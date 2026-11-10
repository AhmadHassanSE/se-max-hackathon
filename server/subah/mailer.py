"""Gift papers by email, sent through Gmail.

The paper is rebuilt for the recipient from today's edition: the same stories and the same published formula
(outlets reporting + 2 for their city + 1 per matching topic, at most 2), re-scored for their city and topics.
Nothing new is written for the email: headlines and summaries are the ones that passed the source check, and
stories without one quote the outlet's own words with a credit and a link, as on the site.

Sending needs GMAIL_USER (the Gmail address) and GMAIL_APP_PASSWORD (a 16-character Google app password, not the
account password). Without them the endpoint says email is not set up and sends nothing.
"""
from __future__ import annotations

import os
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from email.utils import formataddr
from html import escape

SITE_URL = os.environ.get("SUBAH_SITE_URL", "https://ranaahmad3048-subah.hf.space").rstrip("/")
PKT = timezone(timedelta(hours=5))
UR_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
UR_MONTHS = ["جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون", "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر"]
UR_DAYS = ["پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ", "اتوار"]
URDU_FONT = "'Noto Nastaliq Urdu','Jameel Noori Nastaleeq','Urdu Typesetting',serif"
READ_FONT = "Georgia,'Times New Roman',serif"


def mail_configured() -> tuple[bool, str]:
    if not os.environ.get("GMAIL_USER"):
        return False, "GMAIL_USER is not set"
    if not os.environ.get("GMAIL_APP_PASSWORD"):
        return False, "GMAIL_APP_PASSWORD is not set"
    return True, "ok"


def today(lang: str, when: datetime | None = None) -> str:
    d = (when or datetime.now(timezone.utc)).astimezone(PKT)
    if lang == "ur":
        return f"{UR_DAYS[d.weekday()]}، {str(d.day).translate(UR_DIGITS)} {UR_MONTHS[d.month - 1]} {str(d.year).translate(UR_DIGITS)}"
    return d.strftime("%A %d %B %Y").replace(" 0", " ")


def for_recipient(edition: dict, city: str | None, topics: list[str], limit: int = 5) -> list[dict]:
    """Today's stories re-scored for the recipient with the published formula, best first."""
    scored = []
    for st in edition.get("stories", []):
        tags = []
        c = next((x for x in st.get("cities", []) if x["id"] == city), None) if city else None
        if c:
            tags.append({"type": "city", **c})
        tags += [{"type": "topic", **t} for t in st.get("topics", []) if t["id"] in topics]
        bonus = (2 if c else 0) + min(2, sum(1 for t in tags if t["type"] == "topic"))
        scored.append((st["outlet_count"] + bonus, -st.get("rank", 0), st, tags))
    scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
    return [{"story": st, "tags": tags} for _, _, st, tags in scored[:limit]]


def story_text(st: dict, lang: str) -> dict:
    """Headline and body for one story: the checked summary, else the outlet's own words, credited."""
    if st.get("summary"):
        s = st["summary"][lang]
        return {"headline": s["headline"], "text": s["text"], "credit": None, "lang": lang}
    b = (st.get("brief") or {})
    own = b.get(lang) or b.get("en") or b.get("ur")
    head = st["headline"].get(lang) or st["headline"]["en"]
    if own:
        return {"headline": head, "text": own["text"], "credit": {"outlet": own["outlet"], "link": own["link"]},
                "lang": own.get("lang", lang)}
    return {"headline": head, "text": "", "credit": None, "lang": lang}


def is_urdu(text: str) -> bool:
    return any("؀" <= ch <= "ۿ" for ch in text or "")


L = {
    "en": {"gift": "A gift paper", "love": "With love, {f}", "for_you": "For you", "sources": "Read the reports",
           "own": "In {o}'s own words, from its report.", "read_more": "Open today's paper on Subah",
           "footer": ("{f} set up this paper for you on Subah. Every story is grouped from reports by the outlets on "
                      "our published list, and links to each one. Summaries are written only from those reports."),
           "reply": "To stop these emails, reply to this message and {f} will be told.",
           "title": "{n}'s Subah", "large": "Large print", "note": "A note from {f}"},
    "ur": {"gift": "تحفہ", "love": "محبت کے ساتھ، {f}", "for_you": "آپ کے لیے", "sources": "رپورٹس پڑھیں",
           "own": "{o} کے اپنے الفاظ میں، اس کی رپورٹ سے۔", "read_more": "آج کا اخبار صبح پر کھولیں",
           "footer": ("{f} نے یہ اخبار آپ کے لیے صبح پر بنایا ہے۔ ہر خبر ہماری شائع شدہ فہرست کے اداروں کی رپورٹس سے "
                      "جمع کی گئی ہے اور ہر رپورٹ کا لنک ساتھ ہے۔ خلاصے صرف انہی رپورٹس سے لکھے جاتے ہیں۔"),
           "reply": "یہ ای میلز بند کرنے کے لیے اس پیغام کا جواب دیں، {f} کو بتا دیا جائے گا۔",
           "title": "{n} کی صبح", "large": "بڑے حروف", "note": "{f} کی طرف سے پیغام"},
}


def render_gift(edition: dict, gift: dict) -> tuple[str, str, str]:
    """Returns (subject, html, text) for one gift paper."""
    lang = "ur" if gift.get("lang") == "ur" else "en"
    t = L[lang]
    ur_ok = lang == "ur"
    name = (ur_ok and gift.get("recipient_name_ur")) or gift["recipient_name"] or ("آپ" if ur_ok else "Your")
    sender = (ur_ok and gift.get("from_name_ur")) or gift["from_name"]
    big = bool(gift.get("large"))
    base = 20 if big else 16
    font = URDU_FONT if lang == "ur" else READ_FONT
    lh = 2.1 if lang == "ur" else 1.55
    dir_ = "rtl" if lang == "ur" else "ltr"
    align = "right" if lang == "ur" else "left"
    title = t["title"].format(n=name) if (lang == "ur" or gift["recipient_name"]) else "Your Subah"
    date = today(lang)
    picks = for_recipient(edition, gift.get("city"), gift.get("topics") or [], limit=gift.get("stories", 5))

    def span_lang(text: str) -> str:
        """Urdu text inside an English email (or the reverse) gets its own direction and font."""
        ur = is_urdu(text)
        if ur == (lang == "ur"):
            return escape(text)
        return (f'<span dir="{"rtl" if ur else "ltr"}" lang="{"ur" if ur else "en"}" '
                f'style="font-family:{URDU_FONT if ur else READ_FONT}">{escape(text)}</span>')

    stories_html, stories_txt = [], []
    for i, p in enumerate(picks, 1):
        st, tags = p["story"], p["tags"]
        s = story_text(st, lang)
        cov = st["coverage"][lang]
        chips = "".join(
            f'<span style="display:inline-block;margin:0 0 4px 6px;padding:2px 10px;border-radius:99px;'
            f'background:#fbecd6;color:#7a3b10;font-size:{base - 3}px">{escape(tg["ur"] if lang == "ur" else tg["en"])}</span>'
            for tg in tags)
        fy = (f'<div style="margin:6px 0 0"><b style="font-size:{base - 3}px;color:#7a3b10">{t["for_you"]}</b> {chips}</div>'
              if tags else "")
        credit = ""
        if s["credit"]:
            credit = (f'<p style="margin:6px 0 0;font-size:{base - 3}px;color:#6b6f7b">'
                      + t["own"].format(o=f'<a href="{escape(s["credit"]["link"])}" style="color:#6b6f7b">'
                                        f'{escape(s["credit"]["outlet"])}</a>') + "</p>")
        body = ""
        if s["text"]:
            q = "border-%s:3px solid #e2ddd0;padding-%s:10px;" % (("right", "right") if is_urdu(s["text"]) else ("left", "left")) \
                if s["credit"] else ""
            body = f'<p style="margin:8px 0 0;font-size:{base}px;line-height:{lh};{q}">{span_lang(s["text"])}</p>'
        links = " · ".join(
            f'<a href="{escape(src["link"])}" style="color:#1d2433">{escape(src["outlet"])}</a>'
            for src in st["sources"][:6])
        stories_html.append(f"""
        <tr><td style="padding:18px 0;border-bottom:1px solid #e2ddd0">
          <p style="margin:0;font-size:{base - 3}px;color:#b0541c;font-weight:bold">{escape(cov)}</p>
          <h2 style="margin:6px 0 0;font-size:{base + 6}px;line-height:{1.9 if lang == 'ur' else 1.2};font-weight:bold;font-family:{font}">{span_lang(s["headline"])}</h2>
          {body}{credit}{fy}
          <p style="margin:10px 0 0;font-size:{base - 3}px;color:#6b6f7b">{t["sources"]}: {links}</p>
        </td></tr>""")
        stories_txt.append(f"{i}. {s['headline']}\n   {cov}\n   {s['text']}\n"
                           + "\n".join(f"   - {src['outlet']}: {src['link']}" for src in st["sources"][:6]))

    note = (gift.get("note") or "").strip()
    note_html = (f'<tr><td style="padding:14px 16px;background:#fbecd6;border-radius:10px;font-size:{base}px;line-height:{lh}">'
                 f'<b>{escape(t["note"].format(f=sender))}:</b> {span_lang(note)}</td></tr>') if note else ""
    html = f"""<!doctype html>
<html lang="{lang}" dir="{dir_}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)}</title></head>
<body style="margin:0;background:#f3eee2;padding:24px 12px;font-family:{font};color:#1d2433">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fffdf8;border-radius:10px;padding:28px;text-align:{align}" dir="{dir_}">
  <tr><td style="text-align:center;border-bottom:4px double #d9d3c4;padding-bottom:12px">
    <p style="margin:0;font-size:{base - 4}px;color:#6b6f7b">{escape(t["gift"])} · {escape(date)}{' · ' + t['large'] if big else ''}</p>
    <h1 style="margin:8px 0 4px;font-size:{base + 22}px;line-height:{1.8 if lang == 'ur' else 1.05};font-family:{font}">{escape(title)}</h1>
    <p style="margin:0;font-style:{'normal' if lang == 'ur' else 'italic'};color:#b0541c;font-size:{base}px">{escape(t["love"].format(f=sender))}</p>
  </td></tr>
  {note_html}
  {''.join(stories_html)}
  <tr><td style="padding:22px 0 6px;text-align:center">
    <a href="{SITE_URL}/paper.html" style="display:inline-block;background:#f08a3c;color:#2a1608;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:99px;font-family:Arial,sans-serif;font-size:{base - 1}px">{t["read_more"]}</a>
  </td></tr>
  <tr><td style="padding-top:14px;font-size:{base - 4}px;color:#6b6f7b;line-height:{lh}">{escape(t["footer"].format(f=sender))}<br>{escape(t["reply"].format(f=sender))}</td></tr>
</table></td></tr></table></body></html>"""
    text = (f"{title}\n{t['love'].format(f=sender)}\n{date}\n\n" + (f"{note}\n\n" if note else "")
            + "\n\n".join(stories_txt) + f"\n\n{SITE_URL}/paper.html\n\n{t['footer'].format(f=sender)}\n")
    sep = "، " if lang == "ur" else ", "
    subject = f"{title}{sep}{date}: {t['love'].format(f=sender)}"
    return subject, html, text


def send(to: str, subject: str, html: str, text: str, from_name: str, reply_to: str | None = None) -> None:
    user = os.environ["GMAIL_USER"].strip()
    password = os.environ["GMAIL_APP_PASSWORD"].replace(" ", "").strip()
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((f"Subah for {from_name}", user))
    msg["To"] = to
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    # Port 465 (SSL) first; some networks block it, so fall back to 587 (STARTTLS). A wrong password is not retried.
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=20) as smtp:
            smtp.login(user, password)
            smtp.send_message(msg)
        return
    except smtplib.SMTPAuthenticationError:
        raise
    except (OSError, smtplib.SMTPServerDisconnected, smtplib.SMTPConnectError):
        pass
    with smtplib.SMTP("smtp.gmail.com", 587, timeout=25) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(user, password)
        smtp.send_message(msg)
