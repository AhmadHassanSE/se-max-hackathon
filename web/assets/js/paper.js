/* The paper: ten stories, three languages, three type sizes, read aloud on request. */
document.addEventListener("DOMContentLoaded", () => {
  const D = window.SUBAH_DATA;
  const S = window.Subah;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  const profile = S.store.get();
  let lang = ["en", "ur", "ro"].includes(profile.lang) ? profile.lang : "en";
  let size = [1, 1.22, 1.45].includes(profile.size) ? profile.size : 1;
  const name = S.cleanName(profile.name || "");
  const weights = profile.weights || {};

  /* order: what the reader cares about first, the viral check fifth, everything else after */
  const scored = D.STORIES.map((s, i) => ({ s, i, score: s.topics.reduce((a, t) => a + (weights[t] || 0), 0) }));
  const viral = scored.find((x) => x.s.id === "viral");
  const rest = scored.filter((x) => x !== viral).sort((a, b) => b.score - a.score || a.i - b.i);
  const ORDER = [...rest.slice(0, 4), viral, ...rest.slice(4)].map((x) => x.s);
  const TOTAL_MIN = ORDER.reduce((a, s) => a + s.minutes, 0);

  const T = {
    en: {
      why: "Why it matters", unknown: "What we don’t know yet", fy: "For you.", more: "Why it matters", less: "Show less",
      sources: "Reported by", none: "No outlet has reported this claim. It is circulating as a forward.", cover: "How it was covered",
      edition: "Edition No. 1", city: "Lahore", count: "10 stories, about 6 minutes", compiled: "Compiled at 5:12 am from 24 newsrooms",
      of: "of", left: "min left", done: "Done", endHead: "That’s all ten.",
      endBody: "Nothing else is waiting. Three things to remember and a short quiz are on the last page.",
      endBtn: "Finish today’s paper", share: "Copy this check for the family group", copied: "Copied. Paste it in the group.",
      forSample: "Today’s For you lines are written for this sample reader:", forYours: "You told us:",
      forYoursNote: "In this demo the lines are pre-written for a sample reader; the live paper writes each one from your sentence.",
      make: "Make it yours", listen: "Listen", stop: "Stop", noUrdu: "No Urdu voice on this device, so it reads the Roman Urdu edition. The live audio edition is a recorded Urdu voice note.",
      noSpeech: "This browser has no speech voice. The live audio edition is a recorded Urdu voice note."
    },
    ur: {
      why: "یہ کیوں اہم ہے", unknown: "جو ابھی معلوم نہیں", fy: "آپ کے لیے:", more: "یہ کیوں اہم ہے", less: "کم دکھائیں",
      sources: "رپورٹ کرنے والے ادارے:", none: "کسی ادارے نے یہ دعویٰ رپورٹ نہیں کیا۔ یہ صرف فارورڈ ہو رہا ہے۔", cover: "اداروں نے اسے کیسے پیش کیا",
      edition: "شمارہ ۱", city: "لاہور", count: "۱۰ خبریں، تقریباً ۶ منٹ", compiled: "صبح ۵:۱۲ بجے ۲۴ اداروں سے مرتب",
      of: "میں سے", left: "منٹ باقی", done: "مکمل", endHead: "بس، یہ تھیں دسوں خبریں۔",
      endBody: "آگے کچھ انتظار نہیں کر رہا۔ یاد رکھنے کی تین باتیں اور ایک مختصر کوئز آخری صفحے پر ہیں۔",
      endBtn: "آج کا اخبار مکمل کریں", share: "فیملی گروپ کے لیے کاپی کریں", copied: "کاپی ہو گیا۔ گروپ میں بھیج دیں۔",
      forSample: "آج کی ’آپ کے لیے‘ سطریں اس قاری کے لیے لکھی گئی ہیں:", forYours: "آپ نے بتایا:",
      forYoursNote: "اس ڈیمو میں سطریں ایک نمونہ قاری کے لیے پہلے سے لکھی گئی ہیں؛ اصل اخبار ہر سطر آپ کے جملے سے لکھے گا۔",
      make: "اپنا بنائیں", listen: "سنیں", stop: "روکیں", noUrdu: "اس آلے پر اردو آواز موجود نہیں، اس لیے رومن اردو پڑھی جا رہی ہے۔",
      noSpeech: "اس براؤزر میں آواز کی سہولت نہیں۔"
    },
    ro: {
      why: "Yeh kyun aham hai", unknown: "Jo abhi maloom nahin", fy: "Aap ke liye:", more: "Yeh kyun aham hai", less: "Kam dikhayein",
      sources: "Report karne walay idaray:", none: "Kisi idaray ne yeh daawa report nahin kiya. Yeh sirf forward ho raha hai.", cover: "Idaron ne ise kaise pesh kiya",
      edition: "Shumara 1", city: "Lahore", count: "10 khabrein, taqreeban 6 minute", compiled: "Subah 5:12 baje 24 idaron se murattab",
      of: "mein se", left: "minute baaqi", done: "Mukammal", endHead: "Bas, yeh theen das khabrein.",
      endBody: "Aagay kuch intezar nahin kar raha. Yaad rakhne ki teen baatein aur aik mukhtasar quiz aakhri safhay par hain.",
      endBtn: "Aaj ka akhbar mukammal karein", share: "Family group ke liye copy karein", copied: "Copy ho gaya. Group mein bhej dein.",
      forSample: "Aaj ki 'Aap ke liye' lines is namoona qari ke liye likhi gayi hain:", forYours: "Aap ne bataya:",
      forYoursNote: "Is demo mein lines aik namoona qari ke liye pehle se likhi gayi hain; asal akhbar har line aap ke jumlay se likhega.",
      make: "Apna banayein", listen: "Sunein", stop: "Rokein", noUrdu: "", noSpeech: "Is browser mein awaaz ki sahulat nahin."
    }
  };
  const num = (n) => (lang === "ur" ? S.toUrduDigits(n) : String(n));
  const CHEV = '<svg class="pp-more__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  const paper = $("#paper");

  function facts(t, L) {
    return `<dl class="pp-facts"><div><dt>${L.why}</dt><dd>${t.why}</dd></div><div><dt>${L.unknown}</dt><dd>${t.unknown}</dd></div></dl>`;
  }
  function sources(st, L) {
    return st.outlets.length
      ? `<p class="pp-sources"><b>${L.sources}</b> ${st.outlets.join(", ")}</p>`
      : `<p class="pp-sources">${L.none}</p>`;
  }
  function leadHTML(st, i, L) {
    const t = st[lang];
    const cover = st.coverage ? `
      <div class="pp-cover"><h3>${L.cover}</h3><ul>${st.coverage.map(([o, a]) => `<li><b>${o}</b><span>${a[lang]}</span></li>`).join("")}</ul></div>` : "";
    return `
      <section class="pp-lead" id="s-${st.id}" data-i="${i}" aria-labelledby="h-${st.id}">
        <div class="pp-lead__main">
          <p class="pp-sec"><span>${t.section}</span><span class="pp-num">${num(i + 1)} ${L.of} ${num(ORDER.length)}</span></p>
          <h2 class="pp-head" id="h-${st.id}">${t.headline}</h2>
          <p class="pp-dek">${t.dek}</p>
          <div class="pp-badge-row">${S.badgeHTML(st, lang)}</div>
          <p class="pp-foryou"><b>${L.fy}</b> ${t.forYou}</p>
        </div>
        <div class="pp-lead__side">
          ${facts(t, L)}
          ${cover}
          ${sources(st, L)}
        </div>
      </section>`;
  }
  function storyHTML(st, i, L) {
    const t = st[lang];
    const isViral = st.id === "viral";
    return `
      <article class="pp-story${isViral ? " pp-story--viral" : ""}" id="${isViral ? "viral" : "s-" + st.id}" data-i="${i}" aria-labelledby="h-${st.id}">
        <p class="pp-sec"><span>${t.section}</span><span class="pp-num">${num(i + 1)} ${L.of} ${num(ORDER.length)}</span></p>
        <h2 class="pp-head" id="h-${st.id}">${t.headline}</h2>
        <p class="pp-dek">${t.dek}</p>
        <div class="pp-badge-row">${S.badgeHTML(st, lang)}</div>
        <p class="pp-foryou"><b>${L.fy}</b> ${t.forYou}</p>
        <button class="pp-more" type="button" aria-expanded="false" aria-controls="d-${st.id}"><span>${L.more}</span>${CHEV}</button>
        <div class="pp-drawer" id="d-${st.id}"><div inert>${facts(t, L)}${sources(st, L)}</div></div>
        ${isViral ? `<button class="btn btn--ink btn--sm pp-share" type="button" data-share>${L.share}</button>` : ""}
      </article>`;
  }
  function forNote(L) {
    const sentence = (profile.sentence || "").trim();
    if (sentence) {
      return `<p class="pp-for"><span>${L.forYours}</span> <q>${sentence.replace(/[<>]/g, "")}</q> <span>${L.forYoursNote}</span></p>`;
    }
    return `<p class="pp-for"><span>${L.forSample}</span> <q>${D.PROFILE_SAMPLE[lang]}</q> <a href="onboard.html">${L.make}</a></p>`;
  }

  function render() {
    const L = T[lang];
    paper.setAttribute("lang", lang === "ur" ? "ur" : "en");
    paper.setAttribute("dir", lang === "ur" ? "rtl" : "ltr");
    const title = S.paperTitle(name, lang);
    const alt = lang === "ur" ? S.paperTitle(name, "en") : S.paperTitle(name, "ur");
    document.title = `${S.paperTitle(name, "en")}, today’s paper`;
    paper.innerHTML = `
      <header class="pp-mast">
        <div class="pp-mast__top"><span>${L.edition}</span><span>${L.city}</span><span>${lang === "ur" ? S.dates.hijriUr() : S.dates.hijriEn()}</span><span>${L.compiled}</span></div>
        <h1 class="pp-title">${title}</h1>
        <p class="pp-title-alt" ${lang === "ur" ? 'lang="en" dir="ltr"' : 'lang="ur" dir="rtl"'}>${alt}</p>
        <div class="pp-mast__bar"><span>${S.dates[lang]()}</span><span>${L.count}</span></div>
        ${forNote(L)}
      </header>
      ${leadHTML(ORDER[0], 0, L)}
      <div class="pp-grid">${ORDER.slice(1).map((st, k) => storyHTML(st, k + 1, L)).join("")}</div>
      <footer class="pp-end">
        <div class="pp-end__rule"></div>
        <svg class="pp-end__mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="19" r="8" fill="var(--kesar)"/><path d="M3 21.5h26" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M16 4.5v3.2M6.6 8.4l2.2 2.2M25.4 8.4l-2.2 2.2" stroke="var(--kesar)" stroke-width="2.2" stroke-linecap="round"/></svg>
        <h2>${L.endHead}</h2>
        <p>${L.endBody}</p>
        <a class="btn btn--primary" href="end.html" data-magnetic="0.18"><span>${L.endBtn}</span><span class="btn__orb">${S.ICONS.arrow}</span></a>
      </footer>`;
    paper.style.setProperty("--scale", size);
    paper.classList.toggle("is-large", size >= 1.2);
    paper.classList.toggle("is-larger", size >= 1.4);
    bindStories();
    S.magnetic(paper);
    paintListen();
    $("#pp-left-label").textContent = L.left;
    updateProgress();
  }

  function bindStories() {
    $$(".pp-more", paper).forEach((btn) => {
      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") === "true";
        const drawer = document.getElementById(btn.getAttribute("aria-controls"));
        btn.setAttribute("aria-expanded", String(!open));
        drawer.classList.toggle("is-open", !open);
        drawer.firstElementChild.inert = open;
        btn.querySelector("span").textContent = open ? T[lang].more : T[lang].less;
      });
    });
    const share = $("[data-share]", paper);
    if (share) {
      share.addEventListener("click", async () => {
        const st = D.STORIES.find((s) => s.id === "viral")[lang];
        const text = `${st.headline}\n${st.forYou}\nSubah viral check`;
        const label = share.textContent;
        try { await navigator.clipboard.writeText(text); share.textContent = T[lang].copied; }
        catch (e) { share.textContent = T[lang].copied; }
        setTimeout(() => { share.textContent = label; }, 2500);
      });
    }
  }

  /* ---------------------------------------------------------------- reading progress */
  const dots = $("#pp-dots");
  dots.innerHTML = ORDER.map((s, i) => `<li title="${s.en.section}"><span class="sr-only">Story ${i + 1}</span></li>`).join("");
  const ring = $("#pp-ring");
  const leftEl = $("#pp-left");
  const read = new Set();
  const bar = $(".read-progress span");
  let ticking = false;
  function updateProgress() {
    const blocks = $$("[data-i]", paper);
    const vh = window.innerHeight;
    let current = -1;
    blocks.forEach((b) => {
      const r = b.getBoundingClientRect();
      const i = +b.dataset.i;
      if (r.bottom < vh * 0.55) read.add(i);
      if (current < 0 && r.bottom > 160) current = i;
    });
    $$("li", dots).forEach((li, i) => { li.classList.toggle("is-read", read.has(i)); li.classList.toggle("is-current", i === current && !read.has(i)); });
    const readMin = ORDER.reduce((a, s, i) => a + (read.has(i) ? s.minutes : 0), 0);
    const left = Math.max(0, Math.ceil(TOTAL_MIN - readMin - 0.001));
    leftEl.textContent = read.size === ORDER.length ? T[lang].done : num(left);
    $("#pp-left-label").hidden = read.size === ORDER.length;
    ring.style.strokeDashoffset = String(100.53 * (1 - read.size / ORDER.length));
    const doc = document.documentElement;
    bar.style.setProperty("--p", Math.min(1, window.scrollY / Math.max(1, doc.scrollHeight - vh)));
  }
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateProgress(); ticking = false; });
  }, { passive: true });
  window.addEventListener("resize", updateProgress);

  /* ---------------------------------------------------------------- language */
  const langSeg = $("#pp-lang");
  function paintLang() { $$("button", langSeg).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang))); }
  paintLang();
  langSeg.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.dataset.lang === lang) return;
    stopAudio();
    const go = () => { lang = b.dataset.lang; S.store.set({ lang }); paintLang(); render(); };
    if (document.startViewTransition && !S.reduceMotion) document.startViewTransition(go);
    else go();
  });

  /* ---------------------------------------------------------------- type size */
  const sizeSeg = $("#pp-size");
  function paintSize() { $$("button", sizeSeg).forEach((b) => b.setAttribute("aria-pressed", String(parseFloat(b.dataset.size) === size))); }
  paintSize();
  sizeSeg.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    size = parseFloat(b.dataset.size);
    S.store.set({ size });
    paintSize();
    paper.style.setProperty("--scale", size);
    paper.classList.toggle("is-large", size >= 1.2);
    paper.classList.toggle("is-larger", size >= 1.4);
    updateProgress();
  });

  /* ---------------------------------------------------------------- audio edition */
  const listen = $("#pp-listen");
  const note = $("#pp-note");
  function paintListen() {
    const on = listen.classList.contains("is-speaking");
    $(".pp-listen__label", listen).textContent = on ? T[lang].stop : T[lang].listen;
  }
  function stopAudio() {
    S.speech.stop();
    listen.classList.remove("is-speaking");
    listen.setAttribute("aria-pressed", "false");
    $(".pp-listen__icon", listen).innerHTML = S.ICONS.play;
    $$(".is-reading", paper).forEach((el) => el.classList.remove("is-reading"));
    paintListen();
  }
  listen.addEventListener("click", () => {
    if (listen.classList.contains("is-speaking")) { stopAudio(); note.textContent = ""; return; }
    if (!S.speech.supported) { note.textContent = T[lang].noSpeech; return; }
    let readLang = lang;
    const v = S.speech.voiceFor("ur");
    if (lang === "ur" && !(v && v.lang.toLowerCase().startsWith("ur"))) { readLang = "ro"; note.textContent = T.en.noUrdu; }
    else note.textContent = "";
    const items = ORDER.map((st, i) => {
      const t = st[readLang];
      return {
        text: `${t.headline}. ${T[readLang].fy.replace(/[.:]$/, "")}: ${t.forYou}`,
        onStart: () => {
          $$("[data-i]", paper).forEach((b) => b.classList.toggle("is-reading", +b.dataset.i === i));
          const el = $(`[data-i="${i}"]`, paper);
          if (el) el.scrollIntoView({ behavior: S.reduceMotion ? "auto" : "smooth", block: "center" });
        }
      };
    });
    listen.classList.add("is-speaking");
    listen.setAttribute("aria-pressed", "true");
    $(".pp-listen__icon", listen).innerHTML = S.ICONS.pause;
    paintListen();
    S.speech.play(items, readLang, { onEnd: stopAudio });
  });

  render();
  if (location.hash) {
    const el = document.querySelector(location.hash);
    if (el) setTimeout(() => el.scrollIntoView({ block: "start" }), 60);
  }
});
