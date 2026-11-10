"""API: generate-now action, validation, and that no secret reaches the browser."""
import json

from fastapi.testclient import TestClient

from server.app import app

client = TestClient(app)


def test_health_has_no_secrets(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-not-a-real-key")
    body = client.get("/api/health").text
    assert "sk-test" not in body
    assert json.loads(body)["ai"]["enabled"] is True


def test_outlet_list_is_published():
    data = client.get("/api/outlets").json()
    assert len(data["outlets"]) >= 15
    assert all(f["url"].startswith("https://") for o in data["outlets"] for f in o["feeds"])
    assert "outlet" in data["definition"].lower()


def test_generate_now_from_fixtures(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
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
