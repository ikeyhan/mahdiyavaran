/* اتم — Admin Panel: auth guard + sidebar + shared helpers
   NOTE: This is client-side auth for a static demo. For production use,
   move authentication to a real backend with hashed passwords and sessions. */
(function(){
  "use strict";

  var USER = "admin";
  var PASS = "atom313@";
  var SKEY = "atom_admin_session";
  var TOK  = "atom313-authorized";

  // Determine if current page is the login page
  var path = location.pathname.split("/").pop() || "index.html";
  var isLogin = (path === "" || path === "index.html");
  var authed  = (sessionStorage.getItem(SKEY) === TOK);

  // Guard: block all non-login pages when not authed
  if (!isLogin && !authed) {
    location.replace("index.html");
    return;
  }
  // If already logged in, don't sit on the login page
  if (isLogin && authed) {
    location.replace("dashboard.html");
    return;
  }

  // Expose login/logout for the login page + sidebar
  window.atomAdmin = {
    login: function(u, p){
      if (u === USER && p === PASS){
        sessionStorage.setItem(SKEY, TOK);
        location.replace("dashboard.html");
        return true;
      }
      return false;
    },
    logout: function(){
      sessionStorage.removeItem(SKEY);
      location.replace("index.html");
    }
  };

  // Mobile sidebar drawer + scrim
  function setDrawer(open){
    var side  = document.querySelector(".admin-side");
    var scrim = document.querySelector(".side-scrim");
    if (side)  side.classList.toggle("open", open);
    if (scrim) scrim.hidden = !open;
  }
  document.addEventListener("click", function(e){
    var t = e.target.closest("[data-side-toggle]");
    if (t){
      e.preventDefault();
      var side = document.querySelector(".admin-side");
      var isOpen = side && side.classList.contains("open");
      setDrawer(!isOpen);
    }
    var lo = e.target.closest("[data-logout]");
    if (lo){
      e.preventDefault();
      if (confirm("از حساب مدیریت خارج می‌شوید؟")) window.atomAdmin.logout();
    }
    // reveal/mask sensitive key fields
    var mk = e.target.closest("[data-mask-toggle]");
    if (mk){
      e.preventDefault();
      var inp = mk.parentElement.querySelector("input");
      if (inp) inp.type = (inp.type === "password") ? "text" : "password";
    }
  });
  // Close drawer with Escape
  document.addEventListener("keydown", function(e){ if (e.key === "Escape") setDrawer(false); });
})();
