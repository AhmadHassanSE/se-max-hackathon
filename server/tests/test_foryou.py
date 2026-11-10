"""Judge check: "For you" tags appear only when the story actually matches the reader's settings."""
from datetime import datetime, timezone

from server.subah.feeds import Article
from server.subah.group import Story
from server.subah.rank import rank, score
from server.subah.tags import for_you, tag_story, tag_text

T = datetime(2026, 11, 10, 1, 0, tzinfo=timezone.utc)


def story(*items):
    arts = [Article(id=f"a{i}", outlet_id=f"o{i}", outlet_name=f"O{i}", feed_url="", lang=lang, title=title,
                    summary=desc, link=f"https://example.com/{i}", published=T) for i, (lang, title, desc) in enumerate(items)]
    s = Story(id="s1", articles=arts)
    tag_story(s)
    return s


def test_city_and_topic_match_in_english():
    s = story(("en", "Lahore schools go online as smog worsens", ""))
    tags = for_you(s, {"city": "lahore", "topics": ["weather", "cricket"]})
    assert {(t["type"], t["id"]) for t in tags} == {("city", "lahore"), ("topic", "weather")}
    assert next(t for t in tags if t["id"] == "lahore")["term"] == "Lahore"


def test_no_tag_when_reader_settings_do_not_match():
    s = story(("en", "Lahore schools go online as smog worsens", ""))
    assert for_you(s, {"city": "karachi", "topics": ["cricket", "health"]}) == []
    assert for_you(s, {"city": None, "topics": []}) == []


def test_urdu_keywords_match():
    s = story(("ur", "لاہور میں سموگ، اسکولوں میں آن لائن کلاسیں", ""))
    tags = for_you(s, {"city": "lahore", "topics": ["weather"]})
    assert {t["id"] for t in tags} == {"lahore", "weather"}


def test_words_inside_other_words_do_not_match():
    topics, cities = tag_text("Testing the Lahorian spirit: a testimonial on pricey Kar achieves")
    assert "cricket" not in topics
    assert "lahore" not in cities and "karachi" not in cities


def test_ambiguous_urdu_word_is_not_a_price_signal():
    topics, _ = tag_text("چینی کمپنی کے سربراہ پر الزامات")  # "Chinese company", not "sugar"
    assert "prices" not in topics


def test_acronyms_are_case_sensitive():
    topics, _ = tag_text("Let us know what it means for us")
    assert "world" not in topics  # "us" is not "US"
    topics, _ = tag_text("US and UAE talks")
    assert "world" in topics


def test_passing_mention_in_one_description_is_not_enough():
    s = story(("en", "Book fair opens in the capital", "Visitors came from as far as Lahore."),
              ("en", "Capital book fair draws crowds", "Publishers from across the country."),
              ("en", "Book fair: 100 stalls", "Stalls sold out by noon."))
    assert "lahore" not in s.cities
    assert for_you(s, {"city": "lahore", "topics": []}) == []


def test_ranking_formula_is_mechanical():
    s_city = story(("en", "Lahore dengue cases fall", ""))
    total, parts, _ = score(s_city, {"city": "lahore", "topics": ["health", "prices", "cricket"]})
    assert parts == {"outlets": 1, "city": 2, "topics": 1}
    assert total == 4


def test_rank_orders_by_score_then_recency(collection, embedder):
    from server.subah.group import group_articles

    stories = group_articles(collection.articles, embedder)
    for s in stories:
        tag_story(s)
    picked = rank(stories, {"city": None, "topics": []}, limit=10)
    scores = [p["score"] for p in picked]
    assert scores == sorted(scores, reverse=True)
    assert all(p["for_you"] == [] for p in picked)
    assert picked[0]["story"].outlet_count == max(s.outlet_count for s in stories)
