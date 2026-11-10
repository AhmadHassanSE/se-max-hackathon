/* Onboarding: reader settings, topics, then generate today's paper now. Test profiles only. */
document.addEventListener("DOMContentLoaded", async () => {
  const S = window.Subah;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  let profile = S.store.get();
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

  /* ---------------------------------------------------------------- step 3: generate now */
  const logEl = $("#press-log");
  const bar = $("#press-bar");
  const sheet = $("#press-sheet");
  const press = $(".press");
  const tick = S.ICONS.check;
  function logLine(text, done) {
    const prev = logEl.querySelector(".is-working");
    if (prev) { prev.classList.remove("is-working"); prev.classList.add("is-done"); }
    const li = document.createElement("li");
    li.className = done ? "is-done" : "is-working";
    li.innerHTML = `<span class="tick" aria-hidden="true">${tick}</span><span>${S.esc(text)}</span>`;
    logEl.appendChild(li);
  }
  async function print() {
    logEl.innerHTML = "";
    $("#ob-ready").hidden = true;
    $("#print-note").textContent = "";
    $("#ps-title").textContent = S.paperTitle(profile.name, "en");
    $("#ps-title-ur").textContent = S.paperTitle(profile.name, "ur");
    press.classList.add("is-printing");
    bar.style.transform = "scaleX(0.15)";
    logLine("Reading the feeds on our published outlet list");
    let edition = null, error = null;
    const started = performance.now();
    try {
      edition = await S.api.generate(profile);
    } catch (e) {
      error = e;
    }
    const wait = (ms) => new Promise((r) => setTimeout(r, S.reduceMotion ? 0 : ms));
    await wait(Math.max(0, 900 - (performance.now() - started)));
    if (error) {
      press.classList.remove("is-printing");
      logLine(error.status ? `Could not generate: ${error.message}` : "The paper server isn’t running", true);
      $("#print-note").textContent = error.status ? "" : "Start it with the command in the README, or read the bundled sample paper instead.";
      $("#print-title").textContent = "The press is offline.";
      $("#ob-read").querySelector("span").textContent = "Read the sample paper";
      $("#ob-ready").hidden = false;
      return;
    }
    const st = edition.stats, ai = edition.ai;
    const steps = [
      `${st.feeds_ok} feeds answered, ${st.articles} reports kept` + (st.feeds_failed ? ` (${st.feeds_failed} feeds failed and were skipped)` : ""),
      `Grouped them into ${st.stories_grouped} stories, across English and Urdu`,
      `Counted the outlets behind each story and ranked them by the published formula`,
      ai.enabled ? `Summarised ${ai.summarised} stories in ${ai.calls} AI calls; ${ai.fallback} show headlines only` : `No AI today (${ai.note}): stories show their headlines and links`,
      `Checked every summary against its sources`
    ];
    for (let i = 0; i < steps.length; i++) {
      logLine(steps[i]);
      bar.style.transform = `scaleX(${0.15 + (0.85 * (i + 1)) / steps.length})`;
      await wait(520);
    }
    const lang = profile.lang === "ur" ? "ur" : "en";
    [["#ps-h1", edition.stories[0]], ["#ps-h2", edition.stories[1]]].forEach(([sel, story]) => {
      if (!story) return;
      const el = $(sel);
      const h = S.headlineOf(story, lang);
      el.textContent = h;
      if (/[؀-ۿ]/.test(h)) { el.setAttribute("lang", "ur"); el.setAttribute("dir", "rtl"); el.classList.add("is-ur"); }
    });
    if (!S.reduceMotion && sheet.animate) {
      sheet.animate([{ transform: "translateY(-101%)" }, { transform: "translateY(0)" }], { duration: 900, easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "forwards" });
    } else sheet.style.transform = "none";
    setTimeout(() => { sheet.style.transform = "none"; }, S.reduceMotion ? 0 : 950);
    logLine("Printed", true);
    press.classList.remove("is-printing");
    $("#print-title").textContent = profile.name ? `Your paper is ready, ${profile.name}.` : "Your paper is ready.";
    $("#ob-ready").hidden = false;
    $("#ob-read").focus({ preventScroll: true });
    S.magnetic($("#ob-ready"));
  }
});
