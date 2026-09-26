/* =====================================================================
   اتم ۳۱۳ — فروشندگان (sellers.html) و ویترین فروشگاه (seller.html?name=…)
   فهرست واقعی فروشگاه‌های فعال (شامل فروشندگان تازه ثبت‌نام‌شده)،
   مرتب‌سازی، جستجو، صفحه‌بندی؛ و ویترین هر فروشگاه با محصولات و نظرات.
   ===================================================================== */
(function () {
  "use strict";
  var SA = window.SiteAuth; if (!SA) return;
  var FA = "۰۱۲۳۴۵۶۷۸۹";
  function fa(s) { return String(s == null ? "" : s).replace(/[0-9]/g, function (d) { return FA[+d]; }); }
  function en(s) { return String(s == null ? "" : s).replace(/[۰-۹]/g, function (d) { return FA.indexOf(d); }); }
  function norm(s) { return en(s).replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌\s]+/g, " ").trim().toLowerCase(); }
  function money(n) { return fa(String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")) + " ت"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function years(d) { var t = new Date(String(d || "").replace(" ", "T")); if (isNaN(t)) return "جدید"; var y = Math.floor((Date.now() - t) / (365 * 864e5)); return y >= 1 ? fa(y) + " سال" : "جدید"; }
  var AV = { "آترا چرم": "sav-1", "هنرکده پارسیان": "sav-2", "استودیو نگاره": "sav-3", "سفال سبز": "sav-4", "باغ طبیعت": "sav-1", "چرم گالری": "sav-2", "فرش ایران": "sav-4" };
  function avatar(s, radius) {
    if (s.avatar) return '<div class="fill" style="background:#EEF3EF url(\'' + esc(String(s.avatar).replace(/'/g, "%27")) + '\') center/cover no-repeat;' + (radius || "") + '"></div>';
    if (AV[s.name]) return '<div class="fill ' + AV[s.name] + '" style="' + (radius || "") + '"></div>';
    return '<div class="fill" style="background:linear-gradient(135deg,#0E7A38,#37C463);display:grid;place-items:center;color:#fff;font-weight:800;font-size:1.3rem;' + (radius || "") + '">' + esc((s.name || "?").charAt(0)) + "</div>";
  }
  var page = location.pathname.split("/").pop() || "index.html";

  /* ---------- فهرست فروشندگان ---------- */
  if (page === "sellers.html") {
    var grid = document.querySelector(".seller-grid"), count = document.querySelector(".result-count"), pag = document.querySelector(".pagination");
    var sellers = [], sort = 0, cur = 1, q = "", PER = 12;
    var sb = document.querySelector(".sort-bar");
    if (sb && !document.getElementById("sellerQ")) sb.insertAdjacentHTML("beforeend", '<div class="search-bar" style="max-width:300px;"><svg class="icon"><use href="#icon-search"/></svg><input type="text" id="sellerQ" placeholder="جستجوی فروشگاه یا شهر…" data-local-search></div>');
    var SORTS = [
      function (a, b) { return (b.rating * 1000 + b.sales / 10) - (a.rating * 1000 + a.sales / 10); },
      function (a, b) { return b.sales - a.sales; },
      function (a, b) { return String(b.created_at || "").localeCompare(String(a.created_at || "")) || b.id - a.id; },
      function (a, b) { return b.rating - a.rating || b.sales - a.sales; },
    ];
    function card(s) {
      return '<a href="seller.html?name=' + encodeURIComponent(s.name) + '" class="seller-card"><div class="seller-ava">' + avatar(s) + '<span class="verified"><svg class="icon"><use href="#icon-check"/></svg></span></div>' +
        "<b>" + esc(s.name) + '</b><span class="role">' + esc([s.category, s.city].filter(Boolean).join(" · ")) + "</span>" +
        '<div class="seller-meta"><div><b>' + fa((+s.rating || 5).toFixed(1)) + '</b><span>امتیاز</span></div><div><b>' + fa(s.sales || 0) + (s.sales ? "+" : "") + '</b><span>فروش</span></div><div><b>' + years(s.created_at) + "</b><span>سابقه</span></div></div></a>";
    }
    function render() {
      var list = sellers.filter(function (s) { return !q || norm(s.name + " " + s.category + " " + s.city).indexOf(q) !== -1; }).sort(SORTS[sort]);
      var pages = Math.max(1, Math.ceil(list.length / PER)); if (cur > pages) cur = pages;
      grid.innerHTML = list.length ? list.slice((cur - 1) * PER, cur * PER).map(card).join("") : '<div class="cat-empty"><svg class="icon"><use href="#icon-search"/></svg><b>فروشگاهی پیدا نشد</b><span>عبارت دیگری را جستجو کنید.</span></div>';
      if (count) count.textContent = fa(list.length) + " فروشگاه فعال";
      if (pag) { var h = ""; for (var i = 1; i <= pages; i++) h += '<a href="#" data-sp="' + i + '"' + (i === cur ? ' class="active"' : "") + ">" + fa(i) + "</a>"; pag.innerHTML = h; pag.style.display = pages > 1 ? "" : "none"; }
    }
    document.querySelectorAll(".sort-opts button").forEach(function (b, i) { b.addEventListener("click", function () { document.querySelectorAll(".sort-opts button").forEach(function (x) { x.classList.remove("active"); }); b.classList.add("active"); sort = i; cur = 1; render(); }); });
    document.addEventListener("click", function (e) { var a = e.target.closest("[data-sp]"); if (a) { e.preventDefault(); cur = +a.getAttribute("data-sp"); render(); grid.scrollIntoView({ behavior: "smooth" }); } });
    var qi = document.getElementById("sellerQ"); if (qi) qi.addEventListener("input", function () { q = norm(qi.value); cur = 1; render(); });
    (async function () { try { sellers = (await SA.publicGet("sellers")).items || []; if (sellers.length) render(); } catch (e) {} })();
  }

  /* ---------- ویترین فروشگاه ---------- */
  if (page === "seller.html") {
    var name = new URLSearchParams(location.search).get("name") || "آترا چرم";
    (async function () {
      var list = [], shop = null, prods = [], cmts = [];
      try { list = (await SA.publicGet("sellers")).items || []; } catch (e) {}
      shop = list.filter(function (s) { return s.name === name; })[0];
      if (!shop) {
        var h = document.querySelector(".sp-info h1"); if (h) h.textContent = "فروشگاه یافت نشد";
        var p = document.querySelector(".sp-info p"); if (p) p.textContent = "این فروشگاه فعال نیست یا نام آن تغییر کرده است.";
        document.querySelectorAll(".sp-stats, .sp-about, #sp-panels, .test-grid").forEach(function (x) { x.style.display = "none"; });
        return;
      }
      try { prods = ((await SA.publicGet("products")).items || []).filter(function (p) { return p.seller === shop.name; }); } catch (e) {}
      try { cmts = ((await SA.api("/public/comments")).items || []); } catch (e) {}
      document.title = "فروشگاه " + shop.name + " | اتم ۳۱۳";
      var ava = document.querySelector(".sp-ava"); if (ava) ava.innerHTML = avatar(shop, "border-radius:26px;");
      var h1 = document.querySelector(".sp-info h1"); if (h1) h1.textContent = "فروشگاه " + shop.name;
      var sub = document.querySelector(".sp-info p"); if (sub) sub.textContent = [shop.category, "عضو اتم از " + years(shop.created_at).replace("جدید", "امسال"), shop.city].filter(Boolean).join(" · ");
      var badge = document.querySelector(".name-row .chip"); if (badge) badge.style.display = (+shop.rating >= 4.7 && +shop.sales >= 500) ? "" : "none";
      var stats = document.querySelectorAll(".sp-stats .s b");
      var titles = prods.map(function (p) { return norm(p.title); });
      var mine = cmts.filter(function (c) { var p = norm(c.product); return titles.some(function (t) { return t === p || t.indexOf(p) !== -1 || p.split(" ").filter(function (w) { return w.length > 1; }).every(function (w) { return t.indexOf(w) !== -1; }); }); });
      var vals = [fa((+shop.rating || 5).toFixed(1)), fa(shop.sales || 0) + (shop.sales ? "+" : ""), fa(prods.length), years(shop.created_at), fa(mine.length)];
      var lbls = ["امتیاز فروشگاه", "فروش موفق", "محصول فعال", "سابقه فعالیت", "نظر خریداران"];
      stats.forEach(function (b, i) { if (vals[i] != null) { b.textContent = vals[i]; var sp = b.parentNode.querySelector("span"); if (sp) sp.textContent = lbls[i]; } });
      var about = document.querySelector(".sp-about .panel p"); if (about) about.textContent = shop.bio || ("فروشگاه " + shop.name + " در دستهٔ " + (shop.category || "عمومی") + " در اتم ۳۱۳ فعالیت می‌کند.");
      var info = document.querySelectorAll(".sp-about .panel")[1];
      if (info) { var li = info.querySelectorAll("li"); if (li[0]) li[0].innerHTML = '<svg class="icon"><use href="#icon-map-pin"/></svg> ' + esc(shop.city || "ایران"); }
      var sh = document.querySelector(".section-head h2"); if (sh) sh.textContent = "محصولات " + shop.name;
      // محصولات و دسته‌ها
      var cats = []; prods.forEach(function (p) { if (p.category && cats.indexOf(p.category) === -1) cats.push(p.category); });
      var bar = document.querySelector('[data-tabbar="#sp-panels"]'), panels = document.getElementById("sp-panels");
      function pcard(p, i) {
        var th = p.image ? '<div class="ph" style="background:#EEF3EF url(\'' + esc(String(p.image).replace(/'/g, "%27")) + '\') center/cover no-repeat"></div>' : '<div class="ph ph-' + ((i % 6) + 1) + '"></div>';
        return '<article class="prod-card" data-pid="' + p.id + '"><div class="prod-thumb">' + th + '<button class="wish-btn" data-wish aria-label="علاقه‌مندی"><svg class="icon"><use href="#icon-heart"/></svg></button></div><div class="prod-body"><span class="prod-cat">' + esc(p.category || "محصول") + '</span><h3 class="prod-title">' + esc(p.title) + '</h3><span class="prod-seller"><svg class="icon"><use href="#icon-badge-check"/></svg> ' + esc(shop.name) + '</span><div class="prod-foot"><div class="price"><b>' + money(p.price) + '</b></div><button class="add-btn"' + (+p.stock > 0 ? "" : " disabled") + ' aria-label="افزودن به سبد"><svg class="icon"><use href="#icon-cart"/></svg></button></div></div></article>';
      }
      if (bar && panels) {
        var tabs = ["همه"].concat(cats);
        bar.innerHTML = tabs.map(function (t, i) { return '<button' + (i ? "" : ' class="active"') + ' data-stab="' + i + '">' + esc(t) + "</button>"; }).join("");
        function show(i) {
          var list = i ? prods.filter(function (p) { return p.category === cats[i - 1]; }) : prods;
          panels.innerHTML = '<div class="prod-grid">' + (list.length ? list.map(pcard).join("") : '<div class="cat-empty"><svg class="icon"><use href="#icon-box"/></svg><b>این فروشگاه هنوز محصولی منتشر نکرده است</b></div>') + "</div>";
        }
        bar.addEventListener("click", function (e) { var b = e.target.closest("[data-stab]"); if (!b) return; e.stopPropagation(); bar.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); }); b.classList.add("active"); show(+b.getAttribute("data-stab")); }, true);
        show(0);
      }
      // نظرات
      var tg = document.querySelector(".test-grid");
      if (tg) tg.innerHTML = mine.length ? mine.slice(0, 6).map(function (c, i) {
        var st = ""; for (var k = 1; k <= 5; k++) st += '<svg class="icon"' + (k <= (+c.rating || 5) ? "" : ' style="opacity:.25"') + '><use href="#icon-star-filled"/></svg>';
        return '<div class="test-card"><div class="rating">' + st + '</div><p class="test-quote">«' + esc(c.body) + '»</p><div class="test-person"><div class="ava ph-' + ((i % 8) + 1) + '"></div><div><b>' + esc(c.author) + "</b><span>" + esc(c.product) + "</span></div></div></div>";
      }).join("") : '<p class="faint center" style="grid-column:1/-1">هنوز نظری برای محصولات این فروشگاه منتشر نشده است.</p>';
      // دکمه‌ها
      var acts = document.querySelectorAll(".sp-actions button");
      var FK = "atom_follow";
      function follows() { try { return JSON.parse(localStorage.getItem(FK) || "[]"); } catch (e) { return []; } }
      function paintFollow() { var on = follows().indexOf(shop.name) !== -1; if (acts[1]) { acts[1].innerHTML = '<svg class="icon"><use href="#icon-' + (on ? "heart-filled" : "heart") + '"/></svg> ' + (on ? "دنبال می‌کنید" : "دنبال کردن"); acts[1].classList.toggle("btn-primary", on); } }
      if (acts[0]) { acts[0].setAttribute("aria-label", "گفتگو با پشتیبانی"); acts[0].onclick = function () { if (window.atomOpenSupport) atomOpenSupport(); }; }
      if (acts[1]) acts[1].onclick = function () { var f = follows(), i = f.indexOf(shop.name); if (i === -1) { f.push(shop.name); Toast("فروشگاه «" + shop.name + "» را دنبال می‌کنید ✓"); } else { f.splice(i, 1); Toast("دنبال کردن لغو شد"); } try { localStorage.setItem(FK, JSON.stringify(f)); } catch (e) {} paintFollow(); };
      if (acts[2]) acts[2].onclick = function () { (panels || document.body).scrollIntoView({ behavior: "smooth", block: "start" }); };
      paintFollow();
    })();
  }
})();
