/* =====================================================================
   اتم ۳۱۳ — موتور «حالت HTML» (بدون سرور)
   اگر بک‌اند Node در دسترس نباشد (باز کردن مستقیم فایل‌ها، یا میزبانی
   استاتیک)، همهٔ درخواست‌های /api به این موتور می‌رسند: یک پایگاه دادهٔ
   کامل در مرورگر (localStorage) با همان قوانین سرور — ورود، نقش‌ها،
   مالکیت، کلمات ممنوعه، اعتبارسنجی کد ملی، ثبت سفارش و …
   به این ترتیب کل سایت و پنل مدیریت حتی به‌صورت HTML خالص کار می‌کنند.
   داده‌های اولیه از assets/js/demo-seed.js (خروجی همان seed سرور) می‌آید.
   ===================================================================== */
(function () {
  "use strict";
  var KEY = "atom_demo_db_v2";
  // مسیر فایل دادهٔ اولیه کنار همین اسکریپت (فقط در حالت HTML بارگذاری می‌شود)
  var SELF = (document.currentScript && document.currentScript.src) || "";
  var seedP = null;
  function ensureSeed() {
    if (window.ATOM_DEMO_SEED) return Promise.resolve();
    if (seedP) return seedP;
    seedP = new Promise(function (resolve) {
      var sc = document.createElement("script");
      sc.src = SELF ? SELF.replace(/demo-db\.js(\?.*)?$/, "demo-seed.js") : "assets/js/demo-seed.js";
      sc.onload = sc.onerror = function () { resolve(); };
      document.head.appendChild(sc);
    });
    return seedP;
  }
  var STAFF = ["admin", "editor", "support"];

  /* ---------- ابزارها ---------- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function now() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function str(v, max) { return String(v == null ? "" : v).slice(0, max || 300); }
  function int(v, def) { var n = parseInt(v, 10); return isNaN(n) ? (def || 0) : n; }
  function isNationalCode(code) {
    code = String(code == null ? "" : code).replace(/[^0-9]/g, "");
    if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false;
    var sum = 0; for (var i = 0; i < 9; i++) sum += parseInt(code[i], 10) * (10 - i);
    var r = sum % 11, ch = parseInt(code[9], 10);
    return r < 2 ? ch === r : ch === 11 - r;
  }
  function isMobile(m) { return /^09\d{9}$/.test(String(m == null ? "" : m).replace(/[^0-9]/g, "")); }
  function HttpError(status, msg, data) { var e = new Error(msg); e.status = status; e.data = data || { error: msg }; return e; }

  /* ---------- ذخیره‌سازی ---------- */
  var mem = null;
  function db() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { mem = null; }
    if (!mem || !mem.t) { mem = { t: clone(window.ATOM_DEMO_SEED || {}) }; persist(); }
    return mem;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); }
    catch (e) { throw HttpError(507, "فضای ذخیره‌سازی مرورگر پر است. تصاویر کوچک‌تری انتخاب کنید یا دادهٔ دمو را بازنشانی کنید."); }
  }
  function T(name) { var d = db(); if (!d.t[name]) d.t[name] = []; return d.t[name]; }
  function nextId(name) { var m = 0; T(name).forEach(function (r) { if (+r.id > m) m = +r.id; }); return m + 1; }
  function insert(name, row) { row.id = nextId(name); if (!row.created_at) row.created_at = now(); T(name).push(row); persist(); return row; }
  function byId(name, id) { id = +id; return T(name).filter(function (r) { return +r.id === id; })[0] || null; }
  function setting(k, def) { var r = T("settings").filter(function (x) { return x.key === k; })[0]; return r ? r.value : def; }
  function setSetting(k, v) {
    var r = T("settings").filter(function (x) { return x.key === k; })[0];
    if (r) r.value = String(v); else T("settings").push({ key: k, value: String(v) });
  }

  /* ---------- امنیت ---------- */
  function bannedWord() {
    var list = T("banned_words").filter(function (w) { return w.status === "active"; })
      .map(function (w) { return String(w.word || "").trim().toLowerCase(); }).filter(Boolean);
    for (var i = 0; i < arguments.length; i++) {
      var t = String(arguments[i] == null ? "" : arguments[i]).toLowerCase(); if (!t) continue;
      for (var j = 0; j < list.length; j++) if (t.indexOf(list[j]) !== -1) return list[j];
    }
    return null;
  }
  function guardBanned() {
    var w = bannedWord.apply(null, arguments);
    if (w) throw HttpError(400, "متن شامل کلمهٔ غیرمجاز «" + w + "» است. لطفاً آن را اصلاح کنید.");
  }
  function userFrom(headers) {
    var h = (headers && (headers.Authorization || headers.authorization)) || "";
    var tok = h.indexOf("Bearer ") === 0 ? h.slice(7) : "";
    if (tok.indexOf("demo.") !== 0) return null;
    var u = T("admins").filter(function (a) { return a.username === tok.slice(5); })[0];
    return u || null;
  }
  function need(user) {
    if (!user) throw HttpError(401, "برای دسترسی باید وارد شوید.");
    if (user.status !== "active") throw HttpError(403, "حساب شما غیرفعال یا مسدود است.");
    return user;
  }
  function needRole(user, roles) {
    need(user);
    if (roles.indexOf(user.role) === -1) throw HttpError(403, "برای این عملیات دسترسی کافی ندارید.");
    return user;
  }
  function log(actor, action, target) {
    T("activity_log").push({ id: nextId("activity_log"), actor: actor || "ناشناس", action: action, target: target || "", ip: "مرورگر (حالت HTML)", created_at: now() });
    var a = T("activity_log"); if (a.length > 300) a.splice(0, a.length - 300);
  }
  function pubUser(a) {
    var u = { id: a.id, username: a.username, name: a.name, role: a.role, email: a.email };
    if (a.seller_name) u.seller_name = a.seller_name;
    if (a.office_name) u.office_name = a.office_name;
    if (a.phone) u.phone = a.phone;
    return u;
  }

  /* ---------- تعریف منابع (همسان با backend/src/routes/resources.js) ---------- */
  var INT = { price: 1, stock: 1, amount: 1, total_spent: 1, orders_count: 1, count: 1, rating: 1, sales: 1, used: 1, quota: 1, sort: 1, verified: 1 };
  var R = {
    "products": { t: "products", label: "محصول", w: ["admin", "editor", "seller"], owner: "owner", inject: { seller: "seller_name" }, banned: ["title", "description"] },
    "orders": { t: "orders", label: "سفارش", w: ["admin", "support"] },
    "customers": { t: "customers", label: "مشتری", w: ["admin", "support"] },
    "categories": { t: "categories", label: "دسته‌بندی", w: ["admin", "editor"] },
    "sellers": { t: "sellers", label: "فروشنده", w: ["admin", "seller"], owner: "owner", banned: ["name", "bio"] },
    "offers": { t: "offers", label: "تخفیف", w: ["admin", "editor"] },
    "comments": { t: "comments", label: "نظر", w: ["admin", "support", "editor"] },
    "messages": { t: "messages", label: "پیام", w: ["admin", "support"] },
    "faqs": { t: "faqs", label: "سؤال متداول", w: ["admin", "editor", "support"] },
    "slides": { t: "slides", label: "اسلاید", w: ["admin", "editor"] },
    "banned-words": { t: "banned_words", label: "کلمهٔ ممنوعه", w: ["admin"] },
    "ads": { t: "ads", label: "تبلیغ", w: ["admin", "editor"] },
    "offices": {
      t: "offices", label: "دفتر محله", w: ["admin", "office"], owner: "owner", ownerRole: "office", banned: ["name", "manager", "bio"],
      derive: function (d, u, ex) {
        if (u.role === "office") { d.status = ex ? ex.status : "pending"; d.verify_note = ex ? ex.verify_note : ""; }
        d.verified = d.status === "verified" ? 1 : 0;
      },
      validate: function (d) {
        if (d.national_code && String(d.national_code).trim() && !isNationalCode(d.national_code)) return "کد ملی واردشده نامعتبر است. لطفاً یک کد ملی معتبر ۱۰ رقمی وارد کنید.";
        if (d.phone && String(d.phone).trim() && !isMobile(d.phone)) return "شمارهٔ موبایل نامعتبر است (نمونهٔ درست: 09xxxxxxxxx).";
        return null;
      },
    },
    "office-services": { t: "office_services", label: "خدمت دفتر", w: ["admin", "office"], owner: "owner", ownerRole: "office", inject: { office: "office_name" }, banned: ["title", "description"] },
    "office-messages": {
      t: "office_messages", label: "پیام دفتر", w: ["admin", "office"], owner: "owner", ownerRole: "office", banned: ["reply"],
      derive: function (d, u, ex) { if (u.role === "office" && d.reply && String(d.reply).trim() && (!ex || !ex.reply)) d.status = "replied"; },
    },
  };
  function columns(t) {
    var seed = (window.ATOM_DEMO_SEED && window.ATOM_DEMO_SEED[t]) || T(t);
    var row = seed[0] || T(t)[0] || {};
    return Object.keys(row).filter(function (k) { return k !== "id" && k !== "created_at"; });
  }
  function clean(t, body, existing) {
    var out = {};
    columns(t).forEach(function (c) {
      var v = body[c];
      if (v == null) { out[c] = existing ? existing[c] : (INT[c] ? 0 : ""); return; }
      out[c] = INT[c] ? int(v, 0) : str(v, c === "body" || c === "description" ? 200000 : 4000);
    });
    return out;
  }
  function ownerScoped(cfg, u) { return cfg.owner && u.role === (cfg.ownerRole || "seller"); }

  function resource(cfg, method, id, q, body, u) {
    need(u);
    if (STAFF.indexOf(u.role) === -1 && !ownerScoped(cfg, u)) throw HttpError(403, "به این بخش دسترسی ندارید.");
    var rows = T(cfg.t);
    if (method === "GET" && !id) {
      var list = rows.slice();
      if (q.status) list = list.filter(function (r) { return r.status === q.status; });
      if (ownerScoped(cfg, u)) list = list.filter(function (r) { return r[cfg.owner] === u.username; });
      var hasSort = columns(cfg.t).indexOf("sort") !== -1;
      list.sort(function (a, b) { return hasSort && (a.sort - b.sort) ? a.sort - b.sort : b.id - a.id; });
      var total = list.length, lim = Math.min(int(q.limit, 50), 200), off = int(q.offset, 0);
      return { items: clone(list.slice(off, off + lim)), total: total };
    }
    var ex = id ? byId(cfg.t, id) : null;
    if (id && !ex) throw HttpError(404, "یافت نشد.");
    if (ex && ownerScoped(cfg, u) && ex[cfg.owner] !== u.username) throw HttpError(403, "به این مورد دسترسی ندارید.");
    if (method === "GET") return { item: clone(ex) };
    if (cfg.w.indexOf(u.role) === -1) throw HttpError(403, "برای این عملیات دسترسی کافی ندارید.");
    if (method === "DELETE") {
      rows.splice(rows.indexOf(ex), 1);
      log(u.username, "حذف " + cfg.label, ex[columns(cfg.t)[0]] || ("#" + id)); persist();
      return { ok: true };
    }
    var data = clean(cfg.t, body || {}, ex);
    if (cfg.banned) guardBanned.apply(null, cfg.banned.map(function (k) { return data[k]; }));
    if (ownerScoped(cfg, u)) {
      data[cfg.owner] = u.username;
      if (!ex && cfg.inject) Object.keys(cfg.inject).forEach(function (c) { data[c] = u[cfg.inject[c]] || u.name || u.username; });
    }
    if (cfg.derive) cfg.derive(data, u, ex);
    if (cfg.validate) { var err = cfg.validate(data, ex); if (err) throw HttpError(400, err); }
    if (method === "POST") {
      var row = insert(cfg.t, data);
      log(u.username, "افزودن " + cfg.label, data[columns(cfg.t)[0]]); persist();
      return { id: row.id, __status: 201 };
    }
    Object.keys(data).forEach(function (k) { ex[k] = data[k]; });
    log(u.username, "ویرایش " + cfg.label, data[columns(cfg.t)[0]] || ("#" + id)); persist();
    return { ok: true };
  }

  /* ---------- باشگاه مشتریان ---------- */
  var TIERS = [
    { key: "platinum", name: "پلاتینیوم", min: 400000000 }, { key: "gold", name: "طلایی", min: 150000000 },
    { key: "silver", name: "نقره‌ای", min: 50000000 }, { key: "bronze", name: "برنزی", min: 0 },
  ];
  function tierOf(t) { for (var i = 0; i < TIERS.length; i++) if (t >= TIERS[i].min) return TIERS[i]; return TIERS[3]; }

  /* ---------- پاسخ آفلاین چت‌بات: نزدیک‌ترین سؤال متداول ---------- */
  function faqReply(text) {
    var words = String(text || "").replace(/[؟?!.,،]/g, " ").split(/\s+/).filter(function (w) { return w.length > 2; });
    var best = null, score = 0;
    T("faqs").filter(function (f) { return f.status === "active"; }).forEach(function (f) {
      var hay = (f.question + " " + f.answer); var s = 0;
      words.forEach(function (w) { if (hay.indexOf(w) !== -1) s++; });
      if (s > score) { score = s; best = f; }
    });
    return best && score > 0 ? best.answer : null;
  }

  /* ---------- مسیریاب ---------- */
  function route(method, path, body, headers) {
    var qs = {}, qi = path.indexOf("?");
    if (qi !== -1) { path.slice(qi + 1).split("&").forEach(function (p) { var kv = p.split("="); if (kv[0]) qs[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ""); }); path = path.slice(0, qi); }
    path = path.replace(/^\/api/, "").replace(/\/+$/, "");
    var seg = path.split("/").filter(Boolean);
    var u = userFrom(headers);
    body = body || {};

    if (path === "/health") return { ok: true, name: "atom-demo", demo: true };

    /* ----- احراز هویت ----- */
    if (seg[0] === "auth") {
      if (seg[1] === "login" && method === "POST") {
        var un = str(body.username, 60).trim(), pw = str(body.password, 200);
        if (!un || !pw) throw HttpError(400, "نام کاربری و رمز عبور را وارد کنید.");
        var a = T("admins").filter(function (x) { return x.username === un || x.username === un.toLowerCase(); })[0];
        var ok = !!(a && a.status === "active" && a.password && a.password === pw);
        T("login_attempts").push({ id: nextId("login_attempts"), username: un, ip: "مرورگر", success: ok ? 1 : 0, created_at: now() });
        if (!ok) { persist(); throw HttpError(401, "نام کاربری یا رمز عبور اشتباه است."); }
        a.last_login = now(); log(a.username, "ورود", "ورود موفق"); persist();
        return { token: "demo." + a.username, user: pubUser(a) };
      }
      if ((seg[1] === "register" || seg[1] === "register-office" || seg[1] === "register-customer") && method === "POST") {
        if (setting("registration", "1") === "0") throw HttpError(403, "ثبت‌نام حساب جدید موقتاً غیرفعال است.");
        var kind = seg[1] === "register" ? "seller" : seg[1] === "register-office" ? "office" : "customer";
        var username = str(body.username, 60).trim().toLowerCase(), password = str(body.password, 200);
        var phone = str(body.phone, 20).trim();
        if (kind === "seller" && (!str(body.seller_name).trim() || !username || !password)) throw HttpError(400, "نام فروشگاه، نام کاربری و رمز عبور الزامی است.");
        if (kind === "office" && (!str(body.office_name).trim() || !username || !password || !str(body.manager).trim() || !str(body.national_code).trim())) throw HttpError(400, "نام دفتر، مسئول، کد ملی، نام کاربری و رمز عبور الزامی است.");
        if (kind === "customer" && (!str(body.name).trim() || !username || !password || !phone)) throw HttpError(400, "نام، موبایل، نام کاربری و رمز عبور الزامی است.");
        if (password.length < 6) throw HttpError(400, "رمز عبور باید حداقل ۶ کاراکتر باشد.");
        if (!/^[a-zA-Z0-9_.]{3,}$/.test(username)) throw HttpError(400, "نام کاربری فقط حروف و عدد انگلیسی و حداقل ۳ کاراکتر باشد.");
        if (kind === "office" && !isNationalCode(body.national_code)) throw HttpError(400, "کد ملی واردشده نامعتبر است. لطفاً یک کد ملی معتبر وارد کنید.");
        if ((kind === "customer" || phone) && !isMobile(phone)) throw HttpError(400, "شمارهٔ موبایل نامعتبر است (نمونهٔ درست: 09xxxxxxxxx).");
        guardBanned(body.name, body.seller_name, body.office_name, body.manager, username);
        if (T("admins").some(function (x) { return x.username === username; })) throw HttpError(409, "این نام کاربری قبلاً ثبت شده است.");
        var acc = { username: username, password: password, name: str(body.name || body.manager || body.seller_name || body.office_name, 120), email: str(body.email, 160), role: kind, status: "active", phone: phone };
        if (kind === "seller") acc.seller_name = str(body.seller_name, 120).trim();
        if (kind === "office") acc.office_name = str(body.office_name, 160).trim();
        insert("admins", acc);
        if (kind === "seller") insert("sellers", { name: acc.seller_name, category: str(body.category, 120) || "فروشگاه", city: str(body.city, 60), rating: 5, sales: 0, status: "active", bio: "", avatar: "", phone: phone, owner: username });
        if (kind === "office") insert("offices", { name: acc.office_name, manager: str(body.manager, 120), area: str(body.area, 120), city: str(body.city, 60), address: str(body.address, 300), phone: phone, national_code: str(body.national_code, 12), license_no: str(body.license_no, 60), bio: "", avatar: "", owner: username, verified: 0, status: "pending", verify_note: "", rating: 5 });
        if (kind === "customer") insert("customers", { name: acc.name, phone: phone, email: acc.email, city: str(body.city, 60), total_spent: 0, orders_count: 0 });
        log(username, kind === "seller" ? "ثبت‌نام فروشنده" : kind === "office" ? "ثبت‌نام دفتر محله" : "ثبت‌نام مشتری", acc.seller_name || acc.office_name || acc.name);
        persist();
        return { token: "demo." + username, user: pubUser(acc), __status: 201 };
      }
      if (seg[1] === "me") { need(u); return { user: pubUser(u) }; }
      if (seg[1] === "logout") { if (u) { log(u.username, "خروج", "خروج از حساب"); persist(); } return { ok: true }; }
      if (seg[1] === "change-password") {
        need(u);
        if (str(body.next).length < 8) throw HttpError(400, "رمز جدید باید حداقل ۸ کاراکتر باشد.");
        if (u.password !== str(body.current, 200)) throw HttpError(400, "رمز فعلی نادرست است.");
        u.password = str(body.next, 200); log(u.username, "تغییر رمز", "رمز عبور خود را تغییر داد"); persist();
        return { ok: true };
      }
    }

    /* ----- عمومی سایت ----- */
    if (seg[0] === "public") {
      if (seg[1] === "slides") return { items: clone(T("slides").filter(function (s) { return s.status === "active"; }).sort(function (a, b) { return (a.sort - b.sort) || (a.id - b.id); })) };
      if (seg[1] === "ads") {
        var ads = T("ads").filter(function (s) { return s.status === "active"; }).sort(function (a, b) { return (a.sort - b.sort) || (a.id - b.id); });
        return { top: clone(ads.filter(function (a) { return a.placement === "top"; })), corner: clone(ads.filter(function (a) { return a.placement === "corner"; })) };
      }
      if (seg[1] === "offices") return { items: clone(T("offices").filter(function (o) { return o.status === "verified"; }).sort(function (a, b) { return (b.rating - a.rating) || (b.id - a.id); })).map(function (o) { delete o.national_code; delete o.license_no; delete o.verify_note; delete o.owner; return o; }) };
      if (seg[1] === "office-services") {
        var oo = qs.office_id ? byId("offices", qs.office_id) : null;
        if (qs.office_id && (!oo || oo.status !== "verified")) return { items: [] };
        return { items: clone(T("office_services").filter(function (s) { return s.status === "active" && (!oo || s.owner === oo.owner); })).map(function (s) { delete s.owner; return s; }) };
      }
      if (seg[1] === "sellers") return { items: clone(T("sellers").filter(function (s) { return s.status === "active"; }).sort(function (a, b) { return (b.sales - a.sales) || (b.id - a.id); })) };
      if (seg[1] === "products") return { items: clone(T("products").filter(function (p) { return p.status === "active"; }).sort(function (a, b) { return b.id - a.id; })) };
      if (seg[1] === "office-message" && method === "POST") {
        var oid = int(body.office_id, 0), text = str(body.body, 4000).trim();
        if (!oid || !text) throw HttpError(400, "انتخاب دفتر و متن پیام الزامی است.");
        var nm = str(body.name, 120).trim() || "شهروند";
        guardBanned(nm, text);
        var of = byId("offices", oid);
        if (!of || of.status !== "verified") throw HttpError(404, "دفتر یافت نشد یا هنوز تأیید نشده است.");
        insert("office_messages", { owner: of.owner || "", office: of.name, sender_name: nm, sender_phone: str(body.phone, 20), body: text, reply: "", status: "open" });
        return { ok: true, __status: 201 };
      }
      if (seg[1] === "order" && method === "POST") return placeOrder(body, u);
      if (seg[1] === "comments") return { items: clone(T("comments").filter(function (c) { return c.status === "approved" && (!qs.product || c.product === qs.product); }).sort(function (a, b) { return b.id - a.id; })) };
      if (seg[1] === "comment" && method === "POST") {
        var au = str(body.author, 120).trim(), pr = str(body.product, 200).trim(), tx = str(body.body, 2000).trim();
        if (!au || !pr || tx.length < 5) throw HttpError(400, "نام، محصول و متن نظر (حداقل ۵ نویسه) الزامی است.");
        guardBanned(au, tx);
        insert("comments", { author: au, product: pr, body: tx, rating: Math.max(1, Math.min(5, int(body.rating, 5))), status: "pending" });
        return { ok: true, __status: 201 };
      }
      if (seg[1] === "offer") { var of2 = findOffer(qs.code); if (!of2) throw HttpError(404, "کد تخفیف نامعتبر یا منقضی است."); return { code: of2.code, title: of2.title, kind: of2.kind, amount: of2.amount }; }
      if (seg[1] === "track" ) {
        var code = str(qs.code, 40).trim(), ph = str(qs.phone, 20).trim();
        if (!code || !ph) throw HttpError(400, "کد سفارش و موبایل را وارد کنید.");
        var rows = T("orders").filter(function (o) { return String(o.code) === code && o.phone === ph; });
        if (!rows.length) throw HttpError(404, "سفارشی با این مشخصات یافت نشد.");
        return { items: clone(rows) };
      }
    }
    if (seg[0] === "my" && seg[1] === "profile") {
      need(u);
      if (method === "GET") { var pu = pubUser(u); pu.city = u.city || ""; pu.address = u.address || ""; pu.created_at = u.created_at; return { user: pu }; }
      var nph = str(body.phone, 20).trim() || u.phone || "";
      if (nph && !isMobile(nph)) throw HttpError(400, "شمارهٔ موبایل نامعتبر است (نمونهٔ درست: 09xxxxxxxxx).");
      var em = str(body.email, 160).trim();
      if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) throw HttpError(400, "ایمیل نامعتبر است.");
      guardBanned(body.name, body.address);
      var oldPh = u.phone;
      u.name = str(body.name, 120).trim() || u.name; u.email = em; u.phone = nph; u.city = str(body.city, 60).trim(); u.address = str(body.address, 600).trim();
      if (u.role === "customer" && oldPh) T("customers").forEach(function (c) { if (c.phone === oldPh) { c.name = u.name; c.email = u.email; c.city = u.city; c.phone = u.phone; } });
      log(u.username, "ویرایش پروفایل", u.username); persist();
      var ru = pubUser(u); ru.city = u.city; ru.address = u.address; return { ok: true, user: ru };
    }
    if (seg[0] === "my" && (seg[1] === "seller-orders" || seg[1] === "seller-comments")) {
      needRole(u, ["seller"]);
      var shop = u.seller_name || u.name || "";
      if (seg[1] === "seller-comments") {
        var titles = T("products").filter(function (p) { return p.owner === u.username; }).map(function (p) { return p.title; });
        var wd = function (t) { return String(t || "").split(/\s+/).filter(function (w) { return w.length > 1; }); };
        return { items: clone(T("comments").filter(function (c) {
          return (c.status === "approved" || c.status === "pending") && (titles.some(function (t) { return t === c.product || t.indexOf(c.product) !== -1 || (wd(c.product).length > 1 && wd(c.product).every(function (w) { return t.indexOf(w) !== -1; })); }) || (shop && String(c.product || "").indexOf(shop) !== -1));
        }).sort(function (a, b) { return b.id - a.id; })) };
      }
      if (method === "GET") return { items: clone(T("orders").filter(function (o) { return o.seller === shop; }).sort(function (a, b) { return b.id - a.id; })) };
      var so = byId("orders", seg[2]);
      if (!so || so.seller !== shop) throw HttpError(404, "سفارش یافت نشد.");
      var nx = String(body.status || ""), al = { pending: ["shipping"], review: ["shipping"], shipping: ["delivered"] };
      if ((al[so.status] || []).indexOf(nx) === -1) throw HttpError(400, "تغییر وضعیت مجاز نیست.");
      so.status = nx; log(u.username, "به‌روزرسانی سفارش", "#" + so.code + " → " + nx); persist();
      return { ok: true };
    }
    if (seg[0] === "my" && seg[1] === "orders") {
      need(u);
      var mine = T("orders").filter(function (o) { return o.owner === u.username || (u.phone && o.phone === u.phone); }).sort(function (a, b) { return b.id - a.id; });
      return { items: clone(mine) };
    }
    if (seg[0] === "settings" && seg[1] === "public") {
      var keys = ["site_name", "site_title", "domain", "maintenance", "registration", "online_payment", "contact_email", "contact_phone", "address", "social_instagram", "social_telegram", "social_whatsapp", "social_linkedin", "site_description", "shipping_cost", "free_shipping_min", "min_order"];
      var o = {}; T("settings").forEach(function (s) { if (keys.indexOf(s.key) !== -1) o[s.key] = s.value; }); return { settings: o };
    }
    if (seg[0] === "articles" && seg[1] === "public") {
      return { items: clone(T("articles").filter(function (a) { return a.status === "published"; }).sort(function (a, b) { return b.id - a.id; })) };
    }
    if (seg[0] === "support") {
      if (seg[1] === "config") return {
        enabled: setting("chat_enabled", "1") === "1", title: setting("chat_title", "پشتیبان سایت"), welcome: setting("chat_welcome", ""),
        avatar: setting("chat_avatar", ""), color: setting("chat_color", "#149B3E"), aiEnabled: false,
        faqs: clone(T("faqs").filter(function (f) { return f.status === "active"; }).sort(function (a, b) { return (a.sort - b.sort) || (a.id - b.id); })).map(function (f) { return { id: f.id, question: f.question, answer: f.answer }; }),
      };
      if (seg[1] === "chat" && method === "POST") {
        var msgs = Array.isArray(body.messages) ? body.messages : [];
        var last = msgs.filter(function (m) { return m && m.role === "user"; }).slice(-1)[0];
        if (!last) throw HttpError(400, "پیامی ارسال نشد.");
        guardBanned(last.content);
        var ans = faqReply(last.content);
        var session = str(body.session, 80) || ("s-" + Date.now());
        T("chat_messages").push({ id: nextId("chat_messages"), session: session, role: "user", content: str(last.content, 4000), created_at: now() });
        if (ans) { T("chat_messages").push({ id: nextId("chat_messages"), session: session, role: "assistant", content: ans, created_at: now() }); persist(); return { reply: ans, session: session }; }
        persist();
        throw HttpError(503, "no_key", { error: "no_key", reply: "پاسخ دقیقی در سؤالات متداول پیدا نکردم. لطفاً از گزینهٔ «پیام به پشتیبانی» استفاده کنید تا همکاران ما پاسخ دهند." });
      }
      if (seg[1] === "message" && method === "POST") {
        var snd = str(body.sender, 200).trim() || "کاربر سایت", sub = str(body.subject, 200).trim() || "پیام از ویجت پشتیبانی", bd = str(body.body, 4000).trim();
        if (!bd) throw HttpError(400, "متن پیام را وارد کنید.");
        guardBanned(snd, sub, bd);
        insert("messages", { sender: snd, subject: sub, body: bd, status: "open" });
        return { ok: true, __status: 201 };
      }
      if (seg[1] === "conversations") { needRole(u, STAFF); return { items: clone(T("chat_messages").slice(-100).reverse()) }; }
    }

    /* ----- پنل مدیریت ----- */
    if (seg[0] === "stats") {
      needRole(u, STAFF);
      var ord = T("orders"), cnt = function (t) { return T(t).length; };
      var byStatus = {}; ord.forEach(function (o) { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
      return {
        revenue: ord.filter(function (o) { return o.status === "delivered" || o.status === "shipping"; }).reduce(function (s, o) { return s + (+o.amount || 0); }, 0),
        orders: cnt("orders"), customers: cnt("customers"), products: cnt("products"), sellers: cnt("sellers"),
        categories: cnt("categories"), articles: cnt("articles"),
        published: T("articles").filter(function (a) { return a.status === "published"; }).length,
        pendingComments: T("comments").filter(function (c) { return c.status === "pending"; }).length,
        openMessages: T("messages").filter(function (m) { return m.status === "open"; }).length,
        recentOrders: clone(ord.slice().sort(function (a, b) { return b.id - a.id; }).slice(0, 5)),
        ordersByStatus: Object.keys(byStatus).map(function (k) { return { status: k, c: byStatus[k] }; }),
      };
    }
    if (seg[0] === "activity") { needRole(u, STAFF); return { items: clone(T("activity_log").slice().reverse().slice(0, Math.min(int(qs.limit, 50), 200))) }; }
    if (seg[0] === "logins") { needRole(u, STAFF); return { items: clone(T("login_attempts").slice().reverse().slice(0, 50)) }; }
    if (seg[0] === "loyalty") {
      needRole(u, STAFF);
      var counts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
      var members = T("customers").slice().sort(function (a, b) { return b.total_spent - a.total_spent; }).map(function (c) {
        var t = tierOf(c.total_spent); counts[t.key]++; return { id: c.id, name: c.name, total_spent: c.total_spent, tier: t.key, tierName: t.name };
      });
      return { tiers: TIERS, counts: counts, members: members };
    }
    if (seg[0] === "settings") {
      needRole(u, STAFF);
      if (seg[1] === "flags") {
        if (!seg[2]) return { items: clone(T("feature_flags")) };
        needRole(u, ["admin"]);
        var f = T("feature_flags").filter(function (x) { return x.key === seg[2]; })[0];
        if (!f) throw HttpError(404, "فلگ یافت نشد.");
        f.enabled = body.enabled ? 1 : 0; log(u.username, "تغییر فیچرفلگ", f.name + " → " + (f.enabled ? "روشن" : "خاموش")); persist();
        return { ok: true };
      }
      if (method === "GET") {
        var all = {}; T("settings").forEach(function (s) { all[s.key] = s.value; });
        all.ai_api_key_set = all.ai_api_key ? "1" : "0"; all.ai_api_key = "";
        return { settings: all };
      }
      needRole(u, ["admin"]);
      Object.keys(body).forEach(function (k) {
        if (k === "ai_api_key_set" || (k === "ai_api_key" && !String(body[k] || "").trim())) return;
        setSetting(str(k, 60), str(body[k], 200000));
      });
      log(u.username, "تغییر تنظیمات", Object.keys(body).length + " کلید به‌روزرسانی شد"); persist();
      return { ok: true };
    }
    if (seg[0] === "admins") {
      needRole(u, ["admin"]);
      var ROLES = ["admin", "editor", "support"], ST = ["active", "suspended", "blocked"];
      var ad = T("admins");
      if (method === "GET") return { items: clone(ad.filter(function (a) { return STAFF.indexOf(a.role) !== -1; })).map(function (a) { delete a.password; return a; }) };
      if (method === "POST" && !seg[1]) {
        var nu = str(body.username, 60).trim();
        if (!nu || !body.password) throw HttpError(400, "نام کاربری و رمز عبور الزامی است.");
        if (ad.some(function (a) { return a.username === nu; })) throw HttpError(409, "این نام کاربری قبلاً ثبت شده است.");
        var r = insert("admins", { username: nu, password: str(body.password, 200), name: str(body.name, 120), email: str(body.email, 160), role: ROLES.indexOf(body.role) !== -1 ? body.role : "support", status: "active" });
        log(u.username, "ساخت مدیر", "کاربر «" + nu + "» را ایجاد کرد"); persist();
        return { id: r.id, __status: 201 };
      }
      var tgt = byId("admins", seg[1]); if (!tgt) throw HttpError(404, "مدیر یافت نشد.");
      if (seg[2] === "status") {
        if (tgt.role === "admin" && body.status !== "active") throw HttpError(400, "نمی‌توان مدیر کل را مسدود کرد.");
        tgt.status = ST.indexOf(body.status) !== -1 ? body.status : "active"; persist(); return { ok: true };
      }
      if (method === "PUT") {
        tgt.name = str(body.name, 120) || tgt.name; tgt.email = str(body.email, 160) || tgt.email;
        if (ROLES.indexOf(body.role) !== -1) tgt.role = body.role;
        if (ST.indexOf(body.status) !== -1) tgt.status = body.status;
        if (body.password) tgt.password = str(body.password, 200);
        log(u.username, "ویرایش مدیر", "کاربر «" + tgt.username + "» را ویرایش کرد"); persist(); return { ok: true };
      }
      if (method === "DELETE") {
        if (tgt.id === u.id) throw HttpError(400, "نمی‌توانید حساب خودتان را حذف کنید.");
        if (tgt.role === "admin" && ad.filter(function (a) { return a.role === "admin"; }).length <= 1) throw HttpError(400, "حداقل یک مدیر کل باید باقی بماند.");
        ad.splice(ad.indexOf(tgt), 1); log(u.username, "حذف مدیر", "کاربر «" + tgt.username + "» را حذف کرد"); persist(); return { ok: true };
      }
    }
    if (seg[0] === "articles") {
      needRole(u, STAFF);
      var arts = T("articles");
      if (method === "GET" && !seg[1]) return { items: clone(arts.filter(function (a) { return !qs.status || a.status === qs.status; }).sort(function (a, b) { return b.id - a.id; })) };
      if (method === "GET") { var ga = byId("articles", seg[1]); if (!ga) throw HttpError(404, "مقاله یافت نشد."); return { item: clone(ga) }; }
      needRole(u, ["admin", "editor"]);
      var title = str(body.title, 300).trim();
      function slug(t) { return String(t || "").trim().replace(/\s+/g, "-").slice(0, 80) || "article"; }
      if (method === "POST") {
        if (!title) throw HttpError(400, "عنوان مقاله الزامی است.");
        var st = body.status === "published" ? "published" : "draft";
        var na = insert("articles", { title: title, slug: str(body.slug, 100).trim() || slug(title), category: str(body.category, 80), author: str(body.author, 120) || u.name, excerpt: str(body.excerpt, 600), cover: str(body.cover, 400000), body: str(body.body, 200000), status: st, views: 0, updated_at: now() });
        log(u.username, st === "published" ? "انتشار مقاله" : "ذخیره پیش‌نویس", "«" + title + "»"); persist();
        return { id: na.id, __status: 201 };
      }
      var art = byId("articles", seg[1]); if (!art) throw HttpError(404, "مقاله یافت نشد.");
      if (method === "PUT") {
        art.title = title || art.title; art.slug = str(body.slug, 100).trim() || art.slug; art.category = str(body.category, 80) || art.category;
        art.author = str(body.author, 120) || art.author; art.excerpt = str(body.excerpt, 600); art.cover = str(body.cover, 400000);
        art.body = str(body.body, 200000); if (body.status === "published" || body.status === "draft") art.status = body.status; art.updated_at = now();
        log(u.username, "ویرایش مقاله", "«" + art.title + "»"); persist(); return { ok: true };
      }
      if (method === "DELETE") { arts.splice(arts.indexOf(art), 1); log(u.username, "حذف مقاله", "«" + art.title + "»"); persist(); return { ok: true }; }
    }
    if (R[seg[0]]) return resource(R[seg[0]], method, seg[1], qs, body, u);

    throw HttpError(404, "مسیر API یافت نشد.");
  }

  /* ---------- ثبت سفارش (سبد خرید) — همسان با backend/src/routes/public.js ---------- */
  function numSetting(k, d) { var n = parseInt(String(setting(k, d)).replace(/[^0-9]/g, ""), 10); return isNaN(n) ? d : n; }
  function findOffer(code) {
    code = str(code, 40).replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }).trim().toUpperCase(); if (!code) return null;
    var o = T("offers").filter(function (x) { return String(x.code).toUpperCase() === code; })[0];
    if (!o || o.status !== "active" || (o.quota > 0 && o.used >= o.quota)) return null;
    return o;
  }
  function placeOrder(body, u) {
    var items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
    var name = str(body.name, 120).trim(), phone = str(body.phone, 20).trim(), address = str(body.address, 600).trim(), city = str(body.city, 60).trim();
    if (!items.length) throw HttpError(400, "سبد خرید خالی است.");
    if (!name || !address) throw HttpError(400, "نام گیرنده و آدرس کامل را وارد کنید.");
    if (!isMobile(phone)) throw HttpError(400, "شمارهٔ موبایل نامعتبر است (نمونهٔ درست: 09xxxxxxxxx).");
    guardBanned(name, address, body.note);
    var lines = items.map(function (it) {
      var qty = Math.max(1, Math.min(99, int(it.qty, 1)));
      var p = /^\d+$/.test(String(it.id || "")) ? T("products").filter(function (x) { return +x.id === +it.id && x.status === "active"; })[0] : null;
      var price = p ? +p.price : Math.max(0, int(it.price, 0));
      return { qty: qty, price: price, title: p ? p.title : str(it.title, 300), seller: (p && p.seller) || str(it.seller, 120) || "اتم ۳۱۳", amount: qty * price };
    });
    var subtotal = lines.reduce(function (s, l) { return s + l.amount; }, 0);
    var minOrder = numSetting("min_order", 0);
    if (subtotal < minOrder) throw HttpError(400, "حداقل مبلغ سفارش " + minOrder.toLocaleString("fa-IR") + " تومان است.");
    var offer = body.coupon ? findOffer(body.coupon) : null;
    if (body.coupon && !offer) throw HttpError(400, "کد تخفیف نامعتبر یا منقضی است.");
    var discount = offer ? (offer.kind === "percent" ? Math.round(subtotal * Math.min(100, offer.amount) / 100) : Math.min(subtotal, +offer.amount)) : 0;
    var afterDisc = subtotal - discount;
    var shipping = afterDisc >= numSetting("free_shipping_min", 500000) ? 0 : numSetting("shipping_cost", 0);
    var total = afterDisc + shipping, left = discount;
    lines.forEach(function (l, i) { var share = i === lines.length - 1 ? left : Math.round(discount * l.amount / (subtotal || 1)); l.amount -= share; left -= share; });
    var note = [offer ? "کد تخفیف " + offer.code + " (−" + discount + " ت)" : "", shipping ? "هزینهٔ ارسال " + shipping + " ت" : "ارسال رایگان", str(body.note, 300)].filter(Boolean).join(" · ");
    var maxCode = 1000; T("orders").forEach(function (o) { var c = int(o.code, 0); if (c > maxCode) maxCode = c; });
    var code = String(maxCode + 1);
    lines.forEach(function (l, i) {
      insert("orders", { code: code, customer: name, product: l.title + (l.qty > 1 ? " ×" + l.qty : ""), seller: l.seller, amount: l.amount + (i === 0 ? shipping : 0), status: "pending", phone: phone, address: address + (city ? "، " + city : ""), owner: u ? u.username : "", note: note });
    });
    if (offer) offer.used = (+offer.used || 0) + 1;
    var c = T("customers").filter(function (x) { return x.phone === phone; })[0];
    if (c) { c.orders_count = (+c.orders_count || 0) + 1; c.total_spent = (+c.total_spent || 0) + total; }
    else insert("customers", { name: name, phone: phone, email: "", city: city, total_spent: total, orders_count: 1 });
    log(name, "ثبت سفارش", "#" + code); persist();
    return { ok: true, code: code, subtotal: subtotal, discount: discount, shipping: shipping, total: total, __status: 201 };
  }

  /* ---------- آپلود فایل: تبدیل به data URL فشرده ---------- */
  function fileToDataURL(file) {
    return new Promise(function (resolve, reject) {
      var rd = new FileReader();
      rd.onerror = function () { reject(HttpError(400, "خواندن فایل ممکن نشد.")); };
      rd.onload = function () {
        if (!/^image\//.test(file.type) || /svg/.test(file.type)) return resolve(rd.result);
        var img = new Image();
        img.onload = function () {
          var max = 1100, w = img.width, h = img.height, s = Math.min(1, max / Math.max(w, h));
          var cv = document.createElement("canvas"); cv.width = Math.round(w * s); cv.height = Math.round(h * s);
          cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
          try { resolve(cv.toDataURL("image/jpeg", 0.82)); } catch (e) { resolve(rd.result); }
        };
        img.onerror = function () { resolve(rd.result); };
        img.src = rd.result;
      };
      rd.readAsDataURL(file);
    });
  }

  /* ---------- پاسخ شبیه fetch ---------- */
  function respond(status, data) {
    return {
      ok: status >= 200 && status < 300, status: status, headers: { get: function () { return "application/json"; } },
      json: function () { return Promise.resolve(clone(data)); },
      text: function () { return Promise.resolve(JSON.stringify(data)); },
    };
  }
  async function request(url, opts) {
    opts = opts || {};
    await ensureSeed();
    var method = (opts.method || "GET").toUpperCase();
    var path = String(url).replace(/^https?:\/\/[^/]+/, "");
    try {
      if (/^\/api\/uploads\/?$/.test(path) && method === "POST") {
        need(userFrom(opts.headers || {}));
        var file = opts.body && opts.body.get ? opts.body.get("file") : null;
        if (!file) throw HttpError(400, "فایلی انتخاب نشده است.");
        var dataUrl = await fileToDataURL(file);
        return respond(201, { url: dataUrl, name: file.name, size: file.size });
      }
      var body = null;
      if (opts.body && typeof opts.body === "string") { try { body = JSON.parse(opts.body); } catch (e) { body = {}; } }
      var out = route(method, path, body, opts.headers || {});
      var st = out && out.__status ? out.__status : 200;
      if (out && out.__status) delete out.__status;
      return respond(st, out);
    } catch (e) {
      if (e && e.status) return respond(e.status, e.data || { error: e.message });
      console.error(e);
      return respond(500, { error: "خطای داخلی حالت HTML." });
    }
  }

  /* ---------- تشخیص سرور واقعی (یک‌بار در هر صفحه) ---------- */
  var onlineP = null;
  function online() {
    if (onlineP) return onlineP;
    if (location.protocol === "file:") return (onlineP = Promise.resolve(false));
    onlineP = (async function () {
      try {
        var c = new AbortController(); var to = setTimeout(function () { c.abort(); }, 2000);
        var r = await fetch("/api/health", { signal: c.signal, cache: "no-store" }); clearTimeout(to);
        if (!r.ok) return false;
        var d = await r.json().catch(function () { return null; });
        return !!(d && d.ok);
      } catch (e) { return false; }
    })();
    return onlineP;
  }

  // fetch هوشمند: اگر سرور هست همان fetch واقعی، وگرنه موتور حالت HTML
  window.atomFetch = async function (url, opts) {
    var isApi = /^(https?:\/\/[^/]+)?\/api(\/|$)/.test(String(url));
    if (!isApi) return fetch(url, opts);
    if (await online()) return fetch(url, opts);
    return request(url, opts);
  };

  window.AtomDemo = {
    online: online,
    request: request,
    isNationalCode: isNationalCode,
    isMobile: isMobile,
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} mem = null; },
    table: function (name) { return clone(T(name)); },
  };
})();
