# Subah on Hugging Face Spaces (Docker SDK), or any host that runs a container.
# The grouping model (about 1.1 GB) is downloaded at build time so the app starts without it.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HUB_DISABLE_SYMLINKS_WARNING=1 \
    SUBAH_MODEL_CACHE=/app/models \
    SUBAH_SOURCE=live \
    PORT=7860

# Spaces run the container as user 1000
RUN useradd -m -u 1000 user
WORKDIR /app

COPY server/requirements.txt server/requirements.txt
RUN pip install -r server/requirements.txt

# bake the multilingual model into the image
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='sentence-transformers/paraphrase-multilingual-mpnet-base-v2', cache_dir='/app/models')"

COPY server server
COPY web web
RUN mkdir -p server/data && chown -R user:user /app

USER user
EXPOSE 7860
CMD ["sh", "-c", "uvicorn server.app:app --host 0.0.0.0 --port ${PORT:-7860}"]
