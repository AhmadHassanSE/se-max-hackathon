"""Judge checks: summaries contain no claims absent from the linked sources, and the paper still generates
when the AI fails."""
import json

import pytest

from server.subah.edition import build_edition
from server.subah.grounding import check
from server.subah.summarize import summarize

SOURCES = [
    {"id": "a1", "outlet": "Dawn", "lang": "en", "title": "Govt keeps petrol price unchanged, raises diesel by Rs3 per litre",
     "description": "The federal government kept the price of petrol unchanged for the next fortnight and increased high-speed diesel by Rs3 per litre."},
    {"id": "a2", "outlet": "Express", "lang": "ur", "title": "پیٹرول کی قیمت برقرار، ڈیزل 3 روپے مہنگا", "description": ""},
]
GOOD = {
    "id": "s1",
    "headline_en": "Petrol price unchanged, diesel up Rs3 per litre",
    "summary_en": "The federal government kept petrol unchanged for the next fortnight and raised high-speed diesel by Rs3 per litre.",
    "headline_ur": "پیٹرول کی قیمت برقرار، ڈیزل ۳ روپے مہنگا",
    "summary_ur": "حکومت نے پیٹرول کی قیمت برقرار رکھی اور ڈیزل 3 روپے فی لیٹر مہنگا کر دیا۔",
    "used_sources": ["a1", "a2"],
}


def test_grounded_summary_passes():
    assert check(GOOD, SOURCES) == []


@pytest.mark.parametrize("field,value,expect", [
    ("summary_en", "Diesel rose by Rs5 per litre.", "number 5"),
    ("summary_ur", "ڈیزل ۷ روپے مہنگا ہو گیا۔", "number 7"),
    ("headline_en", "", "headline_en is empty"),
])
def test_unsupported_claims_are_rejected(field, value, expect):
    out = dict(GOOD, **{field: value})
    problems = check(out, SOURCES)
    assert any(expect in p for p in problems), problems


def test_names_not_in_sources_are_not_rejected():
    out = dict(GOOD, summary_en="Finance Minister Aurangzeb said the IMF welcomed the decision in Saudi Arabia.")
    assert check(out, SOURCES) == []


def test_citing_sources_from_another_story_is_rejected():
    out = dict(GOOD, used_sources=["a1", "zz"])
    assert any("outside this story" in p for p in check(out, SOURCES))


class FakeClient:
    def __init__(self, reply):
        self.reply = reply
        self.calls = 0

    def complete(self, payload):
        self.calls += 1
        if isinstance(self.reply, Exception):
            raise self.reply
        return self.reply(json.loads(payload)) if callable(self.reply) else self.reply


def echo_good(payload):
    stories = []
    for s in payload["stories"]:
        src = s["sources"][0]
        stories.append({"id": s["id"], "headline_en": src["title"], "summary_en": src["title"],
                        "headline_ur": src["title"], "summary_ur": src["title"], "used_sources": [src["id"]]})
    return json.dumps({"stories": stories})


ITEMS = [{"id": f"s{i}", "sources": [dict(SOURCES[0], id=f"a{i}")]} for i in range(7)]


def test_batches_and_call_budget():
    client = FakeClient(echo_good)
    run = summarize(ITEMS, client=client, cache_path=None, batch_size=5, max_calls=3)
    assert client.calls == 2  # 7 stories in batches of 5
    assert run.stats()["summarised"] == 7

    client = FakeClient(echo_good)
    run = summarize(ITEMS, client=client, cache_path=None, batch_size=5, max_calls=1)
    assert client.calls == 1
    assert run.stats()["fallback"] == 2
    assert "budget" in run.results["s6"]["reason"]


def test_cache_avoids_repeat_calls(tmp_path):
    cache = tmp_path / "c.json"
    summarize(ITEMS[:2], client=FakeClient(echo_good), cache_path=cache)
    client = FakeClient(echo_good)
    run = summarize(ITEMS[:2], client=client, cache_path=cache)
    assert client.calls == 0 and run.cache_hits == 2


@pytest.mark.parametrize("reply", ["not json", json.dumps({"stories": []}), RuntimeError("boom"), "{\"stories\": [1, 2]}"])
def test_bad_ai_output_falls_back(reply):
    run = summarize(ITEMS[:2], client=FakeClient(reply), cache_path=None)
    assert all(r["status"] == "fallback" for r in run.results.values())


def test_ungrounded_story_falls_back_alone():
    def reply(payload):
        data = json.loads(echo_good(payload))
        data["stories"][0]["summary_en"] = "Prices rose by 40 percent, officials in Karachi said."
        return json.dumps(data)

    run = summarize(ITEMS[:3], client=FakeClient(reply), cache_path=None)
    assert run.results["s0"]["status"] == "fallback"
    assert "grounding" in run.results["s0"]["reason"]
    assert run.results["s1"]["status"] == run.results["s2"]["status"] == "ai"


PROFILE = {"city": "lahore", "topics": ["prices", "cricket"], "lang": "en"}


def assert_complete_paper(ed):
    assert len(ed["stories"]) == 10
    for s in ed["stories"]:
        assert s["headline"]["en"] and s["sources"]
        assert all(src["link"].startswith("http") for src in s["sources"])
        assert s["coverage"]["en"].startswith("Reported by")


def test_paper_generates_without_ai(monkeypatch, collection):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    ed = build_edition(PROFILE, collection=collection, cache_path=None)
    assert_complete_paper(ed)
    assert ed["ai"]["enabled"] is False
    assert all(s["summary_status"] == "fallback" and s["summary"] is None for s in ed["stories"])


def test_paper_generates_when_ai_errors(collection):
    ed = build_edition(PROFILE, collection=collection, client=FakeClient(RuntimeError("API down")), cache_path=None)
    assert_complete_paper(ed)
    assert ed["ai"]["fallback"] == 10


def test_paper_with_working_ai(collection):
    ed = build_edition(PROFILE, collection=collection, client=FakeClient(echo_good), cache_path=None)
    assert_complete_paper(ed)
    assert ed["ai"]["summarised"] == 10 and ed["ai"]["calls"] == 2
    assert ed["stories"][0]["for_you"], "the top story for a Lahore reader who follows prices should carry a tag"
