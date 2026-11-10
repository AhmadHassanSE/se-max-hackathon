/* Our sources: renders the published outlet list from the API (or the bundled copy). */
document.addEventListener("DOMContentLoaded", async () => {
  const S = window.Subah;
  const rows = document.getElementById("outlet-rows");
  let data;
  try { data = await S.api.outlets(); } catch (e) {
    rows.innerHTML = `<tr><td colspan="4">Couldn’t load the list.</td></tr>`;
    return;
  }
  document.getElementById("formula").textContent = data.ranking.en;
  document.getElementById("list-def").textContent = data.definition;
  rows.innerHTML = data.outlets.map((o) => o.feeds.map((f, i) => `
    <tr${f.enabled ? "" : ' class="is-off"'}>
      ${i === 0 ? `<th scope="row" rowspan="${o.feeds.length}"><a href="${S.esc(o.site)}" target="_blank" rel="noopener noreferrer">${S.esc(o.name)}</a>${o.note ? `<span>${S.esc(o.note)}</span>` : ""}</th>` : ""}
      <td><code>${S.esc(f.url)}</code></td>
      <td>${f.lang === "ur" ? "Urdu" : "English"}</td>
      <td>${f.enabled ? "Read every night" : "Paused"}${f.status ? `<span>${S.esc(f.status)}</span>` : ""}</td>
    </tr>`).join("")).join("");
});
