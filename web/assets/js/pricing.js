/* Pricing: two plans from /api/plans; choosing one opens a prototype checkout (nothing is charged). */
document.addEventListener("DOMContentLoaded", async () => {
  const S = window.Subah;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const modal = $("#checkout");
  let plans = {};
  let me = S.cachedMe();
  let choosing = null;

  $$(".modal__close").forEach((b) => { b.innerHTML = S.ICONS.close; });
  try {
    (await S.api.plans()).plans.forEach((p) => { plans[p.id] = p; });
  } catch (e) {
    plans = {
      basic: { id: "basic", name: "Basic", price_usd: 3, gifts_per_month: 3, features: [] },
      plus: { id: "plus", name: "Plus", price_usd: 8, gifts_per_month: 30, features: [] }
    };
  }
  Object.values(plans).forEach((p) => {
    const ul = $(`[data-features="${p.id}"]`);
    if (ul && p.features.length) ul.innerHTML = p.features.map((f) => `<li>${S.ICONS.check}<span>${S.esc(f)}</span></li>`).join("");
  });

  function paint() {
    const current = me && me.plan ? me.plan.id : null;
    $$(".plan").forEach((card) => {
      const id = card.dataset.plan;
      const btn = $(`[data-choose="${id}"]`, card);
      const state = $(`[data-state="${id}"]`, card);
      card.classList.toggle("is-current", current === id);
      btn.disabled = current === id;
      const label = current === id ? "Your plan" : current ? `Switch to ${plans[id].name}` : `Choose ${plans[id].name}`;
      (btn.querySelector("span") || btn).textContent = label;
      state.textContent = current === id ? `${me.plan.gifts_left} of ${me.plan.gifts_per_month} gift papers left this month` : "";
    });
  }
  paint();
  document.addEventListener("subah:me", (e) => { me = e.detail; paint(); });

  function open(id) {
    choosing = plans[id];
    $("#co-title").textContent = `Subah ${choosing.name}`;
    $("#co-plan").textContent = `${choosing.name}, $${choosing.price_usd} a month`;
    $("#co-total").textContent = `$${choosing.price_usd.toFixed(2)}`;
    $("#co-email").textContent = me.email;
    $("#co-error").textContent = "";
    $("#co-body").hidden = false;
    $("#co-body").classList.remove("is-stamped");
    $("#co-done").hidden = true;
    modal.hidden = false;
    $("#co-confirm").focus();
  }
  function close() { modal.hidden = true; }
  $$("[data-close]", modal).forEach((b) => b.addEventListener("click", close));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) close(); });

  $$("[data-choose]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.choose;
    if (!me) me = await S.api.me();
    if (!me) { location.href = `account.html?mode=signup&next=${encodeURIComponent(`pricing.html?plan=${id}`)}`; return; }
    open(id);
  }));

  $("#co-confirm").addEventListener("click", async () => {
    const btn = $("#co-confirm");
    btn.disabled = true;
    try {
      me = await S.api.subscribe(choosing.id);
      $("#co-body").classList.add("is-stamped");
      await new Promise((r) => setTimeout(r, S.reduceMotion ? 0 : 900));
      $("#co-body").hidden = true;
      $("#co-done-title").textContent = `${choosing.name} is active.`;
      $("#co-done-text").textContent = `You can send ${choosing.gifts_per_month} gift papers by email this month. Your plan renews in 30 days; no money was taken.`;
      $("#co-done").hidden = false;
      paint();
    } catch (e) {
      $("#co-error").textContent = e.message || "Something went wrong. Try again.";
    } finally {
      btn.disabled = false;
    }
  });

  /* back from signing up with a plan in mind */
  const want = new URLSearchParams(location.search).get("plan");
  if (want && plans[want]) {
    me = me || await S.api.me();
    if (me && (!me.plan || me.plan.id !== want)) open(want);
  }
});
