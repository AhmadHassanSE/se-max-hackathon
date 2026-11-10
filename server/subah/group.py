"""Group articles that report the same event, across outlets and across English and Urdu.

Average-link agglomerative clustering on embedding cosine similarity: two groups merge while the average
similarity between all their members stays above the threshold. Reports far apart in time never merge.
No AI is used here, so grouping costs nothing and runs even when the AI is unavailable.
"""
from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone

import numpy as np

from .embed import Embedder
from .feeds import Article
from .textnorm import fold

# Tuned on server/tests/fixtures (see docs/testing.md): 0.40 to 0.45 gave zero errors; 0.42 sits in the middle.
# Higher merges less. Retune on a real day of feeds before the demo.
THRESHOLD = float(os.environ.get("SUBAH_GROUP_THRESHOLD", "0.42"))
WORD_BOOST = 0.3  # weight of shared content words (Jaccard), helps same-language reports with different phrasing
LEXICAL_THRESHOLD = 0.45
WINDOW_HOURS = 36.0
_STOP = set("the a an of to in on for and by with as at from is are was were has have be will its it that this "
            "per next said says after over into than more new".split())


@dataclass
class Story:
    id: str
    articles: list[Article]
    topics: dict = field(default_factory=dict)  # topic id -> matched term
    cities: dict = field(default_factory=dict)  # city id -> matched term

    @property
    def outlet_ids(self) -> list[str]:
        return sorted({a.outlet_id for a in self.articles})

    @property
    def outlet_names(self) -> list[str]:
        names: dict[str, str] = {}
        for a in self.articles:
            names.setdefault(a.outlet_id, a.outlet_name)
        return [names[k] for k in sorted(names)]

    @property
    def outlet_count(self) -> int:
        return len(self.outlet_ids)

    @property
    def latest(self) -> datetime:
        dates = [a.published for a in self.articles if a.published]
        return max(dates) if dates else datetime.min.replace(tzinfo=timezone.utc)

    @property
    def earliest(self) -> datetime:
        dates = [a.published for a in self.articles if a.published]
        return min(dates) if dates else datetime.min.replace(tzinfo=timezone.utc)


def coverage_label(count: int, lang: str = "en") -> str:
    """The only label a story carries: a count of distinct outlets, never a verdict."""
    if lang == "ur":
        digits = str(count).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))
        return f"{digits} {'ادارے' if count == 1 else 'اداروں'} نے رپورٹ کیا"
    return f"Reported by {count} outlet" + ("" if count == 1 else "s")


def story_id(articles: list[Article]) -> str:
    return "s" + hashlib.sha1("|".join(sorted(a.id for a in articles)).encode("utf-8")).hexdigest()[:10]


def similarity(articles: list[Article], embedder: Embedder) -> np.ndarray:
    """Cosine similarity of (headline + description) meaning, plus a small bonus for shared content words."""
    titles = embedder.embed([a.title for a in articles]).astype(np.float64)
    descs = embedder.embed([a.summary or a.title for a in articles]).astype(np.float64)
    vecs = titles + descs
    vecs /= np.maximum(np.linalg.norm(vecs, axis=1, keepdims=True), 1e-9)
    sim = vecs @ vecs.T
    words = [{w for w in fold(f"{a.title} {a.summary}").split() if len(w) > 2 and w not in _STOP} for a in articles]
    n = len(articles)
    jac = np.zeros((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            union = len(words[i] | words[j])
            if union:
                jac[i, j] = jac[j, i] = len(words[i] & words[j]) / union
    return sim + WORD_BOOST * jac


def group_articles(articles: list[Article], embedder: Embedder, threshold: float | None = None,
                   window_hours: float = WINDOW_HOURS) -> list[Story]:
    n = len(articles)
    if n == 0:
        return []
    if threshold is None:
        threshold = THRESHOLD if embedder.cross_language else LEXICAL_THRESHOLD
    sim = similarity(articles, embedder)

    stamps = np.array([a.published.timestamp() if a.published else np.nan for a in articles])
    gap = np.abs(stamps[:, None] - stamps[None, :]) / 3600.0
    sim[np.nan_to_num(gap, nan=0.0) > window_hours] = -1.0

    np.fill_diagonal(sim, -np.inf)
    size = np.ones(n)
    members = [[i] for i in range(n)]
    alive = np.ones(n, dtype=bool)
    while True:
        flat = int(np.argmax(sim))
        i, j = divmod(flat, n)
        if not np.isfinite(sim[i, j]) or sim[i, j] < threshold:
            break
        merged = (sim[i] * size[i] + sim[j] * size[j]) / (size[i] + size[j])
        sim[i, :] = merged
        sim[:, i] = merged
        sim[i, i] = -np.inf
        sim[j, :] = -np.inf
        sim[:, j] = -np.inf
        size[i] += size[j]
        members[i].extend(members[j])
        members[j] = []
        alive[j] = False

    stories: list[Story] = []
    for k in range(n):
        if alive[k] and members[k]:
            group = sorted((articles[m] for m in members[k]), key=lambda a: a.published or datetime.min.replace(tzinfo=timezone.utc))
            stories.append(Story(id=story_id(group), articles=group))
    return stories
