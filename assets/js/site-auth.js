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
  };
})();
