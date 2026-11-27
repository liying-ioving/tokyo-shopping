// Пилот: просмотр собранных брендов и вещей. Анкета, свайпы и карта — следующие этапы.
const CATEGORIES = {
  all: "Все", tshirt: "Футболки", longsleeve: "Лонгсливы", shirt: "Рубашки", knit: "Трикотаж",
  sweat: "Худи и свитшоты", jacket: "Куртки", coat: "Пальто", pants: "Брюки", denim: "Джинсы",
  shorts: "Шорты", shoes: "Обувь", bag: "Сумки", headwear: "Головные уборы", accessory: "Аксессуары", other: "Другое",
};
const PAGE = 40;
const state = { brand: "all", category: "all", shown: PAGE };
let brands = [], products = [];

const $ = (id) => document.getElementById(id);
const yen = (n) => (n == null ? "" : "¥" + Math.round(n).toLocaleString("ja-JP"));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function chip(label, count, pressed, onClick) {
  const b = document.createElement("button");
  b.className = "chip";
  b.setAttribute("aria-pressed", pressed);
  b.innerHTML = `${esc(label)}${count != null ? `<small>${count}</small>` : ""}`;
  b.onclick = onClick;
  return b;
}

function filtered() {
  return products.filter((p) =>
    (state.brand === "all" || p.brand === state.brand) &&
    (state.category === "all" || p.category === state.category));
}

function render() {
  const brandById = Object.fromEntries(brands.map((b) => [b.id, b]));

  $("brandChips").replaceChildren(
    chip("Все", products.length, state.brand === "all", () => select({ brand: "all" })),
    ...brands.filter((b) => b.product_count).map((b) =>
      chip(b.name, b.product_count, state.brand === b.id, () => select({ brand: b.id }))));

  const card = $("brandCard");
  const b = brandById[state.brand];
  card.hidden = !b;
  if (b) {
    card.innerHTML = `<h3>${esc(b.name)} <span class="ja">${esc(b.name_ja)}</span></h3>
      <p>${esc(b.about)}</p>
      <p class="ja">Медиана цены: ${yen(b.price_median)} · <a href="${esc(b.site)}" target="_blank" rel="noopener">сайт бренда</a></p>`;
  }

  const inBrand = products.filter((p) => state.brand === "all" || p.brand === state.brand);
  const counts = {};
  inBrand.forEach((p) => (counts[p.category] = (counts[p.category] || 0) + 1));
  $("catChips").replaceChildren(
    ...Object.entries(CATEGORIES)
      .filter(([k]) => k === "all" || counts[k])
      .map(([k, label]) => chip(label, k === "all" ? inBrand.length : counts[k], state.category === k, () => select({ category: k }))));

  const list = filtered();
  $("grid").innerHTML = list.slice(0, state.shown).map((p) => `
    <a class="item${p.available ? "" : " sold"}" href="${esc(p.url)}" target="_blank" rel="noopener">
      <img loading="lazy" src="${esc(sized(p.images[0]))}" alt="">
      <div class="meta">
        <span class="brand">${esc(brandById[p.brand]?.name)}</span>
        <span class="title">${esc(p.title)}</span>
        <span class="price">${yen(p.price)}</span>
        ${p.available ? "" : '<span class="sold-tag">нет в наличии онлайн</span>'}
      </div>
    </a>`).join("");
  $("more").hidden = list.length <= state.shown;
}

// Shopify CDN умеет отдавать уменьшенную картинку — экономим трафик телефона.
function sized(src) {
  if (!src) return "";
  return src.includes("cdn.shopify.com") || src.includes("/cdn/shop/")
    ? src + (src.includes("?") ? "&" : "?") + "width=400" : src;
}

function select(patch) {
  Object.assign(state, patch, { shown: PAGE });
  if (patch.brand) state.category = "all";
  render();
}

$("more").onclick = () => { state.shown += PAGE; render(); };

Promise.all([fetch("data/brands.json").then((r) => r.json()), fetch("data/products.json").then((r) => r.json())])
  .then(([b, p]) => {
    brands = b; products = p;
    $("summary").textContent = `${brands.filter((x) => x.product_count).length} брендов · ${products.length.toLocaleString("ru-RU")} вещей`;
    render();
  })
  .catch(() => ($("summary").textContent = "Данные ещё не собраны"));

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
