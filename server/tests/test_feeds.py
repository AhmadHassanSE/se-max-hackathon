"""Judge check: bad feed data (malformed, empty or duplicate items) is handled without crashing."""
from datetime import datetime, timezone

from server.subah import feeds

NOW = datetime(2026, 11, 10, 2, 0, tzinfo=timezone.utc)
OUTLET = {"id": "t", "name": "Test Outlet"}
FEED = {"url": "https://example.com/feed", "lang": "en"}


def rss(items: str) -> str:
    return f"<?xml version='1.0'?><rss version='2.0'><channel><title>t</title>{items}</channel></rss>"


def item(title="A headline", link="https://example.com/a", date="Tue, 10 Nov 2026 01:00:00 +0000", desc="Body"):
    return f"<item><title>{title}</title><link>{link}</link><pubDate>{date}</pubDate><description>{desc}</description></item>"


def test_fixture_snapshot_loads_without_crashing(collection):
    statuses = {(r.outlet_id, r.lang): r.status for r in collection.feeds}
    assert statuses[("fridaytimes", "en")] == "malformed"
    assert statuses[("guardian", "en")] == "empty"
    assert statuses[("dw", "en")] == "empty"
    assert statuses[("bbc", "en")] == "error"
    assert statuses[("dawn", "en")] == "ok"
    assert collection.articles, "good feeds still produce articles"


def test_fixture_drops_are_counted(collection):
    s = collection.summary()
    assert s["dropped"]["duplicate"] == 1
    assert s["dropped"]["too_old"] == 1
    assert s["dropped"]["no_title"] == 1


def test_malformed_xml():
    got, rep = feeds.parse_feed("<rss><channel><item><title>broken", OUTLET, FEED, NOW)
    assert got == [] and rep.status == "malformed"


def test_not_xml_at_all():
    got, rep = feeds.parse_feed(b"\x00\xff\xfe garbage bytes", OUTLET, FEED, NOW)
    assert got == [] and rep.status in ("malformed", "empty")


def test_empty_body_and_none():
    for body in (b"", "   ", None):
        got, rep = feeds.parse_feed(body, OUTLET, FEED, NOW)
        assert got == [] and rep.status == "empty"


def test_missing_fields_are_dropped_not_raised():
    body = rss(item(title="") + item(link="") + item(link="javascript:alert(1)") + item(date="not a date") + item())
    got, rep = feeds.parse_feed(body, OUTLET, FEED, NOW)
    assert len(got) == 1
    assert rep.dropped == {"no_title": 1, "no_link": 2, "no_date": 1}


def test_future_and_old_dates():
    body = rss(item(date="Fri, 20 Nov 2026 01:00:00 +0000") + item(link="https://example.com/b", date="Sat, 01 Nov 2026 01:00:00 +0000"))
    got, rep = feeds.parse_feed(body, OUTLET, FEED, NOW)
    assert got == [] and rep.dropped == {"future_date": 1, "too_old": 1}


def test_html_and_entities_are_cleaned():
    body = rss(item(title="Prices &amp; &lt;b&gt;bills&lt;/b&gt;", desc="&lt;p&gt;Hello&amp;nbsp;world&lt;/p&gt;"))
    got, _ = feeds.parse_feed(body, OUTLET, FEED, NOW)
    assert got[0].title == "Prices & bills"
    assert got[0].summary == "Hello world"


def test_duplicates_by_link_and_title():
    body = rss(
        item(link="https://example.com/a")
        + item(link="https://EXAMPLE.com/a/?utm_source=x#top")  # same link once canonical
        + item(link="https://example.com/c")  # same title, same outlet
        + item(title="Other", link="https://example.com/d")
    )
    got, _ = feeds.parse_feed(body, OUTLET, FEED, NOW)
    kept, dropped = feeds.dedupe(got)
    assert len(kept) == 2 and dropped == 2


def test_live_collection_survives_failing_fetches(outlets):
    def fetcher(url):
        if "dawn" in url:
            return rss(item()).encode(), None
        if "geo" in url:
            return b"<html>not a feed</html>", None
        return None, "ConnectTimeout"

    col = feeds.collect_live(outlets, now=NOW, fetcher=fetcher)
    assert len(col.articles) == 1
    assert any(r.status == "error" for r in col.feeds)
    assert col.summary()["feeds_failed"] >= 1
