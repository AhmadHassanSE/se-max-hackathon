"""Accounts, plans and gift papers by email. Uses the in-memory store and a fake Gmail; nothing leaves the machine."""
import pytest
from fastapi.testclient import TestClient

from server import app as app_module
from server.subah import accounts, mailer
from server.subah.edition import build_edition

H = {"X-Subah": "1"}


@pytest.fixture()
def client(monkeypatch, collection):
    accounts.set_store(accounts.MemoryStore())
    accounts._fails.clear()
    ed = build_edition({}, collection=collection, cache_path=None, pool=12)
    monkeypatch.setattr(app_module, "load_latest", lambda: ed)
    sent = []
    monkeypatch.setattr(mailer, "send", lambda *a, **k: sent.append((a, k)))
    c = TestClient(app_module.app, base_url="https://testserver")
    c.sent = sent
    yield c
    accounts.set_store(None)


def signup(c, email="test.a@example.com", password="test-pass-1"):
    return c.post("/api/auth/signup", json={"name": "Test A", "email": email, "password": password}, headers=H)


def test_password_is_hashed_and_checked():
    h = accounts.hash_password("test-pass-1")
    assert "test-pass-1" not in h and h.startswith("scrypt$")
    assert accounts.verify_password("test-pass-1", h)
    assert not accounts.verify_password("test-pass-2", h)


def test_signup_sets_a_session_cookie_and_me_works(client):
    r = signup(client)
    assert r.status_code == 200, r.text
    assert r.json()["user"]["email"] == "test.a@example.com" and r.json()["user"]["plan"] is None
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "secure" in cookie
    assert "password" not in r.text
    assert client.get("/api/auth/me").json()["user"]["name"] == "Test A"


def test_signup_rules(client):
    assert signup(client, email="not-an-email").status_code == 400
    assert signup(client, password="short").status_code == 400
    assert signup(client).status_code == 200
    assert signup(client).status_code == 409  # same email again


def test_login_logout_and_wrong_password(client):
    signup(client)
    client.post("/api/auth/logout", headers=H)
    assert client.get("/api/auth/me").json()["user"] is None
    bad = client.post("/api/auth/login", json={"email": "test.a@example.com", "password": "wrong-pass"}, headers=H)
    assert bad.status_code == 401
    ok = client.post("/api/auth/login", json={"email": "TEST.A@example.com ", "password": "test-pass-1"}, headers=H)
    assert ok.status_code == 200
    assert client.get("/api/auth/me").json()["user"]["email"] == "test.a@example.com"


def test_repeated_wrong_passwords_are_slowed_down(client):
    signup(client)
    for _ in range(6):
        client.post("/api/auth/login", json={"email": "test.a@example.com", "password": "wrong-pass"}, headers=H)
    r = client.post("/api/auth/login", json={"email": "test.a@example.com", "password": "test-pass-1"}, headers=H)
    assert r.status_code == 429


def test_state_changing_calls_need_the_header(client):
    r = client.post("/api/auth/signup", json={"name": "Test A", "email": "test.a@example.com", "password": "test-pass-1"})
    assert r.status_code == 403


def test_plans_are_three_and_eight_dollars(client):
    plans = {p["id"]: p for p in client.get("/api/plans").json()["plans"]}
    assert plans["basic"]["price_usd"] == 3 and plans["plus"]["price_usd"] == 8


def test_subscribe_needs_login_then_activates(client):
    assert client.post("/api/subscribe", json={"plan": "plus"}, headers=H).status_code == 401
    signup(client)
    u = client.post("/api/subscribe", json={"plan": "plus"}, headers=H).json()["user"]
    assert u["plan"]["id"] == "plus" and u["plan"]["gifts_left"] == 30 and u["plan"]["demo"] is True
    u = client.post("/api/subscribe/cancel", headers=H).json()["user"]
    assert u["plan"] is None


GIFT = {"recipient_name": "Ammi", "recipient_email": "test.parent@example.com", "city": "lahore",
        "topics": ["prices", "weather"], "lang": "ur", "large": True, "from_name": "Test A", "note": "Test note"}


def test_gift_needs_login_and_plan(client, monkeypatch):
    monkeypatch.setenv("GMAIL_USER", "test@example.com")
    monkeypatch.setenv("GMAIL_APP_PASSWORD", "test test test test")
    assert client.post("/api/gift/send", json=GIFT, headers=H).status_code == 401
    signup(client)
    assert client.post("/api/gift/send", json=GIFT, headers=H).status_code == 402
    assert client.sent == []


def test_gift_is_sent_and_counted(client, monkeypatch):
    monkeypatch.setenv("GMAIL_USER", "test@example.com")
    monkeypatch.setenv("GMAIL_APP_PASSWORD", "test test test test")
    signup(client)
    client.post("/api/subscribe", json={"plan": "basic"}, headers=H)
    r = client.post("/api/gift/send", json=GIFT, headers=H)
    assert r.status_code == 200, r.text
    assert r.json()["user"]["plan"]["gifts_left"] == 2
    (to, subject, html, text, from_name), kw = client.sent[0]
    assert to == "test.parent@example.com" and kw["reply_to"] == "test.a@example.com"
    assert 'dir="rtl"' in html and "Test note" not in html  # the note is a Plus feature
    assert "http" in text
    for _ in range(2):
        client.post("/api/gift/send", json=GIFT, headers=H)
    over = client.post("/api/gift/send", json=GIFT, headers=H)
    assert over.status_code == 429 and len(client.sent) == 3


def test_gift_without_gmail_says_so(client):
    signup(client)
    client.post("/api/subscribe", json={"plan": "plus"}, headers=H)
    r = client.post("/api/gift/send", json=GIFT, headers=H)
    assert r.status_code == 503 and "GMAIL_USER" in r.json()["detail"]
    assert client.sent == []


def test_email_is_built_from_checked_text_with_links(client, collection):
    ed = build_edition({}, collection=collection, cache_path=None, pool=12)
    subject, html, text = mailer.render_gift(ed, dict(GIFT, lang="en", note="Test note <b>hi</b>"))
    assert "Ammi" in subject and "Test A" in subject
    assert "&lt;b&gt;hi" in html and "<b>hi" not in html  # escaped
    picks = mailer.for_recipient(ed, "lahore", ["prices", "weather"])
    for p in picks:
        for src in p["story"]["sources"][:6]:
            assert src["link"] in html
    # the recipient's city and topics move stories up, by the published formula
    scores = [p["story"]["outlet_count"] + (2 if any(t["type"] == "city" for t in p["tags"]) else 0)
              + min(2, sum(t["type"] == "topic" for t in p["tags"])) for p in picks]
    assert scores == sorted(scores, reverse=True)


def test_preview_needs_no_account(client):
    r = client.post("/api/gift/preview", json=GIFT)
    assert r.status_code == 200 and "<html" in r.json()["html"]
    assert client.sent == []


def test_unreachable_database_reports_instead_of_crashing(monkeypatch):
    """An srv:// address that cannot be looked up must not crash /api/health or sign-up."""
    accounts.set_store(accounts.MongoStore("mongodb+srv://test:test@nonexistent-cluster.invalid/"))
    try:
        c = TestClient(app_module.app)
        h = c.get("/api/health")
        assert h.status_code == 200
        assert h.json()["accounts"]["ok"] is False and h.json()["accounts"]["note"]
        r = c.post("/api/auth/signup", json={"name": "Test A", "email": "test.a@example.com", "password": "test-pass-1"}, headers=H)
        assert r.status_code == 503
    finally:
        accounts.set_store(None)
