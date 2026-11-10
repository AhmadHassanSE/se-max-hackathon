"""Write the static files the web pages use when the API is not reachable (for example when opened from disk):
web/assets/data/catalog.json, outlets.json and sample-edition.json (built from the synthetic fixture feeds,
with no AI, so its stories show source headlines and links).

Run from the repository root:  python -m server.tools.export_static
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from server.app import get_catalog, outlets
from server.subah.edition import build_edition

OUT = Path(__file__).resolve().parents[2] / "web" / "assets" / "data"
SAMPLE_PROFILE = {"city": "lahore", "topics": ["prices", "weather"], "lang": "en"}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    os.environ["SUBAH_AI"] = "off"
    (OUT / "catalog.json").write_text(json.dumps(get_catalog(), ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "outlets.json").write_text(json.dumps(outlets(), ensure_ascii=False, indent=1), encoding="utf-8")
    ed = build_edition(SAMPLE_PROFILE, source="fixtures", cache_path=None)
    ed["sample"] = True
    (OUT / "sample-edition.json").write_text(json.dumps(ed, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote catalog, outlets and a {len(ed['stories'])}-story sample edition to {OUT}")


if __name__ == "__main__":
    main()
