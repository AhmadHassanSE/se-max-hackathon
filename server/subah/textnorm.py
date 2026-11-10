"""Small text helpers shared by feeds, tags and the grounding check."""
from __future__ import annotations

import html
import re
import unicodedata

# Urdu (Extended Arabic-Indic) and Arabic-Indic digits to ASCII.
_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")
_ARABIC_SCRIPT = re.compile(r"[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]")
_LATIN = re.compile(r"[A-Za-z]")


def clean_text(value: object, limit: int = 600) -> str:
    """Strip HTML, decode entities, normalise Unicode and whitespace, cut at a word boundary."""
    if value is None:
        return ""
    text = str(value)
    text = html.unescape(text)
    text = _TAG.sub(" ", text)
    text = html.unescape(text)  # entities that were double-escaped inside tags
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("‌", " ").replace("‏", "").replace("‎", "")
    text = _WS.sub(" ", text).strip()
    if len(text) > limit:
        cut = text[:limit]
        space = cut.rfind(" ")
        text = (cut[:space] if space > limit * 0.6 else cut).rstrip(" ,;:") + "…"
    return text


def normalize_digits(text: str) -> str:
    return (text or "").translate(_DIGITS)


def is_urdu(text: str) -> bool:
    """True when most letters are in Arabic script."""
    if not text:
        return False
    arabic = len(_ARABIC_SCRIPT.findall(text))
    latin = len(_LATIN.findall(text))
    return arabic > 0 and arabic >= latin


def fold(text: str) -> str:
    """Lowercase, ASCII digits, punctuation to spaces: the form used for matching."""
    text = normalize_digits(unicodedata.normalize("NFKC", text or "")).lower()
    text = text.replace("’", "'").replace("‘", "'")
    text = re.sub(r"[^\w؀-ۿ']+", " ", text)
    return _WS.sub(" ", text).strip()
