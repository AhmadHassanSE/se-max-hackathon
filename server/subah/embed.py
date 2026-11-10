"""Sentence embeddings for grouping. Runs locally, so grouping never spends AI quota and works when the AI is down.

Default: a multilingual model (paraphrase-multilingual-MiniLM-L12-v2 through fastembed/ONNX), which places an
English headline and its Urdu equivalent close together. If the model cannot load, a lexical fallback keeps the
pipeline running; it groups same-language duplicates only, and the edition report says so.
"""
from __future__ import annotations

import hashlib
import os
import re

import numpy as np

from .textnorm import fold

MULTILINGUAL_MODEL = os.environ.get("SUBAH_EMBED_MODEL", "sentence-transformers/paraphrase-multilingual-mpnet-base-v2")
_CACHE_MAX = 20000


class Embedder:
    name = "base"
    cross_language = False

    def embed(self, texts: list[str]) -> np.ndarray:
        raise NotImplementedError


class MultilingualEmbedder(Embedder):
    cross_language = True

    def __init__(self, model_name: str = MULTILINGUAL_MODEL):
        from fastembed import TextEmbedding

        cache = os.environ.get("SUBAH_MODEL_CACHE")
        kwargs = {"cache_dir": cache} if cache else {}
        self._model = TextEmbedding(model_name=model_name, **kwargs)
        self.name = model_name
        self._cache: dict[str, np.ndarray] = {}  # a regenerated paper only embeds reports it has not seen

    def embed(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, 768), dtype=np.float32)
        missing = list(dict.fromkeys(t for t in texts if t not in self._cache))
        if missing:
            if len(self._cache) + len(missing) > _CACHE_MAX:
                self._cache.clear()
            for t, v in zip(missing, self._model.embed(missing)):
                v = np.asarray(v, dtype=np.float32)
                self._cache[t] = v / max(float(np.linalg.norm(v)), 1e-9)
        return np.stack([self._cache[t] for t in texts])


class LexicalEmbedder(Embedder):
    """Hashed word and character n-grams. Deterministic, dependency-free, same-language only."""

    name = "lexical-fallback"
    cross_language = False

    def __init__(self, dims: int = 4096):
        self.dims = dims

    def _features(self, text: str) -> list[str]:
        words = [w for w in fold(text).split() if len(w) > 2]
        feats = [f"w:{w}" for w in words]
        feats += [f"b:{a}_{b}" for a, b in zip(words, words[1:])]
        joined = " ".join(words)
        feats += [f"c:{joined[i:i + 4]}" for i in range(max(0, len(joined) - 3))]
        feats += [f"n:{n}" for n in re.findall(r"\d+", joined)]
        return feats

    def embed(self, texts: list[str]) -> np.ndarray:
        out = np.zeros((len(texts), self.dims), dtype=np.float32)
        for i, t in enumerate(texts):
            for f in self._features(t):
                h = int(hashlib.md5(f.encode("utf-8")).hexdigest(), 16)
                weight = 2.0 if f.startswith(("w:", "n:")) else 1.0
                out[i, h % self.dims] += weight
        norms = np.linalg.norm(out, axis=1, keepdims=True)
        return out / np.maximum(norms, 1e-9)


_cached: Embedder | None = None
_load_error: str | None = None


def get_embedder() -> Embedder:
    """The multilingual model when available, otherwise the lexical fallback. Loaded once per process."""
    global _cached, _load_error
    if _cached is not None:
        return _cached
    if os.environ.get("SUBAH_EMBEDDER") == "lexical":
        _cached = LexicalEmbedder()
        return _cached
    try:
        _cached = MultilingualEmbedder()
    except Exception as exc:  # model download blocked, onnxruntime missing, etc.
        _load_error = f"{type(exc).__name__}: {exc}"[:300]
        _cached = LexicalEmbedder()
    return _cached


def embedder_status() -> dict:
    e = get_embedder()
    return {"name": e.name, "cross_language": e.cross_language, "load_error": _load_error}
