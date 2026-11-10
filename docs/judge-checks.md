# Judge checks

Each check from the idea approval, with where to see it and the test that proves it. Run every test with `bash scripts/test.sh` (or `python -m pytest server/tests -q`).

| # | Check | Where to see it | Automated test |
|---|-------|-----------------|----------------|
| 1 | On a fixed set of articles, duplicates are grouped correctly, including across languages | Fixed set: `server/tests/fixtures/snapshot/` (33 synthetic reports, 13 events, English and Urdu, labels in `expected_groups.json`). Code: `server/subah/group.py` | `test_grouping.py::test_every_report_lands_with_exactly_its_own_event` (every pair: same event together, different events apart), `test_urdu_reports_join_their_english_story` |
| 2 | Coverage labels match the actual number of distinct outlets | Paper page badge "Reported by N outlets"; `coverage_label()` in `group.py`; outlet definition on `/sources.html` | `test_grouping.py::test_coverage_counts_distinct_outlets`, `test_language_editions_of_one_outlet_count_once` (6 reports, 5 outlets), `test_labels_are_counts_not_verdicts` |
| 3 | Summaries contain no claims absent from the linked sources | `server/subah/grounding.py` checks every number and capitalised name in the English and Urdu output against the source headlines and descriptions; a failure drops the summary for that story | `test_summaries.py::test_unsupported_claims_are_rejected` (new number, new name, new acronym, Urdu number), `test_ungrounded_story_falls_back_alone` |
| 4 | "For you" tags appear only when the story matches the reader's settings | `server/subah/tags.py` (keyword rules, English and Urdu); each tag shows the word that matched | `test_foryou.py` (city and topic match, no match, Urdu, word boundaries, acronyms, passing mentions, ambiguous Urdu word) |
| 5 | The paper still generates when AI fails | No key, API error, bad JSON, missing stories, refusal, quota: every case falls back to source headlines with links | `test_summaries.py::test_paper_generates_without_ai`, `test_paper_generates_when_ai_errors`, `test_bad_ai_output_falls_back`, `test_batches_and_call_budget` |
| 6 | Bad feed data is handled without crashing | `server/subah/feeds.py`; the fixed set includes a malformed feed, an empty feed, an empty file, a timed-out feed, a duplicate, an old item, a title-less item and HTML in descriptions | `test_feeds.py` (11 tests) |

## Other approval requirements

| Requirement | Where |
|-------------|-------|
| Coverage labels instead of confirmed / single source / unconfirmed; no viral-claim labelling | `coverageHTML()` in `web/assets/js/common.js`; neutral badge style in `base.css` |
| Summaries only from sources, linked; "what isn't known yet" removed; headline fallback | `summarize.py` prompt and `grounding.py`; paper page lists and links every source |
| Rule-based For you, no predictions about personal costs | `tags.py`, `rank.py`; no AI involved |
| Feed metadata and links only, attribution, licensing noted | `feeds.py` never fetches article pages; `/sources.html` and README "Known limitations" |
| Reader picks (pass, love, keep) | The reader's own choice; no AI. Within loved and kept stories the published formula still sets the order (`pickedStories()` in `common.js`) |
| Published outlet list, mechanical ranking | `/sources.html`, `GET /api/outlets`, `server/outlets.json`, formula in `rank.py` |
| Scope: no payments, audio, quiz or third language; English + Urdu + large print; generate-now action | Paper page button "Generate today’s paper now" and `POST /api/generate` |
| Quota: group before AI, summarise only selected stories, keys server-side | `edition.py` order of steps; `SUBAH_AI_BATCH`, `SUBAH_MAX_AI_CALLS`, per-story cache; key read only from server environment; `test_api.py::test_health_has_no_secrets` |
| Data: event rule on pre-collected data; test profiles only | `SUBAH_SOURCE=live|snapshot|fixtures`; profiles are never stored on the server; test readers A, B and C. Event ruling: **[insert ruling]** |

## Added after approval

These were added on the team's request after the approval; the six checks above are unchanged.

| Feature | Where to see it | Automated test |
|---------|-----------------|----------------|
| No story without text: retry, then the outlet's own words, credited and linked | Paper page; `summarize.py` (retry), `brief()` in `edition.py` | `test_rejected_story_is_retried_with_the_reasons`, `test_retry_respects_the_call_budget`, `test_paper_generates_without_ai` |
| Sign up, log in, log out | `/account.html`; `server/subah/accounts.py` | `test_accounts.py` (sign-up rules, hashing, cookie, wrong password, rate limit, header check) |
| Plans: Basic $3, Plus $8 (prototype checkout, no payment) | `/pricing.html`, `GET /api/plans` | `test_plans_are_three_and_eight_dollars`, `test_subscribe_needs_login_then_activates` |
| Gift paper by email, re-ranked for the recipient with the published formula | `/gift.html` (Send their paper, Preview the email); `server/subah/mailer.py` | `test_gift_is_sent_and_counted`, `test_gift_needs_login_and_plan`, `test_email_is_built_from_checked_text_with_links`, `test_preview_needs_no_account` |
| Read aloud | Paper page: Listen in the top bar and on each story | Manual check |
