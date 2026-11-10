#!/usr/bin/env bash
# Deploy the app to a Hugging Face Space (Docker SDK).
# Usage:  HF_TOKEN=<write token> HF_SPACE=<username>/<space> bash scripts/deploy_space.sh
# The Groq key is never sent from here: set GROQ_API_KEY as a secret in the Space's settings.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${HF_TOKEN:?set HF_TOKEN to a Hugging Face access token with write permission}"
: "${HF_SPACE:?set HF_SPACE to your Space id, for example your-username/subah}"
REPO_URL="${REPO_URL:-https://github.com/AhmadHassanSE/se-max-hackathon}"

OUT="$(mktemp -d)"
cp -r server web Dockerfile .dockerignore "$OUT/"
rm -rf "$OUT/server/data/snapshots" "$OUT/server/data/cache" "$OUT/server/data/editions"
find "$OUT" -name "__pycache__" -type d -prune -exec rm -r {} +

cat > "$OUT/README.md" <<EOF
---
title: Subah
emoji: 🌅
colorFrom: yellow
colorTo: indigo
sdk: docker
app_port: 7860
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
