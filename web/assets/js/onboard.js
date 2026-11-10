/* Onboarding: one sentence, twelve swipes, then the press runs. */
document.addEventListener("DOMContentLoaded", () => {
  const D = window.SUBAH_DATA;
  const S = window.Subah;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const profile = S.store.get();

  const TOPICS = ["prices", "local", "cricket", "money", "work", "climate", "health", "world", "tech", "culture"];
  const state = {
    name: S.cleanName(profile.name || ""),
    sentence: profile.sentence || "",
    lang: profile.lang || "en",
    size: profile.size || 1,
    weights: Object.fromEntries(TOPICS.map((t) => [t, 0]))
  };

  /* ---------------------------------------------------------------- steps */
  const steps = $$(".ob-step");
  const stepNav = $$(".ob-steps li");
  function goStep(n) {
    steps.forEach((s) => {
      const on = +s.dataset.step === n;
      s.hidden = !on;
      s.classList.toggle("is-active", on);
      s.classList.toggle("is-entering", on);
    });
    stepNav.forEach((li) => {
      const k = +li.dataset.s;
      li.classList.toggle("is-active", k === n);
      li.classList.toggle("is-done", k < n);
      if (k === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: S.reduceMotion ? "auto" : "smooth" });
    const head = $(`.ob-step[data-step="${n}"] h1, .ob-step[data-step="${n}"] h2`);
    if (head) { head.setAttribute("tabindex", "-1"); head.focus({ preventScroll: true }); }
  }

  /* ---------------------------------------------------------------- step 1: the sentence */
  const nameEl = $("#ob-name");
  const sentenceEl = $("#ob-sentence");
  const chipsEl = $("#ob-chips");
  const hint = $("#ob-hint");
  nameEl.value = state.name;
  sentenceEl.value = state.sentence;
  $$('input[name="lang"]').forEach((r) => { r.checked = r.value === state.lang; });
  $$('input[name="size"]').forEach((r) => { r.checked = parseFloat(r.value) === state.size; });

  const EXAMPLES = [
    "I’m a nursing student in Lahore. I ride a motorbike to class and my brother works in Dubai.",
    "I drive a rickshaw in Karachi and follow cricket and petrol prices.",
    "Retired teacher in Multan. I like local news, the weather and big type.",
    "Freelance designer in Islamabad, paid in dollars, curious about tech."
  ];
  /* the placeholder types itself while the box is empty */
  let exI = 0, phTimer = 0;
  function cyclePlaceholder() {
    clearTimeout(phTimer);
    if (sentenceEl.value || document.activeElement === sentenceEl || S.reduceMotion) {
      sentenceEl.placeholder = EXAMPLES[0];
      return;
    }
    const text = EXAMPLES[exI % EXAMPLES.length];
    let i = 0;
    const type = () => {
      if (sentenceEl.value || document.activeElement === sentenceEl) { sentenceEl.placeholder = EXAMPLES[0]; return; }
      i += 2;
      sentenceEl.placeholder = text.slice(0, i);
      if (i < text.length) phTimer = setTimeout(type, 28);
      else { exI++; phTimer = setTimeout(cyclePlaceholder, 2600); }
    };
    type();
  }
  cyclePlaceholder();
  sentenceEl.addEventListener("blur", () => { if (!sentenceEl.value) setTimeout(cyclePlaceholder, 600); });
  sentenceEl.addEventListener("focus", () => { clearTimeout(phTimer); sentenceEl.placeholder = EXAMPLES[exI % EXAMPLES.length]; });

  const KEYWORDS = [
    { re: /\blahore\b|لاہور/i, label: "Lahore", kind: "city", t: { local: 2 } },
    { re: /\bkarachi\b|کراچی/i, label: "Karachi", kind: "city", t: { local: 2 } },
    { re: /\bislamabad\b|\brawalpindi\b|\bpindi\b|اسلام آباد/i, label: "Islamabad", kind: "city", t: { local: 2 } },
    { re: /\bmultan\b|ملتان/i, label: "Multan", kind: "city", t: { local: 2 } },
    { re: /\bfaisalabad\b|\bpeshawar\b|\bquetta\b|\bsialkot\b|\bhyderabad\b/i, label: null, kind: "city", t: { local: 2 } },
    { re: /\bstudent\b|\buniversity\b|\bcollege\b|\bclass(es)?\b|طالب/i, label: "Student", kind: "work", t: { local: 1 } },
    { re: /\bnurs(e|ing)\b|\bdoctor\b|\bhospital\b|\bhealth\b/i, label: "Health", kind: "work", t: { health: 2 } },
    { re: /\bteach(er|ing)?\b|\btutor(ing)?\b/i, label: "Teaching", kind: "work", t: { work: 1 } },
    { re: /\bfreelanc\w*|\bupwork\b|\bfiverr\b|\bdeveloper\b|\bdesigner\b|\bprogrammer\b|\bdollars?\b/i, label: "Freelance", kind: "work", t: { work: 2, money: 1, tech: 1 } },
    { re: /\bshop(keeper)?\b|\bbusiness\b|\btrader\b|\bstore\b/i, label: "Business", kind: "work", t: { prices: 2, money: 1 } },
    { re: /\brickshaw\b|\bmotor ?bike\b|\bmotorcycle\b|\bbike\b|\bcommute\b|\bdrive\b|\bcar\b/i, label: "Commute", kind: "topic", t: { prices: 2 } },
    { re: /\bcricket\b|\bpsl\b|کرکٹ/i, label: "Cricket", kind: "topic", t: { cricket: 3 } },
    { re: /\bdubai\b|\buae\b|\bsaudi\b|\briyadh\b|\bqatar\b|\bdoha\b|\bgulf\b|\blondon\b|\babroad\b|\boverseas\b|دبئی|سعودی|لندن/i, label: "Family abroad", kind: "family", t: { world: 2, money: 1 } },
    { re: /\bprices?\b|\binflation\b|\bpetrol\b|\bbudget\b|\bbills?\b|\brent\b|مہنگائی|قیمت|پیٹرول/i, label: "Prices", kind: "topic", t: { prices: 2 } },
    { re: /\btech\b|\bphones?\b|\bai\b|\bstartups?\b/i, label: "Tech", kind: "topic", t: { tech: 2 } },
    { re: /\bweather\b|\bsmog\b|\bclimate\b|\bfarm\w*\b|\bwheat\b|\bcrops?\b|موسم/i, label: "Weather and climate", kind: "topic", t: { climate: 2 } },
    { re: /\bretired\b|\bpension\b/i, label: "Retired", kind: "work", t: { prices: 1, health: 1 } },
    { re: /\bmother\b|\bmum\b|\bammi\b|\bfather\b|\babbu\b|\bparents\b|\bbrother\b|\bsister\b|\bfamily\b|امی|ابو|بھائی/i, label: "Family", kind: "family", t: { local: 1 } },
    { re: /\bmusic\b|\bfilms?\b|\bdramas?\b|\bculture\b|\bbooks?\b/i, label: "Culture", kind: "topic", t: { culture: 2 } },
    { re: /\bbig type\b|\blarge print\b|\btired eyes\b/i, label: "Large print", kind: "topic", t: {}, size: 1.22 }
  ];
  let sentenceWeights = {};
  let seen = new Set();
  function detect() {
    const text = sentenceEl.value;
    sentenceEl.classList.toggle("is-urdu", /[؀-ۿ]/.test(text) && !/[a-z]{3,}/i.test(text));
    const found = [];
    sentenceWeights = {};
    KEYWORDS.forEach((k) => {
      const m = text.match(k.re);
      if (!m) return;
      const label = k.label || m[0].replace(/^\w/, (c) => c.toUpperCase());
      found.push({ label, kind: k.kind });
      Object.entries(k.t).forEach(([t, v]) => { sentenceWeights[t] = (sentenceWeights[t] || 0) + v; });
      if (k.size && !detect.sizeSet) { detect.sizeSet = true; const r = $('input[name="size"][value="1.22"]'); if (r) r.checked = true; }
    });
    if (!found.length) { chipsEl.innerHTML = '<span class="heard__empty">nothing yet</span>'; seen = new Set(); return; }
    const now = new Set(found.map((f) => f.label));
    chipsEl.innerHTML = found.map((f) => `<span class="heard-chip heard-chip--${f.kind}${seen.has(f.label) ? "" : " is-new"}"><i aria-hidden="true"></i>${f.label}</span>`).join("");
    seen = now;
  }
  let detectTimer = 0;
  sentenceEl.addEventListener("input", () => {
    clearTimeout(detectTimer);
    detectTimer = setTimeout(detect, 180);
    if (sentenceEl.getAttribute("aria-invalid") === "true" && sentenceEl.value.trim()) {
      sentenceEl.removeAttribute("aria-invalid");
      hint.textContent = "";
    }
  });
  detect();

  $("#ob-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const sentence = sentenceEl.value.trim();
    if (sentence.length < 8) {
      sentenceEl.setAttribute("aria-invalid", "true");
      hint.textContent = "One sentence is enough: your city and what you do.";
      sentenceEl.focus();
      return;
    }
    state.name = S.cleanName(nameEl.value);
    state.sentence = sentence;
    state.lang = ($('input[name="lang"]:checked') || {}).value || "en";
    state.size = parseFloat(($('input[name="size"]:checked') || {}).value || "1");
    Object.entries(sentenceWeights).forEach(([t, v]) => { if (t in state.weights) state.weights[t] += v; });
    S.store.set({ name: state.name, sentence: state.sentence, lang: state.lang, size: state.size });
    paintBars();
    goStep(2);
    setTimeout(() => $("#ob-deck").focus({ preventScroll: true }), 400);
  });

  /* ---------------------------------------------------------------- step 2: twelve headlines */
  const barsEl = $("#ob-bars");
  barsEl.innerHTML = TOPICS.map((t) => `
    <li class="bar" data-topic="${t}"><span>${D.TOPICS[t]}</span><span class="bar__track"><span class="bar__fill"></span></span><span class="bar__val">0</span></li>`).join("");
  function paintBars() {
    TOPICS.forEach((t) => {
      const li = barsEl.querySelector(`[data-topic="${t}"]`);
      const v = state.weights[t];
      const fill = li.querySelector(".bar__fill");
      fill.style.setProperty("--w", v > 0 ? Math.min(1, 0.1 + v * 0.16) : 0.05);
      fill.classList.toggle("is-neg", v < 0);
      li.querySelector(".bar__val").textContent = v > 0 ? `+${v}` : v;
    });
  }
  paintBars();
  const countEl = $("#ob-count");
  let swiped = 0;
  const deck = new S.SwipeDeck($("#ob-deck"), D.SWIPE, {
    onSwipe: (item, action) => {
      state.weights[item.topic] += action === "love" ? 2 : action === "keep" ? 1 : -1;
      swiped++;
      countEl.textContent = swiped < D.SWIPE.length ? `${swiped + 1} of ${D.SWIPE.length}` : `${D.SWIPE.length} of ${D.SWIPE.length}`;
      paintBars();
    },
    onDone: () => setTimeout(startPrint, 350)
  });
  $$(".ob-deck-wrap .deck-btn").forEach((b) => b.addEventListener("click", () => deck.fling(b.dataset.act)));
  $("#ob-finish").addEventListener("click", startPrint);

  /* ---------------------------------------------------------------- step 3: the press */
  let printing = false;
  function startPrint() {
    if (printing) return;
    printing = true;
    S.store.set({ weights: state.weights });
    goStep(3);

    $("#ps-title").textContent = S.paperTitle(state.name, "en");
    $("#ps-title-ur").textContent = S.paperTitle(state.name, "ur");
    /* the two stories the reader cares about most, in their language */
    const order = D.STORIES.filter((s) => s.id !== "viral")
      .map((s, i) => ({ s, i, score: s.topics.reduce((a, t) => a + (state.weights[t] || 0), 0) }))
      .sort((a, b) => b.score - a.score || a.i - b.i).map((x) => x.s);
    const lang = state.lang;
    [["#ps-h1", order[0]], ["#ps-h2", order[1]]].forEach(([sel, st]) => {
      const el = $(sel);
      el.textContent = st[lang].headline;
      if (lang === "ur") { el.setAttribute("lang", "ur"); el.setAttribute("dir", "rtl"); el.style.fontFamily = "var(--font-urdu)"; el.style.lineHeight = "1.9"; el.style.fontSize = "0.9rem"; }
    });

    const LOG = [
      `Reading overnight coverage from ${D.OUTLETS.length} newsrooms`,
      "Grouping duplicate reports into single stories",
      "Checking each story across outlets",
      "Keeping the ten that fit you",
      "Writing your For you lines"
    ];
    if (lang === "ur") LOG.push("Setting it in Urdu Nastaliq");
    if (lang === "ro") LOG.push("Writing it in Roman Urdu");
    if (state.size > 1) LOG.push("Enlarging the type");

    const logEl = $("#press-log");
    const bar = $("#press-bar");
    const press = $(".press");
    const sheet = $("#press-sheet");
    const step = S.reduceMotion ? 0 : 780;
    press.classList.add("is-printing");
    if (!S.reduceMotion && sheet.animate) {
      sheet.animate([{ transform: "translateY(-101%)" }, { transform: "translateY(0)" }], {
        duration: step * LOG.length + 400, easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "forwards"
      });
    } else {
      sheet.style.transform = "none";
    }
    const tick = S.ICONS.check;
    LOG.forEach((line, i) => {
      setTimeout(() => {
        const prev = logEl.querySelector(".is-working");
        if (prev) { prev.classList.remove("is-working"); prev.classList.add("is-done"); }
        const li = document.createElement("li");
        li.className = "is-working";
        li.innerHTML = `<span class="tick" aria-hidden="true">${tick}</span><span>${line}</span>`;
        logEl.appendChild(li);
        bar.style.transform = `scaleX(${(i + 1) / (LOG.length + 1)})`;
      }, i * step);
    });
    setTimeout(() => {
      const prev = logEl.querySelector(".is-working");
      if (prev) { prev.classList.remove("is-working"); prev.classList.add("is-done"); }
      bar.style.transform = "scaleX(1)";
      press.classList.remove("is-printing");
      $("#print-title").textContent = state.name ? `Your paper is ready, ${state.name}.` : "Your paper is ready.";
      $("#ob-ready").hidden = false;
      $("#ob-read").focus({ preventScroll: true });
      S.magnetic($("#ob-ready"));
    }, LOG.length * step + 300);
  }
});
