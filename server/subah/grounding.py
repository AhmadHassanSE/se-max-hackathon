"""Code-side check that an AI summary makes no claim its linked sources do not support.

Every number in the English and Urdu summary or headline must appear in the source headlines and descriptions,
all four fields must be non-empty, and every cited source must belong to the story. Capitalised names are not
checked: the model often respells or expands a name ("Saudi" -> "Saudi Arabia"), which is not a new claim.
A failed check never reaches the reader: that story falls back to its source headlines and links.
"""
from __future__ import annotations

import re

from .textnorm import normalize_digits

_NUM = re.compile(r"\d+(?:[.,]\d+)*")


def _numbers(text: str) -> set[str]:
    return {n.replace(",", "") for n in _NUM.findall(normalize_digits(text or ""))}


def check(story_out: dict, sources: list[dict]) -> list[str]:
    """Return a list of problems; an empty list means the summary passed."""
    problems: list[str] = []
    corpus = " ".join(f"{s.get('title', '')} {s.get('description', '')}" for s in sources)
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

    used = story_out.get("used_sources") or []
    if not used:
        problems.append("no sources cited")
    stray = [u for u in used if u not in source_ids]
    if stray:
        problems.append(f"cites sources outside this story: {', '.join(stray)}")
    return problems
