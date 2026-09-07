/* =====================================================================
   اتم — کلاینت API پنل مدیریت
   با بک‌اند واقعی (Express+SQLite) کار می‌کند؛ اگر بک‌اند در دسترس نباشد
   (مثلاً میزبانی استاتیک)، حالت دموی محلی فعال می‌ماند.
   ===================================================================== */
(function () {
  "use strict";
  var TOKEN_KEY = "atom_token";
  var USER_KEY = "atom_user";

  function token() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
  function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  function setUser(u) { try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch (e) {} }
  function getUser() { try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch (e) { return null; } }

  var _online = null; // نتیجه‌ی کش‌شده‌ی در دسترس بودن بک‌اند

  async function req(path, opts) {
    opts = opts || {};
    var headers = opts.headers || {};
    if (!(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";
    var t = token();
    if (t) headers["Authorization"] = "Bearer " + t;
    var res = await fetch("/api" + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body instanceof FormData ? opts.body : (opts.body ? JSON.stringify(opts.body) : undefined),
    });
    var data = null;
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401) { // توکن منقضی/نامعتبر
      setToken(null); setUser(null);
      if (!/index\.html$|\/adminpanel\/?$/.test(location.pathname)) location.replace("index.html");
    }
    if (!res.ok) throw new Error((data && data.error) || ("خطای سرور (" + res.status + ")"));
    return data;
  }

  async function available() {
    if (_online !== null) return _online;
    try {
      var c = new AbortController();
      var to = setTimeout(function () { c.abort(); }, 1500);
      var res = await fetch("/api/health", { signal: c.signal });
      clearTimeout(to);
      _online = res.ok;
    } catch (e) { _online = false; }
    return _online;
  }

  window.AtomAPI = {
    available: available,
    token: token,
    user: getUser,
    isAuthed: function () { return !!token(); },

    login: async function (username, password) {
      var d = await req("/auth/login", { method: "POST", body: { username: username, password: password } });
      setToken(d.token); setUser(d.user);
      return d.user;
    },
    logout: async function () {
      try { await req("/auth/logout", { method: "POST" }); } catch (e) {}
      setToken(null); setUser(null);
    },
    me: function () { return req("/auth/me"); },
    changePassword: function (current, next) { return req("/auth/change-password", { method: "POST", body: { current: current, next: next } }); },

    // آپلود تصویر → { url, size, name }
    upload: async function (file) {
      var fd = new FormData(); fd.append("file", file);
      return req("/uploads", { method: "POST", body: fd });
    },

    // منابع
    articles: crud("/articles"),
    products: crud("/products"),
    orders: crud("/orders"),
    customers: crud("/customers"),
    admins: crud("/admins"),
    categories: crud("/categories"),
    sellers: crud("/sellers"),
    offers: crud("/offers"),
    comments: crud("/comments"),
    messages: crud("/messages"),
    resource: function (name) { return crud("/" + name); },

    articlesPublic: function () { return req("/articles/public"); },
    stats: function () { return req("/stats"); },
    activity: function (limit) { return req("/activity?limit=" + (limit || 50)); },
    logins: function () { return req("/logins"); },
    loyalty: function () { return req("/loyalty"); },
    settings: function () { return req("/settings"); },
    saveSettings: function (obj) { return req("/settings", { method: "PUT", body: obj }); },
    flags: function () { return req("/settings/flags"); },
    setFlag: function (key, enabled) { return req("/settings/flags/" + encodeURIComponent(key), { method: "PUT", body: { enabled: enabled } }); },
  };

  function crud(base) {
    return {
      list: function (q) { return req(base + (q ? "?" + q : "")); },
      get: function (id) { return req(base + "/" + id); },
      create: function (data) { return req(base, { method: "POST", body: data }); },
      update: function (id, data) { return req(base + "/" + id, { method: "PUT", body: data }); },
      remove: function (id) { return req(base + "/" + id, { method: "DELETE" }); },
    };
  }
})();
