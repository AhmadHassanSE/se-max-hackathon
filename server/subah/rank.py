"""Mechanical, published ranking. No AI judges importance.

score = number of distinct outlets reporting the story
        + 2 if the story names the reader's city
        + 1 for each of the reader's topics it matches (at most 2)
Ties go to the story with the most recent report, then to the story id (stable).
"""
from __future__ import annotations

from .group import Story
from .tags import for_you

FORMULA = {
    "en": "Score = outlets reporting the story, plus 2 if it names your city, plus 1 per matching topic (at most 2). Ties go to the newest report.",
    "ur": "اسکور = خبر رپورٹ کرنے والے اداروں کی تعداد، آپ کے شہر کا ذکر ہو تو ۲ مزید، اور ہر ملتے موضوع کا ۱ (زیادہ سے زیادہ ۲)۔ برابری پر تازہ ترین رپورٹ پہلے۔",
}
CITY_BONUS = 2
TOPIC_BONUS = 1
TOPIC_BONUS_MAX = 2


def score(story: Story, profile: dict) -> tuple[float, dict, list[dict]]:
    tags = for_you(story, profile)
    city = CITY_BONUS if any(t["type"] == "city" for t in tags) else 0
    topics = min(TOPIC_BONUS_MAX, TOPIC_BONUS * sum(1 for t in tags if t["type"] == "topic"))
    parts = {"outlets": story.outlet_count, "city": city, "topics": topics}
    return float(sum(parts.values())), parts, tags


def rank(stories: list[Story], profile: dict, limit: int = 10) -> list[dict]:
    scored = []
    for s in stories:
        total, parts, tags = score(s, profile)
        scored.append({"story": s, "score": total, "parts": parts, "for_you": tags})
    scored.sort(key=lambda x: (-x["score"], -x["story"].latest.timestamp(), x["story"].id))
    for i, item in enumerate(scored[:limit], start=1):
        item["rank"] = i
    return scored[:limit]
