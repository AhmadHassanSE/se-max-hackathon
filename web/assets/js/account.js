/* Log in, sign up, and the account page. ?mode=signup opens the sign-up form; ?next=<page> returns there after. */
document.addEventListener("DOMContentLoaded", async () => {
  const S = window.Subah;
  const $ = (s, r) => (r || document).querySelector(s);
  const params = new URLSearchParams(location.search);
  /* only return to a page on this site */
  const nextRaw = params.get("next") || "";
  const next = /^[a-z0-9-]+\.html(\?[\w=&%-]*)?$/i.test(nextRaw) ? nextRaw : "";

  function showTab(which) {
    ["login", "signup"].forEach((t) => {
      const on = t === which;
      $(`#tab-${t}`).setAttribute("aria-selected", String(on));
      $(`#tab-${t}`).setAttribute("aria-pressed", String(on));
      $(`#form-${t}`).hidden = !on;
    });
    $(`#form-${which} input`).focus({ preventScroll: true });
  }
  $("#tab-login").addEventListener("click", () => showTab("login"));
  $("#tab-signup").addEventListener("click", () => showTab("signup"));

  document.querySelectorAll(".pass__eye").forEach((b) => b.addEventListener("click", () => {
    const input = b.previousElementSibling;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    b.textContent = show ? "Hide" : "Show";
    b.setAttribute("aria-pressed", String(show));
    b.setAttribute("aria-label", show ? "Hide password" : "Show password");
  }));

  /* a rough strength meter: length and variety */
  $("#su-pass").addEventListener("input", (e) => {
    const v = e.target.value;
    let lvl = 0;
    if (v.length >= 8) lvl++;
    if (v.length >= 12) lvl++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) lvl++;
    if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) lvl++;
    if (v && lvl === 0) lvl = 1;
    $(".meter").dataset.level = String(lvl);
    $("#su-hint").textContent = v.length < 8 ? "At least 8 characters." : ["", "Weak.", "Fair.", "Good.", "Strong."][lvl];
  });
  $("#su-name").addEventListener("input", (e) => { $("#art-title").textContent = S.paperTitle(e.target.value, "en"); });

  async function submit(form, fn) {
    const err = $(".form-error", form);
    const btn = $("button[type=submit]", form);
    err.textContent = "";
    btn.disabled = true;
    try {
      await fn();
      if (next) { location.href = next; return; }
      await showHome();
    } catch (e) {
      err.textContent = e.status === 503 ? "Accounts are unavailable right now. Try again in a minute." : (e.message || "Something went wrong.");
    } finally {
      btn.disabled = false;
    }
  }
  $("#form-login").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    submit(f, () => S.api.login(f.email.value, f.password.value));
  });
  $("#form-signup").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    if (f.password.value.length < 8) { $(".form-error", f).textContent = "Use at least 8 characters for your password."; return; }
    submit(f, () => S.api.signup(f.name.value, f.email.value, f.password.value));
  });

  async function showHome(user) {
    user = user || await S.api.me();
    $("#acct-loading").hidden = true;
    if (!user) { $("#acct-home").hidden = true; $("#acct-auth").hidden = false; return; }
    $("#acct-auth").hidden = true;
    $("#acct-home").hidden = false;
    $("#home-hello").textContent = `Good morning, ${user.name.split(" ")[0]}.`;
    $("#home-email").textContent = user.email;
    $("#art-title").textContent = S.paperTitle(user.name.split(" ")[0], "en");
    const p = user.plan;
    $("#home-plan").innerHTML = p ? `
      <div class="acct-card__row"><span class="acct-card__plan">Subah ${S.esc(p.name)}</span><span class="acct-card__price">$${p.price_usd} a month</span></div>
      <div class="gauge">
        <span class="gauge__bar"><span class="gauge__fill" style="--w:${Math.round(100 * p.gifts_used / p.gifts_per_month)}%"></span></span>
        <span class="gauge__label">${p.gifts_used} of ${p.gifts_per_month} gift papers sent this month</span>
      </div>
      <p class="acct-card__price">Renews ${new Date(p.renews_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}${p.demo ? ". Prototype plan: nothing is charged." : ""}</p>
      <div class="acct-card__links"><a href="pricing.html">Change plan</a><button type="button" id="home-cancel">Cancel plan</button></div>`
      : `<div class="acct-card__row"><span class="acct-card__plan">No plan yet</span></div>
      <p class="acct-sub">Basic is $3 a month and Plus is $8. Either one lets you email the paper to family.</p>
      <div class="acct-actions"><a class="btn btn--ink" href="pricing.html">See plans</a></div>`;
    const fill = $(".gauge__fill");
    if (fill) requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = fill.style.getPropertyValue("--w"); }));
    const cancel = $("#home-cancel");
    if (cancel) cancel.addEventListener("click", async () => {
      if (!confirm(`Cancel Subah ${p.name}? You can choose a plan again at any time.`)) return;
      await S.api.cancelPlan();
      showHome();
    });
  }
  $("#home-logout").addEventListener("click", async () => {
    await S.api.logout();
    showTab("login");
    showHome(null).then(() => { $("#acct-home").hidden = true; $("#acct-auth").hidden = false; });
  });

  const user = await S.api.me();
  if (user) showHome(user);
  else {
    $("#acct-loading").hidden = true;
    $("#acct-auth").hidden = false;
    showTab(params.get("mode") === "signup" ? "signup" : "login");
  }
});
