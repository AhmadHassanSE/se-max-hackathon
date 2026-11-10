/* The last page: today's top three again, with sources, then close the paper. */
document.addEventListener("DOMContentLoaded", async () => {
  const S = window.Subah;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const profile = S.store.get();
  let lang = profile.lang === "ur" ? "ur" : "en";
  let edition = null;
  try { edition = await S.api.edition(); } catch (e) { /* page still works without stories */ }

  const T = {
    en: {
      back: "Back to today’s paper", lede: "You’re done for today. Nothing else is waiting.",
      rememberTitle: "Today’s top three, once more", nextTitle: "Your next paper prints in",
      nextNote: "Tomorrow at 7:00 am, Lahore time. Until then, the news can wait.", close: "Close the paper",
      gift: "Make one for someone you love", seeYou: "See you at seven.", home: "Back to the front page",
      stats: (ed) => [[ed.stories.length, "stories in today’s paper"], [ed.stats.outlets_read, "outlets read overnight"], [0, "feeds to scroll"]],
      sources: (n) => `Sources (${n})`, none: "Generate a paper first to see its top three here."
    },
    ur: {
      back: "آج کے اخبار پر واپس", lede: "آج کے لیے بس۔ آگے کچھ انتظار نہیں کر رہا۔",
      rememberTitle: "آج کی تین بڑی خبریں، ایک بار پھر", nextTitle: "آپ کا اگلا اخبار چھپنے میں",
      nextNote: "کل صبح سات بجے، لاہور کے وقت کے مطابق۔ تب تک خبریں انتظار کر سکتی ہیں۔", close: "اخبار بند کریں",
      gift: "کسی پیارے کے لیے بنائیں", seeYou: "سات بجے ملتے ہیں۔", home: "پہلے صفحے پر واپس",
      stats: (ed) => [[ed.stories.length, "خبریں آج کے اخبار میں"], [ed.stats.outlets_read, "ادارے رات بھر پڑھے گئے"], [0, "فیڈ اسکرول کرنے کو"]],
      sources: (n) => `ذرائع (${S.toUrduDigits(n)})`, none: "یہاں تین بڑی خبریں دیکھنے کے لیے پہلے اخبار بنائیں۔"
    }
  };
  const num = (n) => (lang === "ur" ? S.toUrduDigits(n) : String(n));

  function renderTop() {
    const L = T[lang];
    const list = $("#remember-list");
    if (!edition || !edition.stories.length) { list.innerHTML = `<li>${L.none}</li>`; return; }
    list.innerHTML = edition.stories.slice(0, 3).map((st, i) => {
      const head = S.headlineOf(st, lang);
      const headUr = /[؀-ۿ]/.test(head);
      return `<li class="is-flip top3" style="--i:${i}"${lang === "ur" ? ' lang="ur" dir="rtl"' : ""}>
        <p class="top3__head"${headUr ? ' lang="ur" dir="rtl"' : ""}>${S.esc(head)}</p>
        ${S.coverageHTML(st, lang, { dots: false })}
        <details class="top3__src"><summary>${L.sources(st.sources.length)}</summary><ul>${st.sources.map((s) =>
          `<li><b>${S.esc(s.outlet)}</b> <a href="${S.esc(s.link)}" target="_blank" rel="noopener noreferrer"${s.lang === "ur" ? ' lang="ur" dir="rtl"' : ""}>${S.esc(s.title)}</a></li>`).join("")}</ul></details>
      </li>`;
    }).join("");
  }
  function renderStats() {
    const box = $("#bas-stats");
    if (!edition) { box.innerHTML = ""; return; }
    box.innerHTML = T[lang].stats(edition).map(([v, k]) => `<div role="listitem"><b class="tabular">${num(v)}</b><span${lang === "ur" ? ' lang="ur"' : ""}>${k}</span></div>`).join("");
  }
  let cd = 0;
  function apply() {
    const L = T[lang];
    $$("[data-t]").forEach((el) => {
      const k = el.dataset.t;
      if (typeof L[k] !== "string") return;
      el.textContent = L[k];
      el.classList.toggle("is-ur", lang === "ur");
      if (lang === "ur") { el.setAttribute("lang", "ur"); el.setAttribute("dir", "rtl"); }
      else { el.removeAttribute("lang"); el.removeAttribute("dir"); }
    });
    $$("#end-lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    renderTop();
    renderStats();
    clearInterval(cd);
    cd = S.countdown($("#end-countdown"), { urdu: lang === "ur" });
  }
  $("#end-lang").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.dataset.lang === lang) return;
    lang = b.dataset.lang;
    S.store.set({ lang });
    apply();
  });

  /* close the paper */
  const closing = $("#closing");
  const closeBtn = $("#close-paper");
  const main = $("#end-main");
  closeBtn.addEventListener("click", () => {
    closing.hidden = false;
    requestAnimationFrame(() => closing.classList.add("is-open"));
    main.inert = true;
    document.body.style.overflow = "hidden";
    setTimeout(() => $("#closing-home").focus(), S.reduceMotion ? 0 : 700);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || closing.hidden) return;
    closing.classList.remove("is-open");
    closing.hidden = true;
    main.inert = false;
    document.body.style.overflow = "";
    closeBtn.focus();
  });

  apply();
});
