/* اتم — پنل مدیریت: نگهبان احراز هویت + سایدبار + راه‌اندازی
   ورود همیشه از طریق AtomAPI انجام می‌شود: با بک‌اند واقعی (JWT) یا در
   «حالت HTML» با پایگاه دادهٔ مرورگر — با همان حساب‌ها و نقش‌ها. */
(function () {
  "use strict";

  var path = location.pathname.split("/").pop() || "index.html";
  var isLogin = (path === "" || path === "index.html");

  function authed() { return !!(window.AtomAPI && window.AtomAPI.isAuthed()); }

  // نگهبان: صفحات محافظت‌شده بدون ورود → بازگشت به صفحهٔ ورود
  if (!isLogin && !authed()) { location.replace("index.html"); return; }
  if (isLogin && authed()) { location.replace("dashboard.html"); return; }

  window.atomAdmin = {
    // ورود: خطا (پیام فارسی) را به فرم ورود برمی‌گرداند
    login: async function (u, p) {
      await window.AtomAPI.login(u, p);
      location.replace("dashboard.html");
      return true;
    },
    logout: async function () {
      try { await window.AtomAPI.logout(); } catch (e) {}
      location.replace("index.html");
    }
  };

  /* ---------- سایدبار موبایل (drawer) + scrim ---------- */
  function setDrawer(open) {
    var side = document.querySelector(".admin-side");
    var scrim = document.querySelector(".side-scrim");
    if (side) side.classList.toggle("open", open);
    if (scrim) scrim.hidden = !open;
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-side-toggle]")) {
      e.preventDefault();
      var side = document.querySelector(".admin-side");
      setDrawer(!(side && side.classList.contains("open")));
    }
    if (e.target.closest("[data-logout]")) {
      e.preventDefault();
      if (confirm("از حساب مدیریت خارج می‌شوید؟")) window.atomAdmin.logout();
    }
    var mk = e.target.closest("[data-mask-toggle]");
    if (mk) {
      e.preventDefault();
      var inp = mk.parentElement.querySelector("input");
      if (inp) inp.type = (inp.type === "password") ? "text" : "password";
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setDrawer(false); });

  // هشدار امنیتی راه‌اندازی: رمز پیش‌فرض مدیر یا حساب‌های نمونهٔ فعال (فقط روی سرور واقعی)
  document.addEventListener("DOMContentLoaded", async function () {
    if (isLogin || !window.AtomAPI) return;
    try {
      if (!(await window.AtomAPI.available())) return;
      var d = await window.AtomAPI.me(); var sec = d && d.security; if (!sec) return;
      if (!sec.defaultPassword && !(sec.demoAccounts || []).length) return;
      var main = document.querySelector(".admin-main"); if (!main) return;
      var box = document.createElement("div"); box.className = "sec-warn";
      var parts = [];
      if (sec.defaultPassword) parts.push('رمز مدیر کل هنوز رمز پیش‌فرض است. <a href="security.html">همین حالا تغییرش دهید</a>.');
      if ((sec.demoAccounts || []).length) parts.push('حساب‌های نمونه با رمز عمومی فعال‌اند (' + sec.demoAccounts.join("، ") + '). <button type="button" class="abtn sm" data-demo-lock>غیرفعال‌سازی حساب‌های نمونه</button>');
      box.innerHTML = "<b>⚠ پیش از راه‌اندازی عمومی:</b> " + parts.join(" ");
      var bar = main.querySelector(".admin-topbar"); if (bar) bar.insertAdjacentElement("afterend", box); else main.prepend(box);
      var lock = box.querySelector("[data-demo-lock]");
      if (lock) lock.onclick = async function () {
        if (!confirm("حساب‌های نمونه (فروشنده، دفتر و کارکنان نمونه) غیرفعال شوند؟")) return;
        try { var r = await window.AtomAPI.demoCleanup(); lock.parentNode.innerHTML = "<b>✓</b> " + r.blocked.length + " حساب نمونه غیرفعال شد."; } catch (e) { alert(e.message); }
      };
    } catch (e) {}
  });

  // نام و نقش کاربر واردشده در تاپ‌بار
  var ROLE_FA = { admin: "مدیر کل", editor: "ویرایشگر", support: "پشتیبان" };
  document.addEventListener("DOMContentLoaded", function () {
    var u = window.AtomAPI && window.AtomAPI.user && window.AtomAPI.user();
    if (u) {
      document.querySelectorAll(".admin-user .me b").forEach(function (el) { el.textContent = u.name || u.username; el.title = ROLE_FA[u.role] || u.role; });
      document.querySelectorAll(".admin-user .me .ava").forEach(function (el) { el.textContent = (u.name || u.username || "?").charAt(0); });
    }
  });
})();
