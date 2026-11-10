/* Gift paper builder: every field changes the preview as you type. */
document.addEventListener("DOMContentLoaded", () => {
  const D = window.SUBAH_DATA;
  const S = window.Subah;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const profile = S.store.get();

  const el = {
    name: $("#g-name"), about: $("#g-about"), city: $("#g-city"), from: $("#g-from"), where: $("#g-where"),
    audio: $("#g-audio"), email: $("#g-email"), paper: $("#gift-paper"), status: $("#gift-status")
  };
  if (profile.name) el.from.value = profile.name;
  let lang = "ur";
  let size = 1.22;

  const CITY_UR = { Lahore: "لاہور", Karachi: "کراچی", Islamabad: "اسلام آباد", Multan: "ملتان", Faisalabad: "فیصل آباد", Peshawar: "پشاور", Quetta: "کوئٹہ" };
  const L = {
    en: { edition: "Edition No. 1", count: "10 stories, 6 min", large: "Large print", fy: "For you.", sign: (n) => `With love, ${n}`, voice: "Voice note", },
    ur: { edition: "شمارہ ۱", count: "۱۰ خبریں، ۶ منٹ", large: "بڑے حروف", fy: "آپ کے لیے:", sign: (n) => `محبت کے ساتھ، ${S.urduName(n)}`, voice: "اردو میں صوتی پیغام" },
    ro: { edition: "Shumara 1", count: "10 khabrein, 6 minute", large: "Baray huroof", fy: "Aap ke liye:", sign: (n) => `Mohabbat ke saath, ${n}`, voice: "Voice note" }
  };
  const IDS = ["petrol", "smog", "viral"];
  const story = (id) => D.STORIES.find((s) => s.id === id);

  function render() {
    const t = L[lang];
    const name = S.cleanName(el.name.value);
    const from = S.cleanName(el.from.value) || "you";
    const city = el.city.value;
    el.paper.setAttribute("lang", lang === "ur" ? "ur" : "en");
    el.paper.setAttribute("dir", lang === "ur" ? "rtl" : "ltr");
    el.paper.style.setProperty("--scale", size);
    el.paper.innerHTML = `
      <header class="gp__mast">
        <div class="gp__meta"><span>${t.edition}</span><span>${lang === "ur" ? CITY_UR[city] || city : city}</span></div>
        <h2 class="gp__title">${S.paperTitle(name, lang)}</h2>
        <p class="gp__sign">${t.sign(from)}</p>
        <div class="gp__meta"><span>${S.dates[lang]()}</span><span>${size > 1 ? t.large : t.count}</span></div>
      </header>
      <div class="gp__list">
        ${IDS.map((id) => {
          const st = story(id);
          const s = st[lang];
          return `<div class="gp__story">
            <p class="gp__sec">${s.section}</p>
            <h3 class="gp__head">${s.headline}</h3>
            ${S.badgeHTML(st, lang, { dots: false })}
            <p class="gp__foryou"><b>${t.fy}</b> ${D.GIFT_LINES[id][lang]}</p>
          </div>`;
        }).join("")}
      </div>`;
    const vl = $("#voice-label");
    vl.textContent = lang === "ur" ? L.ur.voice : "Voice note in " + (lang === "en" ? "English" : "Roman Urdu");
    if (lang === "ur") vl.setAttribute("lang", "ur"); else vl.removeAttribute("lang");
    $("#voice").hidden = !el.audio.checked;
    if (!el.audio.checked) { $("#voice-note").textContent = ""; stopVoice(); }
    renderRoute();
  }

  /* ---------------------------------------------------------------- time zones */
  const fmtTime = (tz, d) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(d).replace(/\s?([ap])\.?m\.?/i, " $1m").toLowerCase();
  function renderRoute() {
    const tz = el.where.value;
    const fromCity = el.where.options[el.where.selectedIndex].text;
    const arrive = S.nextSevenAm();
    $("#r-from-city").textContent = fromCity;
    $("#r-from-time").textContent = fmtTime(tz, arrive);
    $("#r-to-city").textContent = el.city.value;
    const now = new Date();
    $("#r-from-now").textContent = `now ${fmtTime(tz, now)}`;
    $("#r-to-now").textContent = `now ${fmtTime("Asia/Karachi", now)}`;
  }
  setInterval(renderRoute, 30000);

  const path = $("#route-path");
  const plane = $("#route-plane");
  function placePlane(p) {
    const len = path.getTotalLength();
    const a = path.getPointAtLength(len * p);
    const b = path.getPointAtLength(Math.min(len, len * p + 1));
    plane.setAttribute("transform", `translate(${a.x} ${a.y}) rotate(${Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI})`);
  }
  placePlane(0.5);

  /* ---------------------------------------------------------------- controls */
  ["input", "change"].forEach((ev) => {
    [el.name, el.about, el.city, el.from, el.where, el.audio].forEach((x) => x.addEventListener(ev, render));
  });
  $("#g-lang").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.dataset.lang === lang) return;
    $$("#g-lang button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    stopVoice();
    const go = () => { lang = b.dataset.lang; render(); };
    if (!S.reduceMotion && el.paper.animate) {
      let swapped = false;
      const swap = () => {
        if (swapped) return;
        swapped = true;
        go();
        el.paper.animate([{ transform: "rotateY(-90deg)" }, { transform: "rotateY(0)" }], { duration: 420, easing: "cubic-bezier(0.22,1,0.36,1)" });
      };
      el.paper.animate([{ transform: "rotateY(0)" }, { transform: "rotateY(90deg)" }], { duration: 220, easing: "cubic-bezier(0.55,0,1,0.45)" }).onfinish = swap;
      setTimeout(swap, 260);
    } else go();
  });
  $("#g-size").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    size = parseFloat(b.dataset.size);
    $$("#g-size button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
  });

  /* ---------------------------------------------------------------- voice note */
  const vBtn = $("#voice-play");
  const vWrap = $("#voice");
  function stopVoice() {
    S.speech.stop();
    vWrap.classList.remove("is-speaking");
    vBtn.setAttribute("aria-pressed", "false");
    vBtn.innerHTML = `<span>${S.ICONS.play}</span>`;
  }
  vBtn.addEventListener("click", () => {
    const note = $("#voice-note");
    if (vWrap.classList.contains("is-speaking")) { stopVoice(); return; }
    if (!S.speech.supported) { note.textContent = "This browser has no speech voice. The live gift paper sends a recorded Urdu voice note."; return; }
    let readLang = lang;
    const v = S.speech.voiceFor("ur");
    if (lang === "ur" && !(v && v.lang.toLowerCase().startsWith("ur"))) {
      readLang = "ro";
      note.textContent = "No Urdu voice on this device, so it reads Roman Urdu. The live version is a recorded Urdu voice note.";
    } else note.textContent = "";
    const name = S.cleanName(el.name.value);
    const greet = readLang === "en" ? `Good morning, ${name || "dear"}.` : `Subah bakhair, ${name || ""}.`;
    const items = [{ text: greet }].concat(IDS.map((id) => ({ text: `${story(id)[readLang].headline}. ${D.GIFT_LINES[id][readLang]}` })));
    vWrap.classList.add("is-speaking");
    vBtn.setAttribute("aria-pressed", "true");
    vBtn.innerHTML = `<span>${S.ICONS.pause}</span>`;
    S.speech.play(items, readLang, { onEnd: stopVoice });
  });

  /* ---------------------------------------------------------------- preview the delivery (nothing is sent) */
  let flying = false;
  $("#gift-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const hint = $("#g-email-hint");
    if (el.email.value && !el.email.checkValidity()) {
      el.email.setAttribute("aria-invalid", "true");
      el.email.setAttribute("aria-describedby", "g-email-hint");
      hint.textContent = "That email doesn’t look complete. Check it, or leave it empty for the preview.";
      el.email.focus();
      return;
    }
    el.email.removeAttribute("aria-invalid");
    hint.textContent = "Optional for the preview.";
    if (flying) return;
    flying = true;
    const name = S.cleanName(el.name.value) || "they";
    const fromCity = el.where.options[el.where.selectedIndex].text;
    const msg = `Preview only: nothing was sent. In the live version, ${name}’s first paper reaches ${el.city.value} tomorrow at 7:00 am, which is ${$("#r-from-time").textContent} in ${fromCity}.`;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      el.paper.classList.remove("is-flying");
      placePlane(1);
      el.status.textContent = msg;
      el.status.classList.add("is-shown");
      flying = false;
    };
    setTimeout(finish, 2400);
    if (S.reduceMotion || !el.paper.animate) { placePlane(1); finish(); return; }
    const t0 = performance.now();
    const dur = 1700;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      placePlane(0.5 - 0.5 * Math.cos(Math.PI * p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    el.paper.classList.add("is-flying");
    el.paper.animate([
      { transform: "none", opacity: 1 },
      { transform: "perspective(1200px) rotateX(18deg) translateY(-30px) scale(0.6)", opacity: 0.9, offset: 0.35 },
      { transform: "perspective(1200px) rotateX(10deg) translate(30%, -60%) scale(0.12)", opacity: 0, offset: 0.75 },
      { transform: "translateY(20px) scale(0.98)", opacity: 0, offset: 0.76 },
      { transform: "none", opacity: 1 }
    ], { duration: 2200, easing: "cubic-bezier(0.45, 0, 0.2, 1)" }).onfinish = finish;
  });

  render();
});
