#!/usr/bin/env bash
# Installs the backend dependencies and runs the test suite. Used by .github/workflows/ci.yml.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m pip install --quiet -r server/requirements.txt
# No API key in CI: the tests use fake AI clients, and the "no key" path is itself tested.
unset GROQ_API_KEY || true
export SUBAH_WARMUP=off
python3 -m pytest server/tests -q
