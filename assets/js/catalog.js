/* =====================================================================
   اتم ۳۱۳ — کاتالوگ محصولات (products.html)
   محصولات کاتالوگ سایت + محصولاتی که فروشندگان از پنل خود بارگذاری
   می‌کنند (از API یا حالت HTML) در یک فهرست واحد با جستجو، فیلتر
   دسته/قیمت/امتیاز/وضعیت/شهر، مرتب‌سازی، نمای شبکه/فهرست و صفحه‌بندی.
   ===================================================================== */
(function () {
  "use strict";
  var grid = document.querySelector(".prod-grid"); if (!grid) return;
  var FA = "۰۱۲۳۴۵۶۷۸۹";
  function fa(s) { return String(s == null ? "" : s).replace(/[0-9]/g, function (d) { return FA[+d]; }); }
  function en(s) { return String(s == null ? "" : s).replace(/[۰-۹]/g, function (d) { return FA.indexOf(d); }); }
  function norm(s) { return en(s).replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌\s]+/g, " ").trim().toLowerCase(); }
  function num(s) { return parseInt(en(s).replace(/[^0-9]/g, ""), 10) || 0; }
  function money(n) { return fa(String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")) + " ت"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function text(el) { return el ? el.textContent.replace(/\s+/g, " ").trim() : ""; }
  var PER_PAGE = 9;

  /* ---------- دادهٔ کارت‌های کاتالوگ ثابت ---------- */
  var items = [].slice.call(grid.querySelectorAll(".prod-card")).map(function (card, i) {
    var pr = card.querySelector(".price b"), old = card.querySelector(".price del"), rt = text(card.querySelector(".rating"));
    var m = en(rt).match(/([\d.]+)\s*\((\d+)\)/);
    return {
      el: card, title: text(card.querySelector(".prod-title")), cat: text(card.querySelector(".prod-cat")),
      seller: text(card.querySelector(".prod-seller")), price: num(text(pr)), old: num(text(old)),
      rating: m ? +m[1] : 4.5, votes: m ? +m[2] : 0, stock: 1, order: 1000 + i, fresh: false,
    };
  });

  /* ---------- کارت محصول پایگاه داده (بارگذاری فروشندگان) ---------- */
  function dbCard(p, i) {
    var thumb = p.image ? '<div class="ph" style="background:#EEF3EF url(\'' + esc(p.image) + '\') center/cover no-repeat;"></div>' : '<div class="ph ph-' + ((i % 6) + 1) + '"></div>';
    var art = document.createElement("article"); art.className = "prod-card"; art.setAttribute("data-pid", p.id);
    art.innerHTML = '<div class="prod-thumb">' + thumb + (p.stock > 0 ? '<span class="badge new">جدید</span>' : '<span class="badge">ناموجود</span>') +
      '<button class="wish-btn" data-wish aria-label="افزودن به علاقه‌مندی"><svg class="icon"><use href="#icon-heart"/></svg></button></div>' +
      '<div class="prod-body"><span class="prod-cat">' + esc(p.category || "محصول") + '</span><h3 class="prod-title">' + esc(p.title) + "</h3>" +
      '<span class="prod-seller"><svg class="icon"><use href="#icon-badge-check"/></svg> ' + esc(p.seller || "فروشندهٔ اتم") + "</span>" +
      '<div class="rating"><svg class="icon"><use href="#icon-star-filled"/></svg> ۵.۰ (۰)</div>' +
      '<div class="prod-foot"><div class="price"><b>' + money(p.price) + '</b></div><button class="add-btn"' + (p.stock > 0 ? "" : " disabled") + ' aria-label="افزودن به سبد"><svg class="icon"><use href="#icon-cart"/></svg></button></div></div>';
    return art;
  }

  /* ---------- وضعیت فیلترها ---------- */
  var st = { q: "", cats: [], min: 0, max: 0, rating: 0, inStock: false, discount: false, freeShip: false, fresh: false, city: "", sort: 0, page: 1 };
  var cityOf = {}, freeMin = 500000;
  try { st.q = norm(new URLSearchParams(location.search).get("q") || ""); } catch (e) {}
  var catParam = ""; try { catParam = new URLSearchParams(location.search).get("cat") || ""; } catch (e) {}

  var filterCard = document.querySelector(".filter-card");
  var groups = filterCard ? [].slice.call(filterCard.querySelectorAll(".filter-group")) : [];
  function groupBy(re) { return groups.filter(function (g) { return re.test(text(g.querySelector("h4"))); })[0]; }

  function buildCategoryFilter() {
    var g = groupBy(/دسته/); if (!g) return;
    var counts = {}; items.forEach(function (it) { if (it.cat) counts[it.cat] = (counts[it.cat] || 0) + 1; });
    var h = g.querySelector("h4").outerHTML;
    g.innerHTML = h + Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).map(function (c) {
      var on = st.cats.indexOf(c) !== -1 || (catParam && norm(c).indexOf(norm(catParam)) !== -1);
      if (on && st.cats.indexOf(c) === -1) st.cats.push(c);
      return '<label class="checkline"><input type="checkbox" data-cat="' + esc(c) + '"' + (on ? " checked" : "") + "> " + esc(c) + '<span class="cnt">' + fa(counts[c]) + "</span></label>";
    }).join("");
  }

  function matches(it) {
    if (st.q && norm(it.title + " " + it.cat + " " + it.seller).indexOf(st.q) === -1) return false;
    if (st.cats.length && st.cats.indexOf(it.cat) === -1) return false;
    if (st.min && it.price < st.min) return false;
    if (st.max && it.price > st.max) return false;
    if (st.rating && it.rating < st.rating) return false;
    if (st.inStock && !(it.stock > 0)) return false;
    if (st.discount && !(it.old > it.price)) return false;
    if (st.freeShip && it.price < freeMin) return false;
    if (st.fresh && !it.fresh) return false;
    if (st.city && cityOf[it.seller] !== st.city) return false;
    return true;
  }
  var SORTS = [
    function (a, b) { return b.votes - a.votes; },                    // پرفروش‌ترین
    function (a, b) { return (b.fresh - a.fresh) || (b.order - a.order); }, // جدیدترین
    function (a, b) { return a.price - b.price; },                    // ارزان‌ترین
    function (a, b) { return b.price - a.price; },                    // گران‌ترین
    function (a, b) { return b.rating - a.rating || b.votes - a.votes; }, // محبوب‌ترین
  ];
  function render() {
    var list = items.filter(matches).sort(SORTS[st.sort] || SORTS[0]);
    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE)); if (st.page > pages) st.page = pages;
    items.forEach(function (it) { it.el.style.display = "none"; });
    list.forEach(function (it) { grid.appendChild(it.el); });
    list.slice((st.page - 1) * PER_PAGE, st.page * PER_PAGE).forEach(function (it) { it.el.style.display = ""; it.el.classList.add("in"); });
    var empty = grid.querySelector(".cat-empty");
    if (!list.length) {
      if (!empty) { empty = document.createElement("div"); empty.className = "cat-empty"; grid.appendChild(empty); }
      empty.innerHTML = '<svg class="icon"><use href="#icon-search"/></svg><b>محصولی با این مشخصات پیدا نشد</b><span>فیلترها را تغییر دهید یا جستجوی دیگری امتحان کنید.</span><button class="btn btn-ghost btn-sm" data-cat-reset>حذف همهٔ فیلترها</button>';
    } else if (empty) empty.remove();
    var rc = document.querySelector(".result-count"); if (rc) rc.textContent = fa(list.length) + " نتیجه" + (st.q ? " برای «" + (new URLSearchParams(location.search).get("q") || st.q) + "»" : "");
    var pg = document.querySelector(".pagination");
    if (pg) {
      var h = "";
      if (pages > 1) h += '<a href="#" data-p="' + Math.max(1, st.page - 1) + '" aria-label="قبلی"><svg class="icon"><use href="#icon-chevron-right"/></svg></a>';
      for (var i = 1; i <= pages; i++) h += '<a href="#" data-p="' + i + '"' + (i === st.page ? ' class="active"' : "") + ">" + fa(i) + "</a>";
      if (pages > 1) h += '<a href="#" data-p="' + Math.min(pages, st.page + 1) + '" aria-label="بعدی"><svg class="icon"><use href="#icon-chevron-left"/></svg></a>';
      pg.innerHTML = h;
    }
  }

  /* ---------- رویدادها ---------- */
  if (filterCard) {
    // موبایل: فیلترها جمع‌شونده تا محصولات بالای صفحه دیده شوند
    var fh = filterCard.querySelector(".fhead");
    if (window.matchMedia && window.matchMedia("(max-width: 900px)").matches) filterCard.classList.add("collapsed");
    if (fh) fh.addEventListener("click", function (e) { if (e.target.closest("a")) return; filterCard.classList.toggle("collapsed"); });
    filterCard.addEventListener("change", function (e) {
      var el = e.target;
      if (el.hasAttribute("data-cat")) st.cats = [].slice.call(filterCard.querySelectorAll("[data-cat]:checked")).map(function (x) { return x.getAttribute("data-cat"); });
      var lbl = text(el.closest("label"));
      if (/موجود در انبار/.test(lbl)) st.inStock = el.checked;
      if (/دارای تخفیف/.test(lbl)) st.discount = el.checked;
      if (/ارسال رایگان/.test(lbl)) st.freeShip = el.checked;
      if (/کالای جدید/.test(lbl)) st.fresh = el.checked;
      st.page = 1; render();
    });
    var pr = filterCard.querySelectorAll(".price-range input");
    [].forEach.call(pr, function (inp, i) {
      inp.setAttribute("inputmode", "numeric");
      inp.addEventListener("input", function () { if (i === 0) st.min = num(inp.value); else st.max = num(inp.value); st.page = 1; render(); });
    });
    var rg = groupBy(/امتیاز/);
    if (rg) rg.addEventListener("click", function (e) {
      var c = e.target.closest(".filter-chip"); if (!c) return;
      rg.querySelectorAll(".filter-chip").forEach(function (x) { x.classList.remove("active"); }); c.classList.add("active");
      var m = en(text(c)).match(/[\d.]+/); st.rating = m ? +m[0] : 0; st.page = 1; render();
    });
    var cg = groupBy(/شهر/);
    if (cg) cg.addEventListener("click", function (e) {
      var c = e.target.closest(".filter-chip"); if (!c) return;
      var on = !c.classList.contains("active");
      cg.querySelectorAll(".filter-chip").forEach(function (x) { x.classList.remove("active"); });
      if (on) c.classList.add("active"); st.city = on ? text(c) : ""; st.page = 1; render();
    });
    var reset = filterCard.querySelector(".fhead a");
    if (reset) reset.addEventListener("click", function (e) { e.preventDefault(); resetAll(); });
  }
  function resetAll() {
    st.q = ""; st.cats = []; st.min = st.max = st.rating = 0; st.inStock = st.discount = st.freeShip = st.fresh = false; st.city = ""; st.page = 1; catParam = "";
    if (filterCard) {
      filterCard.querySelectorAll("input[type=checkbox]").forEach(function (x) { x.checked = false; });
      filterCard.querySelectorAll(".price-range input").forEach(function (x) { x.value = ""; });
      filterCard.querySelectorAll(".filter-chip").forEach(function (x, i) { x.classList.toggle("active", /همه/.test(text(x))); });
    }
    document.querySelectorAll(".search-bar input").forEach(function (i) { i.value = ""; });
    try { history.replaceState(null, "", "products.html"); } catch (e) {}
    render();
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-cat-reset]")) { e.preventDefault(); resetAll(); }
    var p = e.target.closest(".pagination a[data-p]");
    if (p) { e.preventDefault(); st.page = +p.getAttribute("data-p") || 1; render(); grid.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
  var sortBtns = [].slice.call(document.querySelectorAll(".sort-opts button"));
  sortBtns.forEach(function (b, i) { b.addEventListener("click", function () { sortBtns.forEach(function (x) { x.classList.remove("active"); }); b.classList.add("active"); st.sort = i; st.page = 1; render(); }); });
  var vt = [].slice.call(document.querySelectorAll(".view-toggle button"));
  vt.forEach(function (b, i) {
    b.setAttribute("aria-label", i ? "نمایش فهرستی" : "نمایش شبکه‌ای");
    b.addEventListener("click", function () { grid.classList.toggle("list-view", i === 1); vt.forEach(function (x, k) { x.style.color = k === i ? "var(--green-600)" : ""; }); try { localStorage.setItem("atom_view", i); } catch (er) {} });
  });
  try { if (localStorage.getItem("atom_view") === "1" && vt[1]) vt[1].click(); } catch (e) {}
  // جستجوی زنده روی همین صفحه
  document.querySelectorAll(".search-bar input").forEach(function (inp) {
    inp.addEventListener("input", function () { st.q = norm(inp.value); st.page = 1; render(); });
  });

  /* ---------- بارگذاری محصولات فروشندگان و شهرها ---------- */
  (async function () {
    buildCategoryFilter(); render();
    if (!window.SiteAuth) return;
    try {
      var s = (await SiteAuth.publicSettings()).settings || {}; if (s.free_shipping_min) freeMin = num(s.free_shipping_min);
    } catch (e) {}
    try {
      var sellers = (await SiteAuth.publicGet("sellers")).items || [];
      sellers.forEach(function (s) { cityOf[s.name] = s.city; });
    } catch (e) {}
    try {
      var db = (await SiteAuth.publicGet("products")).items || [];
      db.forEach(function (p, i) {
        var same = items.filter(function (it) { return !it.pid && norm(it.title) === norm(p.title); })[0];
        if (same) { same.pid = p.id; same.el.setAttribute("data-pid", p.id); same.stock = p.stock; return; }
        var el = dbCard(p, i);
        items.unshift({ el: el, pid: p.id, title: p.title, cat: p.category || "محصول", seller: p.seller || "", price: +p.price || 0, old: 0, rating: 5, votes: 0, stock: +p.stock || 0, order: 5000 + p.id, fresh: true, data: p });
        grid.insertBefore(el, grid.firstChild);
      });
    } catch (e) {}
    buildCategoryFilter(); render();
  })();
})();
