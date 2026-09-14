/* =====================================================================
   اتم ۳۱۳ — کلاینت احراز هویت و API سمت سایت (ورود/ثبت‌نام فروشنده،
   بارگذاری محصول، پروفایل فروشگاه). با همان بک‌اند پنل کار می‌کند.
   ===================================================================== */
(function () {
  "use strict";
  var TK = "atom_token", UK = "atom_user";
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }

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

  window.SiteAuth = {
    available: available,
    token: function () { return get(TK); },
    user: function () { try { return JSON.parse(get(UK) || "null"); } catch (e) { return null; } },
    isAuthed: function () { return !!get(TK); },
    isSeller: function () { var u = this.user(); return !!(u && u.role === "seller"); },

    login: async function (username, password) {
      var d = await api("/auth/login", { method: "POST", body: { username: username, password: password } });
      set(TK, d.token); set(UK, JSON.stringify(d.user)); return d.user;
    },
    register: async function (payload) {
      var d = await api("/auth/register", { method: "POST", body: payload });
      set(TK, d.token); set(UK, JSON.stringify(d.user)); return d.user;
    },
    logout: async function () { try { await api("/auth/logout", { method: "POST" }); } catch (e) {} set(TK, null); set(UK, null); },
    me: function () { return api("/auth/me"); },
    upload: function (file) { var fd = new FormData(); fd.append("file", file); return api("/uploads", { method: "POST", body: fd }); },

    products: {
      list: function () { return api("/products?limit=200"); },
      create: function (d) { return api("/products", { method: "POST", body: d }); },
      update: function (id, d) { return api("/products/" + id, { method: "PUT", body: d }); },
      remove: function (id) { return api("/products/" + id, { method: "DELETE" }); },
    },
    myShop: async function () {
      var d = await api("/sellers?limit=5"); // نقش seller فقط فروشگاه خودش را می‌بیند
      return (d.items && d.items[0]) || null;
    },
    updateShop: function (id, d) { return api("/sellers/" + id, { method: "PUT", body: d }); },
  };
})();
