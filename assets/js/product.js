/* =====================================================================
   اتم ۳۱۳ — صفحهٔ جزئیات محصول (product.html)
   product.html?id=N  → محصول ثبت‌شده در پایگاه داده (بارگذاری فروشنده)
   product.html?t=…   → محصول کاتالوگ سایت (اطلاعات از کارت کلیک‌شده)
   + گالری، اشتراک‌گذاری، نظرات واقعی تأییدشده و فرم ثبت نظر
   ===================================================================== */
(function () {
  "use strict";
  var FA = "۰۱۲۳۴۵۶۷۸۹";
  function fa(s) { return String(s == null ? "" : s).replace(/[0-9]/g, function (d) { return FA[+d]; }); }
  function en(s) { return String(s == null ? "" : s).replace(/[۰-۹]/g, function (d) { return FA.indexOf(d); }); }
  function norm(s) { return en(s).replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌\s]+/g, " ").trim(); }
  function money(n) { return fa(String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function $(s) { return document.querySelector(s); }
  var SA = window.SiteAuth;
  var params = new URLSearchParams(location.search);
  var h1 = $(".pd-title-row h1");
  var product = { title: h1 ? h1.textContent.trim() : "", price: 2450000, seller: "آترا چرم" };

  function stars(n) { var s = ""; for (var i = 1; i <= 5; i++) s += '<svg class="icon"' + (i <= Math.round(n) ? "" : ' style="opacity:.25"') + '><use href="#icon-star-filled"/></svg>'; return s; }
  function ago(d) {
    var t = new Date(String(d || "").replace(" ", "T")); if (isNaN(t)) return "";
    var days = Math.floor((Date.now() - t) / 864e5);
    return days < 1 ? "امروز" : days < 7 ? fa(days) + " روز پیش" : days < 30 ? fa(Math.floor(days / 7)) + " هفته پیش" : fa(Math.floor(days / 30)) + " ماه پیش";
  }

  function fill(p) {
    product = p;
    document.title = p.title + " | اتم ۳۱۳";
    if (h1) h1.textContent = p.title;
    var crumb = document.querySelector(".crumbs span"); if (crumb) crumb.textContent = p.title;
    var ccat = document.querySelectorAll(".crumbs a")[1]; if (ccat && p.cat) { ccat.textContent = p.cat; ccat.href = "products.html?cat=" + encodeURIComponent(p.cat); }
    var chip = document.querySelector(".pd-title-row .chip"); if (chip && p.cat) chip.innerHTML = '<svg class="icon"><use href="#icon-tag"/></svg> ' + esc(p.cat);
    var box = $(".pd-price-box");
    if (box) {
      var save = p.old > p.price ? Math.round(100 * (p.old - p.price) / p.old) : 0;
      box.innerHTML = "<b>" + money(p.price) + " تومان</b>" + (save ? "<del>" + money(p.old) + " تومان</del><span class=\"save\">" + fa(save) + "٪ صرفه‌جویی</span>" : "");
      var badge = document.querySelector(".pd-gallery-main .badge"); if (badge) { badge.style.display = save ? "" : "none"; badge.textContent = fa(save) + "٪ تخفیف"; }
    }
    var main = $(".pd-gallery-main");
    if (main && (p.image || p.thumb)) {
      if (p.image) main.style.background = "#EEF3EF url('" + p.image.replace(/'/g, "%27") + "') center/cover no-repeat";
      else { main.style.background = ""; main.className = "pd-gallery-main " + p.thumb.replace(/\bph\b/, "").trim(); }
      var th = document.querySelector(".pd-thumbs"); if (th && !p.keepThumbs) th.style.display = "none";
    }
    var sellerBox = document.querySelector(".surface-flat b");
    if (sellerBox && p.seller) {
      sellerBox.textContent = "فروشگاه " + p.seller.replace(/^فروشگاه\s*/, "");
      var link = sellerBox.closest(".surface-flat").querySelector("a.btn"); if (link) link.href = "seller.html?name=" + encodeURIComponent(p.seller);
    }
    if (p.description) { var lead = document.querySelector('[data-tab-panel="desc"] .lead'); if (lead) lead.textContent = p.description; }
    var add = document.querySelector("[data-add-cart]");
    if (add) { add.setAttribute("data-title", p.title); add.setAttribute("data-price", p.price); add.setAttribute("data-seller", p.seller || ""); add.setAttribute("data-id", p.id || p.title); if (p.stock === 0) { add.disabled = true; add.textContent = "ناموجود"; } }
    var md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute("content", "خرید " + p.title + (p.seller ? " از " + p.seller : "") + " در اتم ۳۱۳.");
  }

  /* ---------- گالری ---------- */
  document.querySelectorAll(".pd-thumbs .t").forEach(function (t) {
    t.addEventListener("click", function () { var m = $(".pd-gallery-main"); if (m) m.style.background = t.style.background; });
  });

  /* ---------- اشتراک‌گذاری ---------- */
  var share = document.querySelector(".pd-title-row .btn-icon");
  if (share) {
    share.setAttribute("aria-label", "اشتراک‌گذاری");
    share.addEventListener("click", async function () {
      var url = location.href;
      try {
        if (navigator.share) { await navigator.share({ title: product.title, url: url }); return; }
        await navigator.clipboard.writeText(url); window.Toast && Toast("لینک محصول کپی شد ✓");
      } catch (e) { window.Toast && Toast("لینک: " + url); }
    });
  }

  /* ---------- نظرات واقعی ---------- */
  var panel = document.querySelector('[data-tab-panel="reviews"]');
  function renderReviews(list) {
    if (!panel) return;
    var n = list.length, avg = n ? list.reduce(function (s, c) { return s + (+c.rating || 5); }, 0) / n : 0;
    var tab = document.querySelector('[data-tab="reviews"]'); if (tab) tab.textContent = "نظرات (" + fa(n) + ")";
    var dist = [0, 0, 0, 0, 0, 0]; list.forEach(function (c) { dist[Math.max(1, Math.min(5, +c.rating || 5))]++; });
    var sum = panel.querySelector(".rating-summary");
    if (sum) sum.innerHTML = '<div style="text-align:center;"><div class="big">' + (n ? fa(avg.toFixed(1)) : "—") + '</div><div class="rating" style="justify-content:center;">' + stars(avg) + '</div><div class="faint" style="font-size:.76rem;margin-top:4px;">' + fa(n) + " نظر</div></div>" +
      '<div style="flex:1;">' + [5, 4, 3, 2, 1].map(function (k) { var p = n ? Math.round(100 * dist[k] / n) : 0; return '<div class="rating-bar-row"><span>' + fa(k) + '</span><div class="p-fill-bar"><i style="width:' + p + '%"></i></div><span>' + fa(p) + "٪</span></div>"; }).join("") + "</div>";
    var box = panel.querySelector(".panel");
    if (box) box.innerHTML = (n ? list.map(function (c, i) {
      return '<div class="review-item"><div class="ava ph-' + ((i % 8) + 1) + '"></div><div style="flex:1"><div class="flex between"><b style="font-size:.86rem;">' + esc(c.author) + '</b><span class="faint" style="font-size:.74rem;">' + ago(c.created_at) + '</span></div><div class="rating" style="margin:4px 0;">' + stars(c.rating) + '</div><p class="muted" style="font-size:.85rem; margin:0;">' + esc(c.body) + "</p></div></div>";
    }).join("") : '<p class="faint" style="text-align:center;padding:18px 0;margin:0;">هنوز نظری برای این محصول ثبت نشده است. اولین نفر باشید!</p>') + reviewForm();
    bindForm();
  }
  function reviewForm() {
    var u = SA && SA.user();
    return '<form class="review-form" id="reviewForm"><h3 class="h-3" style="margin:0 0 12px;">ثبت نظر شما</h3>' +
      '<div class="grid grid-2"><div class="field"><label>نام شما</label><input type="text" id="rvName" value="' + esc(u && u.name || "") + '" placeholder="نام نمایشی"></div>' +
      '<div class="field"><label>امتیاز</label><div class="star-pick" id="rvStars">' + [1, 2, 3, 4, 5].map(function (k) { return '<button type="button" data-v="' + k + '" aria-label="' + fa(k) + ' ستاره"><svg class="icon"><use href="#icon-star-filled"/></svg></button>'; }).join("") + "</div></div></div>" +
      '<div class="field" style="margin-top:12px;"><label>متن نظر</label><textarea id="rvBody" placeholder="تجربهٔ خود از این محصول را بنویسید…"></textarea></div>' +
      '<button type="submit" class="btn btn-primary" style="margin-top:14px;">ارسال نظر</button><p class="faint" style="font-size:.74rem;margin:8px 0 0;">نظر شما پس از بررسی و تأیید مدیر نمایش داده می‌شود.</p></form>';
  }
  var rating = 5;
  function paintStars() { document.querySelectorAll("#rvStars button").forEach(function (b) { b.classList.toggle("on", +b.getAttribute("data-v") <= rating); }); }
  function bindForm() {
    var f = document.getElementById("reviewForm"); if (!f) return;
    paintStars();
    f.querySelectorAll("#rvStars button").forEach(function (b) { b.onclick = function () { rating = +b.getAttribute("data-v"); paintStars(); }; });
    f.onsubmit = async function (e) {
      e.preventDefault();
      var name = f.querySelector("#rvName").value.trim(), body = f.querySelector("#rvBody").value.trim();
      if (!name) return Toast("نام خود را وارد کنید.", "err");
      if (body.length < 5) return Toast("متن نظر را کامل‌تر بنویسید.", "err");
      var btn = f.querySelector("button[type=submit]"); btn.disabled = true;
      try {
        await SA.api("/public/comment", { method: "POST", body: { author: name, product: product.title, body: body, rating: rating } });
        f.innerHTML = '<div class="as-ok" style="padding:14px;text-align:center;"><b>✓ نظر شما ثبت شد</b><p class="faint" style="margin:6px 0 0;font-size:.82rem;">پس از تأیید مدیر در همین صفحه نمایش داده می‌شود. سپاس از همراهی شما.</p></div>';
      } catch (er) { Toast(er.message, "err"); btn.disabled = false; }
    };
  }
  async function loadReviews() {
    var list = [];
    try {
      var d = await SA.api("/public/comments");
      var t = norm(product.title);
      list = (d.items || []).filter(function (c) { var p = norm(c.product); return p && (p === t || t.indexOf(p) !== -1 || p.indexOf(t) !== -1 || fuzzy(p, t)); });
    } catch (e) {}
    renderReviews(list);
  }
  // «کیف چرم رویا» ≈ «کیف چرم طبیعی دست‌دوز مدل رویا»: همهٔ واژه‌های کوتاه‌تر در عنوان باشند
  function fuzzy(a, b) { var w = a.split(" ").filter(function (x) { return x.length > 1; }); return w.length > 1 && w.every(function (x) { return b.indexOf(x) !== -1; }); }

  /* ---------- راه‌اندازی ---------- */
  (async function () {
    if (!SA) return;
    var id = params.get("id"), t = params.get("t");
    if (id) {
      try {
        var d = await SA.publicGet("products");
        var p = (d.items || []).filter(function (x) { return String(x.id) === String(id); })[0];
        if (p) fill({ id: p.id, title: p.title, cat: p.category, seller: p.seller, price: +p.price, old: 0, image: p.image, description: p.description, stock: +p.stock });
        else if (window.Toast) Toast("این محصول دیگر در دسترس نیست.", "err");
      } catch (e) {}
    } else if (t) {
      var info = null; try { info = JSON.parse(sessionStorage.getItem("atom_pd") || "null"); } catch (e) {}
      if (info && norm(info.title) === norm(t)) fill(info);
      else fill({ title: t, cat: "", seller: "", price: 0 });
    } else {
      // محصول پیش‌فرض صفحه: در صورت وجود در پایگاه داده، شناسهٔ واقعی آن استفاده شود
      try { var dd = await SA.publicGet("products"); var m = (dd.items || []).filter(function (x) { return norm(x.title) === norm(product.title); })[0]; if (m) { var add = document.querySelector("[data-add-cart]"); if (add) add.setAttribute("data-id", m.id); } } catch (e) {}
    }
    loadReviews();
  })();
})();
