/* =====================================================================
   اتم ۳۱۳ — کلاینت احراز هویت و API سمت سایت
   با بک‌اند واقعی (Express) کار می‌کند؛ و اگر بک‌اند در دسترس نباشد
   (باز کردن مستقیم فایل یا میزبانی استاتیک) به «حالت دمو» محلی
   برمی‌گردد تا ورود، پنل فروشنده، بارگذاری محصول و پروفایل کار کنند.
   ===================================================================== */
(function () {
  "use strict";
  var TK = "atom_token", UK = "atom_user", MK = "atom_mode";
  var PKEY = "atom_demo_products", SKEY = "atom_demo_shop", UKEY = "atom_demo_users";
  var OKEY = "atom_demo_office", OSKEY = "atom_demo_oservices", OMKEY = "atom_demo_omessages";

  // اعتبارسنجی کد ملی ایران (همان الگوریتم سرور — برای حالت دمو)
  function isNationalCode(code) {
    code = String(code == null ? "" : code).replace(/[^0-9]/g, "");
    if (!/^\d{10}$/.test(code)) return false;
    if (/^(\d)\1{9}$/.test(code)) return false;
    var sum = 0; for (var i = 0; i < 9; i++) sum += parseInt(code[i], 10) * (10 - i);
    var r = sum % 11, ch = parseInt(code[9], 10);
    return (r < 2) ? (ch === r) : (ch === (11 - r));
  }
  function isMobile(m) { return /^09\d{9}$/.test(String(m == null ? "" : m).replace(/[^0-9]/g, "")); }

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  function loadJSON(k, def) { try { return JSON.parse(get(k) || "null") || def; } catch (e) { return def; } }
  function saveJSON(k, v) { set(k, JSON.stringify(v)); }
  function isDemo() { return get(MK) === "demo"; }

  async function api(path, opts) {
    opts = opts || {};
    var headers = opts.headers || {};
    var isForm = opts.body instanceof FormData;
    if (!isForm && opts.body) headers["Content-Type"] = "application/json";
    var t = get(TK); if (t) headers["Authorization"] = "Bearer " + t;
    var res = await fetch("/api" + path, {
      method: opts.method || "GET", headers: headers,
      body: isForm ? opts.body : (opts.body ? JSON.stringify(opts.body) : undefined),
    });
    var data = null; try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error((data && data.error) || ("خطای سرور (" + res.status + ")"));
    return data;
  }

  async function available() {
    try {
      var c = new AbortController(); var to = setTimeout(function () { c.abort(); }, 1500);
      var r = await fetch("/api/health", { signal: c.signal }); clearTimeout(to);
      return r.ok;
    } catch (e) { return false; }
  }

  /* ---------- دادهٔ نمونهٔ حالت دمو ---------- */
  var DEMO_USERS = {
    atra: { password: "atra1234", user: { id: 1, username: "atra", role: "seller", name: "فروشگاه آترا چرم", seller_name: "آترا چرم" } },
  };
  function demoUsers() { return loadJSON(UKEY, {}); }
  function seedDemo(user) {
    if (!loadJSON(SKEY, null)) saveJSON(SKEY, {
      id: 1, name: user.seller_name || user.name || "فروشگاه من",
      category: "چرم و پوشاک", city: "تهران", phone: "", avatar: "",
      bio: "این فروشگاه در حالت دمو (بدون بک‌اند) نمایش داده می‌شود.",
    });
    if (!loadJSON(PKEY, null)) saveJSON(PKEY, [
      { id: 1, title: "کیف چرم طبیعی مدل رویا", category: "کیف", price: 2450000, stock: 12, status: "active", image: "assets/img/products/leather-bag-roya.jpg", description: "" },
      { id: 2, title: "کمربند چرم دست‌دوز", category: "کمربند", price: 680000, stock: 30, status: "active", image: "", description: "" },
      { id: 3, title: "کیف‌پول چرم جیبی", category: "کیف‌پول", price: 420000, stock: 45, status: "active", image: "", description: "" },
    ]);
  }

  window.SiteAuth = {
    available: available,
    isDemo: isDemo,
    token: function () { return get(TK); },
    user: function () { try { return JSON.parse(get(UK) || "null"); } catch (e) { return null; } },
    isAuthed: function () { return !!get(TK); },
    isSeller: function () { var u = this.user(); return !!(u && u.role === "seller"); },

    login: async function (username, password) {
      if (await available()) {
        var d = await api("/auth/login", { method: "POST", body: { username: username, password: password } });
        set(TK, d.token); set(UK, JSON.stringify(d.user)); set(MK, "online"); return d.user;
      }
      // حالت دمو (آفلاین)
      var du = DEMO_USERS[username] || demoUsers()[username];
      if (!du || du.password !== password)
        throw new Error("نام کاربری یا رمز عبور اشتباه است. (سرور در دسترس نیست — حالت دمو)");
      set(TK, "demo-token"); set(UK, JSON.stringify(du.user)); set(MK, "demo"); seedDemo(du.user);
      return du.user;
    },

    register: async function (payload) {
      if (await available()) {
        var d = await api("/auth/register", { method: "POST", body: payload });
        set(TK, d.token); set(UK, JSON.stringify(d.user)); set(MK, "online"); return d.user;
      }
      // حالت دمو (آفلاین)
      if (!payload.seller_name || !payload.username || !payload.password)
        throw new Error("نام فروشگاه، نام کاربری و رمز عبور الزامی است.");
      if (payload.password.length < 6) throw new Error("رمز عبور باید حداقل ۶ کاراکتر باشد.");
      var users = demoUsers();
      if (DEMO_USERS[payload.username] || users[payload.username])
        throw new Error("این نام کاربری قبلاً ثبت شده است.");
      var user = { id: Date.now(), username: payload.username, role: "seller", name: payload.name || payload.seller_name, seller_name: payload.seller_name };
      users[payload.username] = { password: payload.password, user: user }; saveJSON(UKEY, users);
      set(TK, "demo-token"); set(UK, JSON.stringify(user)); set(MK, "demo");
      saveJSON(SKEY, { id: 1, name: payload.seller_name, category: payload.category || "فروشگاه", city: payload.city || "", phone: payload.phone || "", bio: "", avatar: "" });
      saveJSON(PKEY, []);
      return user;
    },

    logout: async function () {
      if (!isDemo()) { try { await api("/auth/logout", { method: "POST" }); } catch (e) {} }
      set(TK, null); set(UK, null); set(MK, null);
    },
    me: function () { return api("/auth/me"); },

    upload: function (file) {
      if (isDemo()) return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res({ url: r.result }); }; r.readAsDataURL(file); });
      var fd = new FormData(); fd.append("file", file); return api("/uploads", { method: "POST", body: fd });
    },

    products: {
      list: function () {
        if (isDemo()) return Promise.resolve({ items: loadJSON(PKEY, []) });
        return api("/products?limit=200");
      },
      create: function (d) {
        if (isDemo()) { var a = loadJSON(PKEY, []); d.id = Date.now(); d.price = +d.price || 0; d.stock = +d.stock || 0; a.unshift(d); saveJSON(PKEY, a); return Promise.resolve({ id: d.id }); }
        return api("/products", { method: "POST", body: d });
      },
      update: function (id, d) {
        if (isDemo()) { var a = loadJSON(PKEY, []).map(function (x) { return x.id == id ? Object.assign({}, x, d, { price: +d.price || 0, stock: +d.stock || 0 }) : x; }); saveJSON(PKEY, a); return Promise.resolve({ ok: true }); }
        return api("/products/" + id, { method: "PUT", body: d });
      },
      remove: function (id) {
        if (isDemo()) { saveJSON(PKEY, loadJSON(PKEY, []).filter(function (x) { return x.id != id; })); return Promise.resolve({ ok: true }); }
        return api("/products/" + id, { method: "DELETE" });
      },
    },
    myShop: async function () {
      if (isDemo()) return loadJSON(SKEY, null);
      var d = await api("/sellers?limit=5"); return (d.items && d.items[0]) || null;
    },
    updateShop: function (id, d) {
      if (isDemo()) { saveJSON(SKEY, Object.assign({}, loadJSON(SKEY, {}), d)); return Promise.resolve({ ok: true }); }
      return api("/sellers/" + id, { method: "PUT", body: d });
    },

    /* ---------- دفاتر محلات ---------- */
    isOffice: function () { var u = this.user(); return !!(u && u.role === "office"); },
    validateNationalCode: isNationalCode,

    registerOffice: async function (payload) {
      // اعتبارسنجی سمت کلاینت
      if (!payload.office_name || !payload.username || !payload.password || !payload.manager || !payload.national_code)
        throw new Error("نام دفتر، مسئول، کد ملی، نام کاربری و رمز عبور الزامی است.");
      if (!isNationalCode(payload.national_code)) throw new Error("کد ملی واردشده نامعتبر است.");
      if (payload.phone && !isMobile(payload.phone)) throw new Error("شمارهٔ موبایل نامعتبر است (نمونه: 09xxxxxxxxx).");
      if (await available()) {
        var d = await api("/auth/register-office", { method: "POST", body: payload });
        set(TK, d.token); set(UK, JSON.stringify(d.user)); set(MK, "online"); return d.user;
      }
      // حالت دمو
      if (payload.password.length < 6) throw new Error("رمز عبور باید حداقل ۶ کاراکتر باشد.");
      var users = demoUsers();
      if (users[payload.username]) throw new Error("این نام کاربری قبلاً ثبت شده است.");
      var user = { id: Date.now(), username: payload.username, role: "office", name: payload.manager || payload.office_name, office_name: payload.office_name };
      users[payload.username] = { password: payload.password, user: user }; saveJSON(UKEY, users);
      set(TK, "demo-token"); set(UK, JSON.stringify(user)); set(MK, "demo");
      saveJSON(OKEY, { id: 1, name: payload.office_name, manager: payload.manager, area: payload.area || "", city: payload.city || "", address: payload.address || "", phone: payload.phone || "", national_code: payload.national_code, license_no: payload.license_no || "", verified: 0, status: "pending", verify_note: "", bio: "" });
      saveJSON(OSKEY, []);
      return user;
    },
    myOffice: async function () {
      if (isDemo()) return loadJSON(OKEY, null);
      var d = await api("/offices?limit=5"); return (d.items && d.items[0]) || null;
    },
    updateOffice: function (id, d) {
      if (isDemo()) { var o = Object.assign({}, loadJSON(OKEY, {}), d); o.status = (loadJSON(OKEY, {}) || {}).status || "pending"; o.verified = o.status === "verified" ? 1 : 0; saveJSON(OKEY, o); return Promise.resolve({ ok: true }); }
      return api("/offices/" + id, { method: "PUT", body: d });
    },
    officeServices: {
      list: function () { if (isDemo()) return Promise.resolve({ items: loadJSON(OSKEY, []) }); return api("/office-services?limit=200"); },
      create: function (d) { if (isDemo()) { var a = loadJSON(OSKEY, []); d.id = Date.now(); d.price = +d.price || 0; a.unshift(d); saveJSON(OSKEY, a); return Promise.resolve({ id: d.id }); } return api("/office-services", { method: "POST", body: d }); },
      update: function (id, d) { if (isDemo()) { saveJSON(OSKEY, loadJSON(OSKEY, []).map(function (x) { return x.id == id ? Object.assign({}, x, d, { price: +d.price || 0 }) : x; })); return Promise.resolve({ ok: true }); } return api("/office-services/" + id, { method: "PUT", body: d }); },
      remove: function (id) { if (isDemo()) { saveJSON(OSKEY, loadJSON(OSKEY, []).filter(function (x) { return x.id != id; })); return Promise.resolve({ ok: true }); } return api("/office-services/" + id, { method: "DELETE" }); },
    },

    /* ---------- گفتگوی دفاتر محلات (پیام شهروندان ↔ دفتر) ---------- */
    // فهرست/پاسخ پیام‌ها برای حساب دفتر واردشده
    officeMessages: {
      list: function () { if (isDemo()) return Promise.resolve({ items: loadJSON(OMKEY, []) }); return api("/office-messages?limit=200"); },
      update: function (id, d) {
        if (isDemo()) {
          saveJSON(OMKEY, loadJSON(OMKEY, []).map(function (x) {
            if (x.id != id) return x;
            var n = Object.assign({}, x, d);
            if (d.reply && String(d.reply).trim() && !x.reply) n.status = "replied";
            return n;
          }));
          return Promise.resolve({ ok: true });
        }
        return api("/office-messages/" + id, { method: "PUT", body: d });
      },
      remove: function (id) { if (isDemo()) { saveJSON(OMKEY, loadJSON(OMKEY, []).filter(function (x) { return x.id != id; })); return Promise.resolve({ ok: true }); } return api("/office-messages/" + id, { method: "DELETE" }); },
    },
    // ارسال پیام عمومی شهروند به یک دفتر (بدون نیاز به ورود)
    sendOfficeMessage: async function (payload) {
      if (!payload || !payload.office_id || !String(payload.body || "").trim())
        throw new Error("انتخاب دفتر و متن پیام الزامی است.");
      if (await available()) {
        return api("/public/office-message", { method: "POST", body: payload });
      }
      // حالت دمو — پیام در همین مرورگر ذخیره می‌شود
      var a = loadJSON(OMKEY, []);
      a.unshift({ id: Date.now(), office: payload.office_name || "", sender_name: payload.name || "شهروند", sender_phone: payload.phone || "", body: payload.body, reply: "", status: "open", created_at: new Date().toISOString().slice(0, 16).replace("T", " ") });
      saveJSON(OMKEY, a);
      return { ok: true, demo: true };
    },
  };
})();
