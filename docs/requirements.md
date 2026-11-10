# Requirements

## Problem statement

People in Pakistan, and their families abroad, read the same story five times across apps and WhatsApp groups and still cannot tell how widely it was reported or where it came from. Feeds are built to keep them scrolling.

Subah is a morning paper for one reader: the day's top stories, grouped across Pakistani and world newsrooms, each showing how many outlets reported it and linking every report, in English or Urdu, in large print if wanted. Then it ends.

## Users

- **Reader in Pakistan** who wants the day's news in a few minutes, in English or Urdu.
- **Family member abroad** who sets up a large-print Urdu paper for a parent at home.
- **Judges and demo audience**, using test reader profiles.

## Functional requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Read the feeds on a published outlet list; use only feed metadata (headline, description, link, time) | Must | Done |
| FR-02 | Group reports of the same event across outlets and across English and Urdu | Must | Done (retuning on real feeds, see testing.md) |
| FR-03 | Label each story with the count of distinct outlets ("Reported by N outlets") | Must | Done |
| FR-04 | Rank stories by a published mechanical formula and keep the top ten | Must | Done |
| FR-05 | Summarise only the selected stories, only from their source metadata, and link every source | Must | Done |
| FR-06 | Check every summary against its sources in code; drop it on any unsupported number or name | Must | Done |
| FR-07 | Show the source headlines with links when the AI is unavailable, fails or is out of quota | Must | Done |
| FR-08 | Rule-based "For you" tags for the reader's chosen city and topics, showing the matched word | Must | Done |
| FR-09 | English and Urdu (right to left, Nastaliq), and large print | Must | Done |
| FR-10 | "Generate today's paper now" action | Must | Done |
| FR-11 | Last page with today's top three and their sources | Should | Done |
| FR-12 | Gift paper preview for a parent: their city, topics, language and print size | Should | Done (preview only, nothing sent) |
| FR-13 | Publish the outlet list and the ranking formula | Must | Done (`/sources.html`) |
| FR-14 | Handle malformed, empty and duplicate feed data without crashing | Must | Done |

## Non-functional requirements

| ID | Category | Requirement | Target | How measured | Result |
|----|----------|-------------|--------|--------------|--------|
| NFR-01 | Accuracy | Pairwise grouping errors on the fixed set | 0 | `test_grouping.py` | See testing.md |
| NFR-02 | Honesty | Summaries with a claim not in the sources reaching the reader | 0 | grounding check plus `test_summaries.py` | 0 in tests |
| NFR-03 | Availability | Paper generated when the AI fails | 100% | `test_paper_generates_*` | 100% in tests |
| NFR-04 | Cost | AI calls per paper | at most 3 | `edition.ai.calls`, `SUBAH_MAX_AI_CALLS` | 2 for 10 stories (batches of 5); 0 on cache hits |
| NFR-05 | Speed | Generate-now time from live feeds | under 30 s | `edition.stats.timings_ms` | See testing.md |
| NFR-06 | Security | No secret in the repository or in any API response | none | `.gitignore`, `test_health_has_no_secrets` | Pass |
| NFR-07 | Accessibility | Keyboard use, visible focus, reduced motion respected | all pages | manual check | Pass on manual check |

## Constraints

- Feed metadata and links only; no scraping of article pages.
- AI quota is limited: group first, summarise only the ten selected stories, batch and cache.
- API keys live only in the server environment.
- Test reader profiles only; no real personal data.
- Event rule on pre-collected or snapshot data: **[insert ruling]**. The app supports live feeds, a saved snapshot, or the bundled synthetic fixtures (`SUBAH_SOURCE`).

## Assumptions

- Outlets keep their public RSS feeds available.
- One reader's settings (city, up to five topics, language, print size) are enough to tailor a paper.

## Out of scope

Payments, audio edition, quiz, Roman Urdu, accounts, real delivery by email or WhatsApp, viral-claim labelling, AI judgement of importance, AI predictions about a reader's costs.
