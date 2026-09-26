/* =====================================================================
   اتم ۳۱۳ — صفحات پویای تکمیلی:
   پیگیری سفارش (track.html)، سوالات متداول (faq.html)،
   بلاگ پویا (blog.html) و صفحهٔ مقاله (article.html)
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
  function pdate(s, long) {
    var d = new Date(String(s || "").replace(" ", "T")); if (isNaN(d)) return "";
    try { return new Intl.DateTimeFormat("fa-IR-u-ca-persian", long ? { year: "numeric", month: "long", day: "numeric" } : { year: "numeric", month: "2-digit", day: "2-digit" }).format(d); } catch (e) { return ""; }
  }
  var params = new URLSearchParams(location.search);
  var page = (location.pathname.split("/").pop() || "index.html");

  // پاک‌سازی HTML مقاله (متن از پنل مدیریت) — حذف اسکریپت و رویدادها
  function safeHTML(html) {
    var t = document.createElement("template"); t.innerHTML = String(html || "");
    t.content.querySelectorAll("script,iframe,object,embed,style,link,meta,form").forEach(function (n) { n.remove(); });
    t.content.querySelectorAll("*").forEach(function (n) {
      [].slice.call(n.attributes).forEach(function (a) {
        var v = String(a.value || "").trim().toLowerCase();
        if (/^on/i.test(a.name) || ((a.name === "href" || a.name === "src") && /^(javascript|vbscript|data:text)/.test(v))) n.removeAttribute(a.name);
      });
    });
    return t.innerHTML;
  }
  function readTime(html) { var w = String(html || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length; return Math.max(1, Math.round(w / 180)); }
  function coverStyle(a, i) { return a.cover ? ' style="background:#EEF3EF url(\'' + esc(String(a.cover).replace(/'/g, "%27")) + '\') center/cover no-repeat"' : ""; }
  function coverClass(a, i) { return a.cover ? "cover" : "cover ph-" + ((i % 8) + 1); }

  /* ---------- پیگیری سفارش ---------- */
  if (page === "track.html") {
    var ST = { pending: 0, review: 1, shipping: 2, delivered: 3, returned: -1 };
    var STEPS = ["ثبت سفارش", "تأیید و آماده‌سازی", "تحویل به پست", "تحویل شد"];
    var code = document.getElementById("trCode"), phone = document.getElementById("trPhone"), out = document.getElementById("trResult");
    try { var last = JSON.parse(localStorage.getItem("atom_last_order") || "null"); if (last && !params.get("code")) { code.value = fa(last.code); phone.value = fa(last.phone); } } catch (e) {}
    if (params.get("code")) code.value = fa(params.get("code"));
    if (params.get("phone")) phone.value = fa(params.get("phone"));
    async function track() {
      if (!code.value.trim() || !SA.isMobile(phone.value)) { Toast("کد سفارش و شمارهٔ موبایل معتبر را وارد کنید.", "err"); return; }
      out.innerHTML = '<p class="faint center">در حال جستجو…</p>';
      try {
        var d = await SA.trackOrder(code.value, phone.value), items = d.items || [];
        var status = items.reduce(function (s, i) { return i.status === "returned" ? "returned" : (ST[i.status] < ST[s] ? i.status : s); }, "delivered");
        var total = items.reduce(function (s, i) { return s + (+i.amount || 0); }, 0), step = ST[status];
        out.innerHTML = '<div class="panel reveal in"><div class="flex between" style="flex-wrap:wrap;gap:10px;"><h3 class="h-3">سفارش #' + fa(items[0].code) + '</h3><span class="faint">' + pdate(items[0].created_at, true) + "</span></div>" +
          (step >= 0 ? '<div class="track-steps">' + STEPS.map(function (s, i) { return '<div class="ts' + (i <= step ? " done" : "") + (i === step ? " cur" : "") + '"><span class="n">' + (i < step || step === 3 ? "✓" : fa(i + 1)) + "</span><b>" + s + "</b></div>"; }).join("") + "</div>"
            : '<div class="track-returned">این سفارش مرجوع شده است. برای پیگیری بازگشت وجه با پشتیبانی تماس بگیرید.</div>') +
          '<div class="track-items">' + items.map(function (i) { return '<div class="flex between"><span>' + esc(i.product) + ' <span class="faint">— ' + esc(i.seller) + "</span></span><b>" + money(i.amount) + "</b></div>"; }).join("") +
          '<div class="flex between total"><span>مبلغ کل</span><b>' + money(total) + "</b></div></div></div>";
      } catch (e) { out.innerHTML = '<div class="panel" style="text-align:center;color:var(--text-2);">' + esc(e.message) + '<br><span class="faint" style="font-size:.8rem">کد سفارش را از پیامک یا صفحهٔ تأیید سفارش بردارید.</span></div>'; }
    }
    document.getElementById("trBtn").addEventListener("click", track);
    [code, phone].forEach(function (i) { i.addEventListener("keydown", function (e) { if (e.key === "Enter") track(); }); });
    if (params.get("code") && params.get("phone")) track();
  }

  /* ---------- سوالات متداول ---------- */
  if (page === "faq.html") {
    var list = document.getElementById("faqList"), q = document.getElementById("faqQ"), faqs = [];
    function render() {
      var term = norm(q.value), rows = faqs.filter(function (f) { return !term || norm(f.question + " " + f.answer).indexOf(term) !== -1; });
      list.innerHTML = rows.length ? rows.map(function (f, i) {
        return '<details class="faq-item"' + (i === 0 && !term ? " open" : "") + '><summary>' + esc(f.question) + '<svg class="icon"><use href="#icon-chevron-down"/></svg></summary><div class="faq-a">' + esc(f.answer) + "</div></details>";
      }).join("") : '<p class="faint center" style="padding:30px 0;">نتیجه‌ای برای «' + esc(q.value) + '» پیدا نشد.</p>';
    }
    (async function () {
      try { var d = await SA.api("/support/config"); faqs = d.faqs || []; } catch (e) {}
      render();
    })();
    q.addEventListener("input", render);
  }

  /* ---------- بلاگ پویا ---------- */
  if (page === "blog.html") {
    var featured = document.querySelector(".post-featured"), grid = document.querySelector(".post-grid"), pag = document.querySelector(".pagination");
    var PER = 6, cur = 1, arts = [], cat = "";
    function postCard(a, i) {
      return '<article class="post-card" data-href="article.html?id=' + a.id + '"><div class="' + coverClass(a, i) + '"' + coverStyle(a, i) + '>' + (a.category ? '<span class="chip">' + esc(a.category) + "</span>" : "") + "</div>" +
        '<div class="body"><h3><a href="article.html?id=' + a.id + '">' + esc(a.title) + "</a></h3><p>" + esc(a.excerpt || "") + '</p><div class="post-meta"><span class="ava ph-' + ((i % 8) + 1) + '"></span> ' + esc(a.author || "تیم محتوا") + " · " + pdate(a.created_at, true) + "</div></div></article>";
    }
    function render() {
      var list = arts.filter(function (a) { return !cat || a.category === cat; });
      var top = list[0], rest = list.slice(1);
      if (featured) {
        if (!top) featured.style.display = "none";
        else {
          featured.style.display = "";
          var cv = featured.querySelector(".cover"); cv.className = coverClass(top, 2); cv.setAttribute("style", (coverStyle(top, 2).match(/style="([^"]*)"/) || [0, ""])[1]);
          featured.querySelector("h2").textContent = top.title;
          var p = featured.querySelector("p"); if (p) p.textContent = top.excerpt || "";
          var meta = featured.querySelector(".post-meta"); if (meta) meta.innerHTML = '<span class="ava ph-2"></span> ' + esc(top.author || "تیم محتوا") + " · " + pdate(top.created_at, true) + " · " + fa(readTime(top.body)) + " دقیقه مطالعه";
          var btn = featured.querySelector("a.btn"); if (btn) btn.href = "article.html?id=" + top.id;
        }
      }
      var pages = Math.max(1, Math.ceil(rest.length / PER)); if (cur > pages) cur = pages;
      if (grid) grid.innerHTML = rest.length ? rest.slice((cur - 1) * PER, cur * PER).map(postCard).join("") : '<p class="faint center" style="grid-column:1/-1;padding:24px 0;">مقالهٔ دیگری در این دسته نیست.</p>';
      if (pag) {
        var h = ""; for (var i = 1; i <= pages; i++) h += '<a href="#" data-p="' + i + '"' + (i === cur ? ' class="active"' : "") + ">" + fa(i) + "</a>";
        pag.innerHTML = h; pag.style.display = pages > 1 ? "" : "none";
      }
    }
    // فیلتر دسته از روی برچسب‌ها
    document.addEventListener("click", function (e) {
      var pg = e.target.closest(".pagination a[data-p]"); if (pg) { e.preventDefault(); cur = +pg.getAttribute("data-p"); render(); grid.scrollIntoView({ behavior: "smooth" }); return; }
      var ch = e.target.closest(".post-card .chip, .blog-cats button"); if (ch) { e.preventDefault(); e.stopPropagation(); cat = cat === ch.textContent.trim() ? "" : ch.textContent.trim(); cur = 1; render(); Toast(cat ? "دستهٔ «" + cat + "»" : "همهٔ مقالات"); return; }
      var card = e.target.closest(".post-card[data-href]"); if (card && !e.target.closest("a")) location.href = card.getAttribute("data-href");
    });
    (async function () {
      try { var d = await SA.articles(); arts = d.items || []; if (arts.length) render(); } catch (e) {}
    })();
  }

  /* ---------- صفحهٔ مقاله ---------- */
  if (page === "article.html") {
    var box = document.getElementById("article"), more = document.getElementById("arMore");
    (async function () {
      var all = [];
      try { all = (await SA.articles()).items || []; } catch (e) {}
      var id = params.get("id"), slug = params.get("slug");
      var a = all.filter(function (x) { return String(x.id) === String(id) || (slug && x.slug === slug); })[0];
      if (!a) { box.innerHTML = '<div class="panel" style="text-align:center;padding:48px 16px;"><h2 class="h-2">مقاله پیدا نشد</h2><p class="muted">ممکن است این مقاله حذف یا هنوز منتشر نشده باشد.</p><a class="btn btn-primary" href="blog.html" style="margin-top:14px;">بازگشت به بلاگ</a></div>'; return; }
      document.title = a.title + " | بلاگ اتم ۳۱۳";
      var md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute("content", a.excerpt || a.title);
      document.getElementById("arCrumb").textContent = a.title;
      box.innerHTML = (a.cover ? '<div class="ar-cover" style="background-image:url(\'' + esc(String(a.cover).replace(/'/g, "%27")) + '\')"></div>' : "") +
        (a.category ? '<span class="chip">' + esc(a.category) + "</span>" : "") +
        '<h1 class="h-1" style="margin:14px 0 10px;">' + esc(a.title) + "</h1>" +
        '<div class="post-meta" style="margin-bottom:24px;"><span class="ava ph-2"></span> ' + esc(a.author || "تیم محتوا") + " · " + pdate(a.created_at, true) + " · " + fa(readTime(a.body)) + " دقیقه مطالعه</div>" +
        (a.excerpt ? '<p class="lead">' + esc(a.excerpt) + "</p>" : "") +
        '<div class="ar-body">' + safeHTML(a.body) + "</div>" +
        '<div class="ar-share"><span class="faint">اشتراک‌گذاری:</span><button class="btn btn-sm" id="arShare"><svg class="icon"><use href="#icon-share"/></svg> کپی لینک</button><a class="btn btn-sm" target="_blank" rel="noopener" href="https://t.me/share/url?url=' + encodeURIComponent(location.href) + "&text=" + encodeURIComponent(a.title) + '"><svg class="icon"><use href="#icon-telegram"/></svg> تلگرام</a></div>';
      document.getElementById("arShare").onclick = async function () {
        try { if (navigator.share) await navigator.share({ title: a.title, url: location.href }); else { await navigator.clipboard.writeText(location.href); Toast("لینک مقاله کپی شد ✓"); } } catch (e) {}
      };
      var others = all.filter(function (x) { return x.id !== a.id; }).slice(0, 3);
      if (others.length && more) more.innerHTML = '<h2 class="h-2" style="margin-bottom:18px;">مقالات دیگر</h2><div class="post-grid">' + others.map(function (x, i) {
        return '<article class="post-card"><div class="' + coverClass(x, i) + '"' + coverStyle(x, i) + ">" + (x.category ? '<span class="chip">' + esc(x.category) + "</span>" : "") + '</div><div class="body"><h3><a href="article.html?id=' + x.id + '">' + esc(x.title) + "</a></h3><p>" + esc(x.excerpt || "") + "</p></div></article>";
      }).join("") + "</div>";
    })();
  }
})();
