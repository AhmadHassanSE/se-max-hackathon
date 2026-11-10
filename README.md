# Subah (صبح)

> AI-Powered SE-MAX · CUI Tech Fest FA'26 · Team: <Team Name>

## What it does

A morning paper for one reader: the day's top ten stories, grouped across Pakistani and world newsrooms, each labelled with how many outlets reported it and linking every report, in English or Urdu, in large print if wanted. Then it ends.

## Problem and user

People in Pakistan, and their families abroad, see the same story many times across apps and WhatsApp groups and cannot tell how widely it was reported or where it came from. Subah is for a reader who wants the news in a few minutes, and for a son or daughter abroad setting up a large-print Urdu paper for a parent at home.

## Live deployment

- **URL / install link:** https://ranaahmad3048-subah.hf.space (Space page: https://huggingface.co/spaces/RanaAhmad3048/subah)
- **Platform:** Hugging Face Spaces, Gradio SDK on free ZeroGPU hardware. The site and API are served at the root by our FastAPI app; a small Gradio page at `/gradio` exists only for the Space's hardware check (`server/space_app.py`). The app never uses the GPU.

## Judge quick start (under 5 minutes)

1. Open the live URL. Scroll the front page: the clustering scene and "Then we pick ten" show how grouping and ranking work.
2. Click **Make my paper**, choose **Test reader A**, then **Next: topics**, then **Generate today's paper**.
3. On the paper: each story shows **Reported by N outlets**, its sources with links, **For you** tags with the word that matched, and why it is here. Switch to **اردو** and **large print** in the top bar. **Generate today's paper now** rebuilds it.
4. Open **Our sources** to see the outlet list and the ranking formula, and **Finish today's paper** for the last page.
5. Open **Pricing**, choose **Plus** and sign up with a test email. Checkout is a prototype: nothing is charged. Then on **For family**, enter a recipient email you own and **Send their paper**, or **Preview the email** without sending.

## Test accounts

Reading the paper needs no account. Use the built-in test readers on the setup page:

| Role | Setting | Notes |
|------|---------|-------|
| Test reader A | Lahore; prices, weather and smog; English | |
| Test reader B | Karachi; money and economy, jobs and tech; Urdu | |
| Test reader C | Rawalpindi; health, cricket; Urdu; large print | |

Test profiles only. Settings stay in the browser.

To try plans and gift emails, sign up on **Log in > Sign up** with a test name and an email you own. Plans: **Basic $3 a month** (3 gift emails a month) and **Plus $8 a month** (30 gift emails a month, 15 stories to pick from, a personal note on gifts). Checkout activates a plan for 30 days without taking a payment.

## Run locally

### Prerequisites

Python 3.11 or later. About 1.5 GB of free disk for the grouping model, downloaded on first run.

### Setup

```bash
python -m venv .venv
.venv/Scripts/activate      # Windows; on macOS or Linux: source .venv/bin/activate
pip install -r server/requirements.txt
cp .env.example .env        # then add your API key if you have one
```

### Environment variables

`GROQ_API_KEY` (optional: without it, stories show source headlines with links; get one at console.groq.com), `SUBAH_SOURCE` (`live`, `snapshot` or `fixtures`), `SUBAH_AI_BATCH`, `SUBAH_MAX_AI_CALLS`, `SUBAH_MODEL`, `SUBAH_AI`, `MONGODB_URI` and `SUBAH_DB` (accounts; without them accounts live in memory), `GMAIL_USER` and `GMAIL_APP_PASSWORD` (gift emails; a Google app password, not the account password), `SUBAH_SITE_URL`. See `.env.example`.

### Run

```bash
uvicorn server.app:app --port 8000
```

Open http://localhost:8000. Without a server, the pages in `web/` still open from disk using the bundled sample paper.

Useful tools: `python -m server.tools.check_feeds` checks every feed; `python -m server.tools.export_static` refreshes the bundled sample files.

### Run tests

```bash
bash scripts/test.sh
```

66 tests. See [docs/testing.md](docs/testing.md) and [docs/judge-checks.md](docs/judge-checks.md).

## Deploy (free, Hugging Face Spaces)

One-time setup, about 10 minutes:

1. Create a free account at huggingface.co, then **New Space**: name `subah`, SDK **Gradio**, template **Blank**, hardware **ZeroGPU (Free)** (free accounts cannot choose CPU basic for new Spaces, and Docker Spaces need PRO), visibility **Public**.
2. In the Space: **Settings > Variables and secrets > New secret**, add `GROQ_API_KEY`, `MONGODB_URI`, `GMAIL_USER` and `GMAIL_APP_PASSWORD`. They live only there. In MongoDB Atlas, **Network Access** must allow `0.0.0.0/0`, because the Space has no fixed address.
3. In your Hugging Face account: **Settings > Access Tokens > Create new token**, type **Write**. Copy it.
4. Deploy, either way:
   - **From your computer:** `HF_TOKEN=<token> HF_SPACE=<your-username>/subah bash scripts/deploy_space.sh`
   - **Automatically from GitHub:** in this repository, **Settings > Secrets and variables > Actions**: add the secret `HF_TOKEN` and the variable `HF_SPACE` = `<your-username>/subah`. Every push to `main` then deploys (`.github/workflows/deploy.yml`); you can also run it from the Actions tab.

The first start takes a few minutes (it installs packages and downloads the 1.1 GB grouping model). After a restart or a long idle, the first paper takes up to a minute while the model loads; open the site a few minutes before a demo.

## Known limitations

- **Content licensing:** Subah shows headlines, short feed descriptions and links, with credit, and never copies articles. Licences with publishers are not yet agreed; that must happen before a public launch.
- **Event rule on pre-collected data:** [insert ruling]. The app can run on live feeds, a saved snapshot or the bundled synthetic fixtures.
- Grouping was tuned on one real day of feeds and a fixed test set; ongoing stories can collect several related developments into one group.
- AI summaries use Groq (`openai/gpt-oss-120b`) on the free tier. On a real day 9 of 10 stories passed the source check in 2 calls; the free tier has per-minute token limits, so very fast repeated generations may fall back to headlines until the minute resets.
- Urdu AI output still needs review by an Urdu speaker.
- Payments are a prototype: choosing a plan activates it without charging. A payment provider (for example Stripe) is needed before launch.
- Gift emails go out from one Gmail account, which Google limits to about 500 messages a day.
- Approval note: the approved plan cut payments; plans and gift emails were added on request after approval.

## Documentation

- [Requirements](docs/requirements.md)
- [Design](docs/design.md)
- [Testing](docs/testing.md)
- [AI usage log](docs/ai-usage-log.md)
- [Judge checks](docs/judge-checks.md)

## Team

| Name | Role |
|------|------|
|      |      |
