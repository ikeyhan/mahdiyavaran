/* اتم — پنل مدیریت: نگهبان احراز هویت + سایدبار + راه‌اندازی
   با بک‌اند واقعی (JWT) کار می‌کند؛ اگر بک‌اند در دسترس نباشد، حالت
   دموی محلی با اعتبارنامهٔ ثابت فعال می‌ماند تا نسخهٔ استاتیک هم کار کند. */
(function () {
  "use strict";

  var USER = "admin";              // اعتبارنامهٔ حالت دمو (میزبانی استاتیک بدون بک‌اند)
  var PASS = "atom313@";
  var SKEY = "atom_admin_session";
  var TOK  = "atom313-authorized";

  var path = location.pathname.split("/").pop() || "index.html";
  var isLogin = (path === "" || path === "index.html");

  function authed() {
    var demo = false;
    try { demo = sessionStorage.getItem(SKEY) === TOK; } catch (e) {}
    var real = window.AtomAPI && window.AtomAPI.isAuthed();
    return demo || real;
  }

  // نگهبان: صفحات محافظت‌شده بدون ورود → بازگشت به صفحهٔ ورود
  if (!isLogin && !authed()) { location.replace("index.html"); return; }
  if (isLogin && authed()) { location.replace("dashboard.html"); return; }

  window.atomAdmin = {
    // ورود: اول بک‌اند واقعی، سپس حالت دمو
    login: async function (u, p) {
      if (window.AtomAPI) {
        var online = false;
        try { online = await window.AtomAPI.available(); } catch (e) {}
        if (online) {
          try {
            await window.AtomAPI.login(u, p);
            try { sessionStorage.setItem(SKEY, TOK); } catch (e) {}
            location.replace("dashboard.html");
            return true;
          } catch (e) { return false; } // بک‌اند در دسترس بود ولی اعتبارنامه غلط
        }
      }
      // حالت دمو (بدون بک‌اند)
      if (u === USER && p === PASS) {
        try { sessionStorage.setItem(SKEY, TOK); } catch (e) {}
        location.replace("dashboard.html");
        return true;
      }
      return false;
    },
    logout: async function () {
      if (window.AtomAPI) { try { await window.AtomAPI.logout(); } catch (e) {} }
      try { sessionStorage.removeItem(SKEY); } catch (e) {}
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

  // اگر با بک‌اند وارد شده‌ایم، نام کاربر را در تاپ‌بار نشان بده
  document.addEventListener("DOMContentLoaded", function () {
    var u = window.AtomAPI && window.AtomAPI.user && window.AtomAPI.user();
    if (u && u.name) {
      document.querySelectorAll(".admin-user .me b").forEach(function (el) { el.textContent = u.username; });
    }
  });
})();
