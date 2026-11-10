"""Rule-based topic and city tags, in English and Urdu. No AI.

A story gets a tag when a keyword appears in the headline of at least one of its reports, or in the
descriptions of at least half of them. "For you" tags are the intersection of a story's tags with the
reader's chosen city and topics, so every tag can show the word that produced it.
"""
from __future__ import annotations

import re

from .textnorm import fold, normalize_digits

# id: (English label, Urdu label, English patterns, Urdu terms)
# English patterns are regexes matched case-insensitively with word boundaries, except entries starting
# with "=" which are matched case-sensitively (acronyms such as US, IT, PM).
TOPICS: dict[str, tuple[str, str, list[str], list[str]]] = {
    "prices": ("Prices", "قیمتیں",
               [r"petrol", r"diesel", r"fuel prices?", r"inflation", r"=CPI", r"prices?", r"=LPG", r"flour", r"sugar", r"ghee", r"=HSD"],
               # not "چینی": it means both "sugar" and "Chinese"
               ["پیٹرول", "ڈیزل", "مہنگائی", "قیمت", "ایل پی جی", "آٹا", "مہنگا"]),
    "energy": ("Electricity and gas", "بجلی اور گیس",
               [r"electricity", r"power tariffs?", r"=NEPRA", r"load[- ]?shedding", r"gas supply", r"fuel (?:charge|cost) adjustment", r"=FCA", r"=Discos", r"power bills?", r"electricity bills?"],
               ["بجلی", "نیپرا", "لوڈشیڈنگ", "لوڈ شیڈنگ", "گیس", "فیول ایڈجسٹمنٹ"]),
    "economy": ("Money and economy", "معیشت",
                [r"rupee", r"remittances?", r"state bank", r"=SBP", r"=IMF", r"budget", r"=PSX", r"stock exchange", r"reserves", r"exports?", r"policy rate", r"interest rate"],
                ["روپیہ", "ترسیلات", "اسٹیٹ بینک", "آئی ایم ایف", "بجٹ", "اسٹاک ایکسچینج", "زرمبادلہ"]),
    "cricket": ("Cricket", "کرکٹ",
                [r"cricket", r"=PCB", r"=PSL", r"=Test (?:series|squad|match|matches|side)", r"=ODI", r"=T20", r"pacers?", r"uncapped"],
                ["کرکٹ", "ٹیسٹ سیریز", "اسکواڈ", "پی سی بی", "پی ایس ایل"]),
    "weather": ("Weather and smog", "موسم اور سموگ",
                [r"smog", r"rain(?:fall|s)?", r"floods?", r"heatwave", r"monsoon", r"fog", r"weather", r"air quality", r"=AQI", r"climate"],
                ["سموگ", "اسموگ", "بارش", "سیلاب", "گرمی کی لہر", "دھند", "موسم", "فضائی آلودگی"]),
    "education": ("Education and exams", "تعلیم اور امتحانات",
                  [r"schools?", r"colleges?", r"universit(?:y|ies)", r"exams?", r"examinations?", r"matric", r"intermediate", r"students?", r"online classes", r"=HEC", r"=BISE"],
                  ["اسکول", "سکول", "کالج", "یونیورسٹی", "جامعہ", "امتحان", "نتائج", "میٹرک", "انٹرمیڈیٹ", "طلبہ", "کلاسیں", "تدریس"]),
    "health": ("Health", "صحت",
               [r"dengue", r"polio", r"hospitals?", r"health", r"vaccin(?:e|es|ation)", r"virus", r"patients?"],
               ["ڈینگی", "پولیو", "ہسپتال", "اسپتال", "صحت", "ویکسین", "مریض"]),
    "jobs": ("Jobs and tech", "روزگار اور ٹیکنالوجی",
             [r"jobs?", r"freelanc(?:e|er|ers|ing)", r"=IT exports", r"startups?", r"salar(?:y|ies)", r"employment", r"technology", r"internet", r"smartphones?"],
             ["فری لانس", "فری لانسرز", "نوکری", "ملازمت", "روزگار", "آئی ٹی", "ٹیکنالوجی", "انٹرنیٹ"]),
    "politics": ("Politics", "سیاست",
                 [r"assembly", r"senate", r"parliament", r"elections?", r"prime minister", r"chief minister", r"cabinet", r"supreme court", r"high court"],
                 ["اسمبلی", "سینیٹ", "پارلیمنٹ", "انتخابات", "وزیراعظم", "وزیر اعظم", "وزیراعلیٰ", "کابینہ", "عدالت"]),
    "world": ("World and Gulf", "دنیا اور خلیج",
              [r"=UAE", r"dubai", r"saudi", r"gulf", r"qatar", r"=US", r"united states", r"china", r"india", r"afghanistan", r"iran", r"visas?"],
              ["امارات", "دبئی", "سعودی", "خلیج", "قطر", "امریکہ", "چین", "بھارت", "افغانستان", "ایران", "ویزا"]),
}

CITIES: dict[str, tuple[str, str, list[str]]] = {
    "lahore": ("Lahore", "لاہور", [r"lahore"]),
    "karachi": ("Karachi", "کراچی", [r"karachi"]),
    "islamabad": ("Islamabad", "اسلام آباد", [r"islamabad"]),
    "rawalpindi": ("Rawalpindi", "راولپنڈی", [r"rawalpindi", r"pindi"]),
    "peshawar": ("Peshawar", "پشاور", [r"peshawar"]),
    "quetta": ("Quetta", "کوئٹہ", [r"quetta"]),
    "multan": ("Multan", "ملتان", [r"multan"]),
    "faisalabad": ("Faisalabad", "فیصل آباد", [r"faisalabad"]),
    "hyderabad": ("Hyderabad", "حیدرآباد", [r"hyderabad"]),
    "sialkot": ("Sialkot", "سیالکوٹ", [r"sialkot"]),
    "gujranwala": ("Gujranwala", "گوجرانوالہ", [r"gujranwala"]),
}


def _compile(patterns: list[str]) -> list[re.Pattern]:
    out = []
    for p in patterns:
        if p.startswith("="):
            out.append(re.compile(rf"(?<![A-Za-z]){p[1:]}(?![A-Za-z])"))
        else:
            out.append(re.compile(rf"(?<![A-Za-z]){p}(?![A-Za-z])", re.IGNORECASE))
    return out


_TOPIC_RX = {k: (_compile(v[2]), v[3]) for k, v in TOPICS.items()}
_CITY_RX = {k: (_compile(v[2]), [v[1]]) for k, v in CITIES.items()}


def _match(text: str, rx: list[re.Pattern], urdu_terms: list[str]) -> str | None:
    if not text:
        return None
    for r in rx:
        m = r.search(text)
        if m:
            return m.group(0)
    folded = " " + fold(text) + " "
    for term in urdu_terms:
        if fold(term) and fold(term) in folded:
            return term
    return None


def tag_text(text: str) -> tuple[dict[str, str], dict[str, str]]:
    """Topics and cities named in one piece of text, with the word that matched."""
    text = normalize_digits(text or "")
    topics = {k: t for k, (rx, ur) in _TOPIC_RX.items() if (t := _match(text, rx, ur))}
    cities = {k: t for k, (rx, ur) in _CITY_RX.items() if (t := _match(text, rx, ur))}
    return topics, cities


def tag_story(story) -> None:
    """Fill story.topics and story.cities using the headline-or-half-the-descriptions rule."""
    n = len(story.articles)
    found: dict[str, dict[str, dict]] = {"topics": {}, "cities": {}}
    for a in story.articles:
        t_title, c_title = tag_text(a.title)
        t_desc, c_desc = tag_text(a.summary)
        for kind, in_title, in_desc in (("topics", t_title, t_desc), ("cities", c_title, c_desc)):
            for key in set(in_title) | set(in_desc):
                rec = found[kind].setdefault(key, {"term": None, "titles": 0, "descs": 0})
                if key in in_title:
                    rec["titles"] += 1
                    rec["term"] = rec["term"] or in_title[key]
                if key in in_desc:
                    rec["descs"] += 1
                    rec["term"] = rec["term"] or in_desc[key]
    for kind in ("topics", "cities"):
        kept = {k: r["term"] for k, r in found[kind].items() if r["titles"] >= 1 or r["descs"] * 2 >= n}
        setattr(story, kind, kept)


def for_you(story, profile: dict) -> list[dict]:
    """Tags that match the reader's own settings, and only those."""
    tags: list[dict] = []
    city = (profile or {}).get("city")
    if city and city in story.cities:
        en, ur, _ = CITIES[city]
        tags.append({"type": "city", "id": city, "label_en": en, "label_ur": ur, "term": story.cities[city]})
    for topic in (profile or {}).get("topics", []):
        if topic in story.topics:
            en, ur, _, _ = TOPICS[topic]
            tags.append({"type": "topic", "id": topic, "label_en": en, "label_ur": ur, "term": story.topics[topic]})
    return tags


def catalog() -> dict:
    """Topics and cities for the reader settings form."""
    return {
        "topics": [{"id": k, "en": v[0], "ur": v[1]} for k, v in TOPICS.items()],
        "cities": [{"id": k, "en": v[0], "ur": v[1]} for k, v in CITIES.items()],
    }
