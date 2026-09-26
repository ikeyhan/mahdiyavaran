/* =====================================================================
   اتم ۳۱۳ — پنل فروشنده: آمار، سفارش‌های دریافتی، تحلیل فروش و نظرات
   همه از داده‌های واقعی فروشگاه (سرور یا حالت HTML) محاسبه می‌شوند.
   ===================================================================== */
(function () {
  "use strict";
  var SA = window.SiteAuth; if (!SA || !SA.isSeller()) return;
  var FA = "۰۱۲۳۴۵۶۷۸۹";
  function fa(s) { return String(s == null ? "" : s).replace(/[0-9]/g, function (d) { return FA[+d]; }); }
  function money(n) { return fa(String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")) + " ت"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function dt(s) { var d = new Date(String(s || "").replace(" ", "T")); return isNaN(d) ? null : d; }
  function pdate(s) { var d = dt(s); if (!d) return ""; try { return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d); } catch (e) { return ""; } }
  function panel(k) { return document.querySelector('[data-dash-panel="' + k + '"]'); }
  var ST = { pending: ["در انتظار ارسال", "pend"], review: ["در حال بررسی", "pend"], shipping: ["ارسال شد", "pend"], delivered: ["تحویل شد", "ok"], returned: ["مرجوعی", "cancel"] };
  var orders = [], products = [], comments = [];

  function setCard(root, i, v, l) {
    var c = root && root.querySelectorAll(".dash-card")[i]; if (!c) return;
    var b = c.querySelector("b"), s = c.querySelector(":scope > span"); if (b) b.textContent = v; if (s && l) s.textContent = l;
    var tr = c.querySelector(".trend-up"); if (tr) tr.remove();
  }
  function bars(chart, buckets) {
    if (!chart) return;
    var max = Math.max.apply(null, buckets.map(function (b) { return b.v; }).concat([1]));
    chart.innerHTML = buckets.map(function (b) { return '<div class="col"><div class="bar" style="height:' + Math.max(4, Math.round(100 * b.v / max)) + '%" title="' + esc(money(b.v)) + '"></div><span class="lbl">' + esc(b.l) + "</span></div>"; }).join("");
  }

  function overview() {
    var ov = panel("overview"); if (!ov) return;
    var now = new Date(), valid = orders.filter(function (o) { return o.status !== "returned"; });
    var monthRev = valid.filter(function (o) { var d = dt(o.created_at); return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce(function (s, o) { return s + (+o.amount || 0); }, 0);
    var customers = {}; orders.forEach(function (o) { customers[o.customer] = 1; });
    setCard(ov, 0, money(monthRev), "فروش این ماه");
    setCard(ov, 1, fa(products.filter(function (p) { return p.status === "active"; }).length), "محصول فعال");
    setCard(ov, 2, fa(orders.filter(function (o) { return o.status === "pending" || o.status === "review"; }).length), "سفارش در انتظار ارسال");
    setCard(ov, 3, fa(Object.keys(customers).length), "مشتری");
    // روند ۷ روز اخیر
    var days = []; var wd = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];
    for (var i = 6; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i); days.push({ d: d, l: wd[d.getDay()], v: 0 }); }
    valid.forEach(function (o) { var d = dt(o.created_at); if (!d) return; days.forEach(function (x) { if (x.d.toDateString() === d.toDateString()) x.v += +o.amount || 0; }); });
    bars(ov.querySelector(".bar-chart"), days);
    // سهم دسته‌ها (از محصولات فروش‌رفته، در نبود سفارش از محصولات)
    var cat = {}; products.forEach(function (p) { cat[p.category || "سایر"] = cat[p.category || "سایر"] || 0; });
    valid.forEach(function (o) { var p = products.filter(function (x) { return String(o.product).indexOf(x.title) === 0; })[0]; var k = p ? (p.category || "سایر") : "سایر"; cat[k] = (cat[k] || 0) + (+o.amount || 0); });
    var keys = Object.keys(cat).sort(function (a, b) { return cat[b] - cat[a]; }).slice(0, 4), tot = keys.reduce(function (s, k) { return s + cat[k]; }, 0);
    var cols = ["#0E7A38", "#22B14C", "#37C463", "#9BDDB0"], acc = 0, stops = [];
    var legend = ov.querySelector(".legend"), donut = ov.querySelector(".donut");
    if (legend) legend.innerHTML = keys.length ? keys.map(function (k, i) {
      var p = tot ? Math.round(100 * cat[k] / tot) : Math.round(100 / keys.length);
      stops.push(cols[i] + " " + acc + "% " + (acc + p) + "%"); acc += p;
      return '<div><i style="background:' + cols[i] + ';"></i> ' + esc(k) + " — " + fa(p) + "٪</div>";
    }).join("") : '<div class="faint">هنوز فروشی ثبت نشده است</div>';
    if (donut) donut.style.background = stops.length ? "conic-gradient(" + stops.join(",") + ", var(--surface-2) " + acc + "% 100%)" : "var(--surface-2)";
    // جدول آخرین سفارش‌ها در نمای کلی (در صورت وجود)
    var t = ov.querySelector("table tbody"); if (t) t.innerHTML = rows(orders.slice(0, 5));
  }

  function rows(list) {
    if (!list.length) return '<tr><td colspan="6" style="text-align:center;padding:26px;color:var(--text-3)">هنوز سفارشی برای فروشگاه شما ثبت نشده است.</td></tr>';
    return list.map(function (o, i) {
      var st = ST[o.status] || [o.status, "pend"];
      var act = o.status === "pending" || o.status === "review" ? '<button class="btn btn-sm btn-primary" data-ship="' + o.id + '">ثبت ارسال</button>'
        : o.status === "shipping" ? '<button class="btn btn-sm" data-deliver="' + o.id + '">تحویل شد</button>' : "";
      return '<tr><td>' + esc(o.customer) + '</td><td class="flex gap-12"><div class="prow-thumb ph-' + ((i % 6) + 1) + '"></div> ' + esc(o.product) + "</td><td>" + pdate(o.created_at) + "</td><td>" + money(o.amount) + '</td><td><span class="status-chip ' + st[1] + '">' + esc(st[0]) + "</span></td>" +
        '<td><div class="flex gap-8">' + act + '<button class="btn btn-sm btn-ghost" data-odetail="' + o.id + '">جزئیات</button></div></td></tr>';
    }).join("");
  }
  function ordersPanel() { var t = panel("orders") && panel("orders").querySelector("table tbody"); if (t) t.innerHTML = rows(orders); }

  function analytics() {
    var an = panel("analytics"); if (!an) return;
    var rated = comments.filter(function (c) { return c.status === "approved"; });
    var avg = rated.length ? rated.reduce(function (s, c) { return s + (+c.rating || 5); }, 0) / rated.length : 0;
    var ret = orders.length ? Math.round(100 * orders.filter(function (o) { return o.status === "returned"; }).length / orders.length) : 0;
    var byCust = {}; orders.forEach(function (o) { byCust[o.customer] = (byCust[o.customer] || 0) + 1; });
    var custs = Object.keys(byCust), repeat = custs.length ? Math.round(100 * custs.filter(function (c) { return byCust[c] > 1; }).length / custs.length) : 0;
    var done = orders.length ? Math.round(100 * orders.filter(function (o) { return o.status === "delivered"; }).length / orders.length) : 0;
    setCard(an, 0, avg ? fa(avg.toFixed(1)) : "—", "میانگین امتیاز (" + fa(rated.length) + " نظر)");
    setCard(an, 1, fa(done) + "٪", "سفارش‌های تحویل‌شده");
    setCard(an, 2, fa(ret) + "٪", "نرخ بازگشت کالا");
    setCard(an, 3, fa(repeat) + "٪", "مشتریان بازگشتی");
    var fmt; try { fmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "long" }); } catch (e) { return; }
    var mf = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "numeric" }), now = new Date(), months = [];
    for (var i = 5; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth() - i, 15); months.push({ k: mf.format(d), l: fmt.format(d), v: 0 }); }
    orders.forEach(function (o) { if (o.status === "returned") return; var d = dt(o.created_at); if (!d) return; var k = mf.format(d); months.forEach(function (m) { if (m.k === k) m.v += +o.amount || 0; }); });
    bars(an.querySelector(".bar-chart"), months);
  }

  function messages() {
    var p = panel("messages"); if (!p) return; var box = p.querySelector(".panel"); if (!box) return;
    var h = p.querySelector("h1"); if (h) h.textContent = "نظرات مشتریان";
    box.innerHTML = comments.length ? comments.map(function (c, i) {
      var st = c.status === "approved" ? '<span class="status-chip ok">منتشرشده</span>' : '<span class="status-chip pend">در انتظار تأیید مدیر</span>';
      var stars = ""; for (var k = 1; k <= 5; k++) stars += k <= (+c.rating || 5) ? "★" : "☆";
      return '<div class="msg-item" style="display:flex; gap:14px; padding:16px;"><div class="ava ph-' + ((i % 8) + 1) + '" style="width:46px;height:46px;border-radius:50%;flex-shrink:0"></div><div style="flex:1;"><div class="flex between" style="flex-wrap:wrap;gap:6px"><b style="font-size:.88rem;">' + esc(c.author) + ' <span style="color:#F5A623;letter-spacing:1px">' + stars + '</span></b><span class="faint" style="font-size:.72rem;">' + pdate(c.created_at) + " " + st + '</span></div><div class="faint" style="font-size:.76rem;margin-top:2px">' + esc(c.product) + '</div><p class="muted" style="font-size:.83rem; margin:6px 0 0;">' + esc(c.body) + "</p></div></div>";
    }).join("") : '<p class="faint" style="text-align:center;padding:26px 0;margin:0">هنوز نظری برای محصولات شما ثبت نشده است. نظرات خریداران پس از تأیید مدیر اینجا نمایش داده می‌شود.</p>';
  }

  document.addEventListener("click", async function (e) {
    var sh = e.target.closest("[data-ship]"), dl = e.target.closest("[data-deliver]"), dd = e.target.closest("[data-odetail]");
    if (sh || dl) {
      var b = sh || dl; b.disabled = true;
      try { await SA.setSellerOrder(b.getAttribute(sh ? "data-ship" : "data-deliver"), sh ? "shipping" : "delivered"); Toast(sh ? "ارسال سفارش ثبت شد ✓" : "تحویل سفارش ثبت شد ✓"); await load(); }
      catch (er) { Toast(er.message, "err"); b.disabled = false; }
    }
    if (dd) {
      var o = orders.filter(function (x) { return String(x.id) === dd.getAttribute("data-odetail"); })[0]; if (!o) return;
      var tr = dd.closest("tr"), nx = tr.nextElementSibling;
      if (nx && nx.classList.contains("order-detail")) { nx.remove(); return; }
      var r = document.createElement("tr"); r.className = "order-detail";
      r.innerHTML = '<td colspan="6"><div class="od-box"><div><b>کد سفارش:</b> #' + fa(o.code) + "</div>" + (o.address ? "<div><b>آدرس ارسال:</b> " + esc(o.address) + "</div>" : "") + (o.note ? '<div class="faint">' + esc(o.note) + "</div>" : "") + "</div></td>";
      tr.insertAdjacentElement("afterend", r);
    }
  });

  async function load() {
    try { orders = (await SA.sellerOrders()).items || []; } catch (e) { orders = []; }
    try { products = (await SA.products.list()).items || []; } catch (e) { products = []; }
    try { comments = (await SA.sellerComments()).items || []; } catch (e) { comments = []; }
    overview(); ordersPanel(); analytics(); messages();
  }
  load();
  window.atomSellerRefresh = load;
})();
