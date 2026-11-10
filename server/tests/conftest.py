import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from server.subah import feeds  # noqa: E402

FIXTURES = Path(__file__).resolve().parent / "fixtures"


@pytest.fixture(scope="session")
def outlets():
    return feeds.load_outlets()


@pytest.fixture(scope="session")
def collection(outlets):
    return feeds.collect_snapshot(FIXTURES / "snapshot", outlets, source="fixtures")


@pytest.fixture(scope="session")
def expected_groups():
    return json.loads((FIXTURES / "expected_groups.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def embedder():
    from server.subah.embed import get_embedder

    return get_embedder()
