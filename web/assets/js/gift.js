/* Gift paper builder: the preview re-tags today's stories for the recipient's city and topics, live. */
document.addEventListener("DOMContentLoaded", async () => {
  const S = window.Subah;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  const el = {
    name: $("#g-name"), city: $("#g-city"), from: $("#g-from"), where: $("#g-where"),
    paper: $("#gift-paper"), status: $("#gift-status"), topics: $("#g-topics")
  };
  let lang = "ur";
  let size = 1.25;
  let catalog = { topics: [], cities: [] };
  let edition = null;
  try { catalog = await S.api.catalog(); } catch (e) { /* fine */ }
  try { edition = await S.api.edition(); } catch (e) { /* preview shows a note */ }

  el.city.insertAdjacentHTML("beforeend", catalog.cities.map((c) => `<option value="${c.id}">${S.esc(c.en)} (${S.esc(c.ur)})</option>`).join(""));
  el.city.value = "lahore";
  el.topics.innerHTML = catalog.topics.map((t) => `
    <label class="g-chip"><input type="checkbox" value="${t.id}"${["prices", "weather", "health"].includes(t.id) ? " checked" : ""}><span>${S.esc(t.en)}</span></label>`).join("");
  const mine = S.store.get();
  if (mine.name) el.from.value = mine.name;

  const chosen = () => $$("input:checked", el.topics).map((i) => i.value);
  function limitTopics() {
    const n = chosen().length;
    $$("input", el.topics).forEach((i) => { i.disabled = !i.checked && n >= 5; });
  }

  /* the same rule the server uses: a tag only when the story names their city or matches a chosen topic */
  function forYouFor(story, city, topics) {
    const tags = [];
    const c = (story.cities || []).find((x) => x.id === city);
    if (c) tags.push({ type: "city", id: c.id, label_en: c.en, label_ur: c.ur, term: c.term });
    (story.topics || []).filter((t) => topics.includes(t.id)).forEach((t) => tags.push({ type: "topic", id: t.id, label_en: t.en, label_ur: t.ur, term: t.term }));
    return tags;
  }

  function render() {
    const name = S.cleanName(el.name.value);
    const from = S.cleanName(el.from.value) || "you";
    const cityId = el.city.value;
    const cityObj = catalog.cities.find((c) => c.id === cityId);
    const topics = chosen();
    el.paper.setAttribute("lang", lang === "ur" ? "ur" : "en");
    el.paper.setAttribute("dir", lang === "ur" ? "rtl" : "ltr");
    el.paper.style.setProperty("--scale", size);
    const sign = lang === "ur" ? `محبت کے ساتھ، ${S.urduName(from)}` : `With love, ${from}`;
    let list = "";
    if (edition && edition.stories.length) {
      /* their paper: same mechanical score, recomputed for their settings */
      const scored = edition.stories.map((st) => {
        const tags = forYouFor(st, cityId, topics);
        const bonus = (tags.some((t) => t.type === "city") ? 2 : 0) + Math.min(2, tags.filter((t) => t.type === "topic").length);
        return { st, tags, score: st.outlet_count + bonus };
      }).sort((a, b) => b.score - a.score || a.st.rank - b.st.rank).slice(0, 3);
      list = scored.map(({ st, tags }) => {
        const head = S.headlineOf(st, lang);
        const ur = /[؀-ۿ]/.test(head);
        return `<div class="gp__story">
          <h3 class="gp__head"${ur !== (lang === "ur") ? ` lang="${ur ? "ur" : "en"}" dir="${ur ? "rtl" : "ltr"}"` : ""}>${S.esc(head)}</h3>
          ${S.coverageHTML(st, lang, { dots: false })}
          ${S.forYouHTML(tags, lang)}
        </div>`;
      }).join("");
    }
    el.paper.innerHTML = `
      <header class="gp__mast">
        <div class="gp__meta"><span>${lang === "ur" ? "تحفہ" : "A gift paper"}</span><span>${S.esc(cityObj ? (lang === "ur" ? cityObj.ur : cityObj.en) : "")}</span></div>
        <h2 class="gp__title">${S.esc(S.paperTitle(name, lang))}</h2>
        <p class="gp__sign">${S.esc(sign)}</p>
        <div class="gp__meta"><span>${S.dates[lang]()}</span><span>${size > 1 ? (lang === "ur" ? "بڑے حروف" : "Large print") : ""}</span></div>
      </header>
      <div class="gp__list">${list || `<p class="gp__empty">${lang === "ur" ? "آج کی خبریں دیکھنے کے لیے پہلے اخبار بنائیں۔" : "Generate today’s paper first to preview their stories."}</p>`}</div>`;
    $("#gp-note").textContent = edition && edition.sample ? "Preview uses the sample paper built from test feeds." : "";
    renderRoute();
  }

  /* time zones: their paper arrives at 7:00 am Lahore time */
  const fmtTime = (tz, d) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(d).replace(/\s?([ap])\.?m\.?/i, " $1m").toLowerCase();
  function renderRoute() {
    const tz = el.where.value;
    const now = new Date();
    $("#r-from-city").textContent = el.where.options[el.where.selectedIndex].text;
    $("#r-from-time").textContent = fmtTime(tz, S.nextSevenAm());
    $("#r-to-city").textContent = (catalog.cities.find((c) => c.id === el.city.value) || { en: "Pakistan" }).en;
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

  [el.name, el.city, el.from, el.where].forEach((x) => { x.addEventListener("input", render); x.addEventListener("change", render); });
  el.topics.addEventListener("change", () => { limitTopics(); render(); });
  $("#g-lang").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.dataset.lang === lang) return;
    $$("#g-lang button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    lang = b.dataset.lang;
    render();
  });
  $("#g-size").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    size = parseFloat(b.dataset.size);
    $$("#g-size button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
  });

  /* ---------------------------------------------------------------- sending by email */
  const emailEl = $("#g-email");
  const noteEl = $("#g-note");
  const DRAFT = "subah.giftDraft";
  let me = S.cachedMe();

  function gift() {
    return {
      recipient_name: S.cleanName(el.name.value), recipient_email: emailEl.value.trim(), city: el.city.value || null,
      topics: chosen(), lang, large: size > 1, from_name: S.cleanName(el.from.value), note: noteEl.value.trim().slice(0, 280),
      recipient_name_ur: S.urduName(S.cleanName(el.name.value)), from_name_ur: S.urduName(S.cleanName(el.from.value))
    };
  }
  /* keep the form across a detour to log in or choose a plan */
  function saveDraft() { try { sessionStorage.setItem(DRAFT, JSON.stringify(gift())); } catch (e) { /* blocked */ } }
  function loadDraft() {
    let d = null;
    try { d = JSON.parse(sessionStorage.getItem(DRAFT) || "null"); } catch (e) { /* none */ }
    if (!d) return;
    el.name.value = d.recipient_name || el.name.value;
    emailEl.value = d.recipient_email || "";
    el.city.value = d.city || "";
    $$("input", el.topics).forEach((i) => { i.checked = (d.topics || []).includes(i.value); });
    lang = d.lang === "en" ? "en" : "ur";
    $$("#g-lang button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.lang === lang)));
    size = d.large ? 1.25 : 1;
    $$("#g-size button").forEach((x) => x.setAttribute("aria-pressed", String(parseFloat(x.dataset.size) === size)));
    if (d.from_name) el.from.value = d.from_name;
    noteEl.value = d.note || "";
  }

  function paintAcct() {
    const box = $("#gift-acct");
    const plus = me && me.plan && me.plan.id === "plus";
    noteEl.disabled = !!(me && me.plan && !plus);
    $("#g-note-hint").textContent = noteEl.disabled ? "A note is part of Plus. Your Basic plan sends the paper without one." : "Printed at the top of the email. Up to 280 characters.";
    if (!me) {
      box.innerHTML = `To send it, <a href="account.html?mode=signup&amp;next=gift.html" data-detour>create an account</a> or <a href="account.html?next=gift.html" data-detour>log in</a>. Preview the email first if you like.`;
    } else if (!me.plan) {
      box.innerHTML = `<span class="acct-chip__av">${S.esc(S.initials(me.name))}</span> Sending as ${S.esc(me.name)}. <a href="pricing.html" data-detour>Choose a plan</a> to send gift papers.`;
    } else {
      box.innerHTML = `<span class="acct-chip__av">${S.esc(S.initials(me.name))}</span> Sending as ${S.esc(me.name)} · ${S.esc(me.plan.name)} · <b>${me.plan.gifts_left}</b> of ${me.plan.gifts_per_month} gift papers left this month`;
    }
    $$("[data-detour]", box).forEach((a) => a.addEventListener("click", saveDraft));
    if (me && !el.from.value.trim()) el.from.value = me.name.split(" ")[0];
  }
  document.addEventListener("subah:me", (e) => { me = e.detail; paintAcct(); });

  function flyPlane() {
    return new Promise((resolve) => {
      if (S.reduceMotion) { placePlane(1); resolve(); return; }
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / 1700);
        placePlane(0.5 - 0.5 * Math.cos(Math.PI * p));
        if (p < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
  }
  function status(msg, kind) {
    el.status.textContent = msg;
    el.status.className = `gift-status is-shown${kind ? ` is-${kind}` : ""}`;
  }
  const validEmail = (v) => /^[^@\s<>"']+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v);

  let sending = false;
  $("#gift-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending) return;
    const g = gift();
    if (!validEmail(g.recipient_email)) { status("Add their email address so the paper has somewhere to go.", "error"); emailEl.focus(); return; }
    me = me || await S.api.me();
    if (!me) { saveDraft(); location.href = "account.html?mode=signup&next=gift.html"; return; }
    if (!me.plan) { saveDraft(); location.href = "pricing.html"; return; }
    sending = true;
    $("#gift-send").disabled = true;
    status("Sending…");
    placePlane(0);
    try {
      const [r] = await Promise.all([S.api.giftSend(g), flyPlane()]);
      me = r.user;
      const name = g.recipient_name || "Their";
      status(`Sent. ${name === "Their" ? "Their" : `${name}’s`} paper is in ${r.to}’s inbox now, signed from ${g.from_name || me.name}. ${me.plan.gifts_left} of ${me.plan.gifts_per_month} gift papers left this month.`, "sent");
      S.toast("Gift paper sent");
      try { sessionStorage.removeItem(DRAFT); } catch (err) { /* fine */ }
      paintAcct();
    } catch (err) {
      placePlane(0.5);
      if (err.status === 401) { saveDraft(); location.href = "account.html?next=gift.html"; return; }
      if (err.status === 402) { saveDraft(); location.href = "pricing.html"; return; }
      status(err.message || "The email could not be sent. Try again.", "error");
    } finally {
      sending = false;
      $("#gift-send").disabled = false;
    }
  });

  /* the email exactly as it will arrive, in a sandboxed frame */
  const modal = $("#mail-modal");
  $$(".modal__close", modal).forEach((b) => { b.innerHTML = S.ICONS.close; });
  const closeModal = () => { modal.hidden = true; $("#gift-preview-btn").focus(); };
  $$("[data-close]", modal).forEach((b) => b.addEventListener("click", closeModal));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
  $("#gift-preview-btn").addEventListener("click", async () => {
    const btn = $("#gift-preview-btn");
    btn.disabled = true;
    try {
      const g = gift();
      if (me && me.plan && me.plan.id !== "plus") g.note = "";
      if (!g.from_name && me) g.from_name = me.name.split(" ")[0];
      const r = await S.api.giftPreview(g);
      $("#mail-from").textContent = g.from_name || "you";
      $("#mail-to").textContent = g.recipient_email || "their email";
      $("#mail-subject").textContent = r.subject;
      $("#mail-frame").srcdoc = r.html;
      modal.hidden = false;
    } catch (err) {
      status(err.message || "The preview could not be made.", "error");
    } finally {
      btn.disabled = false;
    }
  });

  loadDraft();
  limitTopics();
  render();
  paintAcct();
  S.api.me();
});
