/* The last page: remember three things, answer three questions, close the paper. */
document.addEventListener("DOMContentLoaded", () => {
  const D = window.SUBAH_DATA;
  const S = window.Subah;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const profile = S.store.get();
  let lang = ["en", "ur", "ro"].includes(profile.lang) ? profile.lang : "en";

  const T = {
    en: {
      lede: "You’re done for today. Ten stories, about six minutes, and nothing else is waiting.",
      s1v: "10 of 10", s1: "stories read", s2v: "8 + 1 + 1", s2: "confirmed, single source, unconfirmed", s3v: "0", s3: "feeds to scroll",
      rememberTitle: "Three things to remember", quizTitle: "The Daily 3", quizLede: "Three questions from this morning’s paper. No timer, no streak.",
      nextTitle: "Your next paper prints in", nextNote: "Tomorrow at 7:00 am, Lahore time. Until then, the news can wait.",
      close: "Close the paper", gift: "Make one for someone you love", seeYou: "See you at seven.", home: "Back to the front page",
      qOf: (i, n) => `Question ${i} of ${n}`, next: "Next question", score: "See my score", retry: "Try again",
      keys: ["A", "B", "C"], right: "Right.", wrong: "Not quite.",
      done: (n) => (n === 3 ? "All three. You read it properly." : n === 2 ? "Two of three. A good morning’s reading." : "Tomorrow brings another paper."),
      doneNote: "That’s the whole paper. Close it and get on with your day."
    },
    ur: {
      lede: "آج کے لیے بس۔ دس خبریں، تقریباً چھ منٹ، اور آگے کچھ انتظار نہیں کر رہا۔",
      s1v: "۱۰ میں سے ۱۰", s1: "خبریں پڑھ لیں", s2v: "۸ + ۱ + ۱", s2: "تصدیق شدہ، ایک ذریعہ، غیر مصدقہ", s3v: "۰", s3: "کوئی فیڈ نہیں",
      rememberTitle: "یاد رکھنے کی تین باتیں", quizTitle: "آج کے تین سوال", quizLede: "آج صبح کے اخبار سے تین سوال۔ نہ وقت کی پابندی، نہ کوئی اسٹریک۔",
      nextTitle: "آپ کا اگلا اخبار چھپنے میں", nextNote: "کل صبح سات بجے، لاہور کے وقت کے مطابق۔ تب تک خبریں انتظار کر سکتی ہیں۔",
      close: "اخبار بند کریں", gift: "کسی پیارے کے لیے بنائیں", seeYou: "سات بجے ملتے ہیں۔", home: "پہلے صفحے پر واپس",
      qOf: (i, n) => `سوال ${S.toUrduDigits(i)} / ${S.toUrduDigits(n)}`, next: "اگلا سوال", score: "نتیجہ دیکھیں", retry: "دوبارہ",
      keys: ["ا", "ب", "ج"], right: "درست۔", wrong: "صحیح جواب یہ ہے۔",
      done: (n) => (n === 3 ? "تینوں درست۔ آپ نے غور سے پڑھا۔" : n === 2 ? "تین میں سے دو۔ اچھی صبح۔" : "کل نیا اخبار آئے گا۔"),
      doneNote: "یہ پورا اخبار تھا۔ اب اسے بند کریں اور اپنے دن کا آغاز کریں۔"
    },
    ro: {
      lede: "Aaj ke liye bas. Das khabrein, taqreeban chhe minute, aur aagay kuch intezar nahin kar raha.",
      s1v: "10 mein se 10", s1: "khabrein parh leen", s2v: "8 + 1 + 1", s2: "tasdeeq shuda, aik zariya, ghair musaddiqa", s3v: "0", s3: "koi feed nahin",
      rememberTitle: "Yaad rakhne ki teen baatein", quizTitle: "Aaj ke teen sawal", quizLede: "Aaj subah ke akhbar se teen sawal. Na waqt ki pabandi, na koi streak.",
      nextTitle: "Aap ka agla akhbar chhapnay mein", nextNote: "Kal subah saat baje, Lahore ke waqt ke mutabiq. Tab tak khabrein intezar kar sakti hain.",
      close: "Akhbar band karein", gift: "Kisi pyaray ke liye banayein", seeYou: "Saat baje miltay hain.", home: "Pehlay safhay par wapas",
      qOf: (i, n) => `Sawal ${i} / ${n}`, next: "Agla sawal", score: "Nateeja dekhein", retry: "Dobara",
      keys: ["A", "B", "C"], right: "Durust.", wrong: "Sahi jawab yeh hai.",
      done: (n) => (n === 3 ? "Teenon durust. Aap ne ghaur se parha." : n === 2 ? "Teen mein se do. Achi subah." : "Kal naya akhbar aayega."),
      doneNote: "Yeh poora akhbar tha. Ab ise band karein aur apne din ka aaghaz karein."
    }
  };

  /* ---------------------------------------------------------------- language */
  function applyText() {
    const L = T[lang];
    document.body.dataset.lang = lang;
    $$("[data-t]").forEach((el) => {
      const k = el.dataset.t;
      if (typeof L[k] !== "string") return;
      el.textContent = L[k];
      el.classList.toggle("is-ur", lang === "ur");
      if (lang === "ur") { el.setAttribute("lang", "ur"); el.setAttribute("dir", "rtl"); }
      else { el.removeAttribute("lang"); el.removeAttribute("dir"); }
    });
    $$("#end-lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    renderRemember();
    renderQuiz();
    if (cd) clearInterval(cd);
    cd = S.countdown($("#end-countdown"), { urdu: lang === "ur" });
  }
  let cd = 0;
  $("#end-lang").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.dataset.lang === lang) return;
    lang = b.dataset.lang;
    S.store.set({ lang });
    quiz = { i: 0, score: 0, answered: false, results: [] };
    applyText();
  });

  /* ---------------------------------------------------------------- three things */
  function renderRemember() {
    const list = $("#remember-list");
    list.innerHTML = D.TAKEAWAYS[lang].map((t, i) => `<li class="is-flip" style="--i:${i}"${lang === "ur" ? ' lang="ur" dir="rtl"' : ""}>${t}</li>`).join("");
  }

  /* ---------------------------------------------------------------- the Daily 3 */
  let quiz = { i: 0, score: 0, answered: false, results: [] };
  const card = $("#quiz-card");
  const CHECK = S.ICONS.check;
  const CROSS = S.ICONS.x;
  function pips() {
    const Q = D.QUIZ[lang];
    return Q.map((_, k) => `<i class="${quiz.results[k] === true ? "is-right" : quiz.results[k] === false ? "is-wrong" : k === quiz.i ? "is-now" : ""}"></i>`).join("");
  }
  function renderQuiz() {
    const L = T[lang];
    const Q = D.QUIZ[lang];
    const ur = lang === "ur";
    card.setAttribute("dir", ur ? "rtl" : "ltr");
    if (quiz.i >= Q.length) {
      const n = quiz.score;
      card.innerHTML = `
        <div class="quiz__done">
          <div class="quiz__ring" aria-hidden="true">
            <svg viewBox="0 0 140 140"><circle class="track" cx="70" cy="70" r="60"/><circle class="fill" cx="70" cy="70" r="60" id="quiz-ring"/></svg>
            <span class="quiz__score tabular">${ur ? S.toUrduDigits(n) : n}/${ur ? "۳" : 3}</span>
          </div>
          <div>
            <h3${ur ? ' class="is-ur" lang="ur"' : ""}>${L.done(n)}</h3>
            <p${ur ? ' class="is-ur" lang="ur"' : ""}>${L.doneNote}</p>
            <button class="btn btn--ghost quiz__next" type="button" id="quiz-retry">${L.retry}</button>
          </div>
        </div>`;
      requestAnimationFrame(() => requestAnimationFrame(() => { $("#quiz-ring").style.strokeDashoffset = String(377 * (1 - n / Q.length)); }));
      $("#quiz-retry").addEventListener("click", () => { quiz = { i: 0, score: 0, answered: false, results: [] }; renderQuiz(); $(".quiz__opt", card)?.focus(); });
      return;
    }
    const q = Q[quiz.i];
    card.innerHTML = `
      <div class="quiz__meta"><span${ur ? ' class="is-ur" lang="ur"' : ""}>${L.qOf(quiz.i + 1, Q.length)}</span><span class="quiz__pips" aria-hidden="true">${pips()}</span></div>
      <p class="quiz__q"${ur ? ' lang="ur"' : ""} id="quiz-q">${q.q}</p>
      <div class="quiz__opts" role="group" aria-labelledby="quiz-q">
        ${q.options.map((o, k) => `<button class="quiz__opt" type="button" data-k="${k}"${ur ? ' lang="ur"' : ""}><span class="quiz__key" aria-hidden="true">${L.keys[k]}</span><span>${o}</span><span class="quiz__mark" aria-hidden="true"></span></button>`).join("")}
      </div>
      <p class="quiz__note"${ur ? ' lang="ur"' : ""} id="quiz-note" role="status"></p>
      <div id="quiz-next-wrap"></div>`;
    $$(".quiz__opt", card).forEach((b) => b.addEventListener("click", () => answer(+b.dataset.k)));
  }
  function answer(k) {
    if (quiz.answered) return;
    quiz.answered = true;
    const L = T[lang];
    const Q = D.QUIZ[lang];
    const q = Q[quiz.i];
    const right = k === q.answer;
    if (right) quiz.score++;
    quiz.results[quiz.i] = right;
    $$(".quiz__opt", card).forEach((b) => {
      const kk = +b.dataset.k;
      b.disabled = true;
      if (kk === q.answer) { b.classList.add("is-right"); b.querySelector(".quiz__mark").innerHTML = CHECK; }
      else if (kk === k) { b.classList.add("is-wrong"); b.querySelector(".quiz__mark").innerHTML = CROSS; }
      else b.classList.add("is-dim");
    });
    $(".quiz__pips", card).innerHTML = pips();
    $("#quiz-note").textContent = `${right ? L.right : L.wrong} ${q.note}`;
    const last = quiz.i === Q.length - 1;
    $("#quiz-next-wrap").innerHTML = `<button class="btn btn--ink quiz__next" type="button" id="quiz-next">${last ? L.score : L.next} ${S.ICONS.arrow}</button>`;
    const nb = $("#quiz-next");
    nb.addEventListener("click", () => {
      quiz.i++; quiz.answered = false; renderQuiz();
      const first = $(".quiz__opt", card) || $("#quiz-retry");
      if (first) first.focus();
    });
    nb.focus();
  }

  /* ---------------------------------------------------------------- close the paper */
  const closing = $("#closing");
  const closeBtn = $("#close-paper");
  const main = $("#end-main");
  function openClosing() {
    closing.hidden = false;
    requestAnimationFrame(() => closing.classList.add("is-open"));
    main.inert = true;
    document.body.style.overflow = "hidden";
    setTimeout(() => $("#closing-home").focus(), S.reduceMotion ? 0 : 700);
  }
  function shutClosing() {
    closing.classList.remove("is-open");
    closing.hidden = true;
    main.inert = false;
    document.body.style.overflow = "";
    closeBtn.focus();
  }
  closeBtn.addEventListener("click", openClosing);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !closing.hidden) shutClosing(); });

  applyText();
});
