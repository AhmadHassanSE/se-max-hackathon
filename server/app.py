"""Subah web server: the static site in /web plus a small JSON API.

Run:  uvicorn server.app:app --port 8000   (from the repository root)
"""
from __future__ import annotations

import os
import threading
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
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


class Profile(BaseModel):
    city: str | None = None
    topics: list[str] = Field(default_factory=list, max_length=5)
    lang: Literal["en", "ur"] = "en"


class GenerateRequest(BaseModel):
    profile: Profile = Field(default_factory=Profile)
    source: Literal["live", "snapshot", "fixtures"] | None = None


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
            "feeds": [{"url": f["url"], "lang": f.get("lang", "en"), "enabled": f.get("enabled", True)} for f in o["feeds"]],
        } for o in data],
        "ranking": FORMULA,
    }


@app.get("/api/catalog")
def get_catalog() -> dict:
    return catalog()


@app.post("/api/generate")
def generate(req: GenerateRequest) -> dict:
    """Generate today's paper now for the given test profile."""
    if not _lock.acquire(timeout=120):
        raise HTTPException(status_code=429, detail="Another paper is being generated. Try again in a moment.")
    try:
        edition = build_edition(req.profile.model_dump(), source=req.source or DEFAULT_SOURCE)
    except ProfileError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        _lock.release()
    save_latest(edition)
    return edition


@app.get("/api/edition/latest")
def latest() -> dict:
    edition = load_latest()
    if edition is None:
        raise HTTPException(status_code=404, detail="No paper generated yet.")
    return edition


app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
