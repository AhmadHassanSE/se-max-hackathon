/* Subah sample edition data.
   Every story below is a SAMPLE written for this prototype. The live paper
   fills these same fields from real RSS feeds, one LLM pass per story cluster. */

window.SUBAH_DATA = (function () {
  const OUTLETS = [
    { name: "Dawn", region: "pk" },
    { name: "Geo News", region: "pk" },
    { name: "The Express Tribune", region: "pk" },
    { name: "Business Recorder", region: "pk" },
    { name: "The News", region: "pk" },
    { name: "Dunya News", region: "pk" },
    { name: "Samaa", region: "pk" },
    { name: "ARY News", region: "pk" },
    { name: "Aaj News", region: "pk" },
    { name: "The Nation", region: "pk" },
    { name: "Pakistan Today", region: "pk" },
    { name: "Profit", region: "pk" },
    { name: "Independent Urdu", region: "pk" },
    { name: "BBC Urdu", region: "world" },
    { name: "DW Urdu", region: "world" },
    { name: "VOA Urdu", region: "world" },
    { name: "Arab News", region: "world" },
    { name: "BBC News", region: "world" },
    { name: "Al Jazeera", region: "world" },
    { name: "Reuters", region: "world" },
    { name: "Associated Press", region: "world" },
    { name: "Gulf News", region: "world" },
    { name: "Khaleej Times", region: "world" },
    { name: "The National", region: "world" }
  ];

  const PROFILE_SAMPLE = {
    en: "I’m a nursing student in Lahore. I ride a motorbike to class, tutor online on weekends, and my brother works in Dubai.",
    ur: "میں لاہور میں نرسنگ کی طالبہ ہوں۔ کلاس موٹر سائیکل پر جاتی ہوں، ہفتے کے آخر میں آن لائن پڑھاتی ہوں، اور میرا بھائی دبئی میں کام کرتا ہے۔",
    ro: "Main Lahore mein nursing ki taliba hoon. Class motorcycle par jaati hoon, weekend par online parhaati hoon, aur mera bhai Dubai mein kaam karta hai."
  };

  const STORIES = [
    {
      id: "petrol",
      topics: ["prices"],
      badge: { type: "confirmed" },
      outlets: ["Dawn", "Geo News", "The Express Tribune", "Business Recorder", "ARY News", "Dunya News", "The News", "Samaa"],
      minutes: 0.8,
      chips: [
        ["Dawn", "Petrol price kept unchanged for next fortnight"],
        ["Geo News", "پیٹرول کی قیمت برقرار، ڈیزل مہنگا"],
        ["The Express Tribune", "Govt holds petrol, raises diesel by Rs 3"],
        ["Business Recorder", "HSD up Rs 3 a litre; petrol maintained"],
        ["ARY News", "Diesel price increased, petrol unchanged"],
        ["Dunya News", "ڈیزل تین روپے مہنگا"],
        ["The News", "Petrol rate stays, diesel climbs"],
        ["Samaa", "No change in petrol price for 15 days"]
      ],
      coverage: [
        ["Business Recorder", {
          en: "Leads on the diesel rise and what it means for freight costs.",
          ur: "ڈیزل میں اضافے اور مال برداری کے اخراجات پر زور۔",
          ro: "Diesel ke izafay aur maal bardari ke kharchon par zor."
        }],
        ["Geo News", {
          en: "Frames it as relief for motorcyclists and rickshaw owners.",
          ur: "اسے موٹر سائیکل اور رکشہ مالکان کے لیے ریلیف کے طور پر پیش کیا۔",
          ro: "Ise motorcycle aur rickshaw malikaan ke liye relief ke tor par pesh kiya."
        }],
        ["Dawn", {
          en: "Notes the government’s petroleum levy target for the year.",
          ur: "حکومت کے سالانہ پیٹرولیم لیوی ہدف کا ذکر۔",
          ro: "Hukoomat ke saalana petroleum levy hadaf ka zikr."
        }]
      ],
      en: {
        section: "Prices",
        headline: "Petrol price held for two weeks; diesel up Rs 3 a litre",
        dek: "The government kept petrol unchanged in its fortnightly review and raised high-speed diesel, citing global oil prices.",
        why: "Diesel moves the trucks that carry food, so a rise usually reaches vegetable and flour prices within weeks.",
        unknown: "Whether transporters will raise fares this week, and how long global oil stays at current levels.",
        forYou: "Your motorbike commute costs the same this fortnight. Watch bus fares and the mess bill, which follow diesel."
      },
      ur: {
        section: "قیمتیں",
        headline: "پیٹرول کی قیمت دو ہفتوں کے لیے برقرار، ڈیزل تین روپے مہنگا",
        dek: "حکومت نے پندرہ روزہ جائزے میں پیٹرول کی قیمت نہیں بدلی، جبکہ عالمی منڈی کے باعث ڈیزل کی قیمت بڑھا دی۔",
        why: "ڈیزل سے مال بردار ٹرک چلتے ہیں، اس لیے اس کا اثر چند ہفتوں میں سبزی اور آٹے کی قیمتوں تک پہنچتا ہے۔",
        unknown: "ٹرانسپورٹر اس ہفتے کرائے بڑھائیں گے یا نہیں، اور عالمی قیمتیں کب تک اسی سطح پر رہیں گی۔",
        forYou: "آپ کی موٹر سائیکل کا خرچ اس پندرہ دن ویسا ہی رہے گا۔ بس کے کرائے اور میس کے بل پر نظر رکھیں۔"
      },
      ro: {
        section: "Qeematein",
        headline: "Petrol ki qeemat do haftay ke liye barqarar, diesel teen rupay mehnga",
        dek: "Hukoomat ne pandrah roza jaizay mein petrol ki qeemat nahin badli, jabke aalmi mandi ki wajah se diesel mehnga kar diya.",
        why: "Diesel se maal bardar truck chaltay hain, is liye is ka asar chand hafton mein sabzi aur aatay ki qeemat tak pohanchta hai.",
        unknown: "Transporter is haftay kiraye barhayenge ya nahin, aur aalmi qeematein kab tak isi satah par rahengi.",
        forYou: "Aap ki motorcycle ka kharcha is pandrah din waisa hi rahega. Bus ke kiraye aur mess ke bill par nazar rakhein."
      }
    },
    {
      id: "smog",
      topics: ["local", "health"],
      badge: { type: "confirmed" },
      outlets: ["Dawn", "BBC Urdu", "The News", "Independent Urdu", "Samaa", "Aaj News"],
      minutes: 0.7,
      chips: [
        ["Dawn", "Smog: Lahore schools to go online on Mondays"],
        ["BBC Urdu", "لاہور میں سموگ، پیر کو آن لائن کلاسیں"],
        ["The News", "Punjab extends its smog curbs"],
        ["Independent Urdu", "سموگ پلان میں توسیع"],
        ["Samaa", "Outdoor sports paused amid smog"],
        ["Aaj News", "Lahore markets told to close early"]
      ],
      en: {
        section: "Lahore",
        headline: "Smog season: Lahore schools switch to online classes on Mondays",
        dek: "The Punjab government extended its smog plan, pausing outdoor sports and asking markets to close earlier.",
        why: "Lahore’s air is usually at its worst through November and December, and children and older people feel it first.",
        unknown: "How long the Monday rule will last, and whether it will widen to colleges.",
        forYou: "Monday lectures in Lahore may move online. Keep a mask for the ride in."
      },
      ur: {
        section: "لاہور",
        headline: "سموگ کا موسم: لاہور کے اسکولوں میں پیر کو آن لائن کلاسیں",
        dek: "پنجاب حکومت نے سموگ پلان میں توسیع کر دی، کھلے میدان میں کھیل معطل اور بازار جلد بند کرنے کی ہدایت۔",
        why: "لاہور کی فضا عموماً نومبر اور دسمبر میں سب سے زیادہ خراب رہتی ہے، اور بچے اور بزرگ اسے سب سے پہلے محسوس کرتے ہیں۔",
        unknown: "یہ پابندی کب تک رہے گی اور کیا کالج بھی اس میں شامل ہوں گے، ابھی واضح نہیں۔",
        forYou: "لاہور میں پیر کے لیکچر آن لائن ہو سکتے ہیں۔ بائیک پر ماسک ساتھ رکھیں۔"
      },
      ro: {
        section: "Lahore",
        headline: "Smog ka mausam: Lahore ke schoolon mein peer ko online classes",
        dek: "Punjab hukoomat ne smog plan barha diya, khulay maidan mein khel band aur bazaar jaldi band karne ki hidayat.",
        why: "Lahore ki hawa aam tor par November aur December mein sab se kharab hoti hai, aur bachay aur buzurg ise pehle mehsoos karte hain.",
        unknown: "Yeh pabandi kab tak rahegi aur kya college bhi is mein shamil honge, abhi wazeh nahin.",
        forYou: "Lahore mein peer ke lecture online ho saktay hain. Bike par mask saath rakhein."
      }
    },
    {
      id: "rupee",
      topics: ["money", "world"],
      badge: { type: "confirmed" },
      outlets: ["Business Recorder", "Profit", "Arab News", "Gulf News"],
      minutes: 0.6,
      chips: [
        ["Business Recorder", "Rupee stable as remittances rise"],
        ["Profit", "Remittances lift reserves"],
        ["Arab News", "Gulf remittances up year on year"],
        ["Gulf News", "Pakistan expat remittances climb"]
      ],
      en: {
        section: "Money",
        headline: "Rupee holds steady as remittances from the Gulf stay strong",
        dek: "The State Bank’s latest figures show workers abroad sent more money home than a year ago, supporting the currency.",
        why: "A steady rupee keeps imported goods such as cooking oil, medicine and phones from jumping in price.",
        unknown: "Whether the trend holds after winter, when remittances usually slow.",
        forYou: "When your brother sends money home from Dubai, this month’s rate is close to last month’s."
      },
      ur: {
        section: "پیسہ",
        headline: "خلیجی ممالک سے ترسیلات زر مضبوط، روپیہ مستحکم",
        dek: "اسٹیٹ بینک کے تازہ اعداد کے مطابق بیرون ملک پاکستانیوں نے گزشتہ سال سے زیادہ رقم بھیجی، جس سے روپے کو سہارا ملا۔",
        why: "مستحکم روپے سے خوردنی تیل، ادویات اور موبائل جیسی درآمدی چیزوں کی قیمتیں اچانک نہیں بڑھتیں۔",
        unknown: "سردیوں کے بعد بھی یہ رجحان برقرار رہے گا یا نہیں، کہنا مشکل ہے۔",
        forYou: "آپ کا بھائی دبئی سے پیسے بھیجے تو اس مہینے ریٹ تقریباً پچھلے مہینے جیسا ہے۔"
      },
      ro: {
        section: "Paisa",
        headline: "Khaleeji mulkon se tarseelat-e-zar mazboot, rupaya mustehkam",
        dek: "State Bank ke taaza adaad ke mutabiq bairon-e-mulk Pakistaniyon ne pichlay saal se zyada raqam bheji, jis se rupay ko sahara mila.",
        why: "Mustehkam rupay se cooking oil, dawaiyon aur mobile jaisi cheezon ki qeematein achanak nahin barhtein.",
        unknown: "Sardiyon ke baad bhi yeh rujhan barqarar rahega ya nahin, kehna mushkil hai.",
        forYou: "Aap ka bhai Dubai se paisay bheje to is mahine rate taqreeban pichlay mahine jaisa hai."
      }
    },
    {
      id: "power",
      topics: ["prices", "money"],
      badge: { type: "confirmed" },
      outlets: ["Dawn", "Business Recorder", "The News", "Geo News", "Profit"],
      minutes: 0.6,
      en: {
        section: "Electricity",
        headline: "Power regulator hears request to add a fuel charge to bills",
        dek: "NEPRA heard distribution companies ask to pass last quarter’s fuel costs on to consumers. A decision is due later.",
        why: "If approved, the charge appears as a separate line on the next bill, on top of the base tariff.",
        unknown: "The size of the charge, and whether homes using under 200 units will be spared.",
        forYou: "Your hostel’s next bill may carry an extra line. Nothing changes until NEPRA decides."
      },
      ur: {
        section: "بجلی",
        headline: "نیپرا میں بجلی کے بلوں پر فیول چارج کی درخواست کی سماعت",
        dek: "تقسیم کار کمپنیوں نے گزشتہ سہ ماہی کے ایندھن کے اخراجات صارفین سے وصول کرنے کی اجازت مانگی۔ فیصلہ بعد میں ہوگا۔",
        why: "منظوری کی صورت میں یہ چارج اگلے بل میں بنیادی ٹیرف کے علاوہ الگ سطر کے طور پر آئے گا۔",
        unknown: "چارج کتنا ہوگا اور کیا دو سو یونٹ سے کم استعمال والے گھر اس سے بچ جائیں گے۔",
        forYou: "آپ کے ہاسٹل کے اگلے بل میں اضافی سطر آ سکتی ہے۔ نیپرا کے فیصلے تک کچھ نہیں بدلے گا۔"
      },
      ro: {
        section: "Bijli",
        headline: "NEPRA mein bijli ke bilon par fuel charge ki darkhwast ki samaat",
        dek: "Taqseem kaar companiyon ne pichli sehmahi ke fuel kharche sarfeen se wasool karne ki ijazat maangi. Faisla baad mein hoga.",
        why: "Manzoori ki soorat mein yeh charge aglay bill mein bunyadi tariff ke ilawa alag line ke tor par aayega.",
        unknown: "Charge kitna hoga aur kya 200 unit se kam istemal walay ghar is se bach jayenge.",
        forYou: "Aap ke hostel ke aglay bill mein izafi line aa sakti hai. NEPRA ke faislay tak kuch nahin badlega."
      }
    },
    {
      id: "results",
      topics: ["education", "local"],
      badge: { type: "single" },
      outlets: ["Dunya News"],
      minutes: 0.5,
      en: {
        section: "Exams",
        headline: "Lahore board expects intermediate supplementary results next week",
        dek: "A notice from the board’s office gives a tentative date. No other outlet has reported it yet.",
        why: "Many university admissions close soon after results, so a week either way matters.",
        unknown: "The exact date. The notice calls it tentative, and only one outlet has carried it.",
        forYou: "If a younger sibling sat the supplementary papers, keep their roll number slip ready."
      },
      ur: {
        section: "امتحانات",
        headline: "لاہور بورڈ: انٹرمیڈیٹ سپلیمنٹری نتائج اگلے ہفتے متوقع",
        dek: "بورڈ کے دفتر سے جاری نوٹس میں عارضی تاریخ دی گئی ہے۔ کسی اور ادارے نے ابھی یہ خبر نہیں دی۔",
        why: "کئی جامعات میں داخلے نتائج کے فوراً بعد بند ہو جاتے ہیں، اس لیے ایک ہفتے کا فرق بھی اہم ہے۔",
        unknown: "حتمی تاریخ۔ نوٹس میں اسے عارضی کہا گیا ہے اور صرف ایک ادارے نے اسے شائع کیا ہے۔",
        forYou: "اگر چھوٹے بہن بھائی نے سپلیمنٹری امتحان دیا ہے تو ان کی رول نمبر سلپ تیار رکھیں۔"
      },
      ro: {
        section: "Imtihanaat",
        headline: "Lahore board: intermediate supplementary nataij aglay haftay mutawaqqe",
        dek: "Board ke daftar se jaari notice mein aarzi tareekh di gayi hai. Kisi aur idaray ne abhi yeh khabar nahin di.",
        why: "Kai jamiaat mein dakhlay nataij ke foran baad band ho jatay hain, is liye aik haftay ka farq bhi aham hai.",
        unknown: "Hatmi tareekh. Notice mein ise aarzi kaha gaya hai aur sirf aik idaray ne ise shaya kiya hai.",
        forYou: "Agar chhotay behan bhai ne supplementary imtihan diya hai to un ki roll number slip tayyar rakhein."
      }
    },
    {
      id: "cricket",
      topics: ["cricket"],
      badge: { type: "confirmed" },
      outlets: ["Geo News", "ARY News", "The Express Tribune", "Dawn", "The Nation"],
      minutes: 0.5,
      chips: [
        ["Geo News", "Three uncapped players in Test squad"],
        ["ARY News", "Pakistan announce squad for home Tests"],
        ["The Express Tribune", "پاکستانی اسکواڈ کا اعلان"],
        ["Dawn", "Selectors rest two senior pacers"],
        ["The Nation", "Young squad for Rawalpindi Test"]
      ],
      en: {
        section: "Cricket",
        headline: "Pakistan name a young squad for the home Test series",
        dek: "Selectors picked three uncapped players and rested two senior fast bowlers for the opening match in Rawalpindi.",
        why: "These are the last home Tests before the next championship cycle is decided.",
        unknown: "Whether the rested bowlers return for the second Test in Karachi.",
        forYou: "Day one falls on a Saturday, so the final session fits after class."
      },
      ur: {
        section: "کرکٹ",
        headline: "ہوم ٹیسٹ سیریز کے لیے پاکستان کا نوجوان اسکواڈ",
        dek: "سلیکٹرز نے تین نئے کھلاڑی منتخب کیے اور راولپنڈی میں پہلے میچ کے لیے دو سینئر فاسٹ بولرز کو آرام دیا۔",
        why: "یہ اگلی چیمپئن شپ سائیکل سے پہلے ملک میں ہونے والے آخری ٹیسٹ میچ ہیں۔",
        unknown: "آرام کرنے والے بولرز کراچی میں دوسرے ٹیسٹ میں واپس آئیں گے یا نہیں۔",
        forYou: "پہلا دن ہفتے کو ہے، اس لیے کلاس کے بعد آخری سیشن دیکھا جا سکتا ہے۔"
      },
      ro: {
        section: "Cricket",
        headline: "Home Test series ke liye Pakistan ka naujawan squad",
        dek: "Selectors ne teen naye khiladi chunay aur Rawalpindi mein pehlay match ke liye do senior fast bowlers ko aaram diya.",
        why: "Yeh aglay championship cycle se pehle mulk mein honay walay aakhri Test match hain.",
        unknown: "Aaram karne walay bowlers Karachi mein doosray Test mein wapas aayenge ya nahin.",
        forYou: "Pehla din haftay ko hai, is liye class ke baad aakhri session dekha ja sakta hai."
      }
    },
    {
      id: "freelance",
      topics: ["work", "tech", "money"],
      badge: { type: "confirmed" },
      outlets: ["Business Recorder", "Profit", "Dawn", "The Express Tribune"],
      minutes: 0.6,
      en: {
        section: "Work",
        headline: "Freelancers to get export payments credited faster, State Bank says",
        dek: "A new circular asks banks to credit IT and freelance export earnings within one working day.",
        why: "Slow credits have pushed many freelancers toward informal channels that cost more and protect less.",
        unknown: "When smaller banks will comply, and whether their fees will change.",
        forYou: "Your weekend tutoring payments should land sooner from next month."
      },
      ur: {
        section: "روزگار",
        headline: "فری لانسرز کو برآمدی ادائیگیاں جلد ملیں گی: اسٹیٹ بینک",
        dek: "نئے سرکلر میں بینکوں سے کہا گیا ہے کہ آئی ٹی اور فری لانس آمدنی ایک کاروباری دن میں کھاتے میں ڈالیں۔",
        why: "سست ادائیگیوں کی وجہ سے بہت سے فری لانسرز مہنگے اور غیر محفوظ غیر رسمی ذرائع استعمال کرتے رہے ہیں۔",
        unknown: "چھوٹے بینک کب عمل کریں گے اور کیا ان کی فیس بدلے گی۔",
        forYou: "ہفتے کے آخر کی آن لائن ٹیوشن کی ادائیگی اگلے مہینے سے جلد ملنی چاہیے۔"
      },
      ro: {
        section: "Rozgaar",
        headline: "Freelancers ko export payments jaldi milengi: State Bank",
        dek: "Naye circular mein bankon se kaha gaya hai ke IT aur freelance aamdani aik karobari din mein khatay mein daalein.",
        why: "Sust adaigiyon ki wajah se kai freelancers mehngay aur ghair mehfooz ghair rasmi zaraye istemal karte rahe hain.",
        unknown: "Chhotay bank kab amal karenge aur kya un ki fees badlegi.",
        forYou: "Weekend ki online tuition ki payment aglay mahine se jaldi milni chahiye."
      }
    },
    {
      id: "indus",
      topics: ["climate", "prices"],
      badge: { type: "confirmed" },
      outlets: ["Dawn", "Business Recorder", "DW Urdu"],
      minutes: 0.6,
      en: {
        section: "Water",
        headline: "Indus flows run below average as wheat sowing begins",
        dek: "The water regulator expects a shortfall this winter and has asked provinces to plan for less canal water.",
        why: "Wheat is the country’s staple, and water for the winter crop shapes flour prices next spring.",
        unknown: "How much rain the coming weeks bring. The forecasts so far disagree.",
        forYou: "Flour is steady for now. This is the story behind next spring’s mess bill."
      },
      ur: {
        section: "پانی",
        headline: "گندم کی بوائی کے آغاز پر دریائے سندھ میں پانی معمول سے کم",
        dek: "ارسا کو اس سردی میں پانی کی کمی کا خدشہ ہے اور صوبوں سے کم نہری پانی کی منصوبہ بندی کرنے کو کہا گیا ہے۔",
        why: "گندم ملک کی بنیادی خوراک ہے، اور ربیع کی فصل کا پانی اگلی بہار میں آٹے کی قیمت طے کرتا ہے۔",
        unknown: "آنے والے ہفتوں میں کتنی بارش ہوگی۔ پیش گوئیاں ابھی ایک دوسرے سے مختلف ہیں۔",
        forYou: "آٹا ابھی مستحکم ہے۔ اگلی بہار کے میس بل کے پیچھے یہی خبر ہے۔"
      },
      ro: {
        section: "Paani",
        headline: "Gandum ki buwai ke aaghaz par darya-e-Sindh mein paani mamool se kam",
        dek: "IRSA ko is sardi paani ki kami ka khadsha hai aur subon se kam nehri paani ki mansooba bandi karne ko kaha gaya hai.",
        why: "Gandum mulk ki bunyadi khurak hai, aur rabi ki fasal ka paani agli bahar mein aatay ki qeemat tay karta hai.",
        unknown: "Aanay walay hafton mein kitni barish hogi. Paish goiyan abhi aik doosray se mukhtalif hain.",
        forYou: "Aata abhi mustehkam hai. Agli bahar ke mess bill ke peechay yehi khabar hai."
      }
    },
    {
      id: "visa",
      topics: ["world", "work"],
      badge: { type: "confirmed" },
      outlets: ["Gulf News", "Khaleej Times", "The National", "Arab News", "Dawn", "Geo News", "Al Jazeera"],
      minutes: 0.6,
      en: {
        section: "Gulf",
        headline: "UAE simplifies work-visa renewals for workers with a clean record",
        dek: "Renewals can now be filed online without an in-person medical for eligible workers, officials said.",
        why: "Many Pakistani families rely on a relative in the Gulf, and renewals have meant long queues and fees.",
        unknown: "Whether the change applies in every emirate, and the date it starts.",
        forYou: "Your brother’s next renewal in Dubai may not need a trip to a medical centre."
      },
      ur: {
        section: "خلیج",
        headline: "متحدہ عرب امارات میں ورک ویزا کی تجدید آسان",
        dek: "حکام کے مطابق صاف ریکارڈ والے کارکن اب ذاتی طبی معائنے کے بغیر آن لائن تجدید کروا سکیں گے۔",
        why: "بہت سے پاکستانی گھرانے خلیج میں کام کرنے والے رشتہ داروں پر انحصار کرتے ہیں، اور تجدید میں لمبی قطاریں اور فیس لگتی تھی۔",
        unknown: "یہ تبدیلی ہر امارت میں لاگو ہوگی یا نہیں، اور کس تاریخ سے شروع ہوگی۔",
        forYou: "دبئی میں آپ کے بھائی کی اگلی تجدید پر شاید میڈیکل سینٹر نہ جانا پڑے۔"
      },
      ro: {
        section: "Khaleej",
        headline: "Mutahida Arab Emarat mein work visa ki tajdeed aasan",
        dek: "Hukkam ke mutabiq saaf record walay karkun ab zaati tibbi muainay ke baghair online tajdeed karwa sakenge.",
        why: "Bohat se Pakistani gharanay Khaleej mein kaam karne walay rishtedaron par inhisar karte hain, aur tajdeed mein lambi qataarein aur fees lagti thi.",
        unknown: "Yeh tabdeeli har emarat mein laagu hogi ya nahin, aur kis tareekh se shuru hogi.",
        forYou: "Dubai mein aap ke bhai ki agli tajdeed par shayad medical center na jana paray."
      }
    },
    {
      id: "viral",
      topics: ["misinfo"],
      badge: { type: "unconfirmed" },
      outlets: [],
      minutes: 0.5,
      chips: [
        ["WhatsApp forward", "Accounts will be FROZEN on Friday!!"],
        ["WhatsApp forward", "اکاؤنٹ جمعہ کو بند ہو جائیں گے"],
        ["WhatsApp forward", "Forward to every family group"]
      ],
      en: {
        section: "Viral check",
        headline: "The ‘accounts frozen on Friday’ message: no bank or outlet confirms it",
        dek: "A forwarded message says bank accounts will be frozen on Friday. No bank, regulator or news outlet has said so.",
        why: "Messages like this push people to share codes or open fake links. Banks never ask for a PIN by message.",
        unknown: "Where the message started. It has circulated in WhatsApp groups since the weekend.",
        forYou: "If it reached your family group, reply with this card. Nothing changes for your account."
      },
      ur: {
        section: "وائرل جانچ",
        headline: "’جمعہ کو اکاؤنٹ منجمد‘ والا پیغام: کسی بینک یا ادارے نے تصدیق نہیں کی",
        dek: "واٹس ایپ پر پھیلے پیغام میں دعویٰ ہے کہ جمعہ کو اکاؤنٹ بند ہو جائیں گے۔ کسی بینک، ریگولیٹر یا خبر رساں ادارے نے ایسا نہیں کہا۔",
        why: "ایسے پیغامات لوگوں سے کوڈ بتانے یا جعلی لنک کھولنے کو کہتے ہیں۔ بینک کبھی پیغام کے ذریعے پن نہیں مانگتے۔",
        unknown: "یہ پیغام کہاں سے شروع ہوا۔ یہ ہفتے کے آخر سے واٹس ایپ گروپوں میں گردش کر رہا ہے۔",
        forYou: "اگر یہ آپ کے فیملی گروپ میں آیا ہے تو جواب میں یہ کارڈ بھیج دیں۔ آپ کے اکاؤنٹ میں کچھ نہیں بدلے گا۔"
      },
      ro: {
        section: "Viral jaanch",
        headline: "'Jumma ko account band' wala paigham: kisi bank ya idaray ne tasdeeq nahin ki",
        dek: "WhatsApp par phailay paigham mein daawa hai ke Jumma ko account band ho jayenge. Kisi bank, regulator ya khabar raasan idaray ne aisa nahin kaha.",
        why: "Aisay paighamat logon se code batanay ya jaali link kholnay ko kehte hain. Bank kabhi message se PIN nahin maangtay.",
        unknown: "Yeh paigham kahan se shuru hua. Yeh weekend se WhatsApp groups mein gardish kar raha hai.",
        forYou: "Agar yeh aap ke family group mein aaya hai to jawab mein yeh card bhej dein. Aap ke account mein kuch nahin badlega."
      }
    }
  ];

  /* Twelve headlines for the onboarding swipe. */
  const SWIPE = [
    { topic: "prices", label: "Prices", headline: "Petrol held for two weeks, diesel up Rs 3 a litre" },
    { topic: "local", label: "Lahore", headline: "Lahore schools move to online classes on Mondays" },
    { topic: "cricket", label: "Cricket", headline: "Pakistan name a young squad for the home Tests" },
    { topic: "money", label: "Money", headline: "Rupee steady as Gulf remittances stay strong" },
    { topic: "work", label: "Work", headline: "Freelance payments to land within one working day" },
    { topic: "climate", label: "Water", headline: "Indus flows below average as wheat sowing begins" },
    { topic: "health", label: "Health", headline: "Dengue cases fall in Rawalpindi as nights turn cold" },
    { topic: "world", label: "Gulf", headline: "UAE makes work-visa renewals simpler" },
    { topic: "local", label: "Karachi", headline: "Karachi’s Green Line adds late evening buses" },
    { topic: "cricket", label: "Cricket", headline: "PSL player draft date announced" },
    { topic: "tech", label: "Tech", headline: "Tax cut proposed on phones under Rs 30,000" },
    { topic: "culture", label: "Culture", headline: "Lok Virsa folk festival opens in Islamabad" }
  ];

  const TOPICS = {
    prices: "Prices", local: "Local", cricket: "Cricket", money: "Money", work: "Work",
    climate: "Climate", health: "Health", world: "Gulf and world", tech: "Tech", culture: "Culture",
    education: "Exams"
  };

  /* Four readers for the "For you" demo on the home page. Same story, four lines. */
  const PERSONAS = [
    { id: "student", label: "Student, Lahore", line: "Your motorbike commute costs the same this fortnight. Watch bus fares and the mess bill, which follow diesel." },
    { id: "rickshaw", label: "Rickshaw driver, Karachi", line: "Your petrol rickshaw costs the same to fill until the next review on the 15th. LPG is priced separately." },
    { id: "shop", label: "Shopkeeper, Faisalabad", line: "Your supplier’s trucks run on diesel, so expect wholesale rates to edge up within a few weeks." },
    { id: "teacher", label: "Retired teacher, Multan", line: "Your pension buys the same petrol, but vegetables may cost a little more by the end of the month." }
  ];

  const TAKEAWAYS = {
    en: [
      "Petrol is unchanged for two weeks, but diesel is up Rs 3, and food prices tend to follow.",
      "Lahore’s smog plan moves Monday classes online. Masks for the ride in.",
      "The ‘accounts frozen on Friday’ message is unconfirmed. Never share a code or PIN."
    ],
    ur: [
      "پیٹرول دو ہفتے کے لیے برقرار، مگر ڈیزل تین روپے مہنگا، اور کھانے کی قیمتیں اس کے پیچھے آتی ہیں۔",
      "لاہور کے سموگ پلان کے تحت پیر کی کلاسیں آن لائن۔ سفر میں ماسک ساتھ رکھیں۔",
      "’جمعہ کو اکاؤنٹ منجمد‘ والا پیغام غیر مصدقہ ہے۔ کبھی کوڈ یا پن نہ بتائیں۔"
    ],
    ro: [
      "Petrol do haftay ke liye barqarar, magar diesel teen rupay mehnga, aur khanay ki qeematein is ke peechay aati hain.",
      "Lahore ke smog plan ke tehat peer ki classes online. Safar mein mask saath rakhein.",
      "'Jumma ko account band' wala paigham ghair musaddiqa hai. Kabhi code ya PIN na batayein."
    ]
  };

  const QUIZ = {
    en: [
      { q: "What happened to the petrol price this fortnight?", options: ["Up Rs 3 a litre", "No change", "Down Rs 5 a litre"], answer: 1, note: "Petrol held. It was diesel that rose by Rs 3." },
      { q: "Which story did only one outlet report?", options: ["Lahore’s Monday online classes", "The intermediate results date", "The young Test squad"], answer: 1, note: "That is why it carried a single-source badge." },
      { q: "What do banks never ask for by message?", options: ["Your PIN", "Your branch name", "Your city"], answer: 0, note: "Which is why the Friday message should not be forwarded." }
    ],
    ur: [
      { q: "اس پندرہ دن پیٹرول کی قیمت کا کیا ہوا؟", options: ["تین روپے مہنگا", "کوئی تبدیلی نہیں", "پانچ روپے سستا"], answer: 1, note: "پیٹرول برقرار رہا۔ تین روپے ڈیزل مہنگا ہوا۔" },
      { q: "کون سی خبر صرف ایک ادارے نے دی؟", options: ["لاہور میں پیر کو آن لائن کلاسیں", "انٹرمیڈیٹ نتائج کی تاریخ", "نوجوان ٹیسٹ اسکواڈ"], answer: 1, note: "اسی لیے اس پر ’صرف ایک ذریعہ‘ کا نشان تھا۔" },
      { q: "بینک پیغام کے ذریعے کبھی کیا نہیں مانگتے؟", options: ["آپ کا پن", "آپ کی برانچ کا نام", "آپ کا شہر"], answer: 0, note: "اسی لیے جمعہ والا پیغام آگے نہ بھیجیں۔" }
    ],
    ro: [
      { q: "Is pandrah din petrol ki qeemat ka kya hua?", options: ["Teen rupay mehnga", "Koi tabdeeli nahin", "Paanch rupay sasta"], answer: 1, note: "Petrol barqarar raha. Teen rupay diesel mehnga hua." },
      { q: "Kaun si khabar sirf aik idaray ne di?", options: ["Lahore mein peer ko online classes", "Intermediate nataij ki tareekh", "Naujawan Test squad"], answer: 1, note: "Isi liye is par 'sirf aik zariya' ka nishan tha." },
      { q: "Bank message ke zariye kabhi kya nahin maangtay?", options: ["Aap ka PIN", "Aap ki branch ka naam", "Aap ka shehar"], answer: 0, note: "Isi liye Jumma wala paigham aagay na bhejein." }
    ]
  };

  /* Gift paper "For you" lines, written for a parent instead of the student. */
  const GIFT_LINES = {
    petrol: {
      en: "No change to the house budget this fortnight, but vegetable prices may rise in a few weeks.",
      ur: "اس پندرہ دن گھر کے بجٹ پر کوئی اثر نہیں، مگر چند ہفتوں میں سبزی کے دام بڑھ سکتے ہیں۔",
      ro: "Is pandrah din ghar ke budget par koi asar nahin, magar chand hafton mein sabzi ke daam barh saktay hain."
    },
    smog: {
      en: "This week the morning walk is better indoors. Keep the windows shut until noon.",
      ur: "اس ہفتے صبح کی سیر گھر کے اندر بہتر ہے۔ دوپہر تک کھڑکیاں بند رکھیں۔",
      ro: "Is haftay subah ki sair ghar ke andar behtar hai. Dopahar tak khirkiyan band rakhein."
    },
    viral: {
      en: "If this message comes to the family group, do not share any code. Your account is fine.",
      ur: "اگر یہ پیغام خاندان کے گروپ میں آئے تو کسی کو کوئی کوڈ نہ بتائیں۔ آپ کا اکاؤنٹ ٹھیک ہے۔",
      ro: "Agar yeh paigham khandan ke group mein aaye to kisi ko koi code na batayein. Aap ka account theek hai."
    }
  };

  return { OUTLETS, PROFILE_SAMPLE, STORIES, SWIPE, TOPICS, PERSONAS, TAKEAWAYS, QUIZ, GIFT_LINES };
})();
