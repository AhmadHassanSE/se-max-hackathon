"""Subah web server: the static site in /web plus a small JSON API.

Run:  uvicorn server.app:app --port 8000   (from the repository root)
"""
from __future__ import annotations

import json
import os
import queue
import threading
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .subah import accounts, feeds, mailer
from .subah.edition import ProfileError, build_edition, load_latest, save_latest
from .subah.embed import embedder_status
from .subah.rank import FORMULA
from .subah.summarize import ai_configured
from .subah.tags import catalog

ROOT = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT / "web"
DEFAULT_SOURCE = os.environ.get("SUBAH_SOURCE", "live")

app = FastAPI(title="Subah", docs_url="/api/docs", openapi_url="/api/openapi.json")
_lock = threading.Lock()


@app.on_event("startup")
def warm_up() -> None:
    """Load the grouping model and embed the newest snapshot in the background, so the first
    "generate now" during a demo only has to embed reports it has not seen."""
    def run() -> None:
        # hold the generation lock so a paper requested during warm-up waits and then reuses the cached
        # embeddings, instead of computing the same reports twice in parallel
        with _lock:
            _warm()

    def _warm() -> None:
        try:
            from .subah.edition import FIXTURES_DIR, latest_snapshot
            from .subah.embed import get_embedder
            from .subah.group import similarity

            snap = latest_snapshot() or FIXTURES_DIR
            col = feeds.collect_snapshot(snap, feeds.load_outlets())
            similarity(col.articles, get_embedder())
        except Exception:  # warm-up is best effort
            pass

    if os.environ.get("SUBAH_WARMUP", "on") != "off":
        threading.Thread(target=run, daemon=True).start()


@app.middleware("http")
async def no_stale_pages(request, call_next):
    """Pages and editions change often during a demo; make browsers revalidate instead of showing old copies."""
    response = await call_next(request)
    response.headers.setdefault("Cache-Control", "no-cache")
    return response


class Profile(BaseModel):
    city: str | None = None
    topics: list[str] = Field(default_factory=list, max_length=5)
    lang: Literal["en", "ur"] = "en"


class GenerateRequest(BaseModel):
    profile: Profile = Field(default_factory=Profile)
    source: Literal["live", "snapshot", "fixtures"] | None = None
    pool: int = Field(10, ge=1, le=15, description="How many top stories to return for the reader to pick from")


@app.get("/api/health")
def health() -> dict:
    ok, why = ai_configured()
    mail_ok, mail_why = mailer.mail_configured()
    return {"ok": True, "ai": {"enabled": ok, "note": why}, "grouping": embedder_status(), "default_source": DEFAULT_SOURCE,
            "accounts": accounts.get_store().status(), "email": {"enabled": mail_ok, "note": mail_why}}


@app.get("/api/outlets")
def outlets() -> dict:
    data = feeds.load_outlets()
    return {
        "definition": "An outlet is one newsroom brand. Its English and Urdu editions count once.",
        "outlets": [{
            "id": o["id"], "name": o["name"], "country": o.get("country"), "site": o.get("site"), "note": o.get("note"),
            "feeds": [{"url": f["url"], "lang": f.get("lang", "en"), "enabled": f.get("enabled", True), "status": f.get("status")}
                      for f in o["feeds"]],
        } for o in data],
        "ranking": FORMULA,
    }


@app.get("/api/catalog")
def get_catalog() -> dict:
    return catalog()


@app.post("/api/generate")
def generate(req: GenerateRequest) -> dict:
    """Generate today's paper now for the given test profile."""
    if not _lock.acquire(timeout=300):
        raise HTTPException(status_code=429, detail="Another paper is being generated. Try again in a moment.")
    try:
        edition = build_edition(req.profile.model_dump(), source=req.source or DEFAULT_SOURCE, pool=req.pool)
    except ProfileError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        _lock.release()
    save_latest(edition)
    return edition


@app.post("/api/generate/stream")
def generate_stream(req: GenerateRequest) -> StreamingResponse:
    """Same as /api/generate, but streams progress as newline-delimited JSON: one line per feed as it answers,
    then grouping, ranking and summaries, and finally {"type": "edition", "edition": {...}}."""
    events: queue.Queue = queue.Queue()

    def work() -> None:
        if not _lock.acquire(timeout=300):
            events.put({"type": "error", "detail": "Another paper is being generated. Try again in a moment."})
            events.put(None)
            return
        try:
            ed = build_edition(req.profile.model_dump(), source=req.source or DEFAULT_SOURCE, pool=req.pool, progress=events.put)
            save_latest(ed)
            events.put({"type": "edition", "edition": ed})
        except ProfileError as exc:
            events.put({"type": "error", "detail": str(exc)})
        except Exception as exc:  # report, never hang the stream
            events.put({"type": "error", "detail": f"generation failed: {type(exc).__name__}"})
        finally:
            _lock.release()
            events.put(None)

    def lines():
        threading.Thread(target=work, daemon=True).start()
        while True:
            ev = events.get()
            if ev is None:
                break
            yield json.dumps(ev, ensure_ascii=False) + "\n"

    return StreamingResponse(lines(), media_type="application/x-ndjson", headers={"X-Accel-Buffering": "no"})


@app.get("/api/edition/latest")
def latest() -> dict:
    edition = load_latest()
    if edition is None:
        raise HTTPException(status_code=404, detail="No paper generated yet.")
    return edition


# ---------------------------------------------------------------- accounts, plans and gifts by email

COOKIE = "subah_session"


def _secure(request: Request) -> bool:
    return request.headers.get("x-forwarded-proto", request.url.scheme) == "https"


def _set_cookie(response: Response, request: Request, token: str) -> None:
    secure = _secure(request)
    # SameSite=None lets the cookie work when the Space is shown inside huggingface.co; it needs Secure
    response.set_cookie(COOKIE, token, max_age=accounts.SESSION_DAYS * 86400, httponly=True, secure=secure,
                        samesite="none" if secure else "lax", path="/")


def _same_site_only(request: Request) -> None:
    """State-changing calls must carry the X-Subah header. A form on another site cannot add it, and a script on
    another site cannot send it without a CORS preflight this server never approves."""
    if request.headers.get("x-subah") != "1":
        raise HTTPException(status_code=403, detail="Missing X-Subah header.")


def _user(request: Request, required: bool = True) -> dict | None:
    try:
        user = accounts.user_for_token(request.cookies.get(COOKIE))
    except accounts.AccountError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc
    if user is None and required:
        raise HTTPException(status_code=401, detail="Log in first.")
    return user


def _account_call(fn, *args):
    try:
        return fn(*args)
    except accounts.AccountError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


class SignupRequest(BaseModel):
    name: str = Field(..., max_length=80)
    email: str = Field(..., max_length=254)
    password: str = Field(..., max_length=200)


class LoginRequest(BaseModel):
    email: str = Field(..., max_length=254)
    password: str = Field(..., max_length=200)


class PlanRequest(BaseModel):
    plan: Literal["basic", "plus"]


class GiftRequest(BaseModel):
    recipient_name: str = Field("", max_length=24)
    recipient_name_ur: str = Field("", max_length=24)
    from_name_ur: str = Field("", max_length=24)
    recipient_email: str = Field(..., max_length=254)
    city: str | None = None
    topics: list[str] = Field(default_factory=list, max_length=5)
    lang: Literal["en", "ur"] = "ur"
    large: bool = True
    from_name: str = Field("", max_length=24)
    note: str = Field("", max_length=280)


@app.get("/api/plans")
def plans() -> dict:
    return {"plans": list(accounts.PLANS.values()), "currency": "USD",
            "payments": "prototype: choosing a plan activates it for 30 days without taking a payment"}


@app.post("/api/auth/signup")
def auth_signup(body: SignupRequest, request: Request, response: Response) -> dict:
    _same_site_only(request)
    user = _account_call(accounts.signup, body.name, body.email, body.password)
    _set_cookie(response, request, _account_call(accounts.start_session, user))
    return {"user": _account_call(accounts.public_user, user)}


@app.post("/api/auth/login")
def auth_login(body: LoginRequest, request: Request, response: Response) -> dict:
    _same_site_only(request)
    user = _account_call(accounts.login, body.email, body.password)
    _set_cookie(response, request, _account_call(accounts.start_session, user))
    return {"user": _account_call(accounts.public_user, user)}


@app.post("/api/auth/logout")
def auth_logout(request: Request, response: Response) -> dict:
    _same_site_only(request)
    _account_call(accounts.end_session, request.cookies.get(COOKIE))
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@app.get("/api/auth/me")
def auth_me(request: Request) -> dict:
    user = _user(request, required=False)
    return {"user": _account_call(accounts.public_user, user) if user else None}


@app.post("/api/subscribe")
def subscribe(body: PlanRequest, request: Request) -> dict:
    _same_site_only(request)
    user = _account_call(accounts.subscribe, _user(request), body.plan)
    return {"user": _account_call(accounts.public_user, user)}


@app.post("/api/subscribe/cancel")
def subscribe_cancel(request: Request) -> dict:
    _same_site_only(request)
    user = _account_call(accounts.cancel, _user(request))
    return {"user": _account_call(accounts.public_user, user)}


@app.post("/api/profile")
def profile_save(body: Profile, request: Request) -> dict:
    _same_site_only(request)
    user = _account_call(accounts.save_profile, _user(request), body.model_dump())
    return {"user": _account_call(accounts.public_user, user)}


def _paper_for_gifts() -> dict:
    edition = load_latest()
    if edition is not None:
        return edition
    if not _lock.acquire(timeout=300):
        raise HTTPException(status_code=429, detail="A paper is being generated. Try again in a moment.")
    try:
        edition = load_latest() or build_edition({}, source=DEFAULT_SOURCE, pool=15)
        save_latest(edition)
        return edition
    finally:
        _lock.release()


@app.post("/api/gift/preview")
def gift_preview(body: GiftRequest) -> dict:
    """The email exactly as it would be sent, without sending it."""
    gift = body.model_dump()
    gift["from_name"] = gift["from_name"] or "you"
    subject, html, _ = mailer.render_gift(_paper_for_gifts(), gift)
    return {"subject": subject, "html": html}


@app.post("/api/gift/send")
def gift_send(body: GiftRequest, request: Request) -> dict:
    _same_site_only(request)
    user = _user(request)
    plan = accounts.active_plan(user)
    if plan is None:
        raise HTTPException(status_code=402, detail="Choose a plan to send gift papers by email.")
    used = _account_call(lambda: accounts.get_store().count_gifts(user["_id"], accounts.month_start()))
    if used >= plan["gifts_per_month"]:
        raise HTTPException(status_code=429, detail=f"You have sent all {plan['gifts_per_month']} gift papers in your "
                                                    f"{plan['name']} plan this month.")
    ok, why = mailer.mail_configured()
    if not ok:
        raise HTTPException(status_code=503, detail=f"Email is not set up on this server yet ({why}).")
    to = _account_call(accounts.clean_email, body.recipient_email)
    gift = body.model_dump()
    gift["from_name"] = gift["from_name"] or user.get("name") or "a friend"
    gift["stories"] = 5
    if plan["id"] != "plus":
        gift["note"] = ""  # the personal note is a Plus feature
    subject, html, text = mailer.render_gift(_paper_for_gifts(), gift)
    try:
        mailer.send(to, subject, html, text, gift["from_name"], reply_to=user["email"])
    except Exception as exc:  # report the reason, never the credentials
        raise HTTPException(status_code=502, detail=f"Gmail did not accept the message ({type(exc).__name__}).") from exc
    _account_call(accounts.get_store().log_gift, {"user_id": user["_id"], "to": to, "sent_at": accounts.now(),
                                                  "lang": gift["lang"], "city": gift["city"]})
    return {"sent": True, "to": to, "subject": subject, "user": _account_call(accounts.public_user, _user(request))}


app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
