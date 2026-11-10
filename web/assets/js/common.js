/* Subah shared helpers: storage, Urdu, dates, nav, motion helpers, swipe deck, speech. */
(function () {
  const doc = document.documentElement;
  doc.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) doc.classList.add("motion");
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------------------------------------------------------------- icons */
  const ICONS = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    one: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 7l3-2v14"/></svg>',
    question: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 9a3 3 0 1 1 4.2 2.7c-.8.4-1.2 1-1.2 1.8V15"/><path d="M12 19h.01"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4.5" height="14" rx="1.2"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.2"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>',
    keep: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  /* ---------------------------------------------------------------- storage (never required) */
  const KEY = "subah.profile.v1";
  const store = {
    get() {
      try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; }
    },
    set(patch) {
      const next = Object.assign({}, store.get(), patch);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* private mode: fine */ }
      return next;
    }
  };

  /* ---------------------------------------------------------------- Urdu helpers */
  const URDU_NAMES = {
    ayesha: "عائشہ", aisha: "عائشہ", ali: "علی", fatima: "فاطمہ", ahmed: "احمد", ahmad: "احمد", sara: "سارہ", sarah: "سارہ",
    hamza: "حمزہ", zainab: "زینب", usman: "عثمان", bilal: "بلال", hira: "حرا", omar: "عمر", umar: "عمر", maryam: "مریم",
    hassan: "حسن", hasan: "حسن", hussain: "حسین", amna: "آمنہ", ammi: "امی", ammi_jaan: "امی جان", abbu: "ابو", abba: "ابا",
    nani: "نانی", dadi: "دادی", nana: "نانا", dada: "دادا", khala: "خالہ", phuppo: "پھپھو", mamu: "ماموں", chacha: "چچا",
    mama: "ماما", papa: "پاپا", mum: "امی", mom: "امی", mother: "امی", dad: "ابو", father: "ابو",
    zara: "زارا", sana: "ثنا", imran: "عمران", asad: "اسد", farah: "فرح", noor: "نور", saad: "سعد", hina: "حنا",
    kashif: "کاشف", rabia: "رابعہ", saima: "صائمہ", tariq: "طارق", yasir: "یاسر", zoya: "زویا", ibrahim: "ابراہیم",
    yusuf: "یوسف", aliza: "علیزہ", mahnoor: "ماہ نور", areeba: "اریبہ", haris: "حارث", talha: "طلحہ", danish: "دانش"
  };
  function urduName(name) {
    if (!name) return "";
    const k = name.trim().toLowerCase().replace(/\s+/g, "_");
    if (URDU_NAMES[k]) return URDU_NAMES[k];
    const first = name.trim().split(/\s+/)[0].toLowerCase();
    return URDU_NAMES[first] || name.trim();
  }
  function toUrduDigits(v) {
    return String(v).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  }
  function possessive(name) {
    const n = (name || "").trim();
    if (!n) return "";
    return /s$/i.test(n) ? n + "’" : n + "’s";
  }
  function cleanName(raw) {
    return (raw || "").replace(/[<>]/g, "").trim().slice(0, 24);
  }
  function paperTitle(name, lang) {
    const n = cleanName(name);
    if (lang === "ur") return (n ? urduName(n) : "آپ") + " کی صبح";
    if (lang === "ro") return (n || "Aap") + " ki Subah";
    return n ? possessive(n) + " Subah" : "Your Subah";
  }

  /* ---------------------------------------------------------------- dates (Lahore) */
  const TZ = "Asia/Karachi";
  function fmt(locale, opts, d) {
    try { return new Intl.DateTimeFormat(locale, Object.assign({ timeZone: TZ }, opts)).format(d || new Date()); }
    catch (e) { return ""; }
  }
  const dates = {
    en: (d) => fmt("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }, d),
    ur: (d) => fmt("ur-PK-u-nu-arabext", { weekday: "long", day: "numeric", month: "long", year: "numeric" }, d),
    ro: (d) => fmt("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }, d),
    hijriEn: (d) => fmt("en-GB-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }, d),
    hijriUr: (d) => fmt("ur-PK-u-ca-islamic-umalqura-nu-arabext", { day: "numeric", month: "long", year: "numeric" }, d)
  };
  function fillDates(root) {
    (root || document).querySelectorAll("[data-today]").forEach((el) => {
      const kind = el.getAttribute("data-today") || "en";
      el.textContent = (dates[kind] || dates.en)();
    });
  }

  /* next 7:00 am in Lahore (UTC+5, no daylight saving) */
  function nextSevenAm(now) {
    now = now || new Date();
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 2, 0, 0));
    if (target <= now) target.setUTCDate(target.getUTCDate() + 1);
    return target;
  }
  function countdown(el, opts) {
    opts = opts || {};
    if (!el) return;
    const tick = () => {
      const ms = nextSevenAm() - new Date();
      const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
      const pad = (n) => String(n).padStart(2, "0");
      let txt = `${pad(h)}:${pad(m)}:${pad(s)}`;
      if (opts.urdu) txt = toUrduDigits(txt);
      el.textContent = txt;
      el.setAttribute("datetime", `PT${h}H${m}M${s}S`);
    };
    tick();
    return setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------------- badges */
  const BADGE_TEXT = {
    en: { confirmed: (n) => `Confirmed by ${n} outlets`, single: () => "Single source", unconfirmed: () => "Unconfirmed: no outlet reported it" },
    ur: { confirmed: (n) => `${toUrduDigits(n)} اداروں سے تصدیق شدہ`, single: () => "صرف ایک ذریعہ", unconfirmed: () => "غیر مصدقہ: کسی ادارے نے رپورٹ نہیں کیا" },
    ro: { confirmed: (n) => `${n} idaron se tasdeeq shuda`, single: () => "Sirf aik zariya", unconfirmed: () => "Ghair musaddiqa: kisi idaray ne report nahin kiya" }
  };
  function badgeHTML(story, lang, opts) {
    lang = lang || "en";
    opts = opts || {};
    const type = story.badge.type;
    const n = story.outlets.length;
    const icon = type === "confirmed" ? ICONS.check : type === "single" ? ICONS.one : ICONS.question;
    const text = BADGE_TEXT[lang][type](n);
    const dots = type === "confirmed" && opts.dots !== false
      ? `<span class="badge__dots" aria-hidden="true">${"<i></i>".repeat(Math.min(n, 9))}</span>` : "";
    const langAttr = lang === "ur" ? ' lang="ur"' : "";
    return `<span class="badge badge--${type}"${langAttr}><span class="badge__icon">${icon}</span>${text}${dots}</span>`;
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

  /* ---------------------------------------------------------------- magnetic buttons */
  function magnetic(root) {
    if (reduceMotion || !finePointer) return;
    (root || document).querySelectorAll("[data-magnetic]").forEach((el) => {
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

  /* ---------------------------------------------------------------- tilt */
  function tilt(el, max, opts) {
    if (!el || reduceMotion || !finePointer) return;
    max = max || 8;
    opts = opts || {};
    const target = opts.target || el;
    const base = opts.base || "";
    let raf = 0;
    const host = opts.host || el;
    host.addEventListener("pointermove", (e) => {
      const r = host.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        target.style.transform = `${base} perspective(1100px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
        if (opts.glare) {
          target.style.setProperty("--gx", `${(px + 0.5) * 100}%`);
          target.style.setProperty("--gy", `${(py + 0.5) * 100}%`);
        }
      });
    });
    host.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      target.style.transition = "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)";
      target.style.transform = base;
      setTimeout(() => { target.style.transition = ""; }, 610);
    });
  }

  /* ---------------------------------------------------------------- reveal once */
  function reveal(root) {
    const els = (root || document).querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window) || reduceMotion) { els.forEach((el) => el.classList.add("is-seen")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-seen"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -12% 0px" });
    els.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------------- typewriter */
  const typers = new WeakMap();
  function typewriter(el, text, opts) {
    opts = opts || {};
    const prev = typers.get(el);
    if (prev) prev.cancel = true;
    const job = { cancel: false };
    typers.set(el, job);
    if (reduceMotion) { el.textContent = text; return Promise.resolve(); }
    el.textContent = "";
    el.classList.add("is-typing");
    const speed = opts.speed || 18;
    return new Promise((resolve) => {
      let i = 0;
      const step = () => {
        if (job.cancel) return resolve();
        i += 1 + (Math.random() < 0.3 ? 1 : 0);
        el.textContent = text.slice(0, i);
        if (i < text.length) setTimeout(step, speed + Math.random() * speed);
        else { el.classList.remove("is-typing"); resolve(); }
      };
      step();
    });
  }

  /* ---------------------------------------------------------------- count up */
  function countUp(el, to, opts) {
    opts = opts || {};
    const dur = opts.duration || 900;
    const urdu = opts.urdu;
    if (reduceMotion) { el.textContent = urdu ? toUrduDigits(to) : to; return; }
    const from = opts.from || 0;
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const frame = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const v = Math.round(from + (to - from) * ease(p));
      el.textContent = urdu ? toUrduDigits(v) : v;
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------- swipe deck */
  class SwipeDeck {
    constructor(root, items, opts) {
      this.root = root;
      this.items = items.slice();
      this.opts = opts || {};
      this.index = 0;
      this.render();
      this.bindKeys();
    }
    cardHTML(item, i) {
      const total = this.items.length;
      return `
        <span class="swipe-card__meta"><span class="swipe-card__label">${item.label}</span><span class="swipe-card__count tabular">${i + 1} of ${total}</span></span>
        <span class="swipe-card__headline">${item.headline}</span>
        <span class="swipe-card__stamp swipe-card__stamp--keep" aria-hidden="true">Keep</span>
        <span class="swipe-card__stamp swipe-card__stamp--pass" aria-hidden="true">Pass</span>
        <span class="swipe-card__stamp swipe-card__stamp--love" aria-hidden="true">Love</span>`;
    }
    render() {
      this.root.innerHTML = "";
      const depth = Math.min(3, this.items.length - this.index);
      for (let d = depth - 1; d >= 0; d--) {
        const i = this.index + d;
        const card = document.createElement("div");
        card.className = "swipe-card";
        card.style.setProperty("--d", d);
        card.innerHTML = this.cardHTML(this.items[i], i);
        if (d === 0) {
          card.classList.add("is-top");
          card.setAttribute("role", "group");
          card.setAttribute("aria-label", `Headline ${i + 1} of ${this.items.length}: ${this.items[i].headline}`);
          this.bindDrag(card);
          this.top = card;
        } else {
          card.setAttribute("aria-hidden", "true");
        }
        this.root.appendChild(card);
      }
      if (this.index >= this.items.length) {
        this.top = null;
        if (this.opts.onDone) this.opts.onDone();
      }
    }
    bindDrag(card) {
      let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false, id = null;
      const onDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        dragging = true; id = e.pointerId; sx = e.clientX; sy = e.clientY; dx = dy = 0;
        card.setPointerCapture(id);
        card.style.transition = "none";
        card.classList.add("is-dragging");
      };
      const onMove = (e) => {
        if (!dragging || e.pointerId !== id) return;
        dx = e.clientX - sx; dy = e.clientY - sy;
        card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.06}deg)`;
        const keep = Math.max(0, Math.min(1, dx / 110));
        const pass = Math.max(0, Math.min(1, -dx / 110));
        const love = Math.max(0, Math.min(1, -dy / 110)) * (Math.abs(dx) < 80 ? 1 : 0);
        card.style.setProperty("--keep", keep);
        card.style.setProperty("--pass", pass);
        card.style.setProperty("--love", love);
      };
      const onUp = (e) => {
        if (!dragging || e.pointerId !== id) return;
        dragging = false;
        card.classList.remove("is-dragging");
        if (dx > 110) this.fling("keep");
        else if (dx < -110) this.fling("pass");
        else if (dy < -110 && Math.abs(dx) < 90) this.fling("love");
        else {
          card.style.transition = "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)";
          card.style.transform = "";
          card.style.setProperty("--keep", 0); card.style.setProperty("--pass", 0); card.style.setProperty("--love", 0);
        }
      };
      card.addEventListener("pointerdown", onDown);
      card.addEventListener("pointermove", onMove);
      card.addEventListener("pointerup", onUp);
      card.addEventListener("pointercancel", onUp);
    }
    fling(action) {
      const card = this.top;
      if (!card || this.busy) return;
      this.busy = true;
      const item = this.items[this.index];
      const w = window.innerWidth;
      const to = action === "keep" ? `translate(${w * 0.7}px, 40px) rotate(24deg)`
        : action === "pass" ? `translate(${-w * 0.7}px, 40px) rotate(-24deg)`
        : `translate(0, ${-window.innerHeight * 0.8}px) rotate(-4deg)`;
      card.style.setProperty(`--${action}`, 1);
      card.style.transition = reduceMotion ? "opacity 150ms linear" : "transform 520ms cubic-bezier(0.55, 0, 1, 0.45), opacity 520ms linear";
      if (reduceMotion) card.style.opacity = 0; else { card.style.transform = to; card.style.opacity = 0; }
      if (this.opts.onSwipe) this.opts.onSwipe(item, action, this.index);
      setTimeout(() => {
        this.index += 1;
        this.busy = false;
        this.render();
        if (this.top && this.opts.focusTop) this.top.focus?.();
      }, reduceMotion ? 160 : 380);
    }
    bindKeys() {
      this.root.setAttribute("tabindex", "0");
      this.root.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); this.fling("keep"); }
        if (e.key === "ArrowLeft") { e.preventDefault(); this.fling("pass"); }
        if (e.key === "ArrowUp") { e.preventDefault(); this.fling("love"); }
      });
    }
  }

  /* ---------------------------------------------------------------- speech (audio edition) */
  const speech = {
    supported: "speechSynthesis" in window,
    voiceFor(lang) {
      if (!this.supported) return null;
      const voices = speechSynthesis.getVoices();
      const want = lang === "ur" ? ["ur-PK", "ur-IN", "ur"] : lang === "ro" ? ["en-PK", "en-IN", "en-GB", "en"] : ["en-PK", "en-GB", "en-IN", "en-US", "en"];
      for (const w of want) {
        const v = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(w.toLowerCase()));
        if (v) return v;
      }
      return null;
    },
    stop() { if (this.supported) speechSynthesis.cancel(); this.playing = false; },
    /* items: [{text, onStart}] */
    play(items, lang, hooks) {
      hooks = hooks || {};
      if (!this.supported) { hooks.onUnsupported && hooks.onUnsupported(); return; }
      this.stop();
      const voice = this.voiceFor(lang);
      let fallback = false;
      if (lang === "ur" && (!voice || !voice.lang.toLowerCase().startsWith("ur"))) fallback = true;
      this.playing = true;
      hooks.onStart && hooks.onStart({ fallback, voice });
      items.forEach((it, i) => {
        const u = new SpeechSynthesisUtterance(it.text);
        if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = lang === "ur" ? "ur-PK" : "en-GB"; }
        u.rate = lang === "ur" ? 0.92 : 0.98;
        u.onstart = () => it.onStart && it.onStart(i);
        if (i === items.length - 1) u.onend = () => { this.playing = false; hooks.onEnd && hooks.onEnd(); };
        speechSynthesis.speak(u);
      });
    }
  };
  if (speech.supported) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); }

  /* ---------------------------------------------------------------- toast */
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

  /* ---------------------------------------------------------------- wordmark sun */
  const SUN_MARK = `<svg class="wordmark__mark" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="19" r="8" fill="var(--kesar)"/>
      <rect x="0" y="19" width="32" height="13" fill="currentColor" opacity="0"/>
      <path d="M3 21.5h26" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M8 25.5h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
      <path d="M16 4.5v3.2M6.6 8.4l2.2 2.2M25.4 8.4l-2.2 2.2" stroke="var(--kesar)" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`;
  function paintMarks() {
    document.querySelectorAll("[data-sunmark]").forEach((el) => { el.outerHTML = SUN_MARK; });
    document.querySelectorAll("[data-icon]").forEach((el) => { el.innerHTML = ICONS[el.getAttribute("data-icon")] || ""; });
  }

  window.Subah = {
    ICONS, store, urduName, toUrduDigits, possessive, cleanName, paperTitle, dates, fillDates,
    nextSevenAm, countdown, badgeHTML, BADGE_TEXT, magnetic, tilt, reveal, typewriter, countUp,
    SwipeDeck, speech, toast, reduceMotion, finePointer
  };

  document.addEventListener("DOMContentLoaded", () => {
    paintMarks();
    initNav();
    fillDates();
    magnetic();
    reveal();
  });
})();
