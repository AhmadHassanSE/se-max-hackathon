/* Onboarding: reader settings, topics, then generate today's paper now. Test profiles only. */
document.addEventListener("DOMContentLoaded", async () => {
  const S = window.Subah;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  let profile = S.store.get();
  const POOL = 12;
  let catalog = { topics: [], cities: [] };
  try { catalog = await S.api.catalog(); } catch (e) { /* the form still works without names */ }

  /* ---------------------------------------------------------------- steps */
  function goStep(n) {
    $$(".ob-step").forEach((s) => {
      const on = +s.dataset.step === n;
      s.hidden = !on;
      s.classList.toggle("is-active", on);
      s.classList.toggle("is-entering", on);
    });
    $$(".ob-steps li").forEach((li) => {
      const k = +li.dataset.s;
      li.classList.toggle("is-active", k === n);
      li.classList.toggle("is-done", k < n);
      if (k === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: S.reduceMotion ? "auto" : "smooth" });
    const head = $(`.ob-step[data-step="${n}"] h1, .ob-step[data-step="${n}"] h2`);
    if (head) { head.setAttribute("tabindex", "-1"); head.focus({ preventScroll: true }); }
  }

  /* ---------------------------------------------------------------- step 1 */
  const nameEl = $("#ob-name");
  const cityEl = $("#ob-city");
  cityEl.insertAdjacentHTML("beforeend", catalog.cities.map((c) => `<option value="${c.id}">${S.esc(c.en)} (${S.esc(c.ur)})</option>`).join(""));
  function fill(p) {
    nameEl.value = p.name || "";
    cityEl.value = p.city || "";
    $$('input[name="lang"]').forEach((r) => { r.checked = r.value === (p.lang || "en"); });
    $$('input[name="large"]').forEach((r) => { r.checked = (r.value === "1") === !!p.large; });
    paintTopics(p.topics || []);
  }
  $("#presets").innerHTML = S.TEST_READERS.map((r, i) => {
    const city = catalog.cities.find((c) => c.id === r.city);
    return `<button class="preset" type="button" data-i="${i}"><b>${S.esc(r.label)}</b><span>${S.esc(city ? city.en : r.city)}, ${r.lang === "ur" ? "Urdu" : "English"}${r.large ? ", large print" : ""}</span></button>`;
  }).join("");
  $("#presets").addEventListener("click", (e) => {
    const b = e.target.closest(".preset");
    if (!b) return;
    const r = S.TEST_READERS[+b.dataset.i];
    fill(r);
    $$(".preset").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    S.toast(`${r.label} loaded. You can change anything.`);
  });

  $("#ob-form").addEventListener("submit", (e) => {
    e.preventDefault();
    profile = S.store.set({
      name: S.cleanName(nameEl.value),
      city: cityEl.value || null,
      lang: ($('input[name="lang"]:checked') || {}).value || "en",
      large: (($('input[name="large"]:checked') || {}).value || "0") === "1"
    });
    goStep(2);
  });

  /* ---------------------------------------------------------------- step 2: topics */
  const topicsEl = $("#topics");
  const hint = $("#topic-hint");
  topicsEl.innerHTML = catalog.topics.map((t) => `
    <label class="topic"><input type="checkbox" name="topic" value="${t.id}"><span class="topic__body"><b>${S.esc(t.en)}</b><span lang="ur">${S.esc(t.ur)}</span></span></label>`).join("");
  function chosen() { return $$('input[name="topic"]:checked').map((i) => i.value); }
  function paintTopics(list) {
    $$('input[name="topic"]').forEach((i) => { i.checked = list.includes(i.value); });
    syncTopics();
  }
  function syncTopics() {
    const n = chosen().length;
    hint.textContent = `${n} of 5 chosen`;
    $$('input[name="topic"]').forEach((i) => { i.disabled = !i.checked && n >= 5; i.closest(".topic").classList.toggle("is-off", i.disabled); });
  }
  topicsEl.addEventListener("change", syncTopics);
  $("#back-1").addEventListener("click", () => goStep(1));
  $("#to-print").addEventListener("click", () => {
    profile = S.store.set({ topics: chosen() });
    goStep(3);
    print();
  });
  fill(profile);

  /* ---------------------------------------------------------------- step 3: generate now, live */
  const sheet = $("#press-sheet");
  const press = $(".press");
  async function print() {
    $("#ob-ready").hidden = true;
    $("#print-note").textContent = "";
    $("#print-title").textContent = "Printing today’s paper";
    $("#ps-title").textContent = S.paperTitle(profile.name, "en");
    $("#ps-title-ur").textContent = S.paperTitle(profile.name, "ur");
    sheet.style.transform = "";
    press.classList.add("is-printing");
    const live = await S.Live.create($("#live-root"), { lang: profile.lang });
    let edition = null, error = null;
    try {
      edition = await S.api.generateStream(profile, null, POOL, live.onEvent);
    } catch (e) {
      error = e;
    }
    if (error) {
      press.classList.remove("is-printing");
      $("#print-note").textContent = error.status ? `Could not generate: ${error.message}` : "The paper server isn’t running. Start it with the command in the README, or read the bundled sample paper instead.";
      $("#print-title").textContent = "The press is offline.";
      $("#ob-read").textContent = "Read the sample paper";
      $("#ob-pick").hidden = true;
      $("#ob-ready").hidden = false;
      return;
    }
    await live.replay(edition);
    const lang = profile.lang === "ur" ? "ur" : "en";
    [["#ps-h1", edition.stories[0]], ["#ps-h2", edition.stories[1]]].forEach(([sel, story]) => {
      if (!story) return;
      const el = $(sel);
      const h = S.headlineOf(story, lang);
      el.textContent = h;
      if (/[\u0600-\u06FF]/.test(h)) { el.setAttribute("lang", "ur"); el.setAttribute("dir", "rtl"); el.classList.add("is-ur"); }
    });
    if (!S.reduceMotion && sheet.animate) {
      sheet.animate([{ transform: "translateY(-101%)" }, { transform: "translateY(0)" }], { duration: 900, easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "forwards" });
    }
    setTimeout(() => { sheet.style.transform = "none"; }, S.reduceMotion ? 0 : 950);
    press.classList.remove("is-printing");
    $("#print-title").textContent = profile.name ? `Your paper is ready, ${profile.name}.` : "Your paper is ready.";
    $("#ob-pick").hidden = false;
    $("#ob-ready").hidden = false;
    $("#ob-pick").focus({ preventScroll: true });
    S.magnetic($("#ob-ready"));
    printed = edition;
  }

  /* ---------------------------------------------------------------- step 4: keep the stories you want */
  let printed = null;
  let picks = {};
  let index = 0;
  let busy = false;
  const deckEl = $("#pick-deck");
  const countEl = $("#pick-count");
  $("#ob-pick").addEventListener("click", () => { goStep(4); startPicking(); });
  $("#pick-again").addEventListener("click", startPicking);
  /* skip: every story not decided yet is kept, choices made so far stay */
  $("#pick-skip").addEventListener("click", () => {
    if (!printed) return;
    printed.stories.slice(index).forEach((st) => { if (!picks[st.id]) picks[st.id] = "keep"; });
    index = printed.stories.length;
    tally();
    renderDeck();
  });

  function startPicking() {
    picks = {};
    index = 0;
    busy = false;
    $("#pick-done").hidden = true;
    deckEl.hidden = false;
    countEl.hidden = false;
    $("#pick-skip").hidden = false;
    tally();
    renderDeck();
    setTimeout(() => deckEl.focus({ preventScroll: true }), 300);
  }
  function tally() {
    const v = Object.values(picks);
    $("#t-love").textContent = v.filter((x) => x === "love").length;
    $("#t-keep").textContent = v.filter((x) => x === "keep").length;
    $("#t-pass").textContent = v.filter((x) => x === "pass").length;
  }
  function cardHTML(st, lang) {
    const t = st.topics && st.topics[0];
    const topic = t ? (lang === "ur" ? t.ur : t.en) : (lang === "ur" ? "خبر" : "News");
    const head = S.headlineOf(st, lang);
    const headUr = /[؀-ۿ]/.test(head);
    const dek = st.summary ? st.summary[lang].text : (lang === "ur" ? `سرخی بشکریہ ${st.headline_from.ur}` : `Headline from ${st.headline_from.en}`);
    const outlets = lang === "ur" ? `${S.toUrduDigits(st.outlet_count)} ادارے` : `${st.outlet_count} outlet${st.outlet_count === 1 ? "" : "s"}`;
    const ui = lang === "ur" ? { pass: "چھوڑیں", love: "پسندیدہ", keep: "رکھیں" } : { pass: "Pass", love: "Love", keep: "Keep" };
    return `
      <div class="pcard__top"><span class="pcard__topic"${lang === "ur" ? ' lang="ur"' : ""}>${S.esc(topic)}</span><span class="pcard__outlets"${lang === "ur" ? ' lang="ur"' : ""}>${outlets}</span></div>
      <h3 class="pcard__head"${headUr ? ' lang="ur" dir="rtl"' : ""}>${S.esc(head)}</h3>
      <p class="pcard__dek"${lang === "ur" ? ' lang="ur" dir="rtl"' : ""}>${S.esc(dek)}</p>
      ${S.forYouHTML(st.for_you, lang)}
      <div class="pcard__actions">
        <button type="button" class="pcard__btn pcard__btn--pass" data-act="pass">${ui.pass}</button>
        <button type="button" class="pcard__btn pcard__btn--love" data-act="love">${ui.love}</button>
        <button type="button" class="pcard__btn pcard__btn--keep" data-act="keep">${ui.keep}</button>
      </div>
      <span class="pcard__stamp pcard__stamp--keep" aria-hidden="true">Keep</span>
      <span class="pcard__stamp pcard__stamp--pass" aria-hidden="true">Pass</span>
      <span class="pcard__stamp pcard__stamp--love" aria-hidden="true">Love</span>`;
  }
  function renderDeck() {
    const stories = printed.stories;
    const lang = profile.lang === "ur" ? "ur" : "en";
    deckEl.innerHTML = "";
    const depth = Math.min(3, stories.length - index);
    for (let d = depth - 1; d >= 0; d--) {
      const st = stories[index + d];
      const card = document.createElement("article");
      card.className = "pcard" + (d === 0 ? " is-top" : "");
      card.style.setProperty("--d", d);
      card.innerHTML = cardHTML(st, lang);
      if (d === 0) {
        card.setAttribute("aria-label", `Story ${index + 1} of ${stories.length}`);
        bindCard(card);
      } else {
        card.setAttribute("aria-hidden", "true");
        card.querySelectorAll("button").forEach((b) => { b.tabIndex = -1; });
      }
      deckEl.appendChild(card);
    }
    countEl.textContent = `${index} of ${stories.length}. Drag, tap a button, or use the arrow keys.`;
    if (index >= stories.length) finish();
  }
  function bindCard(card) {
    card.querySelectorAll(".pcard__btn").forEach((b) => b.addEventListener("click", () => decide(b.dataset.act)));
    let sx = 0, sy = 0, dx = 0, dy = 0, id = null;
    card.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button, a") || (e.button !== undefined && e.button !== 0)) return;
      id = e.pointerId; sx = e.clientX; sy = e.clientY; dx = dy = 0;
      card.setPointerCapture(id);
      card.style.transition = "none";
      card.classList.add("is-dragging");
    });
    card.addEventListener("pointermove", (e) => {
      if (e.pointerId !== id) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.05}deg)`;
      card.style.setProperty("--keep", Math.max(0, Math.min(1, dx / 120)));
      card.style.setProperty("--pass", Math.max(0, Math.min(1, -dx / 120)));
      card.style.setProperty("--love", Math.abs(dx) < 80 ? Math.max(0, Math.min(1, -dy / 120)) : 0);
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      card.classList.remove("is-dragging");
      if (dx > 120) decide("keep");
      else if (dx < -120) decide("pass");
      else if (dy < -120 && Math.abs(dx) < 90) decide("love");
      else {
        card.style.transition = "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)";
        card.style.transform = "";
        ["--keep", "--pass", "--love"].forEach((k) => card.style.setProperty(k, 0));
      }
    };
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
  }
  function decide(act) {
    const card = deckEl.querySelector(".pcard.is-top");
    if (!card || busy) return;
    busy = true;
    picks[printed.stories[index].id] = act;
    tally();
    const w = window.innerWidth;
    const to = act === "keep" ? `translate(${w * 0.7}px, 40px) rotate(22deg)`
      : act === "pass" ? `translate(${-w * 0.7}px, 40px) rotate(-22deg)`
      : `translate(0, ${-window.innerHeight * 0.8}px)`;
    card.style.setProperty(`--${act}`, 1);
    card.style.transition = S.reduceMotion ? "opacity 150ms linear" : "transform 480ms cubic-bezier(0.55, 0, 1, 0.45), opacity 480ms linear";
    if (!S.reduceMotion) card.style.transform = to;
    card.style.opacity = 0;
    setTimeout(() => {
      index++;
      busy = false;
      renderDeck();
      if (index < printed.stories.length) deckEl.focus({ preventScroll: true });
    }, S.reduceMotion ? 160 : 340);
  }
  deckEl.addEventListener("keydown", (e) => {
    const map = { ArrowRight: "keep", ArrowLeft: "pass", ArrowUp: "love" };
    if (map[e.key]) { e.preventDefault(); decide(map[e.key]); }
  });
  function finish() {
    const any = Object.values(picks).some((v) => v !== "pass");
    S.savePicks(printed, any ? picks : null);
    const n = any ? S.pickedStories(printed).length : 0;
    deckEl.hidden = true;
    countEl.hidden = true;
    $("#pick-skip").hidden = true;
    $("#pick-done-head").textContent = n
      ? `Your paper has ${n} stor${n === 1 ? "y" : "ies"}${Object.values(picks).includes("love") ? ", loved ones first" : ""}.`
      : "You passed on everything. Pick again, or read all of today’s stories.";
    $("#pick-read").querySelector("span").textContent = n ? "Read my paper" : "Read all of them";
    $("#pick-done").hidden = false;
    $("#pick-read").focus({ preventScroll: true });
    S.magnetic($("#pick-done"));
  }

});
