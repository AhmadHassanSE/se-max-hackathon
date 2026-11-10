"""Collect articles from RSS/Atom feeds, live or from a saved snapshot.

Only feed metadata is used: title, description, link, date. Article pages are never fetched.
Bad feed data (malformed XML, empty feeds, missing fields, duplicates) is counted and reported, never raised.
"""
from __future__ import annotations

import calendar
import hashlib
import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import feedparser

from .textnorm import clean_text, fold, is_urdu

SERVER_DIR = Path(__file__).resolve().parent.parent
OUTLETS_PATH = SERVER_DIR / "outlets.json"
USER_AGENT = "SubahBot/0.1 (hackathon prototype; reads public RSS feeds only)"


@dataclass
class Article:
    id: str
    outlet_id: str
    outlet_name: str
    feed_url: str
    lang: str
    title: str
    summary: str
    link: str
    published: datetime | None

    def to_source(self) -> dict:
        return {
            "id": self.id,
            "outlet_id": self.outlet_id,
            "outlet": self.outlet_name,
            "lang": self.lang,
            "title": self.title,
            "link": self.link,
            "published": self.published.isoformat() if self.published else None,
        }


@dataclass
class FeedReport:
    outlet_id: str
    outlet: str
    url: str
    lang: str
    status: str = "ok"  # ok | empty | malformed | error | disabled
    error: str | None = None
    items: int = 0
    kept: int = 0
    dropped: dict = field(default_factory=dict)

    def drop(self, reason: str) -> None:
        self.dropped[reason] = self.dropped.get(reason, 0) + 1


# --------------------------------------------------------------------------- outlets
def load_outlets(path: Path = OUTLETS_PATH) -> list[dict]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return data["outlets"]


def enabled_feeds(outlets: list[dict]) -> list[tuple[dict, dict]]:
    return [(o, f) for o in outlets for f in o.get("feeds", []) if f.get("enabled", True)]


# --------------------------------------------------------------------------- parsing
_TRACKING = re.compile(r"^(utm_|fbclid|gclid|ref$|cmpid|ocid)")


def canonical_link(link: str) -> str:
    """Lowercase host, drop fragments, tracking parameters and trailing slashes."""
    parts = urlsplit(link.strip())
    query = urlencode([(k, v) for k, v in parse_qsl(parts.query) if not _TRACKING.match(k.lower())])
    path = parts.path.rstrip("/") or "/"
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), path, query, ""))


def _valid_link(link: str) -> bool:
    try:
        parts = urlsplit(link)
    except ValueError:
        return False
    return parts.scheme in ("http", "https") and bool(parts.netloc)


def _entry_date(entry) -> datetime | None:
    for key in ("published_parsed", "updated_parsed", "created_parsed"):
        value = entry.get(key)
        if value:
            try:
                return datetime.fromtimestamp(calendar.timegm(value), tz=timezone.utc)
            except (OverflowError, ValueError, TypeError):
                return None
    return None


def article_id(outlet_id: str, link: str, title: str) -> str:
    return "a" + hashlib.sha1(f"{outlet_id}|{canonical_link(link)}|{title}".encode("utf-8")).hexdigest()[:10]


def parse_feed(raw: bytes | str | None, outlet: dict, feed: dict, now: datetime, max_age_hours: float = 36) -> tuple[list[Article], FeedReport]:
    report = FeedReport(outlet_id=outlet["id"], outlet=outlet["name"], url=feed["url"], lang=feed.get("lang", "en"))
    if raw is None or (isinstance(raw, (bytes, str)) and not raw.strip()):
        report.status = "empty"
        report.error = "feed body was empty"
        return [], report
    try:
        parsed = feedparser.parse(raw)
    except Exception as exc:  # feedparser is defensive, but never let one feed stop the paper
        report.status = "malformed"
        report.error = f"could not parse: {type(exc).__name__}"
        return [], report

    entries = list(parsed.get("entries") or [])
    report.items = len(entries)
    if not entries:
        if parsed.get("bozo"):
            report.status = "malformed"
            report.error = f"not a readable feed: {type(parsed.get('bozo_exception')).__name__}"
        else:
            report.status = "empty"
            report.error = "feed has no items"
        return [], report
    if parsed.get("bozo"):
        report.error = "feed had markup errors; readable items were kept"

    oldest = now - timedelta(hours=max_age_hours)
    newest_allowed = now + timedelta(hours=1)
    out: list[Article] = []
    for entry in entries:
        title = clean_text(entry.get("title"), limit=300)
        link = (entry.get("link") or "").strip()
        if not title:
            report.drop("no_title")
            continue
        if not link or not _valid_link(link):
            report.drop("no_link")
            continue
        published = _entry_date(entry)
        if published is None:
            report.drop("no_date")
            continue
        if published > newest_allowed:
            report.drop("future_date")
            continue
        if published < oldest:
            report.drop("too_old")
            continue
        summary = clean_text(entry.get("summary") or entry.get("description"), limit=500)
        if summary and fold(summary) == fold(title):
            summary = ""
        lang = "ur" if is_urdu(title) else "en"  # Urdu feeds sometimes carry English items
        out.append(Article(
            id=article_id(outlet["id"], link, title),
            outlet_id=outlet["id"],
            outlet_name=outlet["name"],
            feed_url=feed["url"],
            lang=lang,
            title=title,
            summary=summary,
            link=link,
            published=published,
        ))
    report.kept = len(out)
    if not out and parsed.get("bozo"):
        report.status = "malformed"
        report.error = f"no usable items in a broken feed: {type(parsed.get('bozo_exception')).__name__}"
    return out, report


def dedupe(articles: list[Article]) -> tuple[list[Article], int]:
    """Drop repeated items: same canonical link, or the same title from the same outlet."""
    seen_links: set[str] = set()
    seen_titles: set[tuple[str, str]] = set()
    kept: list[Article] = []
    dropped = 0
    for a in sorted(articles, key=lambda x: (x.published or datetime.min.replace(tzinfo=timezone.utc)), reverse=True):
        link_key = canonical_link(a.link)
        title_key = (a.outlet_id, fold(a.title))
        if link_key in seen_links or title_key in seen_titles:
            dropped += 1
            continue
        seen_links.add(link_key)
        seen_titles.add(title_key)
        kept.append(a)
    return kept, dropped


# --------------------------------------------------------------------------- live fetch
def fetch(url: str, timeout: float = 12.0) -> tuple[bytes | None, str | None]:
    import httpx

    try:
        with httpx.Client(timeout=timeout, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
            resp = client.get(url)
        if resp.status_code != 200:
            return None, f"HTTP {resp.status_code}"
        if len(resp.content) > 5_000_000:
            return None, "feed larger than 5 MB"
        return resp.content, None
    except Exception as exc:  # network errors, timeouts, TLS problems
        return None, f"{type(exc).__name__}"


# --------------------------------------------------------------------------- collection
@dataclass
class Collection:
    articles: list[Article]
    feeds: list[FeedReport]
    duplicates: int
    source: str  # live | snapshot | fixtures
    as_of: datetime
    note: str | None = None

    def summary(self) -> dict:
        drops: dict[str, int] = {}
        for r in self.feeds:
            for k, v in r.dropped.items():
                drops[k] = drops.get(k, 0) + v
        drops["duplicate"] = self.duplicates
        return {
            "source": self.source,
            "as_of": self.as_of.isoformat(),
            "note": self.note,
            "feeds_total": len(self.feeds),
            "feeds_ok": sum(1 for r in self.feeds if r.status == "ok"),
            "feeds_failed": sum(1 for r in self.feeds if r.status != "ok"),
            "items_seen": sum(r.items for r in self.feeds),
            "articles_kept": len(self.articles),
            "dropped": drops,
            "feeds": [asdict(r) for r in self.feeds],
        }


def _feed_event(r: "FeedReport") -> dict:
    return {"type": "feed", "outlet": r.outlet, "outlet_id": r.outlet_id, "lang": r.lang, "status": r.status,
            "items": r.items, "kept": r.kept, "error": r.error}


def collect_live(outlets: list[dict], now: datetime | None = None, max_age_hours: float = 36,
                 save_to: Path | None = None, fetcher=fetch, progress=None) -> Collection:
    """Fetch every enabled feed in parallel. progress(event) is called as each feed answers."""
    now = now or datetime.now(timezone.utc)
    pairs = enabled_feeds(outlets)
    manifest = {"captured_at": now.isoformat(), "feeds": []}
    articles: list[Article] = []
    reports: list[FeedReport] = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fetcher, feed["url"]): (i, outlet, feed) for i, (outlet, feed) in enumerate(pairs)}
        for fut in as_completed(futures):
            i, outlet, feed = futures[fut]
            try:
                body, err = fut.result()
            except Exception as exc:  # a fetcher that raises is treated like a failed fetch
                body, err = None, type(exc).__name__
            if err:
                r = FeedReport(outlet_id=outlet["id"], outlet=outlet["name"], url=feed["url"], lang=feed.get("lang", "en"), status="error", error=err)
                manifest["feeds"].append({"outlet_id": outlet["id"], "url": feed["url"], "lang": feed.get("lang", "en"), "file": None, "error": err})
            else:
                got, r = parse_feed(body, outlet, feed, now, max_age_hours)
                articles.extend(got)
                if save_to is not None:
                    name = f"{i:02d}-{outlet['id']}-{feed.get('lang', 'en')}.xml"
                    manifest["feeds"].append({"outlet_id": outlet["id"], "url": feed["url"], "lang": feed.get("lang", "en"), "file": name, "error": None})
                    save_to.mkdir(parents=True, exist_ok=True)
                    (save_to / name).write_bytes(body)
            reports.append(r)
            if progress:
                progress(_feed_event(r))
    if save_to is not None:
        (save_to / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    kept, dups = dedupe(articles)
    return Collection(kept, reports, dups, "live", now)


def collect_snapshot(snapshot_dir: Path, outlets: list[dict], max_age_hours: float = 36, source: str = "snapshot",
                     progress=None) -> Collection:
    """Replay a saved snapshot: a manifest.json plus the raw feed files captured at that time."""
    snapshot_dir = Path(snapshot_dir)
    manifest = json.loads((snapshot_dir / "manifest.json").read_text(encoding="utf-8"))
    now = datetime.fromisoformat(manifest["captured_at"])
    by_id = {o["id"]: o for o in outlets}
    articles: list[Article] = []
    reports: list[FeedReport] = []
    for entry in manifest["feeds"]:
        outlet = by_id.get(entry["outlet_id"]) or {"id": entry["outlet_id"], "name": entry.get("outlet", entry["outlet_id"])}
        feed = {"url": entry["url"], "lang": entry.get("lang", "en")}
        if entry.get("error") or not entry.get("file"):
            r = FeedReport(outlet_id=outlet["id"], outlet=outlet["name"], url=feed["url"], lang=feed["lang"], status="error", error=entry.get("error") or "no file")
            reports.append(r)
            if progress:
                progress(_feed_event(r))
            continue
        path = snapshot_dir / entry["file"]
        body = path.read_bytes() if path.exists() else None
        got, r = parse_feed(body, outlet, feed, now, max_age_hours)
        articles.extend(got)
        reports.append(r)
        if progress:
            progress(_feed_event(r))
    kept, dups = dedupe(articles)
    return Collection(kept, reports, dups, source, now, note=manifest.get("note"))
