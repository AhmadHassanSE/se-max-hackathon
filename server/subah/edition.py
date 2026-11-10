"""Build one reader's paper: collect -> group -> tag -> rank -> summarise selected stories -> edition JSON."""
from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from . import feeds
from .embed import embedder_status, get_embedder
from .group import coverage_label, group_articles
from .rank import FORMULA, rank
from .summarize import summarize
from .tags import CITIES, TOPICS, tag_story

SERVER_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = SERVER_DIR / "data"
FIXTURES_DIR = SERVER_DIR / "tests" / "fixtures" / "snapshot"
SNAPSHOTS_DIR = DATA_DIR / "snapshots"
EDITIONS_DIR = DATA_DIR / "editions"
PAPER_SIZE = int(os.environ.get("SUBAH_PAPER_SIZE", "10"))
MAX_AGE_HOURS = float(os.environ.get("SUBAH_MAX_AGE_HOURS", "36"))


class ProfileError(ValueError):
    pass


def clean_profile(raw: dict | None) -> dict:
    """Reader settings. Test profiles only: nothing here is stored on the server."""
    raw = raw or {}
    city = raw.get("city") or None
    if city is not None and city not in CITIES:
        raise ProfileError(f"unknown city '{city}'")
    topics = list(dict.fromkeys(raw.get("topics") or []))
    bad = [t for t in topics if t not in TOPICS]
    if bad:
        raise ProfileError(f"unknown topics: {', '.join(bad)}")
    if len(topics) > 5:
        raise ProfileError("choose at most 5 topics")
    lang = raw.get("lang") or "en"
    if lang not in ("en", "ur"):
        raise ProfileError("lang must be 'en' or 'ur'")
    return {"city": city, "topics": topics, "lang": lang}


def latest_snapshot() -> Path | None:
    if not SNAPSHOTS_DIR.exists():
        return None
    dirs = sorted((p for p in SNAPSHOTS_DIR.iterdir() if (p / "manifest.json").exists()), reverse=True)
    return dirs[0] if dirs else None


def collect(source: str, outlets: list[dict]) -> feeds.Collection:
    """live: fetch now (and keep a snapshot); snapshot: newest saved snapshot; fixtures: the bundled test set.
    A live run where every feed fails falls back to the newest snapshot, then to the fixtures, and says so."""
    if source == "fixtures":
        return feeds.collect_snapshot(FIXTURES_DIR, outlets, MAX_AGE_HOURS, source="fixtures")
    if source == "snapshot":
        snap = latest_snapshot()
        if snap:
            return feeds.collect_snapshot(snap, outlets, MAX_AGE_HOURS)
        col = feeds.collect_snapshot(FIXTURES_DIR, outlets, MAX_AGE_HOURS, source="fixtures")
        col.note = "no saved snapshot yet, so the bundled fixture feeds were used"
        return col
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    col = feeds.collect_live(outlets, max_age_hours=MAX_AGE_HOURS, save_to=SNAPSHOTS_DIR / stamp)
    if col.articles:
        return col
    fallback = collect("snapshot", outlets)
    fallback.note = "every live feed failed; " + (fallback.note or "used the newest saved snapshot")
    fallback.feeds = col.feeds + fallback.feeds
    return fallback


def build_edition(profile: dict | None, source: str = "fixtures", client=None, collection: feeds.Collection | None = None,
                  cache_path: Path | None | str = "default") -> dict:
    t0 = time.perf_counter()
    profile = clean_profile(profile)
    outlets = feeds.load_outlets()
    col = collection or collect(source, outlets)
    t_collect = time.perf_counter()

    embedder = get_embedder()
    stories = group_articles(col.articles, embedder)
    for s in stories:
        tag_story(s)
    t_group = time.perf_counter()

    picked = rank(stories, profile, limit=PAPER_SIZE)
    items = [{
        "id": p["story"].id,
        "sources": [{"id": a.id, "outlet": a.outlet_name, "lang": a.lang, "title": a.title, "description": a.summary}
                    for a in p["story"].articles],
    } for p in picked]
    kwargs = {} if cache_path == "default" else {"cache_path": cache_path}
    run = summarize(items, client=client, **kwargs)
    t_ai = time.perf_counter()

    out_stories = []
    for p in picked:
        s = p["story"]
        res = run.results.get(s.id, {"status": "fallback", "reason": "not summarised"})
        en_first = next((a for a in s.articles if a.lang == "en"), s.articles[0])
        ur_first = next((a for a in s.articles if a.lang == "ur"), en_first)
        out_stories.append({
            "id": s.id,
            "rank": p["rank"],
            "score": p["score"],
            "score_parts": p["parts"],
            "outlet_count": s.outlet_count,
            "coverage": {"en": coverage_label(s.outlet_count, "en"), "ur": coverage_label(s.outlet_count, "ur")},
            "outlets": s.outlet_names,
            "topics": [{"id": k, "en": TOPICS[k][0], "ur": TOPICS[k][1], "term": v} for k, v in s.topics.items()],
            "cities": [{"id": k, "en": CITIES[k][0], "ur": CITIES[k][1], "term": v} for k, v in s.cities.items()],
            "for_you": p["for_you"],
            "summary_status": res["status"],
            "summary_note": res.get("reason"),
            "summary": {"en": res["en"], "ur": res["ur"]} if res["status"] == "ai" else None,
            "used_sources": res.get("used_sources", []),
            "headline": {"en": en_first.title, "ur": ur_first.title},
            "headline_from": {"en": en_first.outlet_name, "ur": ur_first.outlet_name},
            "latest": s.latest.isoformat(),
            "sources": [a.to_source() for a in s.articles],
        })

    report = col.summary()
    edition = {
        "edition_id": f"{col.as_of.strftime('%Y%m%d%H%M')}-{len(out_stories)}",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "as_of": col.as_of.isoformat(),
        "source": col.source,
        "profile": profile,
        "ranking": FORMULA,
        "stories": out_stories,
        "stats": {
            "stories_grouped": len(stories),
            "stories_in_paper": len(out_stories),
            "outlets_read": len({a.outlet_id for a in col.articles}),
            "articles": len(col.articles),
            "feeds_ok": report["feeds_ok"],
            "feeds_failed": report["feeds_failed"],
            "timings_ms": {
                "collect": round((t_collect - t0) * 1000),
                "group_and_tag": round((t_group - t_collect) * 1000),
                "summaries": round((t_ai - t_group) * 1000),
                "total": round((time.perf_counter() - t0) * 1000),
            },
        },
        "ai": run.stats(),
        "grouping": embedder_status(),
        "report": report,
    }
    return edition


def save_latest(edition: dict) -> None:
    EDITIONS_DIR.mkdir(parents=True, exist_ok=True)
    (EDITIONS_DIR / "latest.json").write_text(json.dumps(edition, ensure_ascii=False, indent=1), encoding="utf-8")


def load_latest() -> dict | None:
    try:
        return json.loads((EDITIONS_DIR / "latest.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
