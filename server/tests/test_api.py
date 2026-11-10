"""API: generate-now action, validation, and that no secret reaches the browser."""
import json

from fastapi.testclient import TestClient

from server.app import app

client = TestClient(app)


def test_health_has_no_secrets(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_not_a_real_key")
    body = client.get("/api/health").text
    assert "gsk_test" not in body
    assert json.loads(body)["ai"]["enabled"] is True


def test_outlet_list_is_published():
    data = client.get("/api/outlets").json()
    assert len(data["outlets"]) >= 15
    assert all(f["url"].startswith("https://") for o in data["outlets"] for f in o["feeds"])
    assert "outlet" in data["definition"].lower()


def test_generate_now_from_fixtures(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    r = client.post("/api/generate", json={"profile": {"city": "lahore", "topics": ["weather"], "lang": "ur"}, "source": "fixtures"})
    assert r.status_code == 200
    ed = r.json()
    assert ed["source"] == "fixtures" and len(ed["stories"]) == 10
    assert client.get("/api/edition/latest").json()["edition_id"] == ed["edition_id"]


def test_bad_profile_is_rejected():
    r = client.post("/api/generate", json={"profile": {"city": "atlantis"}, "source": "fixtures"})
    assert r.status_code == 422
    r = client.post("/api/generate", json={"profile": {"topics": ["a", "b", "c", "d", "e", "f"]}, "source": "fixtures"})
    assert r.status_code == 422


def test_server_files_are_not_served():
    assert client.get("/server/app.py").status_code == 404
    assert client.get("/.env").status_code == 404
    assert client.get("/index.html").status_code == 200


def test_candidate_pool_for_picking(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    r = client.post("/api/generate", json={"profile": {"city": "lahore"}, "source": "fixtures", "pool": 12})
    assert r.status_code == 200 and len(r.json()["stories"]) == 12
    assert [s["rank"] for s in r.json()["stories"]] == list(range(1, 13))
    assert client.post("/api/generate", json={"source": "fixtures", "pool": 40}).status_code == 422


def test_generate_stream_reports_progress_then_edition(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    r = client.post("/api/generate/stream", json={"profile": {"city": "lahore"}, "source": "fixtures", "pool": 12})
    assert r.status_code == 200
    events = [json.loads(line) for line in r.text.splitlines() if line.strip()]
    kinds = [e["type"] for e in events]
    assert kinds.count("feed") == 20  # one per feed in the fixture manifest, good or bad
    assert {"collected", "grouped", "ranked", "summarised"} <= set(kinds)
    assert kinds[-1] == "edition" and len(events[-1]["edition"]["stories"]) == 12
    statuses = {e["status"] for e in events if e["type"] == "feed"}
    assert {"ok", "malformed", "empty", "error"} <= statuses


def test_generate_stream_bad_profile_is_an_error_event():
    r = client.post("/api/generate/stream", json={"profile": {"city": "atlantis"}, "source": "fixtures"})
    events = [json.loads(line) for line in r.text.splitlines() if line.strip()]
    assert events[-1]["type"] == "error"
