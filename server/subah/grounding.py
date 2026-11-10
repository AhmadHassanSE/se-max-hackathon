"""Code-side check that an AI summary makes no claim its linked sources do not support.

It is deliberately strict: any number, or any capitalised name, in the English summary or headline must appear
in the source headlines and descriptions; every number in the Urdu text must appear too. A failed check never
reaches the reader: that story falls back to its source headlines and links.
"""
from __future__ import annotations

import re

from .textnorm import fold, normalize_digits

_NUM = re.compile(r"\d+(?:[.,]\d+)*")
_WORD = re.compile(r"[A-Za-z][A-Za-z0-9'’\-]*")
_SENT_START = re.compile(r"(^|[.!?:;]\s+|[\"“‘(]\s*)$")

# Capitalised words that are not claims when they open a sentence.
COMMON = {
    "the", "a", "an", "this", "that", "these", "those", "it", "its", "they", "their", "he", "she", "his", "her",
    "we", "in", "on", "at", "after", "before", "but", "and", "or", "as", "for", "from", "with", "while", "under",
    "reports", "report", "officials", "official", "authorities", "outlets", "sources", "according", "meanwhile",
    "separately", "also", "both", "some", "several", "one", "two", "three", "there", "no", "not", "new", "if",
}


def _numbers(text: str) -> set[str]:
    return {n.replace(",", "") for n in _NUM.findall(normalize_digits(text or ""))}


def _names(text: str) -> list[str]:
    out = []
    for m in _WORD.finditer(text or ""):
        word = m.group(0)
        if not word[0].isupper():
            continue
        base = re.sub(r"['’]s$", "", word).strip("-'’")
        if not base:
            continue
        at_start = bool(_SENT_START.search(text[: m.start()]))
        if base.lower() in COMMON and (at_start or base.lower() in {"the", "a", "an"}):
            continue
        out.append(base)
    return out


def check(story_out: dict, sources: list[dict]) -> list[str]:
    """Return a list of problems; an empty list means the summary passed."""
    problems: list[str] = []
    corpus = " ".join(f"{s.get('title', '')} {s.get('description', '')}" for s in sources)
    corpus_fold = " " + fold(corpus) + " "
    corpus_nums = _numbers(corpus)
    source_ids = {s["id"] for s in sources}

    for field in ("headline_en", "summary_en", "headline_ur", "summary_ur"):
        if not (story_out.get(field) or "").strip():
            problems.append(f"{field} is empty")

    english = f"{story_out.get('headline_en', '')}. {story_out.get('summary_en', '')}"
    urdu = f"{story_out.get('headline_ur', '')} {story_out.get('summary_ur', '')}"
    for n in sorted(_numbers(english) | _numbers(urdu)):
        if n not in corpus_nums:
            problems.append(f"number {n} is not in the sources")
    for name in _names(english) + _names(urdu):
        if f" {fold(name)} " not in corpus_fold:
            problems.append(f"name '{name}' is not in the sources")

    used = story_out.get("used_sources") or []
    if not used:
        problems.append("no sources cited")
    stray = [u for u in used if u not in source_ids]
    if stray:
        problems.append(f"cites sources outside this story: {', '.join(stray)}")
    return problems
