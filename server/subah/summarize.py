"""Grounded summaries for the selected stories only, with Groq.

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

PROMPT_VERSION = "v2"
MODEL = os.environ.get("SUBAH_MODEL", "openai/gpt-oss-120b")
BATCH_SIZE = int(os.environ.get("SUBAH_AI_BATCH", "5"))
MAX_CALLS = int(os.environ.get("SUBAH_MAX_AI_CALLS", "3"))
CACHE_PATH = Path(__file__).resolve().parent.parent / "data" / "cache" / "summaries.json"

SYSTEM = """You write short summaries for Subah, a morning news paper read in Pakistan.

Each story comes with the headlines and feed descriptions published by several outlets about the same event.
For each story write a neutral headline (at most 14 words) and a summary of one or two sentences (at most 55 words) in English, then the same headline and summary in Urdu.

Use only facts stated in that story's sources. Do not add background, causes, consequences, predictions, advice or opinion, and nothing you know from elsewhere, even if you are confident it is true. Copy numbers, names and places exactly as the sources give them: in English, spell every name the way an English source spells it, do not turn a place into an adjective (write "Turkiye", not "Turkish"), and leave out any name that appears only in an Urdu source. If the sources disagree, say that reports differ. If the sources are thin, a summary that restates the main headline is fine.
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
    if not os.environ.get("GROQ_API_KEY"):
        return False, "no GROQ_API_KEY set on the server"
    return True, "ok"


class GroqClient:
    """Groq's OpenAI-compatible chat API over httpx. Tests swap in a fake with the same .complete(payload)."""

    URL = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self, model: str | None = None):
        import httpx

        self._httpx = httpx
        self.model = model or MODEL
        self.key = os.environ["GROQ_API_KEY"]

    def _body(self, payload: str, structured: bool) -> dict:
        body = {
            "model": self.model,
            "temperature": 0.2,
            "max_completion_tokens": 8000,
            "messages": [
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": payload},
            ],
        }
        if self.model.startswith("openai/gpt-oss"):
            body["reasoning_effort"] = "low"
        if structured:
            body["response_format"] = {"type": "json_schema", "json_schema": {"name": "subah_summaries", "schema": SCHEMA, "strict": True}}
        else:
            body["response_format"] = {"type": "json_object"}
        return body

    def complete(self, payload: str) -> str:
        httpx = self._httpx
        headers = {"Authorization": f"Bearer {self.key}", "Content-Type": "application/json"}
        last = None
        for structured in (True, False):  # strict schema first; plain JSON mode if the model does not support it
            try:
                resp = httpx.post(self.URL, headers=headers, json=self._body(payload, structured), timeout=90.0)
            except httpx.TimeoutException as exc:
                raise AIUnavailable("the AI took too long to answer") from exc
            except httpx.HTTPError as exc:
                raise AIUnavailable("could not reach the AI service") from exc
            if resp.status_code == 429:
                raise AIUnavailable("rate limited or out of free quota")
            if resp.status_code in (401, 403):
                raise AIUnavailable("API key rejected")
            if resp.status_code == 400 and structured:
                last = resp
                continue
            if resp.status_code >= 400:
                raise AIUnavailable(f"AI service error {resp.status_code}")
            data = resp.json()
            choice = (data.get("choices") or [{}])[0]
            if choice.get("finish_reason") == "length":
                raise AIUnavailable("response was cut off")
            text = (choice.get("message") or {}).get("content") or ""
            if not text.strip():
                raise AIUnavailable("empty response")
            return text
        raise AIUnavailable(f"AI service error {last.status_code if last is not None else 'unknown'}")


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
            client = GroqClient()
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
