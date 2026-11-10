"""Judge checks: duplicates are grouped correctly, including across languages, and coverage labels match
the actual number of distinct outlets."""
from collections import defaultdict
from itertools import combinations

import pytest

from server.subah.group import coverage_label, group_articles


@pytest.fixture(scope="module")
def stories(collection, embedder):
    return group_articles(collection.articles, embedder)


def test_multilingual_model_is_loaded(embedder):
    assert embedder.cross_language, "the multilingual embedding model must load for cross-language grouping"


def test_every_report_lands_with_exactly_its_own_event(stories, expected_groups):
    """Pairwise check on the fixed set: same event -> same story; different events -> different stories."""
    story_of = {}
    for s in stories:
        for a in s.articles:
            story_of[a.link] = s.id
    labelled = [link for link in expected_groups if link in story_of]
    assert len(labelled) == len(expected_groups)
    wrong_split, wrong_merge = [], []
    for x, y in combinations(labelled, 2):
        same_event = expected_groups[x] == expected_groups[y]
        same_story = story_of[x] == story_of[y]
        if same_event and not same_story:
            wrong_split.append((expected_groups[x], x, y))
        if same_story and not same_event:
            wrong_merge.append((expected_groups[x], expected_groups[y], x, y))
    assert not wrong_split, f"reports of one event were split: {wrong_split}"
    assert not wrong_merge, f"different events were merged: {wrong_merge}"


def test_urdu_reports_join_their_english_story(stories, expected_groups):
    mixed = [s for s in stories if {a.lang for a in s.articles} == {"en", "ur"}]
    events = {expected_groups[a.link] for s in mixed for a in s.articles}
    # E1, E2, E3, E4, E5, E6, E10 all have English and Urdu reports in the fixtures
    assert {"E1", "E2", "E3", "E4", "E5", "E6", "E10"} <= events


def test_coverage_counts_distinct_outlets(stories, expected_groups):
    expected = defaultdict(set)
    for s in stories:
        for a in s.articles:
            expected[expected_groups[a.link]].add(a.outlet_id)
    for s in stories:
        event = expected_groups[s.articles[0].link]
        assert s.outlet_count == len(expected[event])
        assert s.outlet_count == len({a.outlet_id for a in s.articles})


def test_language_editions_of_one_outlet_count_once(stories, expected_groups):
    petrol = next(s for s in stories if expected_groups[s.articles[0].link] == "E1")
    assert len(petrol.articles) == 6  # six reports...
    assert petrol.outlet_count == 5  # ...from five outlets: Express English and Express Urdu are one outlet


def test_labels_are_counts_not_verdicts():
    assert coverage_label(1) == "Reported by 1 outlet"
    assert coverage_label(5) == "Reported by 5 outlets"
    assert coverage_label(5, "ur") == "۵ اداروں نے رپورٹ کیا"
    for n in (1, 2, 9):
        label = coverage_label(n).lower()
        assert "confirm" not in label and "verified" not in label


def test_reports_far_apart_in_time_never_merge(collection, embedder):
    from dataclasses import replace
    from datetime import timedelta

    a = next(x for x in collection.articles if "petrol" in x.title.lower())
    b = replace(a, id="late", link="https://example.com/late", outlet_id="other", published=a.published + timedelta(hours=60))
    stories = group_articles([a, b], embedder)
    assert len(stories) == 2
