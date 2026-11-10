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

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .subah import feeds
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
    return {"ok": True, "ai": {"enabled": ok, "note": why}, "grouping": embedder_status(), "default_source": DEFAULT_SOURCE}


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


app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
