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
  function imgsrc(v) { v = String(v == null ? "" : v); return /^assets\//.test(v) ? "../" + v : v; }
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
      case "img": return v ? '<span class="th-img" style="background-image:url(\'' + esc(imgsrc(v)) + '\');background-size:cover;background-position:center"></span>' : '<span class="th-img">' + icon("image") + "</span>";
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
      if (c.form === "image")
        return field(c.label,
          '<div class="img-field" data-imgfield>' +
            '<div class="img-prev"' + (val ? ' style="background-image:url(\'' + esc(imgsrc(val)) + '\')"' : "") + ">" + (val ? "" : icon("image")) + "</div>" +
            '<div class="img-col">' +
              '<input type="text" data-f="' + c.key + '" value="' + esc(val) + '" placeholder="آدرس تصویر یا آپلود کنید">' +
              '<button type="button" class="abtn sm" data-imgpick>' + icon("image") + " آپلود تصویر</button>" +
              '<input type="file" accept="image/*" hidden data-imginput>' +
            "</div>" +
          "</div>");
      var t = c.form === "number" ? "number" : "text";
      return field(c.label, '<input type="' + t + '" data-f="' + c.key + '" value="' + esc(val) + '">');
    }).join("");
    // فعال‌سازی فیلدهای تصویر (پیش‌نمایش + آپلود)
    body.querySelectorAll("[data-imgfield]").forEach(function (w) {
      var input = w.querySelector("[data-f]"), file = w.querySelector("[data-imginput]"),
          pick = w.querySelector("[data-imgpick]"), prev = w.querySelector(".img-prev");
      function setPrev(u) { prev.style.backgroundImage = u ? "url('" + imgsrc(u) + "')" : ""; prev.innerHTML = u ? "" : icon("image"); }
      input.addEventListener("input", function () { setPrev(input.value.trim()); });
      pick.onclick = function () { file.click(); };
      file.onchange = async function () {
        if (!file.files[0]) return;
        var orig = pick.innerHTML; pick.textContent = "در حال آپلود…"; pick.disabled = true;
        try { var up = await window.AtomAPI.upload(file.files[0]); input.value = up.url; setPrev(up.url); toast("تصویر آپلود شد ✓"); }
        catch (e) { toast(e.message || "خطا در آپلود تصویر", true); }
        pick.innerHTML = orig; pick.disabled = false;
      };
    });
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
        try { await window.AtomAPI[cfg.resource].update(+b.getAttribute("data-approve"), { status: cfg.approveStatus || "approved" }); toast("تأیید شد ✓"); reload(cfg); }
        catch (e) { toast(e.message, true); }
      };
    });
  }
  function bindResource(cfg, tableEl) {
    listTable = tableEl || findListTable(); if (!listTable) return;
    listTable.setAttribute("data-bound", "1");
    listCfg = cfg;
    // دکمهٔ افزودن: در میان همهٔ نوارها، دکمهٔ «افزودن/جدید/تعریف» را پیدا کن
    var addBtn = [].slice.call(main.querySelectorAll(".section-bar .actions .abtn.primary"))
      .filter(function (b) { return /افزودن|جدید|تعریف/.test(b.textContent); })[0];
    if (addBtn) addBtn.onclick = function (e) { e.preventDefault(); openForm(cfg, null); };
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
    faqs: {
      resource: "faqs", title: "سؤال متداول",
      columns: [
        { key: "question", label: "سؤال", type: "text", form: "text", required: true },
        { key: "answer", label: "پاسخ", type: "long", form: "textarea" },
        { key: "sort", label: "ترتیب", type: "int", form: "number" },
        { key: "status", label: "وضعیت", type: "chip", map: { active: ["فعال", "ok"], hidden: ["مخفی", "pend"] }, form: "select", options: { active: "فعال", hidden: "مخفی" } },
      ],
    },
    slideshow: {
      resource: "slides", title: "اسلاید", query: "limit=50",
      columns: [
        { key: "id", label: "#", type: "id" },
        { key: "image", label: "تصویر", type: "img", form: "image" },
        { key: "title", label: "عنوان", type: "text", form: "text", required: true },
        { key: "eyebrow", label: "برچسب", type: "text", form: "text" },
        { key: "subtitle", label: "زیرعنوان", type: "long", form: "textarea" },
        { key: "cta_label", label: "متن دکمه", type: "text", form: "text" },
        { key: "cta_link", label: "لینک دکمه", type: "mono", form: "text" },
        { key: "sort", label: "ترتیب", type: "int", form: "number" },
        { key: "status", label: "وضعیت", type: "chip", map: { active: ["فعال", "ok"], hidden: ["مخفی", "pend"] }, form: "select", options: { active: "فعال", hidden: "مخفی" } },
      ],
    },
    ads: {
      resource: "ads", title: "تبلیغ", query: "limit=100",
      columns: [
        { key: "id", label: "#", type: "id" },
        { key: "image", label: "تصویر", type: "img", form: "image" },
        { key: "placement", label: "جایگاه", type: "chip", map: { top: ["نوار بالا", "info"], corner: ["مربع گوشه", "ok"] }, form: "select", options: { top: "نوار بالای سایت", corner: "مربع گوشهٔ چپ" } },
        { key: "title", label: "عنوان", type: "text", form: "text", required: true },
        { key: "text", label: "متن", type: "long", form: "text" },
        { key: "cta_label", label: "متن دکمه", type: "text", form: "text" },
        { key: "link", label: "لینک", type: "mono", form: "text" },
        { key: "bg", label: "رنگ", type: "text", form: "text" },
        { key: "sort", label: "ترتیب", type: "int", form: "number" },
        { key: "status", label: "وضعیت", type: "chip", map: { active: ["فعال", "ok"], hidden: ["مخفی", "pend"] }, form: "select", options: { active: "فعال", hidden: "مخفی" } },
      ],
    },
    localoffices: {
      resource: "offices", title: "دفتر محله", query: "limit=100", approve: true, approveStatus: "verified",
      columns: [
        { key: "name", label: "دفتر", type: "sub", sub: "area", grad: "135deg,#0E7A38,#37C463", form: "text", required: true },
        { key: "manager", label: "مسئول", type: "text", form: "text" },
        { key: "area", label: "محله", type: "text", form: "text" },
        { key: "city", label: "شهر", type: "text", form: "text" },
        { key: "phone", label: "تماس", type: "ltr", form: "text" },
        { key: "national_code", label: "کد ملی", type: "mono", form: "text" },
        { key: "license_no", label: "مجوز", type: "mono", form: "text" },
        { key: "status", label: "اعتبارسنجی", type: "chip", map: { pending: ["در انتظار", "pend"], verified: ["تأییدشده", "ok"], rejected: ["رد شده", "err"], blocked: ["مسدود", "err"] }, form: "select", options: { pending: "در انتظار", verified: "تأییدشده", rejected: "رد شده", blocked: "مسدود" } },
        { key: "verify_note", label: "یادداشت", type: "text", form: "text" },
      ],
    },
    officemessages: {
      resource: "officeMessages", title: "پیام دفتر", query: "limit=200",
      columns: [
        { key: "office", label: "دفتر", type: "text" },
        { key: "sender_name", label: "فرستنده", type: "sub", sub: "sender_phone" },
        { key: "body", label: "متن پیام", type: "text" },
        { key: "reply", label: "پاسخ دفتر", type: "text", form: "textarea" },
        { key: "created_at", label: "تاریخ", type: "date" },
        { key: "status", label: "وضعیت", type: "chip", map: { open: ["بی‌پاسخ", "pend"], replied: ["پاسخ داده‌شده", "ok"], closed: ["بسته‌شده", "info"] }, form: "select", options: { open: "بی‌پاسخ", replied: "پاسخ داده‌شده", closed: "بسته‌شده" } },
      ],
    },
    banned: {
      resource: "bannedWords", title: "کلمهٔ ممنوعه", query: "limit=200",
      columns: [
        { key: "word", label: "کلمه", type: "text", form: "text", required: true },
        { key: "note", label: "توضیح", type: "text", form: "text" },
        { key: "created_at", label: "تاریخ", type: "date" },
        { key: "status", label: "وضعیت", type: "chip", map: { active: ["فعال", "ok"], off: ["غیرفعال", "pend"] }, form: "select", options: { active: "فعال", off: "غیرفعال" } },
      ],
    },
  };

  /* ---------- فعال‌سازهای خاص ---------- */
  async function activateDashboard() {
    try {
      var s = await window.AtomAPI.stats();
      var labels = ["درآمد قطعی (ارسال و تحویل)", "کل سفارش‌ها", "مشتریان", "فروشندگان"];
      [money(s.revenue), fa(s.orders), fa(s.customers), fa(s.sellers)].forEach(function (v, i) {
        setStat(i, v);
        var st = main.querySelectorAll(".stat-grid .stat")[i];
        if (st) { var tr = st.querySelector(".trend"); if (tr) tr.remove(); var sp = st.querySelector(":scope > span"); if (sp) sp.textContent = labels[i]; }
      });
      // جدول آخرین سفارش‌ها (داخل کارت)
      var t = [].slice.call(main.querySelectorAll("table.tbl")).filter(function (x) { return x.closest(".card"); })[0];
      if (t && s.recentOrders) {
        t.setAttribute("data-bound", "1");
        var tb = t.querySelector("tbody");
        if (tb) tb.innerHTML = s.recentOrders.length ? s.recentOrders.map(function (o) {
          var m = S.orderStatus[o.status] || [o.status, "info"];
          return "<tr><td><b>#" + fa(o.code) + "</b></td><td>" + esc(o.customer) + "</td><td>" + esc(o.product) +
            "</td><td>" + money(o.amount) + "</td><td>" + pdate(o.created_at) + "</td><td>" + chip(m[0], m[1]) + "</td></tr>";
        }).join("") : '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--a-text-3)">هنوز سفارشی ثبت نشده است.</td></tr>';
      }
      // نمودار ۷ روز اخیر و سهم فروشندگان از روی سفارش‌های واقعی
      var all = (await window.AtomAPI.orders.list("limit=200")).items || [];
      var valid = all.filter(function (o) { return o.status !== "returned"; });
      var now = new Date(), WD = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"], days = [];
      for (var i = 6; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i); days.push({ d: d.toDateString(), l: WD[d.getDay()], v: 0 }); }
      valid.forEach(function (o) { var d = new Date(String(o.created_at || "").replace(" ", "T")); if (isNaN(d)) return; days.forEach(function (x) { if (x.d === d.toDateString()) x.v += +o.amount || 0; }); });
      var max = Math.max.apply(null, days.map(function (x) { return x.v; }).concat([1]));
      var chart = main.querySelector(".bar-chart");
      if (chart) chart.innerHTML = days.map(function (x) { return '<div class="col"><div class="bar" style="height:' + Math.max(3, Math.round(100 * x.v / max)) + '%" title="' + esc(money(x.v)) + '"></div><span class="lbl">' + x.l + "</span></div>"; }).join("");
      var by = {}; valid.forEach(function (o) { by[o.seller || "سایر"] = (by[o.seller || "سایر"] || 0) + (+o.amount || 0); });
      var keys = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }), tot = keys.reduce(function (x, k) { return x + by[k]; }, 0);
      var top = keys.slice(0, 3), rest = keys.slice(3).reduce(function (x, k) { return x + by[k]; }, 0);
      var parts = top.map(function (k) { return [k, by[k]]; }); if (rest) parts.push(["سایر", rest]);
      var cols = ["#0E7A38", "#22B14C", "#37C463", "#DCE8E0"], acc = 0, stops = [];
      var legend = main.querySelector(".donut-wrap .legend"), donut = main.querySelector(".donut-wrap .donut");
      var head = donut && donut.closest(".card") && donut.closest(".card").querySelector(".card-head h3"); if (head) head.textContent = "سهم فروش فروشندگان";
      if (legend) legend.innerHTML = parts.length ? parts.map(function (p, i) { var pc = tot ? Math.round(100 * p[1] / tot) : 0; stops.push(cols[i] + " " + acc + "% " + (acc + pc) + "%"); acc += pc; return '<div><i style="background:' + cols[i] + '"></i> ' + esc(p[0]) + " — " + fa(pc) + "٪</div>"; }).join("") : "<div>هنوز فروشی ثبت نشده است</div>";
      if (donut) donut.style.background = stops.length ? "conic-gradient(" + stops.join(",") + ", var(--a-border) " + acc + "% 100%)" : "var(--a-border)";
    } catch (e) {}
  }
  async function activateLoyalty() {
    try {
      var d = await window.AtomAPI.loyalty();
      var t = findListTable(); if (!t) return;
      t.setAttribute("data-bound", "1");
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
      t.setAttribute("data-bound", "1");
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
        if (tb) tb.closest("table").setAttribute("data-bound", "1");
        if (tb) tb.innerHTML = d.items.slice(0, 8).map(function (l) {
          return "<tr><td>" + esc(l.username) + "</td><td class='mono'>" + esc(l.ip || "—") + "</td><td>" +
            fa((l.created_at || "").slice(11, 16)) + "</td><td>" + (l.success ? chip("موفق", "ok") : chip("ناموفق", "err")) + "</td></tr>";
        }).join("");
      }
    } catch (e) {}
  }
  async function activateSettings() {
    // فیلدهای دارای data-key مستقیماً به جدول تنظیمات سرور وصل‌اند (و روی سایت اثر دارند)
    var fields = [].slice.call(main.querySelectorAll("[data-key]"));
    try {
      var d = await window.AtomAPI.settings(); var s = d.settings || {};
      fields.forEach(function (el) { var k = el.getAttribute("data-key"); if (s[k] != null && s[k] !== "") el.value = s[k]; });
    } catch (e) {}
    var saveBtn = main.querySelector(".section-bar .actions .abtn.primary");
    if (saveBtn) saveBtn.onclick = async function (e) {
      e.preventDefault();
      var out = {};
      fields.forEach(function (el) { out[el.getAttribute("data-key")] = el.value.trim(); });
      if (out.contact_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.contact_email)) { toast("ایمیل تماس نامعتبر است.", true); return; }
      try { await window.AtomAPI.saveSettings(out); toast("تنظیمات ذخیره شد و روی سایت اعمال شد ✓"); } catch (er) { toast(er.message, true); }
    };
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

  async function activateSupport() {
    // بارگذاری تنظیمات چت‌بات و هوش مصنوعی
    var avatarData = null, avatarFile = null;
    try {
      var d = await window.AtomAPI.settings(); var s = d.settings || {};
      setVal("sup_chat_title", s.chat_title);
      setVal("sup_chat_welcome", s.chat_welcome);
      setVal("sup_chat_color", s.chat_color || "#149B3E");
      setVal("sup_ai_provider", s.ai_provider || "openai");
      setVal("sup_ai_base_url", s.ai_base_url);
      setVal("sup_ai_model", s.ai_model);
      var keyInp = document.getElementById("sup_ai_api_key"); if (keyInp) { keyInp.value = ""; keyInp.placeholder = s.ai_api_key_set === "1" ? "•••••••• (کلید ذخیره شده — برای تغییر، کلید جدید وارد کنید)" : "کلید API را وارد کنید"; }
      setVal("sup_ai_system_prompt", s.ai_system_prompt);
      var en = document.getElementById("sup_chat_enabled"); if (en) en.checked = (s.chat_enabled !== "0");
      avatarData = s.chat_avatar || "";
      var hex = document.getElementById("sup_color_hex"); if (hex) hex.textContent = s.chat_color || "#149B3E";
      var img = document.getElementById("supAvatarImg"), dz = document.querySelector("#supAvatarBox .dz-ic");
      if (avatarData && img) { img.src = avatarData; img.hidden = false; if (dz) dz.style.display = "none"; }
      // وضعیت هوش مصنوعی
      var aiChip = document.getElementById("supAiState");
      if (aiChip) { if (s.ai_api_key_set === "1") { aiChip.textContent = "فعال"; aiChip.className = "chip ok"; } else { aiChip.textContent = "پیکربندی نشده"; aiChip.className = "chip pend"; } }
      setStat(0, s.ai_api_key_set === "1" ? "فعال" : "غیرفعال");
    } catch (e) {}

    // رنگ زنده
    var color = document.getElementById("sup_chat_color");
    if (color) color.oninput = function () { var h = document.getElementById("sup_color_hex"); if (h) h.textContent = color.value; };

    // آواتار
    var pick = document.getElementById("supAvatarPick"), inp = document.getElementById("supAvatarInput");
    if (pick && inp) {
      pick.onclick = function () { inp.click(); };
      inp.onchange = function () {
        if (!inp.files[0]) return; avatarFile = inp.files[0];
        var rd = new FileReader(); rd.onload = function () {
          var img = document.getElementById("supAvatarImg"), dz = document.querySelector("#supAvatarBox .dz-ic");
          if (img) { img.src = rd.result; img.hidden = false; } if (dz) dz.style.display = "none"; avatarData = rd.result;
        }; rd.readAsDataURL(avatarFile);
      };
    }
    var clr = document.getElementById("supAvatarClear");
    if (clr) clr.onclick = function () { avatarFile = null; avatarData = ""; var img = document.getElementById("supAvatarImg"), dz = document.querySelector("#supAvatarBox .dz-ic"); if (img) img.hidden = true; if (dz) dz.style.display = ""; };

    // ذخیره
    var saveBtn = document.querySelector("[data-save-support]");
    if (saveBtn) saveBtn.onclick = async function () {
      var out = {
        chat_title: val("sup_chat_title"), chat_welcome: val("sup_chat_welcome"),
        chat_color: val("sup_chat_color"), chat_enabled: document.getElementById("sup_chat_enabled").checked ? "1" : "0",
        ai_provider: val("sup_ai_provider"), ai_base_url: val("sup_ai_base_url"),
        ai_model: val("sup_ai_model"), ai_system_prompt: val("sup_ai_system_prompt"),
      };
      var key = val("sup_ai_api_key"); if (key) out.ai_api_key = key;
      try {
        if (avatarFile) { var up = await window.AtomAPI.upload(avatarFile); out.chat_avatar = up.url; }
        else out.chat_avatar = avatarData || "";
        await window.AtomAPI.saveSettings(out);
        toast("تنظیمات چت‌بات ذخیره شد ✓");
        var aiChip = document.getElementById("supAiState");
        if (aiChip && (key || (out.ai_api_key))) { aiChip.textContent = "فعال"; aiChip.className = "chip ok"; }
      } catch (e) { toast(e.message, true); }
    };

    // «مشاهده در سایت»
    var vw = document.querySelector("[data-open-widget]");
    if (vw) vw.onclick = function (e) { e.preventDefault(); window.open("../index.html", "_blank"); };

    // جدول سؤالات متداول (اولین جدول غیر-کارت)
    bindResource(CONFIG.faqs, findListTable());

    // گفتگوهای اخیر
    try {
      var cd = await window.AtomAPI.conversations();
      var cvT = document.getElementById("supConvos"); if (cvT) cvT.setAttribute("data-bound", "1");
      var tb = document.querySelector("#supConvos tbody");
      if (tb && cd.items && cd.items.length) {
        tb.innerHTML = cd.items.slice(0, 20).map(function (m) {
          return "<tr><td class='mono'>" + esc((m.session || "").slice(0, 10)) + "</td>" +
            "<td>" + (m.role === "user" ? chip("کاربر", "info") : chip("دستیار", "ok")) + "</td>" +
            "<td class='preview' style='max-width:360px'>" + esc((m.content || "").slice(0, 90)) + "</td>" +
            "<td>" + fa((m.created_at || "").replace("T", " ")) + "</td></tr>";
        }).join("");
        setStat(2, fa(cd.items.filter(function (m) { return m.role === "user"; }).length));
      }
    } catch (e) {}

    // آمار سؤالات
    try { var fd = await window.AtomAPI.faqs.list(); setStat(1, fa((fd.items || []).length)); } catch (e) {}
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
  function setVal(id, v) { var el = document.getElementById(id); if (el && v != null) el.value = v; }

  /* ---------- اجرا ---------- */
  (async function run() {
    var online = false;
    try { online = await window.AtomAPI.available(); } catch (e) {}
    // نشان وضعیت اتصال در تاپ‌بار: سرور واقعی یا «حالت HTML» (پایگاه دادهٔ مرورگر)
    var me = main.querySelector(".admin-user .me");
    if (me && !me.querySelector(".live-dot")) {
      var d = document.createElement("span"); d.className = "live-dot" + (online ? "" : " html-mode");
      d.title = online ? "متصل به سرور واقعی" : "حالت HTML — داده‌ها در همین مرورگر ذخیره می‌شوند";
      me.prepend(d);
    }
    if (!online && !document.querySelector(".html-mode-note")) {
      var n = document.createElement("div"); n.className = "html-mode-note";
      n.innerHTML = "حالت HTML فعال است: سرور Node در دسترس نیست و همهٔ بخش‌ها با پایگاه دادهٔ همین مرورگر کار می‌کنند. " +
        '<button type="button" class="abtn" data-demo-reset>بازنشانی دادهٔ دمو</button>';
      var bar = main.querySelector(".admin-topbar"); if (bar) bar.insertAdjacentElement("afterend", n);
      n.querySelector("[data-demo-reset]").onclick = function () {
        if (!confirm("همهٔ تغییرات حالت HTML پاک شود و داده‌های اولیه برگردد؟")) return;
        if (window.AtomDemo) window.AtomDemo.reset(); location.reload();
      };
    }
    try {
      if (CONFIG[page]) bindResource(CONFIG[page]);
      else if (page === "dashboard") await activateDashboard();
      else if (page === "loyalty") await activateLoyalty();
      else if (page === "audit") await activateAudit();
      else if (page === "security") await activateSecurity();
      else if (page === "settings") await activateSettings();
      else if (page === "flags") await activateFlags();
      else if (page === "support") await activateSupport();
    } finally {
      // فعال‌ساز سراسری (activate.js) پس از اتصال داده‌ها اجرا می‌شود
      document.dispatchEvent(new Event("atom:pages-ready"));
    }
  })();
})();
