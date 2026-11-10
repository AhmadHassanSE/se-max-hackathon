#!/usr/bin/env bash
# Deploy the app to a free Hugging Face Space (Gradio SDK on ZeroGPU, the only free hardware for new Spaces).
# The Space runs app.py: the site and API at the root, plus a small Gradio check page at /gradio.
# Usage:  HF_TOKEN=<write token> HF_SPACE=<username>/<space> bash scripts/deploy_space.sh
# The Groq key is never sent from here: set GROQ_API_KEY as a secret in the Space's settings.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${HF_TOKEN:?set HF_TOKEN to a Hugging Face access token with write permission}"
: "${HF_SPACE:?set HF_SPACE to your Space id, for example your-username/subah}"
REPO_URL="${REPO_URL:-https://github.com/AhmadHassanSE/se-max-hackathon}"

OUT="$(mktemp -d)"
cp -r server web "$OUT/"
rm -rf "$OUT/server/data/snapshots" "$OUT/server/data/cache" "$OUT/server/data/editions"
find "$OUT" -name "__pycache__" -type d -prune -exec rm -r {} +
grep -v '^pytest' server/requirements.txt > "$OUT/requirements.txt"

cat > "$OUT/app.py" <<'EOF'
"""Hugging Face runs this file. The real entry point is server/space_app.py."""
import os

import uvicorn

from server.space_app import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "7860")))
EOF

cat > "$OUT/README.md" <<EOF
---
title: Subah
emoji: 🌅
colorFrom: yellow
colorTo: indigo
sdk: gradio
sdk_version: 6.18.0
python_version: "3.11"
app_file: app.py
pinned: false
---

Subah, a morning paper that ends. Source code and documentation: ${REPO_URL}
EOF

cd "$OUT"
git init -q -b main
git config user.name "subah-deploy"
git config user.email "subah-deploy@users.noreply.github.com"
git add -A
git commit -q -m "Deploy $(date -u +%Y-%m-%dT%H:%MZ)"
# --force rewrites only the Space's own deploy copy on Hugging Face, never the GitHub repository
git push --force -q "https://user:${HF_TOKEN}@huggingface.co/spaces/${HF_SPACE}" main
echo "Pushed. The Space builds now: https://huggingface.co/spaces/${HF_SPACE}"
