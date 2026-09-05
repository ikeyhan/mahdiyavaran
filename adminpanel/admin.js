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

  // Mobile sidebar toggle
  document.addEventListener("click", function(e){
    var t = e.target.closest("[data-side-toggle]");
    if (t){
      var side = document.querySelector(".admin-side");
      if (side) side.classList.toggle("open");
    }
    var lo = e.target.closest("[data-logout]");
    if (lo){
      e.preventDefault();
      if (confirm("خروج از پنل مدیریت؟")) window.atomAdmin.logout();
    }
  });
})();
