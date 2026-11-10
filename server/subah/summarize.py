"""Grounded summaries for the selected stories only, with Claude.

- Runs after grouping and ranking, so only the ~10 stories that make the paper are sent.
- Stories go in batches (default 5 per call) and results are cached per story, so a regenerated paper
  reuses earlier summaries and a typical paper costs two calls.
- Input is feed metadata only: each report's headline and feed description. No article pages.
- Every result goes through grounding.check(); a story that fails, or any API error, falls back to its
  source headlines with links. The paper is always produced.
- The API key is read from the server environment and never sent to the browser.
"""
from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass, field
from pathlib import Path

from .grounding import check

PROMPT_VERSION = "v1"
MODEL = os.environ.get("SUBAH_MODEL", "claude-opus-5-5")
BATCH_SIZE = int(os.environ.get("SUBAH_AI_BATCH", "5"))
MAX_CALLS = int(os.environ.get("SUBAH_MAX_AI_CALLS", "3"))
CACHE_PATH = Path(__file__).resolve().parent.parent / "data" / "cache" / "summaries.json"

SYSTEM = """You write short summaries for Subah, a morning news paper read in Pakistan.

Each story comes with the headlines and feed descriptions published by several outlets about the same event.
For each story write a neutral headline (at most 14 words) and a summary of one or two sentences (at most 55 words) in English, then the same headline and summary in Urdu.

Use only facts stated in that story's sources. Do not add background, causes, consequences, predictions, advice or opinion, and nothing you know from elsewhere, even if you are confident it is true. Copy numbers, names and places exactly as the sources give them. If the sources disagree, say that reports differ. If the sources are thin, a summary that restates the main headline is fine.
The Urdu must say exactly what the English says, with no added facts.
In used_sources, list the ids of the sources your summary relies on."""

SCHEMA = {
    "type": "object",
    "properties": {
        "stories": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "headline_en": {"type": "string"},
                    "summary_en": {"type": "string"},
                    "headline_ur": {"type": "string"},
                    "summary_ur": {"type": "string"},
                    "used_sources": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["id", "headline_en", "summary_en", "headline_ur", "summary_ur", "used_sources"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["stories"],
    "additionalProperties": False,
}


class AIUnavailable(Exception):
    pass


def ai_configured() -> tuple[bool, str]:
    if os.environ.get("SUBAH_AI", "on").lower() in ("off", "0", "false"):
        return False, "AI turned off (SUBAH_AI=off)"
    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        return False, "no API key set on the server"
    return True, "ok"


class ClaudeClient:
    """Thin wrapper so tests can swap in a fake with the same .complete(payload) method."""

    def __init__(self, model: str = MODEL):
        import anthropic

        self._anthropic = anthropic
        self.client = anthropic.Anthropic(max_retries=2, timeout=90.0)
        self.model = model

    def complete(self, payload: str) -> str:
        a = self._anthropic
        try:
            resp = self.client.beta.messages.create(
                model=self.model,
                max_tokens=16000,
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                output_config={"effort": "low", "format": {"type": "json_schema", "schema": SCHEMA}},
                system=SYSTEM,
                messages=[{"role": "user", "content": payload}],
            )
        except a.RateLimitError as exc:
            raise AIUnavailable("rate limited or out of quota") from exc
        except a.AuthenticationError as exc:
            raise AIUnavailable("API key rejected") from exc
        except a.APIStatusError as exc:
            raise AIUnavailable(f"API error {exc.status_code}") from exc
        except a.APIConnectionError as exc:
            raise AIUnavailable("could not reach the API") from exc
        if resp.stop_reason == "refusal":
            raise AIUnavailable("the model declined this batch")
        if resp.stop_reason == "max_tokens":
            raise AIUnavailable("response was cut off")
        text = next((b.text for b in resp.content if b.type == "text"), "")
        if not text:
            raise AIUnavailable("empty response")
        return text


def _signature(item: dict) -> str:
    ids = ",".join(sorted(s["id"] for s in item["sources"]))
    return hashlib.sha1(f"{PROMPT_VERSION}|{MODEL}|{ids}".encode("utf-8")).hexdigest()[:16]


def _load_cache(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _save_cache(path: Path, cache: dict) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
    except OSError:
        pass


@dataclass
class SummaryRun:
    results: dict = field(default_factory=dict)  # story id -> {"status": "ai"|"fallback", "reason", "en", "ur", "used_sources"}
    calls: int = 0
    cache_hits: int = 0
    enabled: bool = False
    note: str = ""

    def stats(self) -> dict:
        statuses = [r["status"] for r in self.results.values()]
        return {
            "enabled": self.enabled,
            "model": MODEL if self.enabled else None,
            "calls": self.calls,
            "call_budget": MAX_CALLS,
            "cache_hits": self.cache_hits,
            "summarised": statuses.count("ai"),
            "fallback": statuses.count("fallback"),
            "note": self.note,
        }


def summarize(items: list[dict], client=None, cache_path: Path | None = CACHE_PATH, max_calls: int = MAX_CALLS,
              batch_size: int = BATCH_SIZE) -> SummaryRun:
    """items: [{"id": story id, "sources": [{"id","outlet","lang","title","description"}]}]"""
    run = SummaryRun()
    ok, why = (True, "ok") if client is not None else ai_configured()
    if not ok:
        run.note = why
        for it in items:
            run.results[it["id"]] = {"status": "fallback", "reason": why}
        return run
    run.enabled = True
    cache = _load_cache(cache_path) if cache_path else {}

    todo = []
    for it in items:
        hit = cache.get(_signature(it))
        if hit and not check(hit, it["sources"]):
            run.results[it["id"]] = {"status": "ai", "reason": "cached", **_public(hit)}
            run.cache_hits += 1
        else:
            todo.append(it)

    if todo and client is None:
        try:
            client = ClaudeClient()
        except Exception as exc:  # SDK missing or misconfigured
            run.note = f"AI client unavailable: {type(exc).__name__}"
            client = None

    for start in range(0, len(todo), batch_size):
        batch = todo[start:start + batch_size]
        if client is None:
            reason = run.note or "AI client unavailable"
        elif run.calls >= max_calls:
            reason = "AI call budget for this paper used up"
        else:
            reason = None
        if reason:
            for it in batch:
                run.results[it["id"]] = {"status": "fallback", "reason": reason}
            continue
        payload = json.dumps({"stories": [{"id": it["id"], "sources": it["sources"]} for it in batch]}, ensure_ascii=False)
        run.calls += 1
        try:
            raw = client.complete(payload)
            parsed = json.loads(raw)
            outs = {o.get("id"): o for o in parsed.get("stories", []) if isinstance(o, dict)}
        except AIUnavailable as exc:
            outs, err = {}, str(exc)
        except (ValueError, TypeError, AttributeError):
            outs, err = {}, "response was not valid JSON"
        except Exception as exc:  # any other failure must not stop the paper
            outs, err = {}, f"AI error: {type(exc).__name__}"
        else:
            err = "story missing from the AI response"
        for it in batch:
            out = outs.get(it["id"])
            if out is None:
                run.results[it["id"]] = {"status": "fallback", "reason": err}
                continue
            problems = check(out, it["sources"])
            if problems:
                run.results[it["id"]] = {"status": "fallback", "reason": "grounding check failed: " + "; ".join(problems[:3])}
                continue
            cache[_signature(it)] = out
            run.results[it["id"]] = {"status": "ai", "reason": "summarised", **_public(out)}
    if cache_path:
        _save_cache(cache_path, cache)
    return run


def _public(out: dict) -> dict:
    return {
        "en": {"headline": out["headline_en"].strip(), "text": out["summary_en"].strip()},
        "ur": {"headline": out["headline_ur"].strip(), "text": out["summary_ur"].strip()},
        "used_sources": list(out.get("used_sources") or []),
    }
