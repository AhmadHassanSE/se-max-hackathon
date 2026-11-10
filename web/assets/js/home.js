/* Home: one night, scrolled. */
document.addEventListener("DOMContentLoaded", () => {
  const D = window.SUBAH_DATA;
  const S = window.Subah;
  const html = document.documentElement;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const choreo = hasGsap && !S.reduceMotion;
  if (choreo) {
    gsap.registerPlugin(ScrollTrigger);
    html.classList.add("gsap-on", "sky-on");
  }

  const byId = (id) => document.getElementById(id);
  const story = (id) => D.STORIES.find((s) => s.id === id);
  const profile = S.store.get();

  /* ------------------------------------------------------------ smooth scroll */
  let lenis = null;
  if (choreo && window.Lenis) {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const el = document.querySelector(id);
        if (!el) return;
        e.preventDefault();
        lenis.scrollTo(el, { offset: -20 });
        history.replaceState(null, "", id);
      });
    });
  }

  /* ------------------------------------------------------------ stars */
  const canvas = document.querySelector(".sky__stars");
  let starsAlive = choreo;
  if (canvas && choreo) {
    const ctx = canvas.getContext("2d");
    let stars = [], w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((w * h) / 7000);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h * 0.85,
        r: Math.random() < 0.08 ? 1.6 : Math.random() * 1.1 + 0.3,
        p: Math.random() * Math.PI * 2, s: 0.4 + Math.random() * 1.2
      }));
    };
    resize();
    window.addEventListener("resize", resize);
    let last = 0;
    const draw = (t) => {
      if (!starsAlive) { requestAnimationFrame(draw); return; }
      if (t - last > 50) {
        last = t;
        ctx.clearRect(0, 0, w, h);
        for (const st of stars) {
          const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(st.p + (t / 1000) * st.s));
          ctx.globalAlpha = a;
          ctx.fillStyle = "#f4efe2";
          ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) starsAlive = false; else if (!html.classList.contains("is-daylight")) starsAlive = choreo; });

  /* ------------------------------------------------------------ the narrative clock */
  const clockEl = document.querySelector(".clock__time");
  const clockOrb = document.querySelector(".clock");
  function fmtTime(min) {
    min = ((Math.round(min) % 1440) + 1440) % 1440;
    const h = Math.floor(min / 60), m = min % 60;
    const h12 = ((h + 11) % 12) + 1;
    return { text: `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`, short: `${h12}:${String(m).padStart(2, "0")}`, ampm: h < 12 ? "am" : "pm", min };
  }
  function setClock(min) {
    if (!clockEl) return;
    const t = fmtTime(min);
    clockEl.textContent = t.text;
    clockOrb.style.setProperty("--clock-rot", `${(t.min / 1440) * 360 - 180}deg`);
  }
  const clockRange = (sec) => (sec.getAttribute("data-clock") || "0,0").split(",").map(Number);
  function clockTrigger(sec) {
    if (!choreo) return;
    const [a, b] = clockRange(sec);
    const span = ((b - a) + 1440) % 1440;
    ScrollTrigger.create({
      trigger: sec, start: "top 60%", end: "bottom 60%",
      onUpdate: (self) => setClock(a + span * self.progress),
      onEnter: () => setClock(a), onEnterBack: () => setClock(b)
    });
  }

  /* ------------------------------------------------------------ hero: name to masthead */
  const nameInput = byId("hero-name");
  const mpTitle = byId("mp-title");
  const mpTitleUr = byId("mp-title-ur");
  let lastTitle = "";
  function renderTitle(name) {
    const title = S.paperTitle(name, "en");
    mpTitleUr.textContent = S.paperTitle(name, "ur");
    const fold = document.querySelector(".fold__mast");
    if (fold) fold.textContent = title;
    if (title === lastTitle) return;
    const prev = lastTitle;
    lastTitle = title;
    mpTitle.innerHTML = [...title].map((c) => `<span class="ch">${c === " " ? "&nbsp;" : c.replace(/[&<>]/g, "")}</span>`).join("");
    if (choreo) {
      let firstDiff = 0;
      while (firstDiff < prev.length && prev[firstDiff] === title[firstDiff]) firstDiff++;
      const fresh = [...mpTitle.querySelectorAll(".ch")].slice(firstDiff);
      gsap.fromTo(fresh, { yPercent: -60, opacity: 0, rotate: -6 }, { yPercent: 0, opacity: 1, rotate: 0, duration: 0.45, ease: "back.out(2)", stagger: 0.025 });
    }
  }
  if (profile.name) nameInput.value = profile.name;
  renderTitle(nameInput.value);
  nameInput.addEventListener("input", () => renderTitle(S.cleanName(nameInput.value)));
  byId("namebar").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = S.cleanName(nameInput.value);
    S.store.set({ name });
    window.location.href = "onboard.html";
  });

  /* tilt the paper with the pointer */
  const stack = byId("paper-stack");
  S.tilt(stack, 12, { base: "rotateX(10deg) rotateY(-16deg) rotateZ(2.5deg)", host: document.querySelector(".hero__stage"), glare: false });
  const mini = document.querySelector(".mini-paper");
  if (mini && S.finePointer && !S.reduceMotion) {
    document.querySelector(".hero__stage").addEventListener("pointermove", (e) => {
      const r = mini.getBoundingClientRect();
      mini.style.setProperty("--gx", `${((e.clientX - r.left) / r.width) * 100}%`);
      mini.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  }

  /* hero entrance: one settle */
  if (choreo) {
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from(".hero__title .line > span", { yPercent: 110, duration: 1.1, stagger: 0.09 })
      .from("[data-hero-fade]", { y: 18, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.35)
      .from(".hero__stage", { y: 80, opacity: 0, rotate: 4, duration: 1.4 }, 0.2)
      .from(".hero__scroll", { opacity: 0, duration: 0.8 }, 1);
  }

  /* ------------------------------------------------------------ clock: hero */
  clockTrigger(document.querySelector(".hero"));

  /* ------------------------------------------------------------ cluster: 26 headlines become 5 stories */
  const stage = byId("cluster-stage");
  const clusterStories = ["petrol", "smog", "cricket", "rupee", "viral"].map(story);
  const chips = [];
  clusterStories.forEach((st, g) => {
    st.chips.forEach(([outlet, text]) => {
      const isUr = /[؀-ۿ]/.test(text);
      chips.push({ g, outlet, text, isUr, wa: outlet === "WhatsApp forward" });
    });
  });
  stage.innerHTML =
    chips.map((c) => `<div class="cl-chip${c.wa ? " cl-chip--wa" : ""}" aria-hidden="true"><b>${c.outlet}</b>${c.isUr ? `<span class="ur" lang="ur">${c.text}</span>` : c.text}</div>`).join("") +
    clusterStories.map((st) => `
      <div class="cl-card">
        <span class="cl-card__sec">${st.en.section}</span>
        <span class="cl-card__head">${shortHead(st)}</span>
        ${S.badgeHTML(st, "en", { dots: false })}
        <span class="cl-card__from">${st.outlets.length ? `${st.chips.length} headlines, one story` : "3 forwards, 0 outlets"}</span>
      </div>`).join("");
  function shortHead(st) {
    return {
      petrol: "Petrol held; diesel up Rs 3",
      smog: "Lahore schools online on Mondays",
      cricket: "Young squad for home Tests",
      rupee: "Rupee steady on remittances",
      viral: "‘Accounts frozen Friday’ message"
    }[st.id];
  }
  const countEl = document.querySelector(".cluster__count");
  countEl.textContent = D.OUTLETS.length;

  if (choreo) {
    const chipEls = [...stage.querySelectorAll(".cl-chip")];
    const cardEls = [...stage.querySelectorAll(".cl-card")];
    const steps = [...document.querySelectorAll(".cluster__steps li")];
    const L = { W: 0, H: 0, start: [], centers: [] };
    let seed = 7;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const starts = chips.map(() => [rand(), rand(), rand() * 16 - 8]);
    function layout() {
      L.W = stage.clientWidth; L.H = stage.clientHeight;
      const narrow = L.W < 560;
      const cw = chipEls[0].offsetWidth, ch = chipEls[0].offsetHeight || 48;
      L.start = starts.map(([a, b]) => ({ x: cw / 2 + a * (L.W - cw), y: ch / 2 + b * (L.H - ch) }));
      const pos = narrow
        ? [[0.25, 0.15], [0.75, 0.2], [0.25, 0.5], [0.75, 0.55], [0.5, 0.86]]
        : [[0.17, 0.24], [0.5, 0.2], [0.83, 0.27], [0.32, 0.74], [0.68, 0.78]];
      L.centers = pos.map(([x, y]) => ({ x: x * L.W, y: y * L.H }));
    }
    layout();
    ScrollTrigger.addEventListener("refreshInit", layout);
    gsap.set(chipEls, { xPercent: -50, yPercent: -50 });
    gsap.set(cardEls, { xPercent: -50, yPercent: -50 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".cluster", start: "top top", end: "+=220%", pin: ".cluster__pin", scrub: 0.7,
        invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (self) => {
          const p = self.progress;
          const k = p < 0.22 ? 0 : p < 0.62 ? 1 : 2;
          steps.forEach((li, i) => li.classList.toggle("is-active", i === k));
          setClock(0 + 190 * p);
        }
      }
    });
    tl.fromTo(chipEls,
      { x: (i) => L.start[i].x, y: (i) => L.start[i].y, rotation: (i) => starts[i][2], opacity: 1, scale: 1 },
      { x: (i) => L.start[i].x + (rand() * 30 - 15), y: (i) => L.start[i].y - 18, duration: 1, ease: "none" }, 0);
    tl.to(chipEls, {
      x: (i) => L.centers[chips[i].g].x + ((i % 3) - 1) * 6,
      y: (i) => L.centers[chips[i].g].y + ((i % 4) - 1.5) * 7,
      rotation: (i) => ((i % 5) - 2) * 2.2,
      duration: 3, ease: "power2.inOut", stagger: { each: 0.05, from: "random" }
    }, 1);
    tl.to(chipEls, { scale: 0.86, opacity: 0, duration: 1, ease: "power1.in", stagger: 0.015 }, 4.6);
    tl.fromTo(cardEls,
      { x: (i) => L.centers[i].x, y: (i) => L.centers[i].y, opacity: 0, scale: 0.7, rotation: (i) => (i % 2 ? 4 : -4) },
      { opacity: 1, scale: 1, rotation: 0, duration: 1.2, ease: "back.out(1.6)", stagger: 0.18 }, 4.9);
    tl.to({}, { duration: 2 });

    ScrollTrigger.create({
      trigger: ".cluster", start: "top 70%", once: true,
      onEnter: () => S.countUp(countEl, D.OUTLETS.length, { duration: 1200 })
    });
  }

  /* ------------------------------------------------------------ learn: swipe five headlines */
  const learnTopics = ["prices", "local", "cricket", "money", "work"];
  const weights = Object.fromEntries(learnTopics.map((t) => [t, 0]));
  const barsEl = byId("learn-bars");
  barsEl.innerHTML = learnTopics.map((t) => `
    <li class="bar" data-topic="${t}">
      <span>${D.TOPICS[t]}</span>
      <span class="bar__track"><span class="bar__fill"></span></span>
      <span class="bar__val">0</span>
    </li>`).join("");
  function paintBars() {
    learnTopics.forEach((t) => {
      const li = barsEl.querySelector(`[data-topic="${t}"]`);
      const v = weights[t];
      const fill = li.querySelector(".bar__fill");
      fill.style.setProperty("--w", v > 0 ? Math.min(1, 0.12 + v * 0.3) : 0.06);
      fill.classList.toggle("is-neg", v < 0);
      li.querySelector(".bar__val").textContent = v > 0 ? `+${v}` : v;
    });
  }
  paintBars();
  const deckItems = learnTopics.map((t) => D.SWIPE.find((s) => s.topic === t));
  const deck = new S.SwipeDeck(byId("learn-deck"), deckItems, {
    onSwipe: (item, action) => {
      weights[item.topic] += action === "love" ? 2 : action === "keep" ? 1 : -1;
      paintBars();
    },
    onDone: () => {
      byId("learn-done").hidden = false;
      document.querySelector(".learn .deck-actions").hidden = true;
      byId("learn-deck").hidden = true;
    }
  });
  document.querySelectorAll(".learn .deck-btn").forEach((b) => b.addEventListener("click", () => deck.fling(b.dataset.act)));
  clockTrigger(document.querySelector(".learn"));

  /* ------------------------------------------------------------ fajr: the sun comes up over Lahore */
  const fajrHH = document.querySelector(".fajr__hh");
  const fajrAmPm = document.querySelector(".fajr__ampm");
  if (choreo) {
    const clockObj = { m: 308 };
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".fajr", start: "top top", end: "+=170%", pin: ".fajr__pin", scrub: 0.8, anticipatePin: 1,
        onUpdate: (self) => {
          html.classList.toggle("is-daylight", self.progress > 0.62);
          starsAlive = self.progress < 0.55;
        },
        onLeave: () => html.classList.add("is-daylight"),
        onLeaveBack: () => { html.classList.remove("is-daylight"); starsAlive = true; }
      }
    });
    tl.to(".sky__dawn", { opacity: 1, duration: 4, ease: "none" }, 0)
      .to(".sky__stars", { opacity: 0, duration: 3.5, ease: "none" }, 0)
      .to(".sky__moon", { y: -120, opacity: 0, duration: 3, ease: "power1.in" }, 0)
      .fromTo(".fajr__sun", { yPercent: 70, scale: 0.85 }, { yPercent: -95, scale: 1, duration: 8, ease: "power1.out" }, 0.5)
      .to(".sky__day", { opacity: 1, duration: 4, ease: "none" }, 4)
      .to(clockObj, {
        m: 420, duration: 7.5, ease: "none",
        onUpdate: () => {
          const t = fmtTime(clockObj.m);
          fajrHH.textContent = t.short; fajrAmPm.textContent = t.ampm; setClock(clockObj.m);
        }
      }, 0)
      .fromTo(".fajr__copy", { color: "rgb(243, 239, 229)" }, { color: "rgb(22, 26, 40)", duration: 1.6, ease: "none" }, 4.4)
      .fromTo(".skyline", { color: "rgb(7, 10, 20)" }, { color: "rgb(52, 40, 46)", duration: 4, ease: "none" }, 3.5)
      .to(".fajr__line--a", { opacity: 0, y: -10, duration: 0.8 }, 6.2)
      .fromTo(".fajr__line--b", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8 }, 6.8)
      .fromTo(".fajr__birds", { opacity: 0, x: -60 }, { opacity: 0.8, x: 120, duration: 3, ease: "none" }, 5.5)
      .to({}, { duration: 1.2 });
  } else {
    fajrHH.textContent = "7:00";
  }

  /* ------------------------------------------------------------ for you: one story, four readers */
  const personas = byId("personas");
  const fyText = byId("foryou-text");
  byId("sc-badge").innerHTML = S.badgeHTML(story("petrol"), "en");
  personas.innerHTML = D.PERSONAS.map((p, i) => `
    <button class="persona" type="button" role="tab" id="persona-${p.id}" aria-controls="persona-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-i="${i}">${p.label}</button>`).join("");
  const tabs = [...personas.querySelectorAll(".persona")];
  function selectPersona(i, focus) {
    tabs.forEach((t, k) => { t.setAttribute("aria-selected", String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    byId("persona-panel").setAttribute("aria-labelledby", tabs[i].id);
    if (focus) tabs[i].focus();
    S.typewriter(fyText, D.PERSONAS[i].line, { speed: 16 });
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectPersona(i));
    t.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); selectPersona((i + 1) % tabs.length, true); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); selectPersona((i - 1 + tabs.length) % tabs.length, true); }
    });
  });
  byId("persona-panel").setAttribute("aria-labelledby", tabs[0].id);
  /* auto-cycle readers once while the card is on screen, until the visitor picks one */
  let autoCycle = true, cycleTimer = 0;
  tabs.forEach((t) => t.addEventListener("click", () => { autoCycle = false; clearTimeout(cycleTimer); }));
  if ("IntersectionObserver" in window && !S.reduceMotion) {
    let k = 0;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting || !autoCycle) return;
      io.disconnect();
      const next = () => {
        if (!autoCycle || k >= D.PERSONAS.length - 1) return;
        k += 1; selectPersona(k);
        cycleTimer = setTimeout(next, 4200);
      };
      cycleTimer = setTimeout(next, 2600);
    }), { threshold: 0.6 });
    io.observe(document.querySelector(".story-card"));
  }
  ["foryou", "sample", "gift", "pricing", "sources", "ending"].forEach((c) => clockTrigger(document.querySelector("." + c)));

  /* ------------------------------------------------------------ sample paper: language, size, audio */
  const paper = byId("sample-paper");
  const sampleIds = ["petrol", "smog", "viral"];
  const LBL = {
    en: { edition: "Edition No. 1", city: "Lahore", count: "10 stories, 6 min", fy: "For you.", date: "en" },
    ur: { edition: "شمارہ ۱", city: "لاہور", count: "۱۰ خبریں، ۶ منٹ", fy: "آپ کے لیے:", date: "ur" },
    ro: { edition: "Shumara 1", city: "Lahore", count: "10 khabrein, 6 minute", fy: "Aap ke liye:", date: "ro" }
  };
  let lang = "en";
  function renderSample() {
    const l = LBL[lang];
    paper.setAttribute("lang", lang === "ur" ? "ur" : "en");
    paper.setAttribute("dir", lang === "ur" ? "rtl" : "ltr");
    paper.innerHTML = `
      <header class="sp__mast">
        <div class="sp__meta"><span>${l.edition}</span><span>${l.city}</span></div>
        <h3 class="sp__title">${S.paperTitle(S.cleanName(nameInput.value), lang)}</h3>
        <div class="sp__meta"><span>${S.dates[l.date]()}</span><span>${l.count}</span></div>
      </header>
      <div class="sp__grid">
        ${sampleIds.map((id, i) => {
          const st = story(id), t = st[lang];
          return `<div class="sp__story" data-i="${i}">
            <p class="sp__sec">${t.section}</p>
            <h4 class="sp__head">${t.headline}</h4>
            ${i === 0 ? `<p class="sp__dek">${t.dek}</p>` : ""}
            ${S.badgeHTML(st, lang, { dots: false })}
            <p class="sp__foryou"><b>${l.fy}</b> ${t.forYou}</p>
          </div>`;
        }).join("")}
      </div>`;
  }
  renderSample();
  const langSeg = byId("sample-lang");
  langSeg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.lang === lang) return;
    langSeg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    const swap = () => { lang = b.dataset.lang; renderSample(); };
    stopAudio();
    if (choreo) {
      gsap.timeline()
        .to(paper, { rotateY: lang === "en" ? -90 : 90, duration: 0.28, ease: "power2.in" })
        .add(swap)
        .fromTo(paper, { rotateY: b.dataset.lang === "ur" ? -90 : 90 }, { rotateY: 0, duration: 0.5, ease: "power3.out" });
    } else swap();
  }));
  const sizeInput = byId("sample-size");
  sizeInput.addEventListener("input", () => {
    const v = parseFloat(sizeInput.value);
    paper.style.setProperty("--scale", v);
    paper.classList.toggle("is-large", v >= 1.3);
  });

  const listenBtn = byId("sample-listen");
  const note = byId("sample-note");
  function stopAudio() {
    S.speech.stop();
    listenBtn.classList.remove("is-speaking");
    listenBtn.setAttribute("aria-pressed", "false");
    listenBtn.querySelector(".listen__label").textContent = "Listen";
    listenBtn.querySelector(".listen__icon").innerHTML = S.ICONS.play;
    paper.querySelectorAll(".sp__story").forEach((s) => s.classList.remove("is-reading"));
  }
  listenBtn.addEventListener("click", () => {
    if (listenBtn.classList.contains("is-speaking")) { stopAudio(); note.textContent = ""; return; }
    if (!S.speech.supported) { note.textContent = "This browser has no speech voice. The live audio edition is a recorded Urdu voice note."; return; }
    let readLang = lang;
    const v = S.speech.voiceFor("ur");
    if (lang === "ur" && !(v && v.lang.toLowerCase().startsWith("ur"))) {
      readLang = "ro";
      note.textContent = "No Urdu voice on this device, so it reads the Roman Urdu edition. The live audio edition uses a recorded Urdu voice.";
    } else note.textContent = "";
    const items = sampleIds.map((id, i) => {
      const t = story(id)[readLang];
      return { text: `${t.headline}. ${LBL[readLang].fy.replace(/[.:]/, "")}: ${t.forYou}`, onStart: () => {
        paper.querySelectorAll(".sp__story").forEach((s, k) => s.classList.toggle("is-reading", k === i));
      } };
    });
    listenBtn.classList.add("is-speaking");
    listenBtn.setAttribute("aria-pressed", "true");
    listenBtn.querySelector(".listen__label").textContent = "Stop";
    listenBtn.querySelector(".listen__icon").innerHTML = S.ICONS.pause;
    S.speech.play(items, readLang, { onEnd: stopAudio });
  });
  nameInput.addEventListener("input", () => { const t = paper.querySelector(".sp__title"); if (t) t.textContent = S.paperTitle(S.cleanName(nameInput.value), lang); });

  /* ------------------------------------------------------------ gift: Dubai to Lahore, then the letter opens */
  const path = byId("flight-path");
  const plane = byId("flight-plane");
  function placePlane(p) {
    const len = path.getTotalLength();
    const pt = path.getPointAtLength(len * p);
    const pt2 = path.getPointAtLength(Math.min(len, len * p + 1));
    const ang = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI;
    plane.setAttribute("transform", `translate(${pt.x} ${pt.y}) rotate(${ang})`);
  }
  placePlane(1);
  if (choreo) {
    const f = { p: 0 };
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ".gift__stage", start: "top 75%", end: "bottom 45%", scrub: 0.8 }
    });
    gsap.set(".envelope__flap", { rotateX: 0, zIndex: 4 });
    gsap.set(".letter", { yPercent: 0 });
    placePlane(0);
    tl.fromTo(f, { p: 0 }, { p: 1, duration: 5, ease: "power1.inOut", onUpdate: () => placePlane(f.p) }, 0)
      .fromTo(".flight__path", { strokeDashoffset: 0 }, { strokeDashoffset: -60, duration: 5, ease: "none" }, 0)
      .to(".envelope__flap", { rotateX: 180, duration: 1.4, ease: "power2.inOut" }, 4.6)
      .set(".envelope__flap", { zIndex: 1 }, 5.3)
      .to(".letter", { yPercent: -74, duration: 2.2, ease: "power3.out" }, 5.6);
  }

  /* ------------------------------------------------------------ pricing tilt */
  document.querySelectorAll("[data-tilt]").forEach((el) => S.tilt(el, 7));

  /* ------------------------------------------------------------ sources marquee */
  const outletHTML = (o) => `<span class="outlet outlet--${o.region}"><span class="outlet__mono" aria-hidden="true">${o.name.replace(/^The /, "")[0]}</span>${o.name}</span>`;
  const fillMarquee = (el, list) => {
    const track = el.querySelector(".marquee__track");
    track.innerHTML = list.map(outletHTML).join("");
    const clone = track.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    el.appendChild(clone);
  };
  fillMarquee(byId("marquee-pk"), D.OUTLETS.filter((o) => o.region === "pk"));
  fillMarquee(byId("marquee-world"), D.OUTLETS.filter((o) => o.region === "world"));
  const mToggle = byId("marquee-toggle");
  if (S.reduceMotion) mToggle.hidden = true;
  mToggle.addEventListener("click", () => {
    const paused = mToggle.getAttribute("aria-pressed") !== "true";
    mToggle.setAttribute("aria-pressed", String(paused));
    mToggle.textContent = paused ? "Play" : "Pause";
    document.querySelectorAll(".marquee").forEach((m) => m.classList.toggle("is-paused", paused));
  });

  /* ------------------------------------------------------------ the end: the paper folds shut */
  if (choreo) {
    gsap.fromTo(".fold__half--top", { rotateX: 0 }, {
      rotateX: -180, ease: "power2.inOut",
      scrollTrigger: { trigger: ".ending", start: "top 65%", end: "center 45%", scrub: 0.8 }
    });
    gsap.from(".ending__bas > span", {
      yPercent: 40, opacity: 0, stagger: 0.12, duration: 1, ease: "expo.out",
      scrollTrigger: { trigger: ".ending__bas", start: "top 80%" }
    });
  }
  S.countdown(byId("home-countdown"));

  /* reveal for in-flow pieces */
  if (choreo) ScrollTrigger.refresh();
});
