/* =====================================================================
   اتم — فعال‌سازی زندهٔ صفحات پنل
   هر صفحه که منبع بک‌اند دارد، داده‌ها را از API واقعی می‌گیرد و
   افزودن/ویرایش/حذف را انجام می‌دهد. اگر بک‌اند در دسترس نباشد،
   محتوای دموی استاتیک دست‌نخورده می‌ماند.
   ===================================================================== */
(function () {
  "use strict";
  var main = document.querySelector(".admin-main[data-page]");
  if (!main || !window.AtomAPI) return;
  var page = main.getAttribute("data-page");

  /* ---------- ابزارها ---------- */
  var FA = "۰۱۲۳۴۵۶۷۸۹";
  function fa(s) { return String(s == null ? "" : s).replace(/[0-9]/g, function (d) { return FA[+d]; }); }
  function money(n) { n = Math.round(+n || 0); return fa(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "٬")) + " ت"; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function icon(n) { return '<svg class="icon"><use href="#i-' + n + '"/></svg>'; }
  function chip(text, cls) { return '<span class="chip ' + (cls || "info") + '">' + esc(text) + "</span>"; }
  function initialBox(name, grad) {
    return '<span class="th-img av" style="background:linear-gradient(' + (grad || "135deg,#22B14C,#0E7A38") + ');">' + esc((name || "?")[0]) + "</span>";
  }
  function stars(n) { n = +n || 0; var s = ""; for (var i = 0; i < 5; i++) s += '<svg class="icon"' + (i < n ? "" : ' style="opacity:.28"') + '><use href="#i-star"/></svg>'; return '<span class="rate stars">' + s + "</span>"; }
  function toast(msg, bad) {
    var t = document.createElement("div"); t.className = "atom-toast" + (bad ? " bad" : "");
    t.innerHTML = icon(bad ? "x" : "check") + " " + esc(msg);
    document.body.appendChild(t); setTimeout(function () { t.classList.add("show"); }, 10);
    setTimeout(function () { t.classList.remove("show"); setTimeout(function () { t.remove(); }, 300); }, 2600);
  }
  function pdate(s) { return s ? fa(String(s).slice(0, 10).replace(/-/g, "/")) : "—"; }

  /* ---------- رندر سلول بر اساس نوع ستون ---------- */
  function cell(col, row) {
    var v = row[col.key];
    switch (col.type) {
      case "id": return "<b>#" + fa(v) + "</b>";
      case "money": return money(v);
      case "int": return fa(v == null ? "" : v);
      case "mono": return '<span class="mono">' + esc(v) + "</span>";
      case "ltr": return '<span style="direction:ltr;display:inline-block">' + esc(v) + "</span>";
      case "date": return pdate(v);
      case "pdate": return fa(v || "—");
      case "rating": return stars(v);
      case "chip": var m = (col.map && col.map[v]) || [v, "info"]; return chip(m[0], m[1]);
      case "sub": return '<div class="row-th">' + initialBox(row[col.key], col.grad) +
        "<div><b>" + esc(v) + "</b><span>" + esc(row[col.sub] || "") + "</span></div></div>";
      case "long": return '<span class="preview" style="max-width:320px;display:inline-block">' + esc(String(v || "").slice(0, 90)) + "</span>";
      default: return esc(v == null ? "" : v);
    }
  }

  /* ---------- ساخت مودال فرم (یک‌بار) ---------- */
  var modal;
  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "mini-modal"; modal.hidden = true;
    modal.innerHTML = '<div class="mini-card"><div class="mini-head"><h3></h3>' +
      '<button class="icon-btn" data-x>' + icon("x") + "</button></div>" +
      '<div class="mini-body"></div>' +
      '<div class="mini-foot"><button class="abtn" data-x>انصراف</button>' +
      '<button class="abtn primary" data-save>ذخیره</button></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener("click", function (e) {
      if (e.target === modal || e.target.closest("[data-x]")) modal.hidden = true;
    });
    return modal;
  }
  function openForm(cfg, row) {
    ensureModal();
    var editing = !!row; row = row || {};
    modal.querySelector("h3").textContent = (editing ? "ویرایش " : "افزودن ") + cfg.title;
    var body = modal.querySelector(".mini-body");
    body.innerHTML = cfg.columns.filter(function (c) { return c.form; }).map(function (c) {
      var val = row[c.key] != null ? row[c.key] : (c.def != null ? c.def : "");
      if (c.form === "select") {
        var opts = Object.keys(c.options).map(function (k) {
          return '<option value="' + k + '"' + (String(val) === k ? " selected" : "") + ">" + c.options[k] + "</option>";
        }).join("");
        return field(c.label, '<select data-f="' + c.key + '">' + opts + "</select>");
      }
      if (c.form === "textarea")
        return field(c.label, '<textarea data-f="' + c.key + '">' + esc(val) + "</textarea>");
      var t = c.form === "number" ? "number" : "text";
      return field(c.label, '<input type="' + t + '" data-f="' + c.key + '" value="' + esc(val) + '">');
    }).join("");
    modal.querySelector("[data-save]").onclick = function () { submitForm(cfg, editing ? row.id : null); };
    modal.hidden = false;
    var first = body.querySelector("input,select,textarea"); if (first) first.focus();
  }
  function field(label, inner) {
    return '<div class="field"><label>' + esc(label) + "</label>" + inner + "</div>";
  }
  async function submitForm(cfg, id) {
    var data = {};
    modal.querySelectorAll("[data-f]").forEach(function (el) { data[el.getAttribute("data-f")] = el.value; });
    var req = (cfg.columns.find(function (c) { return c.required; }) || {}).key;
    if (req && !String(data[req] || "").trim()) { toast("فیلد الزامی را پر کنید.", true); return; }
    try {
      if (id) await window.AtomAPI[cfg.resource].update(id, data);
      else await window.AtomAPI[cfg.resource].create(data);
      modal.hidden = true; toast(id ? "با موفقیت ویرایش شد ✓" : "با موفقیت افزوده شد ✓");
      reload(cfg);
    } catch (e) { toast(e.message || "خطا در ذخیره", true); }
  }

  /* ---------- بایند جدول منبع ---------- */
  function findListTable() {
    var tables = [].slice.call(main.querySelectorAll("table.tbl"));
    return tables.filter(function (t) { return !t.closest(".card"); })[0] || tables[0];
  }
  var listCfg = null, listTable = null;
  async function reload(cfg) {
    try {
      var d = await window.AtomAPI[cfg.resource].list(cfg.query || "");
      renderRows(cfg, d.items || []);
      if (cfg.onData) cfg.onData(d);
    } catch (e) { /* آفلاین → دمو می‌ماند */ }
  }
  function renderRows(cfg, rows) {
    var cols = cfg.columns;
    var thead = "<thead><tr>" + cols.map(function (c) {
      return "<th" + (c.type === "money" || c.type === "int" ? ' class="num"' : "") + ">" + c.label + "</th>";
    }).join("") + "<th></th></tr></thead>";
    var tbody = "<tbody>" + (rows.length ? rows.map(function (r) {
      var tds = cols.map(function (c) {
        return "<td" + (c.type === "money" || c.type === "int" ? ' class="num"' : "") + ">" + cell(c, r) + "</td>";
      }).join("");
      var acts = '<td><div class="act-icons">' +
        (cfg.approve ? '<button data-approve="' + r.id + '" title="تأیید">' + icon("check") + "</button>" : "") +
        '<button data-edit="' + r.id + '" title="ویرایش">' + icon("edit") + "</button>" +
        '<button class="dl" data-del="' + r.id + '" title="حذف">' + icon("trash") + "</button></div></td>";
      return '<tr data-id="' + r.id + '">' + tds + acts + "</tr>";
    }).join("") : '<tr><td colspan="' + (cols.length + 1) + '" style="text-align:center;padding:28px;color:var(--a-text-3)">موردی یافت نشد.</td></tr>') + "</tbody>";
    listTable.innerHTML = thead + tbody;
    // ذخیره سطرها برای ویرایش
    var byId = {}; rows.forEach(function (r) { byId[r.id] = r; });
    listTable.querySelectorAll("[data-edit]").forEach(function (b) {
      b.onclick = function () { openForm(cfg, byId[b.getAttribute("data-edit")]); };
    });
    listTable.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = async function () {
        if (!confirm("حذف این مورد؟")) return;
        try { await window.AtomAPI[cfg.resource].remove(+b.getAttribute("data-del")); toast("حذف شد ✓"); reload(cfg); }
        catch (e) { toast(e.message, true); }
      };
    });
    listTable.querySelectorAll("[data-approve]").forEach(function (b) {
      b.onclick = async function () {
        try { await window.AtomAPI[cfg.resource].update(+b.getAttribute("data-approve"), { status: "approved" }); toast("تأیید شد ✓"); reload(cfg); }
        catch (e) { toast(e.message, true); }
      };
    });
  }
  function bindResource(cfg) {
    listTable = findListTable(); if (!listTable) return;
    listCfg = cfg;
    // دکمهٔ افزودن در نوار بخش
    var addBtn = main.querySelector(".section-bar .actions .abtn.primary");
    if (addBtn && /افزودن|جدید|تعریف/.test(addBtn.textContent)) addBtn.onclick = function (e) { e.preventDefault(); openForm(cfg, null); };
    reload(cfg);
  }

  /* ---------- به‌روزرسانی کارت‌های آمار ---------- */
  function setStat(i, value) {
    var b = main.querySelectorAll(".stat-grid .stat > b")[i];
    if (b) b.textContent = value;
  }

  /* ---------- پیکربندی منابع ---------- */
  var S = {
    prodStatus: { active: ["فعال", "ok"], inactive: ["ناموجود", "err"] },
    orderStatus: { pending: ["در انتظار", "pend"], shipping: ["در حال ارسال", "pend"], delivered: ["تحویل شد", "ok"], returned: ["مرجوع", "err"], review: ["در حال بررسی", "info"] },
    role: { admin: ["مدیر کل", "err"], editor: ["ویرایشگر", "info"], support: ["پشتیبان", "info"] },
    adminStatus: { active: ["فعال", "ok"], suspended: ["معلق", "pend"], blocked: ["مسدود", "err"] },
    catStatus: { active: ["فعال", "ok"], draft: ["پیش‌نویس", "pend"] },
    sellerStatus: { active: ["تأییدشده", "ok"], pending: ["در انتظار", "pend"], blocked: ["مسدود", "err"] },
    offerStatus: { active: ["فعال", "ok"], expired: ["پایان‌یافته", "err"] },
    commentStatus: { pending: ["در انتظار", "pend"], approved: ["تأییدشده", "ok"], rejected: ["رد شده", "err"] },
    msgStatus: { open: ["باز", "pend"], pending: ["در حال بررسی", "info"], closed: ["بسته", "ok"] },
  };

  var CONFIG = {
    products: {
      resource: "products", title: "محصول", query: "limit=100",
      columns: [
        { key: "id", label: "کد", type: "id" },
        { key: "title", label: "محصول", type: "sub", sub: "category", form: "text", required: true },
        { key: "category", label: "دسته", form: "text" },
        { key: "seller", label: "فروشنده", type: "text", form: "text" },
        { key: "price", label: "قیمت", type: "money", form: "number" },
        { key: "stock", label: "موجودی", type: "int", form: "number" },
        { key: "status", label: "وضعیت", type: "chip", map: S.prodStatus, form: "select", options: { active: "فعال", inactive: "ناموجود" } },
      ],
    },
    orders: {
      resource: "orders", title: "سفارش", query: "limit=100",
      columns: [
        { key: "code", label: "کد", type: "mono", form: "text" },
        { key: "customer", label: "مشتری", type: "text", form: "text" },
        { key: "product", label: "محصول", type: "text", form: "text" },
        { key: "seller", label: "فروشنده", type: "text", form: "text" },
        { key: "amount", label: "مبلغ", type: "money", form: "number" },
        { key: "created_at", label: "تاریخ", type: "date" },
        { key: "status", label: "وضعیت", type: "chip", map: S.orderStatus, form: "select", options: { pending: "در انتظار", shipping: "در حال ارسال", delivered: "تحویل شد", returned: "مرجوع", review: "در حال بررسی" } },
      ],
    },
    customers: {
      resource: "customers", title: "مشتری", query: "limit=100",
      columns: [
        { key: "name", label: "مشتری", type: "sub", sub: "email", form: "text", required: true },
        { key: "phone", label: "موبایل", type: "ltr", form: "text" },
        { key: "email", label: "ایمیل", form: "text" },
        { key: "orders_count", label: "سفارش‌ها", type: "int", form: "number" },
        { key: "total_spent", label: "مجموع خرید", type: "money", form: "number" },
        { key: "city", label: "شهر", type: "text", form: "text" },
      ],
      onData: function (d) { setStat(0, fa(d.total || (d.items || []).length)); },
    },
    admins: {
      resource: "admins", title: "مدیر",
      columns: [
        { key: "name", label: "مدیر", type: "sub", sub: "email", grad: "135deg,#0E7A38,#37C463", form: "text", required: true },
        { key: "username", label: "نام کاربری", type: "mono", form: "text" },
        { key: "email", label: "ایمیل", form: "text" },
        { key: "role", label: "نقش", type: "chip", map: S.role, form: "select", options: { admin: "مدیر کل", editor: "ویرایشگر", support: "پشتیبان" } },
        { key: "last_login", label: "آخرین ورود", type: "date" },
        { key: "status", label: "وضعیت", type: "chip", map: S.adminStatus, form: "select", options: { active: "فعال", suspended: "معلق", blocked: "مسدود" } },
        { key: "password", label: "رمز عبور (اختیاری برای ویرایش)", form: "text" },
      ],
    },
    categories: {
      resource: "categories", title: "دسته‌بندی",
      columns: [
        { key: "title", label: "عنوان", type: "text", form: "text", required: true },
        { key: "slug", label: "شناسه", type: "mono", form: "text" },
        { key: "count", label: "محصولات", type: "int", form: "number" },
        { key: "parent", label: "والد", type: "text", form: "text" },
        { key: "status", label: "وضعیت", type: "chip", map: S.catStatus, form: "select", options: { active: "فعال", draft: "پیش‌نویس" } },
      ],
    },
    sellers: {
      resource: "sellers", title: "فروشنده",
      columns: [
        { key: "name", label: "فروشنده", type: "sub", sub: "category", grad: "135deg,#0E7A38,#37C463", form: "text", required: true },
        { key: "rating", label: "امتیاز", type: "rating", form: "number" },
        { key: "sales", label: "فروش", type: "int", form: "number" },
        { key: "city", label: "شهر", type: "text", form: "text" },
        { key: "status", label: "وضعیت", type: "chip", map: S.sellerStatus, form: "select", options: { active: "تأییدشده", pending: "در انتظار", blocked: "مسدود" } },
      ],
    },
    offers: {
      resource: "offers", title: "کد تخفیف",
      columns: [
        { key: "code", label: "کد", type: "mono", form: "text", required: true },
        { key: "title", label: "عنوان", type: "text", form: "text" },
        { key: "kind", label: "نوع", type: "chip", map: { percent: ["درصدی", "info"], amount: ["مبلغی", "info"] }, form: "select", options: { percent: "درصدی", amount: "مبلغی" } },
        { key: "amount", label: "مقدار", type: "int", form: "number" },
        { key: "used", label: "استفاده", type: "int", form: "number" },
        { key: "expires", label: "انقضا", type: "pdate", form: "text" },
        { key: "status", label: "وضعیت", type: "chip", map: S.offerStatus, form: "select", options: { active: "فعال", expired: "پایان‌یافته" } },
      ],
    },
    comments: {
      resource: "comments", title: "نظر", approve: true,
      columns: [
        { key: "author", label: "کاربر", type: "sub", sub: "product", form: "text", required: true },
        { key: "product", label: "محصول", type: "text", form: "text" },
        { key: "body", label: "متن نظر", type: "long", form: "textarea" },
        { key: "rating", label: "امتیاز", type: "rating", form: "number" },
        { key: "created_at", label: "تاریخ", type: "date" },
        { key: "status", label: "وضعیت", type: "chip", map: S.commentStatus, form: "select", options: { pending: "در انتظار", approved: "تأیید", rejected: "رد" } },
      ],
    },
    messages: {
      resource: "messages", title: "پیام",
      columns: [
        { key: "sender", label: "فرستنده", type: "sub", sub: "subject", form: "text", required: true },
        { key: "subject", label: "موضوع", type: "text", form: "text" },
        { key: "body", label: "متن", type: "long", form: "textarea" },
        { key: "created_at", label: "تاریخ", type: "date" },
        { key: "status", label: "وضعیت", type: "chip", map: S.msgStatus, form: "select", options: { open: "باز", pending: "در حال بررسی", closed: "بسته" } },
      ],
    },
  };

  /* ---------- فعال‌سازهای خاص ---------- */
  async function activateDashboard() {
    try {
      var s = await window.AtomAPI.stats();
      setStat(0, money(s.revenue)); setStat(1, fa(s.orders));
      setStat(2, fa(s.customers)); setStat(3, fa(s.sellers));
      // جدول آخرین سفارش‌ها (داخل کارت)
      var t = [].slice.call(main.querySelectorAll("table.tbl")).filter(function (x) { return x.closest(".card"); })[0];
      if (t && s.recentOrders) {
        var tb = t.querySelector("tbody");
        if (tb) tb.innerHTML = s.recentOrders.map(function (o) {
          var m = S.orderStatus[o.status] || [o.status, "info"];
          return "<tr><td><b>#" + fa(o.code) + "</b></td><td>" + esc(o.customer) + "</td><td>" + esc(o.product) +
            "</td><td>" + money(o.amount) + "</td><td>" + pdate(o.created_at) + "</td><td>" + chip(m[0], m[1]) + "</td></tr>";
        }).join("");
      }
    } catch (e) {}
  }
  async function activateLoyalty() {
    try {
      var d = await window.AtomAPI.loyalty();
      var t = findListTable(); if (!t) return;
      var order = { platinum: "t-platinum", gold: "t-gold", silver: "t-silver", bronze: "t-bronze" };
      t.innerHTML = "<thead><tr><th>مشتری</th><th>سطح</th><th>مجموع خرید</th></tr></thead><tbody>" +
        d.members.map(function (m) {
          return "<tr><td>" + '<div class="row-th">' + initialBox(m.name) + "<b>" + esc(m.name) + "</b></div></td>" +
            '<td><span class="tier-badge ' + (order[m.tier] || "") + '"><span class="mini-medal ' + (order[m.tier] || "") + '"></span> ' + esc(m.tierName) + "</span></td>" +
            "<td>" + money(m.total_spent) + "</td></tr>";
        }).join("") + "</tbody>";
    } catch (e) {}
  }
  async function activateAudit() {
    try {
      var d = await window.AtomAPI.activity(60);
      var t = findListTable(); if (!t) return;
      t.innerHTML = "<thead><tr><th>کاربر</th><th>اقدام</th><th>مورد</th><th>IP</th><th>زمان</th></tr></thead><tbody>" +
        d.items.map(function (a) {
          return "<tr><td>" + '<div class="row-th">' + initialBox(a.actor, "135deg,#0E7A38,#37C463") + "<b>" + esc(a.actor) + "</b></div></td>" +
            "<td>" + chip(a.action, "info") + "</td><td style='color:var(--a-text-2)'>" + esc(a.target) +
            "</td><td class='mono'>" + esc(a.ip || "—") + "</td><td>" + fa((a.created_at || "").replace("T", " ")) + "</td></tr>";
        }).join("") + "</tbody>";
    } catch (e) {}
  }
  async function activateSecurity() {
    try {
      var d = await window.AtomAPI.logins();
      // اولین جدول داخل کارت «ورودهای اخیر»
      var cards = [].slice.call(main.querySelectorAll(".card"));
      var loginCard = cards.filter(function (c) { var h = c.querySelector("h3"); return h && /ورودهای اخیر/.test(h.textContent); })[0];
      if (loginCard) {
        var tb = loginCard.querySelector("tbody");
        if (tb) tb.innerHTML = d.items.slice(0, 8).map(function (l) {
          return "<tr><td>" + esc(l.username) + "</td><td class='mono'>" + esc(l.ip || "—") + "</td><td>" +
            fa((l.created_at || "").slice(11, 16)) + "</td><td>" + (l.success ? chip("موفق", "ok") : chip("ناموفق", "err")) + "</td></tr>";
        }).join("");
      }
    } catch (e) {}
  }
  async function activateSettings() {
    try {
      var d = await window.AtomAPI.settings(); var s = d.settings || {};
      var map = { site_name: "اتم", site_title: null, domain: null, contact_email: null };
      // پرکردن ورودی‌ها بر اساس مقدار برچسب — تطبیق ساده با value موجود
      main.querySelectorAll(".field input, .field textarea").forEach(function (inp) {
        var lbl = inp.closest(".field").querySelector("label");
        if (!lbl) return; var t = lbl.textContent;
        if (/نام سایت/.test(t) && s.site_name) inp.value = s.site_name;
        else if (/عنوان/.test(t) && s.site_title) inp.value = s.site_title;
        else if (/دامنه اصلی/.test(t) && s.domain) inp.value = s.domain;
        else if (/ایمیل تماس/.test(t) && s.contact_email) inp.value = s.contact_email;
      });
      var saveBtn = main.querySelector(".section-bar .actions .abtn.primary");
      if (saveBtn) saveBtn.onclick = async function (e) {
        e.preventDefault();
        var out = {};
        main.querySelectorAll(".field input, .field textarea").forEach(function (inp) {
          var lbl = inp.closest(".field").querySelector("label"); if (!lbl) return; var t = lbl.textContent;
          if (/نام سایت/.test(t)) out.site_name = inp.value;
          else if (/عنوان \(SEO\)|^عنوان/.test(t)) out.site_title = inp.value;
          else if (/دامنه اصلی/.test(t)) out.domain = inp.value;
          else if (/ایمیل تماس/.test(t)) out.contact_email = inp.value;
        });
        try { await window.AtomAPI.saveSettings(out); toast("تنظیمات ذخیره شد ✓"); } catch (er) { toast(er.message, true); }
      };
    } catch (e) {}
  }
  async function activateFlags() {
    try {
      var d = await window.AtomAPI.flags();
      var byKey = {}; d.items.forEach(function (f) { byKey[f.key] = f; });
      main.querySelectorAll(".flag-row").forEach(function (row) {
        var keyEl = row.querySelector(".mono"); if (!keyEl) return;
        var key = keyEl.textContent.trim(); var f = byKey[key]; if (!f) return;
        var cb = row.querySelector('input[type="checkbox"]'); if (!cb) return;
        cb.checked = !!f.enabled;
        cb.onchange = async function () {
          try { await window.AtomAPI.setFlag(key, cb.checked); toast((f.name || key) + (cb.checked ? " روشن شد" : " خاموش شد") + " ✓"); }
          catch (e) { cb.checked = !cb.checked; toast(e.message, true); }
        };
      });
    } catch (e) {}
  }

  /* ---------- اجرا ---------- */
  (async function run() {
    var online = false;
    try { online = await window.AtomAPI.available(); } catch (e) {}
    if (!online) return; // بک‌اند نیست → دمو می‌ماند
    // نشان «متصل به بک‌اند» در تاپ‌بار
    var me = main.querySelector(".admin-user .me");
    if (me && !me.querySelector(".live-dot")) {
      var d = document.createElement("span"); d.className = "live-dot"; d.title = "متصل به بک‌اند واقعی"; me.prepend(d);
    }
    if (CONFIG[page]) return bindResource(CONFIG[page]);
    if (page === "dashboard") return activateDashboard();
    if (page === "loyalty") return activateLoyalty();
    if (page === "audit") return activateAudit();
    if (page === "security") return activateSecurity();
    if (page === "settings") return activateSettings();
    if (page === "flags") return activateFlags();
  })();
})();
