/* Live generation: a press-room ticker that lights up each feed as the server reads it, then a replay of
   tonight's real reports flying together into their story groups. Used by onboarding and the paper page. */
(function () {
  const S = window.Subah;
  const esc = S.esc;
  const wait = (ms) => new Promise((r) => setTimeout(r, S.reduceMotion ? 0 : ms));
  const URDU = /[؀-ۿ]/;

  function feedKey(id, lang) { return `${id}|${lang}`; }

  async function create(root, opts) {
    opts = opts || {};
    const lang = opts.lang === "ur" ? "ur" : "en";
    root.innerHTML = `
      <div class="live">
        <dl class="live__counters">
          <div><dt>feeds answered</dt><dd class="tabular" data-c="feeds">0</dd></div>
          <div><dt>reports read</dt><dd class="tabular" data-c="reports">0</dd></div>
          <div><dt>stories</dt><dd class="tabular" data-c="stories">0</dd></div>
        </dl>
        <ul class="live__feeds" aria-label="Feeds"></ul>
        <p class="live__status" role="status" aria-live="polite">Calling the newsrooms…</p>
        <div class="live__stage" aria-hidden="true" hidden></div>
      </div>`;
    const ul = root.querySelector(".live__feeds");
    const status = root.querySelector(".live__status");
    const stage = root.querySelector(".live__stage");
    const counters = { feeds: 0, reports: 0, stories: 0 };
    const setCount = (k, v) => { counters[k] = v; root.querySelector(`[data-c="${k}"]`).textContent = v; };

    function pill(id, name, lng) {
      let li = ul.querySelector(`[data-key="${CSS.escape(feedKey(id, lng))}"]`);
      if (!li) {
        li = document.createElement("li");
        li.className = "feed-pill is-waiting";
        li.dataset.key = feedKey(id, lng);
        li.innerHTML = `<span class="feed-pill__dot" aria-hidden="true"></span><span class="feed-pill__name">${esc(name)}</span><span class="feed-pill__lang">${lng === "ur" ? "اردو" : "EN"}</span><span class="feed-pill__n tabular"></span>`;
        ul.appendChild(li);
      }
      return li;
    }
    try {
      const data = await S.api.outlets();
      data.outlets.forEach((o) => o.feeds.filter((f) => f.enabled).forEach((f) => pill(o.id, o.name, f.lang)));
    } catch (e) { /* pills appear as feeds report */ }

    function onEvent(ev) {
      if (ev.type === "feed") {
        const li = pill(ev.outlet_id, ev.outlet, ev.lang);
        li.classList.remove("is-waiting");
        const ok = ev.status === "ok";
        li.classList.add(ok ? "is-ok" : ev.status === "error" ? "is-failed" : "is-bad");
        li.querySelector(".feed-pill__n").textContent = ok ? ev.kept : ev.status === "error" ? "✕" : "0";
        li.title = ok ? `${ev.kept} recent reports` : `${ev.status}: ${ev.error || ""}`;
        if (ok) setCount("feeds", counters.feeds + 1);
        setCount("reports", counters.reports + (ev.kept || 0));
        status.textContent = ok ? `${ev.outlet} answered with ${ev.kept} reports` : `${ev.outlet} ${ev.status === "error" ? "did not answer" : "sent nothing usable"}, skipped`;
      } else if (ev.type === "collected") {
        setCount("reports", ev.articles);
        status.textContent = `Read ${ev.articles} reports after removing duplicates. Grouping them by meaning, across English and Urdu…`;
        ul.querySelectorAll(".is-waiting").forEach((li) => li.classList.add("is-idle"));
      } else if (ev.type === "grouped") {
        setCount("stories", ev.stories);
        status.textContent = `${ev.articles} reports became ${ev.stories} stories; ${ev.multi} were reported by more than one outlet.`;
      } else if (ev.type === "ranked") {
        status.textContent = `Ranked by the published formula. Writing summaries for the top ${ev.picked}…`;
      } else if (ev.type === "summarised") {
        status.textContent = ev.enabled
          ? `${ev.summarised} summaries passed the source check in ${ev.calls} AI call${ev.calls === 1 ? "" : "s"}; ${ev.fallback} show headlines only.`
          : `No AI today (${ev.note}). Stories show their own headlines and links.`;
      }
    }

    /* the replay: the real reports of the top stories, scattered, then pulled into their groups */
    async function replay(edition) {
      const stories = edition.stories.slice(0, 5).filter((s) => s.sources.length);
      if (!stories.length) return;
      stage.hidden = false;
      stage.innerHTML = "";
      const W = stage.clientWidth, H = stage.clientHeight;
      const narrow = W < 560;
      const anchors = (narrow
        ? [[0.27, 0.16], [0.73, 0.2], [0.27, 0.5], [0.73, 0.54], [0.5, 0.85]]
        : [[0.18, 0.27], [0.5, 0.22], [0.82, 0.27], [0.33, 0.75], [0.67, 0.75]]).map(([x, y]) => [x * W, y * H]);
      const chipW = Math.min(200, W * (narrow ? 0.42 : 0.3));
      const chips = [];
      stories.forEach((st, g) => st.sources.slice(0, 4).forEach((src) => chips.push({ g, src })));
      let seed = 11;
      const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      const els = chips.map(({ src }) => {
        const el = document.createElement("div");
        el.className = "live-chip";
        el.style.width = `${chipW}px`;
        const ur = URDU.test(src.title);
        el.innerHTML = `<b>${esc(src.outlet)}</b><span${ur ? ' lang="ur" dir="rtl"' : ""}>${esc(src.title)}</span>`;
        stage.appendChild(el);
        return el;
      });
      const starts = els.map((el) => [chipW / 2 + rand() * (W - chipW), 30 + rand() * (H - 60), rand() * 14 - 7]);
      const at = (x, y, r, s) => `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${r || 0}deg) scale(${s == null ? 1 : s})`;
      els.forEach((el, i) => { el.style.transform = at(...starts[i]); });
      status.textContent = `Tonight’s real reports for the top ${stories.length} stories, from ${new Set(chips.map((c) => c.src.outlet)).size} outlets…`;
      if (!S.reduceMotion) {
        els.forEach((el, i) => el.animate([{ opacity: 0, transform: at(...starts[i], 0.85) }, { opacity: 1, transform: at(...starts[i]) }],
          { duration: 420, delay: i * 35, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }));
        await wait(420 + els.length * 35 + 500);
        els.forEach((el, i) => {
          const [ax, ay] = anchors[chips[i].g];
          const k = chips.filter((c, j) => j < i && c.g === chips[i].g).length;
          el.animate([{ transform: at(...starts[i]) }, { transform: at(ax + (k - 1.5) * 5, ay + (k - 1.5) * 7, (k - 1.5) * 2.5) }],
            { duration: 1100, delay: rand() * 260, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" });
        });
        status.textContent = "Same event, same story, whatever the language…";
        await wait(1500);
        els.forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: "ease-in", fill: "forwards" }));
        await wait(260);
      } else {
        els.forEach((el) => el.remove());
      }
      stories.forEach((st, g) => {
        const card = document.createElement("div");
        card.className = "live-card";
        card.style.width = `${Math.min(220, W * (narrow ? 0.44 : 0.3))}px`;
        const head = S.headlineOf(st, lang);
        card.innerHTML = `<span class="live-card__head"${URDU.test(head) ? ' lang="ur" dir="rtl"' : ""}>${esc(head)}</span>${S.coverageHTML(st, lang, { dots: false })}`;
        card.style.transform = at(...anchors[g]);
        stage.appendChild(card);
        if (!S.reduceMotion) card.animate([{ opacity: 0, transform: at(...anchors[g], 0, 0.75) }, { opacity: 1, transform: at(...anchors[g]) }],
          { duration: 520, delay: g * 110, easing: "cubic-bezier(0.34, 1.4, 0.64, 1)", fill: "backwards" });
      });
      status.textContent = `${chips.length} reports, ${stories.length} stories. Each label is a count of outlets.`;
      await wait(1700);
    }

    return { onEvent, replay, root };
  }

  S.Live = { create };
})();
