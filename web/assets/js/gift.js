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

  /* preview the delivery: nothing is sent */
  let flying = false;
  $("#gift-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (flying) return;
    flying = true;
    const name = S.cleanName(el.name.value) || "They";
    const city = (catalog.cities.find((c) => c.id === el.city.value) || { en: "Pakistan" }).en;
    const msg = `Preview only: nothing was sent. In the live version, ${name}’s first paper reaches ${city} tomorrow at 7:00 am, which is ${$("#r-from-time").textContent} in ${el.where.options[el.where.selectedIndex].text}.`;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      placePlane(1);
      el.status.textContent = msg;
      el.status.classList.add("is-shown");
      flying = false;
    };
    setTimeout(finish, 2000);
    if (S.reduceMotion) { finish(); return; }
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / 1700);
      placePlane(0.5 - 0.5 * Math.cos(Math.PI * p));
      if (p < 1 && !done) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  limitTopics();
  render();
});
