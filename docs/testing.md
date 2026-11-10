# Testing

## Test strategy

- **Fixed data set.** `server/tests/fixtures/snapshot/` holds 20 synthetic feeds (33 labelled reports, 13 events, English and Urdu) plus deliberately bad feeds: malformed XML, an empty channel, an empty file, a timed-out feed, a duplicate with tracking parameters, an item older than the window, an item with no title, and HTML in descriptions. Regenerate with `python server/tests/fixtures/make_fixtures.py`.
- **AI is faked in tests.** The summariser takes any client with a `complete()` method, so tests cover good output, bad JSON, missing stories, ungrounded claims, API errors and the call budget without a key or quota.
- **Real data, by hand.** Grouping was also run on a live capture of the real feeds (300 reports) and the groups were read one by one.

## How to run tests

```
bash scripts/test.sh
```

or, with the virtual environment active, `python -m pytest server/tests -q`. The first run downloads the grouping model (about 1 GB).

## Results summary

| Type | Total | Passed | Failed |
|------|-------|--------|--------|
| Unit (feeds, grouping, tags, ranking, grounding, summariser) | 43 | 43 | 0 |
| Integration / API | 8 | 8 | 0 |
| End-to-end / manual (browser) | 6 pages | 6 | 0 |
| Unit / integration added later: summary retry and the outlet's-own-words fallback (`test_summaries.py`) | 2 | 2 | 0 |
| Unit / integration added later: accounts, plans, gift email (`test_accounts.py`) | 13 | 13 | 0 |
| End-to-end / manual added later (browser): pricing, sign up, checkout, account page, gift preview, send without Gmail, phone width | 3 pages | 3 | 0 |

Total automated tests now: 66, all passing.

## Edge cases covered

| ID | Edge case | Expected behaviour | Test / evidence | Result |
|----|-----------|--------------------|-----------------|--------|
| EC-01 | Malformed XML feed | Feed marked malformed, paper still built | `test_malformed_xml`, fixture feed 90 | Pass |
| EC-02 | Empty feed, empty body, no response | Marked empty or error, skipped | `test_empty_body_and_none`, `test_fixture_snapshot_loads_without_crashing` | Pass |
| EC-03 | Duplicate items (same link with tracking params, same title) | Dropped and counted | `test_duplicates_by_link_and_title` | Pass |
| EC-04 | Missing title, missing or non-http link, bad date | Dropped and counted | `test_missing_fields_are_dropped_not_raised` | Pass |
| EC-05 | Future dates, items older than 36 h | Dropped and counted | `test_future_and_old_dates` | Pass |
| EC-06 | Every live feed fails | Falls back to newest snapshot, then fixtures, and says so | `edition.collect()`; `test_live_collection_survives_failing_fetches` | Pass |
| EC-07 | English and Urdu reports of one event | One story | `test_urdu_reports_join_their_english_story` | Pass |
| EC-08 | Same outlet in English and Urdu | Counted once | `test_language_editions_of_one_outlet_count_once` | Pass |
| EC-09 | Similar topics, different events (petrol vs electricity fuel charge; smog vs Lahore board results) | Separate stories | `test_every_report_lands_with_exactly_its_own_event` | Pass |
| EC-10 | Summary adds a number, name or acronym not in sources | Story falls back to headlines | `test_unsupported_claims_are_rejected` | Pass |
| EC-11 | AI returns bad JSON, empty list, crashes | Whole batch falls back, paper still built | `test_bad_ai_output_falls_back`, `test_paper_generates_when_ai_errors` | Pass |
| EC-12 | No API key | Paper with headlines and links; note shown | `test_paper_generates_without_ai` | Pass |
| EC-13 | Call budget used up | Remaining stories fall back | `test_batches_and_call_budget` | Pass |
| EC-14 | Word inside another word ("Testing", "Lahorian") | No tag | `test_words_inside_other_words_do_not_match` | Pass |
| EC-15 | Ambiguous Urdu word (چینی: sugar or Chinese) | Not a price signal | `test_ambiguous_urdu_word_is_not_a_price_signal` | Pass |
| EC-16 | Invalid profile (unknown city, six topics) | HTTP 422 | `test_bad_profile_is_rejected` | Pass |
| EC-17 | Request for server files or `.env` through the web server | 404 | `test_server_files_are_not_served` | Pass |
| EC-18 | AI summary rejected by the grounding check | One retry with the reasons; if it fails again, the outlet's own words, credited | `test_rejected_story_is_retried_with_the_reasons`, `test_retry_respects_the_call_budget` | Pass |
| EC-19 | Sign-up with a bad email, a short password, or an email already used | 400, 400, 409 | `test_signup_rules` | Pass |
| EC-20 | Wrong password; email in a different case or with spaces | 401; the same account logs in | `test_login_logout_and_wrong_password` | Pass |
| EC-21 | Repeated wrong passwords | Logins for that email paused (429) | `test_repeated_wrong_passwords_are_slowed_down` | Pass |
| EC-22 | State-changing call without the `X-Subah` header | 403 | `test_state_changing_calls_need_the_header` | Pass |
| EC-23 | Gift without login; without a plan | 401; 402, nothing sent | `test_gift_needs_login_and_plan` | Pass |
| EC-24 | Monthly gift allowance used up | 429, nothing sent | `test_gift_is_sent_and_counted` | Pass |
| EC-25 | Gmail not configured | 503 with the reason, nothing sent | `test_gift_without_gmail_says_so`; browser check | Pass |
| EC-26 | HTML in the sender's note | Escaped in the email | `test_email_is_built_from_checked_text_with_links` | Pass |
| EC-27 | MongoDB rejects the login, or cannot be reached | `/api/health` names the problem; account calls answer 503 | Connection test and `/api/health`, by hand | Pass |

## Measured metrics

| Metric | Method | Result |
|--------|--------|--------|
| Grouping errors on the fixed set | All 528 report pairs: same event together, different events apart | 0 split, 0 merged at the default threshold 0.62 |
| Grouping margin | Threshold sweep on the fixed set (cross-language bonus 0.1) | 0 errors from 0.56 to 0.68; 4 split pairs at 0.72 |
| Smaller model, for comparison | Same sweep with paraphrase-multilingual-MiniLM-L12-v2 | 0 errors only near 0.42, where real feeds chained unrelated stories (groups of 17); rejected |
| Grouping on real feeds | 300 live reports, groups read by hand | Event-level groups (for example one factory blast: 3 English + 2 Urdu reports from 5 outlets). Weak spot: an ongoing story such as a war can gather several related developments into one group |
| Feeds answering | `python -m server.tools.check_feeds` on 2026-11-10 | 15 of 20 feeds; 3 returned HTTP 404 and 2 were unreadable, now paused and listed on the sources page |
| Generate-now time | `edition.stats.timings_ms`, 300 reports | 63 s on a cold start (model loading and embedding), 2.2 s warm; the server warms up at start and holds requests until it is ready. Paper page end to end with the live replay: 16 s warm |
| AI calls per paper | `edition.ai.calls` with batches of 5 | 2 for 10 stories, 0 when cached |
| Model choice | Same 10 real stories, grounding check pass rate | openai/gpt-oss-120b: 7 of 10, then 9 of 10 after a prompt fix on name spelling, about 8 s; qwen/qwen3.8-27b: could not run a full paper, its free-tier limit is 8,000 tokens a minute |
| Grounding check on real AI output | Rejections read by hand | All rejections were real: names written in a spelling no source used ("Turkish" for "Turkiye"; English spellings of names found only in Urdu sources) |

## Defect log

| ID | Description | Found by / how | Severity | Status | Fix commit |
|----|-------------|----------------|----------|--------|------------|
| D-01 | A broken feed that still yielded a half item was reported as "ok" | Test `test_malformed_xml` | Low | Fixed | 7c39534 |
| D-02 | Grounding check read "Rs3" as a name "Rs" and rejected a correct summary | Test `test_grounded_summary_passes` | Medium | Fixed | 7c39534 |
| D-03 | Urdu "چینی" (sugar) tagged a story about a Chinese company as Prices | Live run, by hand | Medium | Fixed | 7c39534 |
| D-04 | Small embedding model chained unrelated real stories into one group | Live run, by hand | High | Fixed with the larger model and retuning | e65443e |
| D-05 | A CSS cleanup broke a combined selector and disabled the rest of the paper's styles | Browser check | Medium | Fixed | e65443e |
| D-06 | Five feed addresses on the first outlet list did not work | `check_feeds` | Medium | Paused and published | 7c39534 |
| D-07 | Stories whose summary failed the check showed only "No summary today" | Reading the paper | Medium | Fixed: retry, then the outlet's own words | e071f5a |
| D-08 | The first MongoDB login supplied was rejected by Atlas (`bad auth`) | Connection test | High | Fixed by using a working database user | configuration |
| D-09 | With the account chip, the nav overflowed at 375 px and hid the menu button | Browser check at phone width | Medium | Fixed | 27cfa98 |
| D-10 | The Basic plan promised settings saved to the account before that was wired into the pages | Review | Low | Open (FR-22) | |

## Known untested areas

- Urdu wording of AI summaries: needs a review by an Urdu speaker.
- Grouping on several real days: tuned on one day of feeds plus the fixed set.
- Screen readers: keyboard and focus were checked by hand; no screen-reader pass yet.
- Gift email through real Gmail: tested with a fake sender; a real send needs the Gmail app password on the server.
- Payments: the checkout is a prototype and takes no payment, so no payment flow is tested.
- Read aloud: checked in one desktop browser; voices and Urdu support differ by device.
