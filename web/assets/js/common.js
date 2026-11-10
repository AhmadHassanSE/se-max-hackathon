/* Subah shared helpers: reader profile, API with offline fallback, Urdu, dates, badges, small motion helpers. */
(function () {
  const doc = document.documentElement;
  doc.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) doc.classList.add("motion");
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------------------------------------------------------------- icons */
  const ICONS = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    stack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h16M4 12h16M4 16h10"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="7.5" r="1.4"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>'
  };

  /* ---------------------------------------------------------------- reader profile (test profiles only, this browser only) */
  const KEY = "subah.profile.v2";
  const DEFAULT_PROFILE = { name: "", city: null, topics: [], lang: "en", large: false };
  const TEST_READERS = [
    { label: "Test reader A", name: "Test A", city: "lahore", topics: ["prices", "weather"], lang: "en", large: false },
    { label: "Test reader B", name: "Test B", city: "karachi", topics: ["economy", "jobs"], lang: "ur", large: false },
    { label: "Test reader C", name: "Test C", city: "rawalpindi", topics: ["health", "cricket"], lang: "ur", large: true }
  ];
  const store = {
    get() {
      try { return Object.assign({}, DEFAULT_PROFILE, JSON.parse(localStorage.getItem(KEY) || "{}")); }
      catch (e) { return Object.assign({}, DEFAULT_PROFILE); }
    },
    set(patch) {
      const next = Object.assign({}, store.get(), patch);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* private mode */ }
      return next;
    },
    getEdition() {
      try { return JSON.parse(sessionStorage.getItem("subah.edition") || "null"); } catch (e) { return null; }
    },
    setEdition(ed) {
      try { sessionStorage.setItem("subah.edition", JSON.stringify(ed)); } catch (e) { /* too big or blocked */ }
    }
  };

  /* ---------------------------------------------------------------- API, with static files when the server is not running */
  async function getJSON(url, opts) {
    const res = await fetch(url, Object.assign({ headers: { "Content-Type": "application/json" } }, opts || {}));
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try { detail = (await res.json()).detail || detail; } catch (e) { /* not json */ }
      const err = new Error(detail);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
  const api = {
    online: null,
    async health() {
      try { const h = await getJSON("/api/health"); api.online = true; return h; }
      catch (e) { api.online = false; return null; }
    },
    async catalog() {
      try { return await getJSON("/api/catalog"); } catch (e) { return getJSON("assets/data/catalog.json"); }
    },
    async outlets() {
      try { return await getJSON("/api/outlets"); } catch (e) { return getJSON("assets/data/outlets.json"); }
    },
    async generate(profile, source, pool) {
      const body = { profile: { city: profile.city || null, topics: profile.topics || [], lang: profile.lang || "en" } };
      if (source) body.source = source;
      if (pool) body.pool = pool;
      const ed = await getJSON("/api/generate", { method: "POST", body: JSON.stringify(body) });
      store.setEdition(ed);
      return ed;
    },
    /* the reader's latest paper: this session, else the server's latest, else the bundled sample */
    async edition() {
      const mine = store.getEdition();
      if (mine) return mine;
      try { return await getJSON("/api/edition/latest"); }
      catch (e) { return getJSON("assets/data/sample-edition.json"); }
    }
  };

  /* ---------------------------------------------------------------- the reader's own picks
     Loved stories come first, then kept ones, each group in the published formula order; passed stories leave the paper. */
  function pickedStories(edition) {
    const picks = edition && edition.picks;
    if (!picks) return edition ? edition.stories : [];
    const loved = edition.stories.filter((s) => picks[s.id] === "love");
    const kept = edition.stories.filter((s) => picks[s.id] === "keep");
    return loved.concat(kept);
  }
  function savePicks(edition, picks) {
    edition.picks = picks;
    store.setEdition(edition);
    return edition;
  }

  /* ---------------------------------------------------------------- Urdu and text helpers */
  const URDU_NAMES = {
    ayesha: "عائشہ", aisha: "عائشہ", ali: "علی", fatima: "فاطمہ", ahmed: "احمد", ahmad: "احمد", sara: "سارہ", hamza: "حمزہ",
    zainab: "زینب", usman: "عثمان", bilal: "بلال", hira: "حرا", omar: "عمر", umar: "عمر", maryam: "مریم", hassan: "حسن",
    amna: "آمنہ", ammi: "امی", abbu: "ابو", abba: "ابا", nani: "نانی", dadi: "دادی", nana: "نانا", dada: "دادا", khala: "خالہ",
    mama: "ماما", papa: "پاپا", mum: "امی", mom: "امی", dad: "ابو", sana: "ثنا", noor: "نور", rana: "رانا"
  };
  function urduName(name) {
    if (!name) return "";
    const first = name.trim().split(/\s+/)[0].toLowerCase();
    return URDU_NAMES[first] || name.trim();
  }
  const toUrduDigits = (v) => String(v).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cleanName = (raw) => (raw || "").replace(/[<>]/g, "").trim().slice(0, 24);
  function paperTitle(name, lang) {
    const n = cleanName(name);
    if (lang === "ur") return (n ? urduName(n) : "آپ") + " کی صبح";
    return n ? (/s$/i.test(n) ? n + "’" : n + "’s") + " Subah" : "Your Subah";
  }

  /* ---------------------------------------------------------------- dates (Lahore) */
  const TZ = "Asia/Karachi";
  const fmt = (locale, opts, d) => {
    try { return new Intl.DateTimeFormat(locale, Object.assign({ timeZone: TZ }, opts)).format(d || new Date()); }
    catch (e) { return ""; }
  };
  const dates = {
    en: (d) => fmt("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }, d),
    ur: (d) => fmt("ur-PK-u-nu-arabext", { weekday: "long", day: "numeric", month: "long", year: "numeric" }, d),
    time: (d, lang) => fmt(lang === "ur" ? "ur-PK-u-nu-arabext" : "en-GB", { hour: "numeric", minute: "2-digit", hour12: true }, d),
    hijriEn: (d) => fmt("en-GB-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }, d),
    hijriUr: (d) => fmt("ur-PK-u-ca-islamic-umalqura-nu-arabext", { day: "numeric", month: "long", year: "numeric" }, d)
  };
  function ago(iso, lang) {
    if (!iso) return "";
    const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (lang === "ur") {
      if (mins < 60) return `${toUrduDigits(mins)} منٹ پہلے`;
      const h = Math.round(mins / 60);
      return h < 48 ? `${toUrduDigits(h)} گھنٹے پہلے` : `${toUrduDigits(Math.round(h / 24))} دن پہلے`;
    }
    if (mins < 60) return `${mins} min ago`;
    const h = Math.round(mins / 60);
    return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
  }
  function fillDates(root) {
    (root || document).querySelectorAll("[data-today]").forEach((el) => {
      const kind = el.getAttribute("data-today") || "en";
      el.textContent = (dates[kind] || dates.en)();
    });
  }
  function nextSevenAm(now) {
    now = now || new Date();
    const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 2, 0, 0));
    if (t <= now) t.setUTCDate(t.getUTCDate() + 1);
    return t;
  }
  function countdown(el, opts) {
    opts = opts || {};
    if (!el) return 0;
    const tick = () => {
      const ms = nextSevenAm() - new Date();
      const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
      const pad = (n) => String(n).padStart(2, "0");
      const txt = `${pad(h)}:${pad(m)}:${pad(s)}`;
      el.textContent = opts.urdu ? toUrduDigits(txt) : txt;
      el.setAttribute("datetime", `PT${h}H${m}M${s}S`);
    };
    tick();
    return setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------------- story pieces */
  /* The coverage label: a count of distinct outlets, never a verdict. */
  function coverageHTML(story, lang, opts) {
    opts = opts || {};
    const n = story.outlet_count;
    const label = (story.coverage && story.coverage[lang]) || (lang === "ur" ? `${toUrduDigits(n)} اداروں نے رپورٹ کیا` : `Reported by ${n} outlet${n === 1 ? "" : "s"}`);
    const dots = opts.dots === false ? "" : `<span class="badge__dots" aria-hidden="true">${"<i></i>".repeat(Math.min(n, 9))}</span>`;
    return `<span class="badge badge--coverage"${lang === "ur" ? ' lang="ur"' : ""}><span class="badge__icon">${ICONS.stack}</span>${esc(label)}${dots}</span>`;
  }
  /* "For you" tags: shown only when the story matched the reader's own city or topics, with the word that matched. */
  function forYouHTML(tags, lang) {
    if (!tags || !tags.length) return "";
    const head = lang === "ur" ? "آپ کے لیے" : "For you";
    const chips = tags.map((t) => {
      const label = lang === "ur" ? t.label_ur : t.label_en;
      const why = lang === "ur" ? `’${t.term}‘ کی بنیاد پر` : `matched “${t.term}”`;
      return `<span class="fy-tag fy-tag--${t.type}" title="${esc(why)}">${t.type === "city" ? ICONS.pin : ICONS.tag}<span>${esc(label)}</span><span class="fy-tag__why">${esc(why)}</span></span>`;
    }).join("");
    return `<div class="fy"${lang === "ur" ? ' lang="ur"' : ""}><span class="fy__head">${head}</span>${chips}</div>`;
  }
  function headlineOf(story, lang) {
    if (story.summary) return story.summary[lang].headline;
    return story.headline[lang] || story.headline.en;
  }

  /* ---------------------------------------------------------------- nav */
  function initNav() {
    document.querySelectorAll(".nav").forEach((nav) => {
      const btn = nav.querySelector(".nav__menu-btn");
      if (!btn) return;
      btn.innerHTML = ICONS.menu;
      btn.addEventListener("click", () => {
        const open = nav.getAttribute("data-open") === "true";
        nav.setAttribute("data-open", String(!open));
        btn.setAttribute("aria-expanded", String(!open));
        btn.innerHTML = open ? ICONS.menu : ICONS.close;
      });
      nav.querySelectorAll(".nav__links a").forEach((a) => a.addEventListener("click", () => {
        nav.setAttribute("data-open", "false");
        btn.setAttribute("aria-expanded", "false");
        btn.innerHTML = ICONS.menu;
      }));
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && nav.getAttribute("data-open") === "true") { btn.click(); btn.focus(); }
      });
    });
  }

  /* ---------------------------------------------------------------- motion helpers */
  function magnetic(root) {
    if (reduceMotion || !finePointer) return;
    (root || document).querySelectorAll("[data-magnetic]").forEach((el) => {
      if (el.dataset.magBound) return;
      el.dataset.magBound = "1";
      const strength = parseFloat(el.getAttribute("data-magnetic")) || 0.28;
      let raf = 0;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * strength;
        const y = (e.clientY - r.top - r.height / 2) * strength;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => { el.style.transform = `translate(${x}px, ${y}px)`; });
      });
      el.addEventListener("pointerleave", () => {
        cancelAnimationFrame(raf);
        el.style.transition = "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform = "";
        setTimeout(() => { el.style.transition = ""; }, 430);
      });
    });
  }
  function tilt(el, max, opts) {
    if (!el || reduceMotion || !finePointer) return;
    max = max || 8;
    opts = opts || {};
    const target = opts.target || el;
    const base = opts.base || "";
    const host = opts.host || el;
    let raf = 0;
    host.addEventListener("pointermove", (e) => {
      const r = host.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        target.style.transform = `${base} perspective(1100px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
      });
    });
    host.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      target.style.transition = "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)";
      target.style.transform = base;
      setTimeout(() => { target.style.transition = ""; }, 610);
    });
  }
  function reveal(root) {
    const els = (root || document).querySelectorAll("[data-reveal]:not(.is-seen)");
    if (!("IntersectionObserver" in window) || reduceMotion) { els.forEach((el) => el.classList.add("is-seen")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-seen"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -12% 0px" });
    els.forEach((el) => io.observe(el));
  }
  function countUp(el, to, opts) {
    opts = opts || {};
    if (reduceMotion) { el.textContent = opts.urdu ? toUrduDigits(to) : to; return; }
    const dur = opts.duration || 900;
    const t0 = performance.now();
    const frame = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const v = Math.round(to * (1 - Math.pow(1 - p, 3)));
      el.textContent = opts.urdu ? toUrduDigits(v) : v;
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  let toastEl = null, toastTimer = 0;
  function toast(msg, ms) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(() => toastEl.classList.add("is-on"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), ms || 4200);
  }

  const SUN_MARK = `<svg class="wordmark__mark" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="19" r="8" fill="var(--kesar)"/>
      <path d="M3 21.5h26" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M8 25.5h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
      <path d="M16 4.5v3.2M6.6 8.4l2.2 2.2M25.4 8.4l-2.2 2.2" stroke="var(--kesar)" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`;
  function paintMarks(root) {
    (root || document).querySelectorAll("[data-sunmark]").forEach((el) => { el.outerHTML = SUN_MARK; });
    (root || document).querySelectorAll("[data-icon]").forEach((el) => { el.innerHTML = ICONS[el.getAttribute("data-icon")] || ""; });
  }

  window.Subah = {
    ICONS, store, api, TEST_READERS, urduName, toUrduDigits, esc, cleanName, paperTitle, dates, ago, fillDates,
    nextSevenAm, countdown, pickedStories, savePicks, coverageHTML, forYouHTML, headlineOf, magnetic, tilt, reveal, countUp, toast,
    paintMarks, reduceMotion, finePointer
  };

  document.addEventListener("DOMContentLoaded", () => {
    paintMarks();
    initNav();
    fillDates();
    magnetic();
    reveal();
  });
})();
