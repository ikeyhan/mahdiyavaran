/* =====================================================================
   اتم ۳۱۳ — کلاینت احراز هویت و API سمت سایت
   همهٔ درخواست‌ها از atomFetch می‌گذرند: اگر بک‌اند Node در دسترس باشد
   به سرور واقعی می‌روند؛ وگرنه «حالت HTML» (assets/js/demo-db.js) با همان
   قوانین پاسخ می‌دهد. بنابراین ورود، ثبت‌نام، پنل فروشنده، پنل دفتر،
   سبد خرید و ثبت سفارش در هر دو حالت کامل کار می‌کنند.
   ===================================================================== */
(function () {
  "use strict";
  var TK = "atom_token", UK = "atom_user", MK = "atom_mode";

  function isNationalCode(code) {
    code = String(code == null ? "" : code).replace(/[^0-9]/g, "");
    if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false;
    var sum = 0; for (var i = 0; i < 9; i++) sum += parseInt(code[i], 10) * (10 - i);
    var r = sum % 11, ch = parseInt(code[9], 10);
    return r < 2 ? ch === r : ch === 11 - r;
  }
  function toEn(s) { return String(s == null ? "" : s).replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }); }
  function isMobile(m) { return /^09\d{9}$/.test(toEn(m).replace(/[^0-9]/g, "")); }

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  var doFetch = window.atomFetch || window.fetch.bind(window);

  async function api(path, opts) {
    opts = opts || {};
    var headers = opts.headers || {};
    var isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
    if (!isForm && opts.body) headers["Content-Type"] = "application/json";
    var t = get(TK); if (t) headers["Authorization"] = "Bearer " + t;
    var res;
    try {
      res = await doFetch("/api" + path, {
        method: opts.method || "GET", headers: headers,
        body: isForm ? opts.body : (opts.body ? JSON.stringify(opts.body) : undefined),
      });
    } catch (e) { throw new Error("ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید."); }
    var data = null; try { data = await res.json(); } catch (e) {}
    if (res.status === 401 && t && path.indexOf("/auth/") !== 0) { set(TK, null); set(UK, null); }
    if (!res.ok) throw new Error((data && data.error) || ("خطای سرور (" + res.status + ")"));
    return data;
  }
  async function available() { return window.AtomDemo ? window.AtomDemo.online() : true; }
  async function remember(d) {
    set(TK, d.token); set(UK, JSON.stringify(d.user));
    set(MK, (await available()) ? "online" : "demo");
    return d.user;
  }
  function crud(base) {
    return {
      list: function (q) { return api(base + "?limit=200" + (q ? "&" + q : "")); },
      create: function (d) { return api(base, { method: "POST", body: d }); },
      update: function (id, d) { return api(base + "/" + id, { method: "PUT", body: d }); },
      remove: function (id) { return api(base + "/" + id, { method: "DELETE" }); },
    };
  }

  window.SiteAuth = {
    api: api,
    available: available,
    isDemo: function () { return get(MK) === "demo"; },
    token: function () { return get(TK); },
    user: function () { try { return JSON.parse(get(UK) || "null"); } catch (e) { return null; } },
    isAuthed: function () { return !!get(TK); },
    isSeller: function () { var u = this.user(); return !!(u && u.role === "seller"); },
    isOffice: function () { var u = this.user(); return !!(u && u.role === "office"); },
    isCustomer: function () { var u = this.user(); return !!(u && u.role === "customer"); },
    isStaff: function () { var u = this.user(); return !!(u && ["admin", "editor", "support"].indexOf(u.role) !== -1); },
    validateNationalCode: isNationalCode,
    isNationalCode: isNationalCode,
    isMobile: isMobile,
    // مسیر پنل مناسب هر نقش
    home: function () {
      var u = this.user(); if (!u) return "login.html";
      return u.role === "seller" ? "seller-dashboard.html" : u.role === "office" ? "office-dashboard.html" :
        ["admin", "editor", "support"].indexOf(u.role) !== -1 ? "adminpanel/index.html" : "dashboard.html";
    },

    login: async function (username, password) {
      return remember(await api("/auth/login", { method: "POST", body: { username: String(username || "").trim(), password: password } }));
    },
    register: async function (payload) {
      if (!payload.seller_name || !payload.username || !payload.password) throw new Error("نام فروشگاه، نام کاربری و رمز عبور الزامی است.");
      if (payload.phone && !isMobile(payload.phone)) throw new Error("شمارهٔ موبایل نامعتبر است (نمونه: 09xxxxxxxxx).");
      if (payload.phone) payload.phone = toEn(payload.phone);
      return remember(await api("/auth/register", { method: "POST", body: payload }));
    },
    registerOffice: async function (payload) {
      if (!payload.office_name || !payload.username || !payload.password || !payload.manager || !payload.national_code)
        throw new Error("نام دفتر، مسئول، کد ملی، نام کاربری و رمز عبور الزامی است.");
      if (!isNationalCode(payload.national_code)) throw new Error("کد ملی واردشده نامعتبر است.");
      if (payload.phone && !isMobile(payload.phone)) throw new Error("شمارهٔ موبایل نامعتبر است (نمونه: 09xxxxxxxxx).");
      payload.national_code = toEn(payload.national_code); if (payload.phone) payload.phone = toEn(payload.phone);
      return remember(await api("/auth/register-office", { method: "POST", body: payload }));
    },
    registerCustomer: async function (payload) {
      if (!payload.name || !payload.phone || !payload.username || !payload.password) throw new Error("نام، موبایل، نام کاربری و رمز عبور الزامی است.");
      if (!isMobile(payload.phone)) throw new Error("شمارهٔ موبایل نامعتبر است (نمونه: 09xxxxxxxxx).");
      payload.phone = toEn(payload.phone);
      return remember(await api("/auth/register-customer", { method: "POST", body: payload }));
    },
    logout: async function () {
      try { await api("/auth/logout", { method: "POST" }); } catch (e) {}
      set(TK, null); set(UK, null); set(MK, null);
    },
    me: function () { return api("/auth/me"); },
    changePassword: function (current, next) { return api("/auth/change-password", { method: "POST", body: { current: current, next: next } }); },

    upload: function (file) { var fd = new FormData(); fd.append("file", file); return api("/uploads", { method: "POST", body: fd }); },

    /* فروشنده */
    products: crud("/products"),
    myShop: async function () { var d = await api("/sellers?limit=5"); return (d.items && d.items[0]) || null; },
    updateShop: function (id, d) { return api("/sellers/" + id, { method: "PUT", body: d }); },

    /* دفتر محله */
    myOffice: async function () { var d = await api("/offices?limit=5"); return (d.items && d.items[0]) || null; },
    updateOffice: function (id, d) { return api("/offices/" + id, { method: "PUT", body: d }); },
    officeServices: crud("/office-services"),
    officeMessages: crud("/office-messages"),
    sendOfficeMessage: function (payload) {
      if (!payload || !payload.office_id || !String(payload.body || "").trim()) return Promise.reject(new Error("انتخاب دفتر و متن پیام الزامی است."));
      if (payload.phone && !isMobile(payload.phone)) return Promise.reject(new Error("شمارهٔ موبایل نامعتبر است (نمونه: 09xxxxxxxxx)."));
      if (payload.phone) payload.phone = toEn(payload.phone);
      return api("/public/office-message", { method: "POST", body: payload });
    },

    /* خرید */
    placeOrder: function (payload) { if (payload.phone) payload.phone = toEn(payload.phone); return api("/public/order", { method: "POST", body: payload }); },
    trackOrder: function (code, phone) { return api("/public/track?code=" + encodeURIComponent(toEn(code).trim()) + "&phone=" + encodeURIComponent(toEn(phone).trim())); },
    myOrders: function () { return api("/my/orders"); },
    profile: function () { return api("/my/profile"); },
    sellerOrders: function () { return api("/my/seller-orders"); },
    setSellerOrder: function (id, status) { return api("/my/seller-orders/" + id, { method: "PUT", body: { status: status } }); },
    sellerComments: function () { return api("/my/seller-comments"); },
    saveProfile: async function (d) {
      if (d.phone) d.phone = toEn(d.phone);
      var r = await api("/my/profile", { method: "PUT", body: d });
      if (r && r.user) { var u = this.user() || {}; ["name", "email", "phone", "city", "address"].forEach(function (k) { u[k] = r.user[k]; }); set(UK, JSON.stringify(u)); }
      return r;
    },

    /* دادهٔ عمومی */
    publicGet: function (path) { return api("/public/" + path); },
    publicSettings: function () { return api("/settings/public"); },
    articles: function () { return api("/articles/public"); },
    supportMessage: function (d) { return api("/support/message", { method: "POST", body: d }); },
  };
})();
