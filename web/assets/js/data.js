/* Illustrations for the home page only. These five stories are SAMPLES written for the pitch, in the same shape
   the server produces. The real paper (paper.html) is built by the server from the outlets on sources.html. */
window.SUBAH_DATA = (function () {
  const T = (id, en, ur, term) => ({ id, en, ur, term });
  const STORIES = [
    {
      id: "petrol", outlet_count: 5,
      outlets: ["Dawn", "Express", "Geo News", "Business Recorder", "ARY News"],
      topics: [T("prices", "Prices", "قیمتیں", "petrol")], cities: [],
      summary: {
        en: { headline: "Petrol price unchanged, diesel up Rs3 per litre", text: "The federal government kept the price of petrol unchanged for the next fortnight and raised high-speed diesel by Rs3 per litre, according to a finance division notification." },
        ur: { headline: "پیٹرول کی قیمت برقرار، ڈیزل 3 روپے مہنگا", text: "وزارت خزانہ کے نوٹیفکیشن کے مطابق حکومت نے آئندہ پندرہ روز کے لیے پیٹرول کی قیمت برقرار رکھی اور ہائی اسپیڈ ڈیزل 3 روپے فی لیٹر مہنگا کر دیا۔" }
      },
      chips: [
        ["Dawn", "Govt keeps petrol price unchanged, raises diesel by Rs3"],
        ["Express", "پیٹرول کی قیمت برقرار، ڈیزل 3 روپے مہنگا"],
        ["Express", "Petrol price unchanged, diesel up Rs3 for 15 days"],
        ["Geo News", "آئندہ پندرہ روز کے لیے پیٹرول کی قیمت میں کوئی تبدیلی نہیں"],
        ["Business Recorder", "HSD up Rs3 a litre; petrol maintained"],
        ["ARY News", "Diesel price increased, petrol unchanged"]
      ]
    },
    {
      id: "smog", outlet_count: 4,
      outlets: ["Dawn", "The News International", "BBC", "Independent Urdu"],
      topics: [T("weather", "Weather and smog", "موسم اور سموگ", "smog"), T("education", "Education and exams", "تعلیم اور امتحانات", "schools")],
      cities: [T("lahore", "Lahore", "لاہور", "Lahore")],
      summary: {
        en: { headline: "Lahore schools move Monday classes online as smog plan is extended", text: "The Punjab government extended its smog plan, moving Monday classes at Lahore schools online and pausing outdoor sports." },
        ur: { headline: "سموگ پلان میں توسیع، لاہور کے اسکولوں میں پیر کو آن لائن کلاسیں", text: "پنجاب حکومت نے سموگ پلان میں توسیع کرتے ہوئے لاہور کے اسکولوں میں پیر کی کلاسیں آن لائن کر دیں اور کھلے میدان میں کھیل روک دیے۔" }
      },
      chips: [
        ["Dawn", "Lahore schools to hold online classes on Mondays"],
        ["BBC", "لاہور میں سموگ: پیر کو آن لائن کلاسیں"],
        ["The News International", "Punjab extends smog curbs"],
        ["Independent Urdu", "سموگ: لاہور کے اسکولوں میں آن لائن تدریس"]
      ]
    },
    {
      id: "cricket", outlet_count: 4,
      outlets: ["Geo News", "ARY News", "Express", "Dawn"],
      topics: [T("cricket", "Cricket", "کرکٹ", "Test squad")], cities: [],
      summary: {
        en: { headline: "Three uncapped players in squad for home Test series", text: "The PCB named three uncapped players for the home Test series and rested two senior pacers for the first match in Rawalpindi." },
        ur: { headline: "ہوم ٹیسٹ سیریز کے اسکواڈ میں تین نئے کھلاڑی", text: "پی سی بی نے ہوم ٹیسٹ سیریز کے لیے تین نئے کھلاڑی منتخب کیے اور راولپنڈی میں پہلے میچ کے لیے دو سینئر فاسٹ بولرز کو آرام دیا۔" }
      },
      chips: [
        ["Geo News", "Three uncapped players in Test squad"],
        ["ARY News", "Pakistan announce squad for home Tests"],
        ["Express", "ٹیسٹ سیریز کے لیے قومی اسکواڈ کا اعلان"],
        ["Dawn", "Selectors rest two senior pacers"]
      ]
    },
    {
      id: "rupee", outlet_count: 4,
      outlets: ["Business Recorder", "Arab News Pakistan", "Geo News", "ProPakistani"],
      topics: [T("economy", "Money and economy", "معیشت", "remittances")], cities: [],
      summary: {
        en: { headline: "Remittances rise and the rupee holds steady", text: "Remittances from Pakistanis abroad rose compared with a year earlier, State Bank data showed, while the rupee held steady against the dollar." },
        ur: { headline: "ترسیلات زر میں اضافہ، روپیہ مستحکم", text: "اسٹیٹ بینک کے اعداد کے مطابق بیرون ملک پاکستانیوں کی ترسیلات گزشتہ سال سے زیادہ رہیں جبکہ روپیہ ڈالر کے مقابلے میں مستحکم رہا۔" }
      },
      chips: [
        ["Business Recorder", "Rupee stable as remittances rise"],
        ["Arab News Pakistan", "Gulf remittances climb, central bank says"],
        ["Geo News", "ترسیلات زر میں اضافہ، روپیہ مستحکم"],
        ["ProPakistani", "Workers' remittances up year on year"]
      ]
    },
    {
      id: "results", outlet_count: 1,
      outlets: ["Dawn"],
      topics: [T("education", "Education and exams", "تعلیم اور امتحانات", "results")], cities: [T("lahore", "Lahore", "لاہور", "Lahore")],
      summary: {
        en: { headline: "Lahore board expects supplementary results next week", text: "A notice from the Lahore board says intermediate supplementary results are expected next week." },
        ur: { headline: "لاہور بورڈ: سپلیمنٹری نتائج اگلے ہفتے متوقع", text: "لاہور بورڈ کے نوٹس کے مطابق انٹرمیڈیٹ سپلیمنٹری نتائج اگلے ہفتے متوقع ہیں۔" }
      },
      chips: [["Dawn", "Lahore board to announce supplementary results next week"]]
    }
  ];
  STORIES.forEach((s) => {
    s.coverage = { en: `Reported by ${s.outlet_count} outlet${s.outlet_count === 1 ? "" : "s"}`, ur: `${String(s.outlet_count).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d])} ${s.outlet_count === 1 ? "ادارے" : "اداروں"} نے رپورٹ کیا` };
  });
  return { STORIES };
})();
