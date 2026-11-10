"""Reader accounts: sign up, log in, sessions, plans and the gift log.

Storage is MongoDB when MONGODB_URI is set, otherwise an in-memory store (for tests and local runs; it forgets
everything on restart). Passwords are hashed with scrypt; sessions are random tokens of which only a SHA-256 hash
is stored, sent to the browser in an HttpOnly cookie.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import re
import secrets
import threading
import time
from copy import deepcopy
from datetime import datetime, timedelta, timezone

SESSION_DAYS = 30
EMAIL_RE = re.compile(r"^[^@\s<>\"']{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$")

PLANS = {
    "basic": {
        "id": "basic", "name": "Basic", "price_usd": 3, "period": "month",
        "gifts_per_month": 3, "stories": 12,
        "features": [
            "Your own paper every morning, in English or Urdu",
            "Large print and read-aloud",
            "Send a gift paper by email to 3 people a month",
            "Your settings saved to your account",
        ],
    },
    "plus": {
        "id": "plus", "name": "Plus", "price_usd": 8, "period": "month",
        "gifts_per_month": 30, "stories": 15,
        "features": [
            "Everything in Basic",
            "15 stories to pick from each morning, instead of 12",
            "Send gift papers by email to 30 people a month",
            "A personal note printed on every gift paper",
        ],
    },
}


class AccountError(Exception):
    """A problem the reader can fix: shown to them as is."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


# ---------------------------------------------------------------- passwords and tokens

def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)
    return f"scrypt$16384$8$1${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, n, r, p, salt, want = stored.split("$")
        got = hashlib.scrypt(password.encode("utf-8"), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p), dklen=32)
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(got.hex(), want)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def now() -> datetime:
    return datetime.now(timezone.utc)


def clean_email(email: str) -> str:
    email = (email or "").strip().lower()
    if not EMAIL_RE.match(email):
        raise AccountError("Enter a valid email address.")
    return email


def check_password_rules(password: str) -> None:
    if len(password or "") < 8:
        raise AccountError("Use at least 8 characters for your password.")
    if len(password) > 200:
        raise AccountError("That password is too long.")


# ---------------------------------------------------------------- stores

class MemoryStore:
    kind = "memory"

    def __init__(self):
        self.users: dict[str, dict] = {}
        self.sessions: dict[str, dict] = {}
        self.gifts: list[dict] = []
        self._lock = threading.Lock()

    def status(self) -> dict:
        return {"store": self.kind, "ok": True, "note": "accounts are kept in memory and forgotten on restart"}

    def insert_user(self, user: dict) -> dict:
        with self._lock:
            if any(u["email"] == user["email"] for u in self.users.values()):
                raise AccountError("An account with this email already exists. Log in instead.", 409)
            user = dict(user, _id=secrets.token_hex(12))
            self.users[user["_id"]] = user
            return deepcopy(user)

    def user_by_email(self, email: str) -> dict | None:
        return deepcopy(next((u for u in self.users.values() if u["email"] == email), None))

    def user_by_id(self, uid: str) -> dict | None:
        return deepcopy(self.users.get(uid))

    def update_user(self, uid: str, patch: dict) -> None:
        with self._lock:
            if uid in self.users:
                self.users[uid].update(deepcopy(patch))

    def insert_session(self, s: dict) -> None:
        self.sessions[s["token_hash"]] = dict(s)

    def session(self, th: str) -> dict | None:
        return dict(self.sessions[th]) if th in self.sessions else None

    def delete_session(self, th: str) -> None:
        self.sessions.pop(th, None)

    def log_gift(self, g: dict) -> None:
        self.gifts.append(dict(g))

    def count_gifts(self, uid: str, since: datetime) -> int:
        return sum(1 for g in self.gifts if g["user_id"] == uid and g["sent_at"] >= since)


class MongoStore:
    kind = "mongodb"

    def __init__(self, uri: str, db_name: str = "subah"):
        from pymongo import ASCENDING, MongoClient
        self.client = MongoClient(uri, serverSelectionTimeoutMS=6000, connectTimeoutMS=6000, tz_aware=True)
        self.db = self.client[db_name]
        self._indexed = False
        self._ascending = ASCENDING
        self._error: str | None = None

    def _ready(self):
        if not self._indexed:
            try:
                self.db.users.create_index("email", unique=True)
                self.db.sessions.create_index("token_hash", unique=True)
                self.db.sessions.create_index("expires_at", expireAfterSeconds=0)
                self.db.gifts.create_index([("user_id", self._ascending), ("sent_at", self._ascending)])
                self._indexed = True
                self._error = None
            except Exception as exc:
                self._error = describe_db_error(exc)
                raise AccountError("Accounts are unavailable right now. Try again in a minute.", 503) from exc
        return self.db

    def status(self) -> dict:
        cached = getattr(self, "_status", None)
        if cached and time.time() - cached[0] < 60:
            return cached[1]
        try:
            self._ready()
            self.client.admin.command("ping")
            out = {"store": self.kind, "ok": True, "note": "ok"}
        except Exception as exc:
            out = {"store": self.kind, "ok": False, "note": self._error or describe_db_error(exc)}
        self._status = (time.time(), out)
        return out

    def _call(self, fn):
        db = self._ready()
        try:
            return fn(db)
        except AccountError:
            raise
        except Exception as exc:
            from pymongo.errors import DuplicateKeyError
            if isinstance(exc, DuplicateKeyError):
                raise AccountError("An account with this email already exists. Log in instead.", 409) from exc
            self._error = describe_db_error(exc)
            raise AccountError("Accounts are unavailable right now. Try again in a minute.", 503) from exc

    @staticmethod
    def _out(doc):
        if doc is None:
            return None
        doc = dict(doc)
        doc["_id"] = str(doc["_id"])
        return doc

    def insert_user(self, user: dict) -> dict:
        def go(db):
            doc = dict(user, _id=secrets.token_hex(12))
            db.users.insert_one(doc)
            return self._out(doc)
        return self._call(go)

    def user_by_email(self, email: str) -> dict | None:
        return self._call(lambda db: self._out(db.users.find_one({"email": email})))

    def user_by_id(self, uid: str) -> dict | None:
        return self._call(lambda db: self._out(db.users.find_one({"_id": uid})))

    def update_user(self, uid: str, patch: dict) -> None:
        self._call(lambda db: db.users.update_one({"_id": uid}, {"$set": patch}))

    def insert_session(self, s: dict) -> None:
        self._call(lambda db: db.sessions.insert_one(dict(s)))

    def session(self, th: str) -> dict | None:
        return self._call(lambda db: db.sessions.find_one({"token_hash": th}, {"_id": 0}))

    def delete_session(self, th: str) -> None:
        self._call(lambda db: db.sessions.delete_one({"token_hash": th}))

    def log_gift(self, g: dict) -> None:
        self._call(lambda db: db.gifts.insert_one(dict(g)))

    def count_gifts(self, uid: str, since: datetime) -> int:
        return self._call(lambda db: db.gifts.count_documents({"user_id": uid, "sent_at": {"$gte": since}}))


def describe_db_error(exc: Exception) -> str:
    text = str(exc)
    if "bad auth" in text or "Authentication failed" in text:
        return "MongoDB refused the username or password in MONGODB_URI"
    if "timed out" in text.lower() or "ServerSelectionTimeout" in type(exc).__name__:
        return "MongoDB could not be reached (check Network Access allows this server)"
    return f"MongoDB error: {type(exc).__name__}"


_store = None
_store_lock = threading.Lock()


def get_store():
    global _store
    with _store_lock:
        if _store is None:
            uri = os.environ.get("MONGODB_URI", "").strip()
            _store = MongoStore(uri, os.environ.get("SUBAH_DB", "subah")) if uri else MemoryStore()
        return _store


def set_store(store) -> None:
    """For tests."""
    global _store
    _store = store


# ---------------------------------------------------------------- account actions

def public_user(user: dict, store=None) -> dict:
    store = store or get_store()
    plan = active_plan(user)
    used = store.count_gifts(user["_id"], month_start()) if plan else 0
    return {
        "id": user["_id"], "name": user.get("name", ""), "email": user["email"],
        "created_at": iso(user.get("created_at")),
        "plan": ({"id": plan["id"], "name": plan["name"], "price_usd": plan["price_usd"],
                  "renews_at": iso(user["subscription"].get("renews_at")), "demo": user["subscription"].get("demo", True),
                  "gifts_per_month": plan["gifts_per_month"], "gifts_used": used,
                  "gifts_left": max(0, plan["gifts_per_month"] - used)} if plan else None),
        "profile": user.get("profile") or {},
    }


def iso(v):
    return v.isoformat() if isinstance(v, datetime) else v


def month_start() -> datetime:
    n = now()
    return n.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def active_plan(user: dict) -> dict | None:
    sub = user.get("subscription") or {}
    if sub.get("status") != "active":
        return None
    renews = sub.get("renews_at")
    if isinstance(renews, datetime) and renews.tzinfo is None:
        renews = renews.replace(tzinfo=timezone.utc)
    if isinstance(renews, datetime) and renews < now():
        return None
    return PLANS.get(sub.get("plan"))


def signup(name: str, email: str, password: str, store=None) -> dict:
    store = store or get_store()
    name = re.sub(r"[<>]", "", (name or "").strip())[:40]
    if not name:
        raise AccountError("Tell us your name.")
    email = clean_email(email)
    check_password_rules(password)
    return store.insert_user({"name": name, "email": email, "password": hash_password(password),
                              "created_at": now(), "subscription": None, "profile": {}})


_fails: dict[str, list[float]] = {}


def login(email: str, password: str, store=None) -> dict:
    store = store or get_store()
    email = (email or "").strip().lower()
    recent = [t for t in _fails.get(email, []) if time.time() - t < 900]
    if len(recent) >= 6:
        raise AccountError("Too many wrong passwords. Wait 15 minutes and try again.", 429)
    user = store.user_by_email(email) if EMAIL_RE.match(email) else None
    if not user or not verify_password(password or "", user["password"]):
        _fails[email] = recent + [time.time()]
        raise AccountError("That email and password do not match.", 401)
    _fails.pop(email, None)
    return user


def start_session(user: dict, store=None) -> str:
    store = store or get_store()
    token = secrets.token_urlsafe(32)
    store.insert_session({"token_hash": token_hash(token), "user_id": user["_id"], "created_at": now(),
                          "expires_at": now() + timedelta(days=SESSION_DAYS)})
    return token


def user_for_token(token: str | None, store=None) -> dict | None:
    if not token:
        return None
    store = store or get_store()
    s = store.session(token_hash(token))
    if not s:
        return None
    exp = s["expires_at"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now():
        store.delete_session(token_hash(token))
        return None
    return store.user_by_id(s["user_id"])


def end_session(token: str | None, store=None) -> None:
    if token:
        (store or get_store()).delete_session(token_hash(token))


def subscribe(user: dict, plan_id: str, store=None) -> dict:
    """Prototype checkout: activates the plan for 30 days without taking a payment."""
    store = store or get_store()
    if plan_id not in PLANS:
        raise AccountError("Choose Basic or Plus.")
    sub = {"plan": plan_id, "status": "active", "started_at": now(), "renews_at": now() + timedelta(days=30),
           "demo": True, "price_usd": PLANS[plan_id]["price_usd"]}
    store.update_user(user["_id"], {"subscription": sub})
    return store.user_by_id(user["_id"])


def cancel(user: dict, store=None) -> dict:
    store = store or get_store()
    sub = dict(user.get("subscription") or {}, status="cancelled", cancelled_at=now())
    store.update_user(user["_id"], {"subscription": sub})
    return store.user_by_id(user["_id"])


def save_profile(user: dict, profile: dict, store=None) -> dict:
    store = store or get_store()
    store.update_user(user["_id"], {"profile": profile})
    return store.user_by_id(user["_id"])
