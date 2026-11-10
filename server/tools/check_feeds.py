"""Probe every feed in server/outlets.json and print whether it answers with readable items.

Run from the repository root:  python -m server.tools.check_feeds
"""
from __future__ import annotations

from datetime import datetime, timezone

from server.subah import feeds


def main() -> None:
    now = datetime.now(timezone.utc)
    for outlet in feeds.load_outlets():
        for feed in outlet["feeds"]:
            body, err = feeds.fetch(feed["url"])
            if err:
                print(f"FAIL  {outlet['name']:<24} {feed['lang']}  {err:<20} {feed['url']}")
                continue
            arts, rep = feeds.parse_feed(body, outlet, feed, now, max_age_hours=72)
            mark = "OK  " if rep.status == "ok" and arts else "WARN"
            print(f"{mark}  {outlet['name']:<24} {feed['lang']}  {rep.status:<9} items={rep.items:<3} recent={len(arts):<3} {feed['url']}")


if __name__ == "__main__":
    main()
