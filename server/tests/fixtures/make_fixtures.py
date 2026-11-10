"""Writes the fixed fixture snapshot used by the tests and by the demo's "fixtures" source.

All items are SYNTHETIC, written for testing. They are not real reports. Each item carries an event label
(E1..E12) so tests can check that grouping puts exactly the right reports together, across English and Urdu.
Run:  python server/tests/fixtures/make_fixtures.py
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).resolve().parent / "snapshot"
CAPTURED = datetime(2026, 11, 10, 2, 0, tzinfo=timezone.utc)  # 7:00 am in Lahore

# (event, outlet_id, lang, hours_before_capture, title, description, slug)
ITEMS = [
    # E1 petrol price review: 5 outlets (Express in English and Urdu counts once)
    ("E1", "dawn", "en", 14, "Govt keeps petrol price unchanged, raises diesel by Rs3 per litre",
     "The federal government kept the price of petrol unchanged for the next fortnight and increased the price of high-speed diesel by Rs3 per litre, the finance division said in a notification.", "petrol-unchanged"),
    ("E1", "express", "en", 13, "Petrol price unchanged, diesel up Rs3 for next 15 days",
     "Petrol will cost the same for the next 15 days while high-speed diesel goes up by Rs3 per litre, according to a finance division notification.", "petrol-diesel-fortnight"),
    ("E1", "express", "ur", 13, "پیٹرول کی قیمت برقرار، ڈیزل 3 روپے مہنگا",
     "وفاقی حکومت نے آئندہ پندرہ روز کے لیے پیٹرول کی قیمت برقرار رکھی ہے جبکہ ہائی اسپیڈ ڈیزل کی قیمت میں 3 روپے فی لیٹر اضافہ کر دیا گیا ہے۔", "petrol-qeemat"),
    ("E1", "geo", "ur", 12, "آئندہ پندرہ روز کے لیے پیٹرول کی قیمت میں کوئی تبدیلی نہیں، ڈیزل مہنگا",
     "وزارت خزانہ کے نوٹیفکیشن کے مطابق پیٹرول کی قیمت میں کوئی تبدیلی نہیں کی گئی، ڈیزل 3 روپے فی لیٹر مہنگا ہو گیا۔", "petrol-tabdeeli-nahin"),
    ("E1", "brecorder", "en", 13, "HSD price increased by Rs3 per litre, petrol price maintained",
     "The government increased the price of high-speed diesel (HSD) by Rs3 per litre and maintained the price of petrol for the next fortnight.", "hsd-increased"),
    ("E1", "ary", "en", 12, "Diesel price increased, petrol rate kept unchanged",
     "The price of high-speed diesel has been increased by Rs3 per litre while the petrol rate remains unchanged for the next fortnight.", "diesel-increased"),
    # E2 smog in Lahore: 4 outlets
    ("E2", "dawn", "en", 10, "Lahore schools to hold online classes on Mondays as smog worsens",
     "The Punjab government extended its smog plan, moving Monday classes at Lahore schools online and pausing outdoor sports.", "lahore-smog-schools"),
    ("E2", "thenews", "en", 9, "Punjab extends smog curbs, Lahore schools go online on Mondays",
     "Schools in Lahore will teach online on Mondays and markets have been told to close early under the extended smog plan.", "punjab-smog-curbs"),
    ("E2", "bbc", "ur", 8, "لاہور میں سموگ: اسکولوں میں پیر کو آن لائن کلاسیں",
     "پنجاب حکومت نے سموگ پلان میں توسیع کرتے ہوئے لاہور کے اسکولوں میں پیر کے روز آن لائن کلاسوں کا اعلان کیا ہے۔", "lahore-smog-urdu"),
    ("E2", "independenturdu", "ur", 8, "سموگ کے باعث لاہور کے اسکولوں میں پیر کو آن لائن تدریس",
     "لاہور میں سموگ کی صورتحال کے پیش نظر اسکول پیر کو آن لائن تدریس کریں گے اور کھلے میدان میں کھیلوں پر پابندی ہوگی۔", "smog-online-tadrees"),
    # E3 cricket squad: 4 outlets
    ("E3", "geo", "en", 11, "Three uncapped players named in Pakistan Test squad",
     "The PCB named a squad for the home Test series that includes three uncapped players, while two senior pacers have been rested.", "uncapped-test-squad"),
    ("E3", "ary", "en", 11, "Pakistan announce squad for home Test series",
     "Pakistan announced their squad for the home Test series, with three uncapped players and two senior pacers rested for the first match in Rawalpindi.", "pakistan-test-squad"),
    ("E3", "express", "ur", 10, "ٹیسٹ سیریز کے لیے قومی اسکواڈ کا اعلان، تین نئے کھلاڑی شامل",
     "پی سی بی نے ہوم ٹیسٹ سیریز کے لیے قومی اسکواڈ کا اعلان کر دیا جس میں تین نئے کھلاڑی شامل ہیں۔", "test-squad-urdu"),
    ("E3", "dawn", "en", 10, "Selectors rest two senior pacers, pick three new faces for home Tests",
     "Selectors rested two senior fast bowlers and picked three uncapped players for the Test series opener in Rawalpindi.", "selectors-rest-pacers"),
    # E4 remittances and the rupee: 4 outlets
    ("E4", "brecorder", "en", 16, "Rupee stable against dollar as remittances rise",
     "The rupee held steady against the US dollar as workers' remittances rose compared with a year earlier, State Bank of Pakistan data showed.", "rupee-stable-remittances"),
    ("E4", "profit", "en", 15, "Workers' remittances rise year-on-year in October, SBP data shows",
     "Remittances sent home by overseas Pakistanis rose year-on-year in October, according to State Bank of Pakistan data, with the Gulf the largest source.", "remittances-october"),
    ("E4", "arabnews", "en", 15, "Pakistan's remittances from Gulf countries climb, central bank says",
     "Remittances from Saudi Arabia and the UAE led an increase in money sent home by Pakistanis working abroad, the central bank said.", "gulf-remittances-climb"),
    ("E4", "geo", "ur", 14, "ترسیلات زر میں اضافہ، روپیہ مستحکم",
     "اسٹیٹ بینک کے مطابق بیرون ملک پاکستانیوں کی جانب سے بھیجی گئی رقوم میں گزشتہ سال کے مقابلے میں اضافہ ہوا، جبکہ روپیہ ڈالر کے مقابلے میں مستحکم رہا۔", "tarseelat-izafa"),
    # E5 electricity fuel charge: 3 outlets
    ("E5", "dawn", "en", 18, "NEPRA hears plea for fuel charge adjustment on electricity bills",
     "The power regulator heard a request from distribution companies to pass last quarter's fuel costs on to consumers and reserved its decision.", "nepra-fca-hearing"),
    ("E5", "brecorder", "en", 17, "Discos seek quarterly FCA, NEPRA reserves decision",
     "Power distribution companies sought a fuel charge adjustment for the previous quarter; NEPRA reserved its decision after the hearing.", "discos-seek-fca"),
    ("E5", "express", "ur", 16, "بجلی صارفین پر فیول ایڈجسٹمنٹ کی درخواست، نیپرا نے فیصلہ محفوظ کر لیا",
     "تقسیم کار کمپنیوں نے گزشتہ سہ ماہی کی فیول ایڈجسٹمنٹ صارفین سے وصول کرنے کی درخواست کی، نیپرا نے سماعت کے بعد فیصلہ محفوظ کر لیا۔", "nepra-faisla-mehfooz"),
    # E6 dengue in Rawalpindi: 2 outlets
    ("E6", "thenews", "en", 20, "Dengue cases decline in Rawalpindi as temperatures drop",
     "Health officials in Rawalpindi reported fewer new dengue cases this week as night temperatures fell.", "dengue-rawalpindi"),
    ("E6", "dw", "ur", 19, "راولپنڈی میں ڈینگی کے کیسز میں کمی",
     "محکمہ صحت کے مطابق درجہ حرارت میں کمی کے بعد راولپنڈی میں ڈینگی کے نئے کیسز کم ہو گئے ہیں۔", "dengue-kami"),
    # E7 single source: Lahore board results date
    ("E7", "pakistantoday", "en", 9, "Lahore board to announce intermediate supplementary results next week",
     "The Board of Intermediate and Secondary Education Lahore said in a notice that supplementary results are expected next week.", "lahore-board-results"),
    # E8 UAE visa renewals: 2 outlets
    ("E8", "aljazeera", "en", 22, "UAE simplifies work visa renewals for residents",
     "Residents with a clean record can renew work visas online without an in-person medical test, UAE officials said.", "uae-visa-renewals"),
    ("E8", "arabnews", "en", 21, "UAE eases work visa renewal process, removing in-person medical test",
     "The UAE will let eligible residents renew work visas online, removing the requirement for an in-person medical test.", "uae-eases-renewal"),
    # E9 single source: Karachi transport
    ("E9", "propakistani", "en", 7, "Karachi's Green Line adds late evening service",
     "The Green Line bus service in Karachi will run later into the evening from next week, the operator said.", "green-line-evening"),
    # E10 freelancer payments: 3 outlets
    ("E10", "propakistani", "en", 15, "SBP directs banks to credit freelancers' export proceeds within one day",
     "The State Bank of Pakistan asked banks to credit IT and freelance export earnings within one working day.", "sbp-freelancers"),
    ("E10", "profit", "en", 14, "Freelance export payments to be credited faster, SBP says",
     "Banks must now credit freelancers' export proceeds within one working day under a new SBP circular.", "freelance-payments-faster"),
    ("E10", "express", "ur", 13, "فری لانسرز کو ادائیگیاں ایک دن میں ملیں گی، اسٹیٹ بینک",
     "اسٹیٹ بینک نے بینکوں کو ہدایت کی ہے کہ فری لانسرز کی برآمدی آمدنی ایک کاروباری دن میں کھاتوں میں منتقل کی جائے۔", "freelancers-adaigi"),
    # E11 single source: Peshawar
    ("E11", "thenews", "en", 6, "Peshawar BRT adds a new route to Hayatabad",
     "TransPeshawar said a new feeder route to Hayatabad will start operating on Monday.", "peshawar-brt-route"),
    # E12 single source: Islamabad book fair
    ("E12", "pakistantoday", "en", 5, "Book fair opens in Islamabad with over 100 stalls",
     "A three-day book fair opened in Islamabad with more than 100 stalls from publishers across the country.", "islamabad-book-fair"),
]

# Bad data, by design: each case must be handled without crashing.
EXTRA_DAWN = [
    # duplicate of E1 with tracking parameters: must be dropped as a duplicate
    ("DUP", 14, "Govt keeps petrol price unchanged, raises diesel by Rs3 per litre", "Duplicate item.", "petrol-unchanged?utm_source=rss&utm_medium=feed"),
    # older than the 36-hour window: must be dropped as too old
    ("OLD", 80, "Last week: cabinet meets to review budget proposals", "An old item.", "old-cabinet"),
    # no title: must be dropped
    ("NOTITLE", 5, "", "An item with no title.", "no-title"),
    # HTML and entities in the description: must be cleaned
]

FEEDS = [
    ("dawn", "en", "https://www.dawn.com/feeds/home"),
    ("express", "en", "https://tribune.com.pk/feed/home"),
    ("express", "ur", "https://www.express.pk/feed/"),
    ("geo", "en", "https://www.geo.tv/rss/1/1"),
    ("geo", "ur", "https://urdu.geo.tv/rss/1/0"),
    ("thenews", "en", "https://www.thenews.com.pk/rss/1/1"),
    ("brecorder", "en", "https://www.brecorder.com/feeds/latest-news"),
    ("arabnews", "en", "https://www.arabnews.pk/rss.xml"),
    ("ary", "en", "https://arynews.tv/feed/"),
    ("pakistantoday", "en", "https://www.pakistantoday.com.pk/feed/"),
    ("profit", "en", "https://profit.pakistantoday.com.pk/feed/"),
    ("propakistani", "en", "https://propakistani.pk/feed/"),
    ("independenturdu", "ur", "https://www.independenturdu.com/rss.xml"),
    ("bbc", "ur", "https://feeds.bbci.co.uk/urdu/rss.xml"),
    ("dw", "ur", "https://rss.dw.com/rdf/rss-urdu-all"),
    ("aljazeera", "en", "https://www.aljazeera.com/xml/rss/all.xml"),
]


def item_xml(title: str, desc: str, link: str, when: datetime, guid: str) -> str:
    return (
        "    <item>\n"
        f"      <title>{escape(title)}</title>\n"
        f"      <link>{escape(link)}</link>\n"
        f"      <guid isPermaLink=\"false\">{escape(guid)}</guid>\n"
        f"      <pubDate>{format_datetime(when)}</pubDate>\n"
        f"      <description>{escape(desc)}</description>\n"
        "    </item>\n"
    )


def channel(title: str, items: str) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n'
        f"    <title>{escape(title)} (synthetic test feed)</title>\n    <link>https://example.com/</link>\n"
        "    <description>Synthetic items for Subah tests. Not real reports.</description>\n"
        f"{items}  </channel>\n</rss>\n"
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.xml"):
        old.unlink()
    manifest = {
        "captured_at": CAPTURED.isoformat(),
        "note": "Synthetic fixture feeds for tests and offline demos. Not real reports.",
        "feeds": [],
    }
    labels = {}
    for i, (outlet, lang, url) in enumerate(FEEDS):
        items = ""
        for ev, o, l, hrs, title, desc, slug in ITEMS:
            if o == outlet and l == lang:
                link = f"https://example.com/{outlet}/{lang}/{slug}"
                items += item_xml(title, desc, link, CAPTURED - timedelta(hours=hrs), f"{outlet}-{slug}")
                labels[link] = ev
        if outlet == "dawn":
            for ev, hrs, title, desc, slug in EXTRA_DAWN:
                link = f"https://example.com/dawn/en/{slug}"
                items += item_xml(title, desc, link, CAPTURED - timedelta(hours=hrs), f"dawn-extra-{ev}")
            items += item_xml("Cabinet approves &amp; notifies new <b>holiday</b> schedule",
                              "<p>The federal cabinet approved the schedule.&nbsp;<a href='x'>Read more</a></p>",
                              "https://example.com/dawn/en/holiday-schedule", CAPTURED - timedelta(hours=4), "dawn-html")
            labels["https://example.com/dawn/en/holiday-schedule"] = "E13"
        name = f"{i:02d}-{outlet}-{lang}.xml"
        (OUT / name).write_text(channel(f"{outlet} {lang}", items), encoding="utf-8")
        manifest["feeds"].append({"outlet_id": outlet, "url": url, "lang": lang, "file": name, "error": None})

    # malformed XML, an empty channel, an empty body, and a feed that timed out
    (OUT / "90-fridaytimes-en.xml").write_text("<?xml version='1.0'?><rss><channel><title>Broken<item><title>Half an item",
                                               encoding="utf-8")
    (OUT / "91-guardian-en.xml").write_text(channel("guardian en", ""), encoding="utf-8")
    (OUT / "92-dw-en.xml").write_text("", encoding="utf-8")
    manifest["feeds"] += [
        {"outlet_id": "fridaytimes", "url": "https://thefridaytimes.com/feed/", "lang": "en", "file": "90-fridaytimes-en.xml", "error": None},
        {"outlet_id": "guardian", "url": "https://www.theguardian.com/world/pakistan/rss", "lang": "en", "file": "91-guardian-en.xml", "error": None},
        {"outlet_id": "dw", "url": "https://rss.dw.com/rdf/rss-en-asia", "lang": "en", "file": "92-dw-en.xml", "error": None},
        {"outlet_id": "bbc", "url": "https://feeds.bbci.co.uk/news/world/asia/rss.xml", "lang": "en", "file": None, "error": "ReadTimeout"},
    ]
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT.parent / "expected_groups.json").write_text(json.dumps(labels, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {len(manifest['feeds'])} feeds and {len(labels)} labelled items to {OUT}")


if __name__ == "__main__":
    main()
