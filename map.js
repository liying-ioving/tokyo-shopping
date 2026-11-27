// Карта: все магазины одежды в ключевых районах (из OpenStreetMap). Цвет = тип точки.
// Слой «Винтаж и секонд-хенды» по умолчанию выключен — включается галочкой.
(() => {
  const KINDS = {
    brand_store: { label: "Магазин бренда", color: "#c8102e", on: true },
    shop: { label: "Независимый / select shop", color: "#2563eb", on: true },
    department: { label: "Универмаг", color: "#d97706", on: true },
    vintage: { label: "Винтаж и секонд-хенды", color: "#16a34a", on: false },
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const map = L.map("map", { zoomControl: true }).setView([35.672, 139.705], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);


  function popup(s, kind) {
    const gmaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.lat},${s.lon}`)}`;
    const alt = [s.name_ja, s.name_en].filter((x) => x && x !== s.name).join(" · ");
    return `<b>${esc(s.name)}</b>${alt ? `<br><small>${esc(alt)}</small>` : ""}
      <br><small style="color:${kind.color}">● ${esc(kind.label)}</small>
      ${s.opening_hours ? `<br><small>Часы: ${esc(s.opening_hours)}</small>` : ""}
      <br><a href="${gmaps}" target="_blank" rel="noopener">Открыть в Google Maps</a>
      ${s.website ? ` · <a href="${esc(s.website.split(";")[0])}" target="_blank" rel="noopener">сайт</a>` : ""}
      ${s.instagram ? ` · <a href="${esc(igUrl(s.instagram))}" target="_blank" rel="noopener">Instagram</a>` : ""}`;
  }

  function igUrl(v) {
    return /^https?:/.test(v) ? v : `https://www.instagram.com/${v.replace(/^@/, "")}/`;
  }

  // Магазины из исследования встроены в общие слои по типу точки — просто с более подробной карточкой.
  function richPopup(c, kind) {
    const gmaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address || `${c.name} ${c.lat},${c.lon}`)}`;
    return `<div class="cur">
      <b>${esc(c.name)}</b> ${"★".repeat(c.stars || 1)}${c.name_ja ? `<br><small>${esc(c.name_ja)}</small>` : ""}
      <br><small style="color:${kind.color}">● ${esc(kind.label)}</small> · <small>${esc(c.price || "")}</small>
      ${c.style?.length ? `<br><small>Стиль: ${esc(c.style.join(", "))}</small>` : ""}
      ${c.brands?.length ? `<br><small>Бренды: ${esc(c.brands.join(", "))}</small>` : ""}
      <p>${esc(c.why || "")}</p>
      ${c.hours ? `<small>Часы: ${esc(c.hours)}</small><br>` : ""}
      ${c.geo === "approx" ? `<small class="approx">Точка примерная (центр района) — точный адрес уточняется</small><br>` : ""}
      <a href="${gmaps}" target="_blank" rel="noopener">Открыть в Google Maps</a>
      ${c.website ? ` · <a href="${esc(c.website)}" target="_blank" rel="noopener">сайт</a>` : ""}
      ${c.instagram ? ` · <a href="${esc(igUrl(c.instagram))}" target="_blank" rel="noopener">Instagram</a>` : ""}
    </div>`;
  }

  const load = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  Promise.all([load("data/shops.json"), load("data/curated.json")]).then(([osm, curated]) => {
    if (!osm) throw new Error("no shops");
    curated = curated || [];
    const covered = new Set(curated.map((c) => c.osm_id).filter(Boolean)); // без дублей
    const all = [
      ...curated.map((c) => ({ ...c, rich: true })),
      ...osm.shops.filter((s) => !covered.has(s.id)),
    ];
    // Видимость точки = галочка её типа И (не из подборок ИЛИ галочка «Кураторский список»).
    const show = Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [k, v.on]));
    show.curated = true;
    const counts = { curated: curated.length };
    const markers = all.map((s) => {
      const k = KINDS[s.kind] ? s.kind : "shop";
      const kind = KINDS[k];
      counts[k] = (counts[k] || 0) + 1;
      const m = L.circleMarker([s.lat, s.lon], {
        radius: 6, color: "#fff", weight: 1.5, dashArray: s.geo === "approx" ? "2 3" : null,
        fillColor: kind.color, fillOpacity: 0.9,
      }).bindPopup(s.rich ? richPopup(s, kind) : popup(s, kind), { maxWidth: 280 });
      return { m, k, rich: !!s.rich };
    });
    const refresh = () => markers.forEach(({ m, k, rich }) =>
      show[k] && (!rich || show.curated) ? m.addTo(map) : m.remove());
    Object.values(osm.districts).forEach((d) =>
      L.marker([d.lat, d.lon], { interactive: false, icon: L.divIcon({ className: "district-label", html: esc(d.name), iconSize: null }) }).addTo(map));

    const toggle = (key, html) => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" ${show[key] ? "checked" : ""}>${html} <small>${counts[key] || 0}</small>`;
      label.querySelector("input").onchange = (e) => { show[key] = e.target.checked; refresh(); };
      return label;
    };
    document.getElementById("legend").replaceChildren(
      ...Object.entries(KINDS).map(([k, kind]) => toggle(k, `<i style="background:${kind.color}"></i>${esc(kind.label)}`)),
      toggle("curated", "★ Кураторский список"));
    refresh();
    document.getElementById("mapNote").textContent =
      `${all.length} магазинов, о которых есть информация · пунктирная обводка — адрес примерный`;
  }).catch(() => (document.getElementById("mapNote").textContent = "Магазины ещё не собраны"));
})();
