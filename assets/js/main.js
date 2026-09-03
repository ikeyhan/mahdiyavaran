(function(){
  "use strict";

  var root = document.documentElement;
  var THEME_KEY = "sm-theme";

  // Inject the animated starfield layer (only visible in dark mode, via CSS)
  if(!document.querySelector(".sky")){
    var sky = document.createElement("div");
    sky.className = "sky";
    sky.setAttribute("aria-hidden", "true");
    if(document.body) document.body.insertBefore(sky, document.body.firstChild);
  }

  function syncToggleIcons(t){
    document.querySelectorAll("[data-theme-toggle] use").forEach(function(u){
      u.setAttribute("href", t === "dark" ? "#icon-moon" : "#icon-sun");
    });
  }
  function applyTheme(t){
    root.setAttribute("data-theme", t);
    localStorage.setItem(THEME_KEY, t);
    syncToggleIcons(t);
  }
  var saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  document.querySelectorAll("[data-theme-toggle]").forEach(function(btn){
    btn.addEventListener("click", function(){
      applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  });

  var drawer = document.querySelector("[data-drawer]");
  var overlay = document.querySelector("[data-drawer-overlay]");
  function setDrawer(open){
    if(!drawer) return;
    drawer.classList.toggle("open", open);
    overlay.classList.toggle("open", open);
    document.body.style.overflow = open ? "hidden" : "";
  }
  document.querySelectorAll("[data-drawer-open]").forEach(function(b){ b.addEventListener("click", function(){ setDrawer(true); }); });
  document.querySelectorAll("[data-drawer-close]").forEach(function(b){ b.addEventListener("click", function(){ setDrawer(false); }); });
  if(overlay) overlay.addEventListener("click", function(){ setDrawer(false); });

  document.querySelectorAll("[data-wish]").forEach(function(btn){
    btn.addEventListener("click", function(e){
      e.preventDefault();
      btn.classList.toggle("active");
      var use = btn.querySelector("use");
      if(use) use.setAttribute("href", btn.classList.contains("active") ? "assets/svg/icons.svg#icon-heart-filled" : "assets/svg/icons.svg#icon-heart");
    });
  });

  document.querySelectorAll("[data-tabbar]").forEach(function(bar){
    var buttons = bar.querySelectorAll("button");
    var targetSelector = bar.getAttribute("data-tabbar");
    buttons.forEach(function(b){
      b.addEventListener("click", function(){
        buttons.forEach(function(x){ x.classList.remove("active"); });
        b.classList.add("active");
        var group = document.querySelectorAll(targetSelector + " [data-tab-panel]");
        group.forEach(function(p){ p.hidden = p.getAttribute("data-tab-panel") !== b.getAttribute("data-tab"); });
      });
    });
  });

  var toTop = document.querySelector("[data-to-top]");
  window.addEventListener("scroll", function(){
    if(toTop) toTop.classList.toggle("show", window.scrollY > 480);
    var header = document.querySelector(".site-header");
    if(header) header.style.boxShadow = window.scrollY > 8 ? "0 8px 24px rgba(20,22,30,.08)" : "none";
  });
  if(toTop) toTop.addEventListener("click", function(){ window.scrollTo({top:0,behavior:"smooth"}); });

  var revealEls = document.querySelectorAll(".reveal");
  if("IntersectionObserver" in window && revealEls.length){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold:.15 });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add("in"); });
  }

  document.querySelectorAll("[data-count]").forEach(function(el){
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var started = false;
    var run = function(){
      if(started) return; started = true;
      var start = 0, dur = 1400, t0 = null;
      function step(ts){
        if(!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(start + (target - start) * eased).toLocaleString("fa-IR") + suffix;
        if(p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
    if("IntersectionObserver" in window){
      var io2 = new IntersectionObserver(function(entries){
        entries.forEach(function(en){ if(en.isIntersecting) run(); });
      }, { threshold:.4 });
      io2.observe(el);
    } else { run(); }
  });

  document.querySelectorAll("[data-dropdown]").forEach(function(dd){
    var trigger = dd.querySelector("[data-dropdown-trigger]");
    if(!trigger) return;
    trigger.addEventListener("click", function(e){
      e.stopPropagation();
      var isOpen = dd.classList.contains("open");
      document.querySelectorAll(".open[data-dropdown]").forEach(function(o){ o.classList.remove("open"); });
      dd.classList.toggle("open", !isOpen);
    });
  });
  document.addEventListener("click", function(){
    document.querySelectorAll(".open[data-dropdown]").forEach(function(o){ o.classList.remove("open"); });
  });

  var qty = document.querySelectorAll("[data-qty]");
  qty.forEach(function(box){
    var input = box.querySelector("input");
    box.querySelectorAll("[data-qty-btn]").forEach(function(b){
      b.addEventListener("click", function(){
        var v = parseInt(input.value || "1", 10);
        v = b.getAttribute("data-qty-btn") === "inc" ? v + 1 : Math.max(1, v - 1);
        input.value = v;
      });
    });
  });

})();
