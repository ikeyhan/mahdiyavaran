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
  function revealShow(el){ el.classList.add("in"); }
  if("IntersectionObserver" in window && revealEls.length){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ revealShow(en.target); io.unobserve(en.target); }
      });
    }, { threshold:0, rootMargin:"0px 0px -8% 0px" });
    revealEls.forEach(function(el){ io.observe(el); });
    // شبکهٔ ایمنی: هیچ بخشی نباید نامرئی بماند (رفع فضای خالی «بهم‌ریخته»)
    setTimeout(function(){ revealEls.forEach(revealShow); }, 1400);
  } else {
    revealEls.forEach(revealShow);
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

/* ============ ویجت پشتیبانی و چت‌بات اتم ============ */
(function () {
  "use strict";
  if (document.querySelector(".atom-support")) return;

  var API = "/api";
  var cfg = {
    enabled: true, title: "پشتیبان سایت", welcome:
      "سلام! 👋 من دستیار پشتیبانی اتم هستم. می‌توانید یکی از سؤالات متداول را انتخاب کنید، با هوش مصنوعی گفتگو کنید، یا برای ما پیام بگذارید.",
    avatar: "", color: "#149B3E", aiEnabled: false,
    faqs: [
      { question: "چطور سفارش خود را پیگیری کنم؟", answer: "از بخش «داشبورد › سفارش‌های من» وضعیت و کد رهگیری سفارش را می‌بینید." },
      { question: "روش‌های پرداخت کدام‌اند؟", answer: "پرداخت آنلاین (زرین‌پال و بانک ملت)، کیف پول اتم و در برخی شهرها پرداخت در محل." },
      { question: "شرایط مرجوعی کالا چیست؟", answer: "تا ۷ روز پس از دریافت، در صورت سالم بودن کالا امکان مرجوعی و بازگشت وجه هست." },
      { question: "هزینه و زمان ارسال چقدر است؟", answer: "ارسال ۲ تا ۴ روز کاری؛ برای خرید بالای ۵۰۰ هزار تومان رایگان." }
    ]
  };
  var online = false, session = "s-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  var history = [];

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function linkify(s){ return esc(s).replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>'); }

  var HEADSET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><path d="M4 13a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2z"/><path d="M20 13a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2z"/><path d="M20 15v1a4 4 0 0 1-4 4h-3"/><circle cx="12" cy="20" r="1.2" fill="currentColor" stroke="none"/></svg>';
  var SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 13L21 3M21 3l-6.5 18a.5.5 0 0 1-.93.06L11 13 3.9 9.43a.5.5 0 0 1 .06-.93z"/></svg>';
  var CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M4 5h16v11H9l-4 4v-4H4z"/><path d="M8 10h8M8 13h5" stroke-linecap="round"/></svg>';
  var MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/></svg>';
  var CHEV = '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>';

  var root = document.createElement("div");
  root.className = "atom-support";
  document.body.appendChild(root);

  function render() {
    if (!cfg.enabled) { root.style.display = "none"; return; }
    root.style.setProperty("--green-600", cfg.color);
    var avatar = cfg.avatar ? '<img src="' + esc(cfg.avatar) + '" alt="">' : HEADSET;
    root.innerHTML =
      '<button class="as-fab" aria-label="پشتیبانی">' + HEADSET + '<span class="as-ping"></span></button>' +
      '<div class="as-panel" role="dialog" aria-label="پشتیبانی">' +
        '<div class="as-head"><span class="as-ava">' + avatar + '</span>' +
          '<div><h4>' + esc(cfg.title) + '</h4><div class="as-status">' + (online ? "آنلاین" : "پاسخ‌گویی") + '</div></div>' +
          '<button class="as-close" aria-label="بستن">&times;</button></div>' +
        '<div class="as-body"></div>' +
        '<div class="as-foot" hidden><textarea rows="1" placeholder="پیام خود را بنویسید…"></textarea><button class="as-send">' + SEND + '</button></div>' +
      '</div>';
    root.querySelector(".as-fab").onclick = toggle;
    root.querySelector(".as-close").onclick = toggle;
    var ta = root.querySelector(".as-foot textarea");
    ta.addEventListener("input", function(){ ta.style.height="auto"; ta.style.height=Math.min(ta.scrollHeight,90)+"px"; });
    ta.addEventListener("keydown", function(e){ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendChat(); } });
    root.querySelector(".as-send").onclick = sendChat;
    home();
  }
  function toggle(){ root.classList.toggle("open"); if(root.classList.contains("open") && !root.dataset.seen){ root.dataset.seen="1"; } }
  // باز کردن ویجت از دکمه‌های سایت (data-open-support)
  window.atomOpenSupport = function(){ if(root && !root.classList.contains("open")) toggle(); };
  document.addEventListener("click", function(e){ if(e.target.closest("[data-open-support]")){ e.preventDefault(); window.atomOpenSupport(); } });
  function foot(show){ root.querySelector(".as-foot").hidden = !show; }

  function home(){
    foot(false);
    var faq = cfg.faqs.map(function(f,i){
      return '<li data-i="'+i+'"><div class="q">'+esc(f.question)+CHEV+'</div><div class="a"><div class="a-in">'+linkify(f.answer)+'</div></div></li>';
    }).join("");
    body(
      '<div class="as-welcome">'+esc(cfg.welcome)+'</div>' +
      '<div class="as-sec-title">سؤالات متداول</div><ul class="as-faq">'+faq+'</ul>' +
      '<div class="as-actions">' +
        '<button data-go="chat">'+CHAT+'گفتگو با هوش مصنوعی</button>' +
        '<button data-go="msg">'+MAIL+'ارسال پیام</button>' +
      '</div>'
    );
    root.querySelectorAll(".as-faq li").forEach(function(li){ li.querySelector(".q").onclick=function(){ li.classList.toggle("open"); }; });
    root.querySelector('[data-go="chat"]').onclick = chat;
    root.querySelector('[data-go="msg"]').onclick = msgForm;
  }

  function chat(){
    foot(true);
    body('<button class="as-back">→ بازگشت</button><div class="as-msgs"></div>');
    root.querySelector(".as-back").onclick = home;
    var box = root.querySelector(".as-msgs");
    if (!history.length) addMsg(box, "bot", online && cfg.aiEnabled
      ? "سلام! چطور می‌توانم کمکتان کنم؟ سؤال خود دربارهٔ خرید، سفارش، ارسال یا پرداخت را بپرسید."
      : "در حال حاضر گفتگوی هوشمند در دسترس نیست. لطفاً از «سؤالات متداول» استفاده کنید یا از بخش «ارسال پیام» برای ما پیام بگذارید.");
    else history.forEach(function(m){ addMsg(box, m.role==="user"?"me":"bot", m.content); });
    root.querySelector(".as-foot textarea").focus();
  }

  function addMsg(box, cls, text){
    var d = document.createElement("div"); d.className = "as-msg "+cls; d.innerHTML = linkify(text);
    box.appendChild(d); box.parentElement.scrollTop = box.parentElement.scrollHeight; return d;
  }
  async function sendChat(){
    var ta = root.querySelector(".as-foot textarea"); if(!ta) return;
    var text = ta.value.trim(); if(!text) return;
    var box = root.querySelector(".as-msgs"); if(!box){ chat(); box = root.querySelector(".as-msgs"); }
    ta.value=""; ta.style.height="auto";
    addMsg(box, "me", text); history.push({role:"user", content:text});
    var typing = document.createElement("div"); typing.className="as-typing"; typing.innerHTML="<i></i><i></i><i></i>";
    box.appendChild(typing); box.parentElement.scrollTop = box.parentElement.scrollHeight;
    root.querySelector(".as-send").disabled = true;
    try {
      var r = await (window.atomFetch||fetch)(API+"/support/chat", {method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({session:session, messages:history})});
      var d = await r.json();
      typing.remove();
      var reply = d.reply || "متأسفم، مشکلی پیش آمد.";
      addMsg(box, "bot", reply); history.push({role:"assistant", content:reply});
    } catch(e){
      typing.remove();
      addMsg(box, "bot", "ارتباط با سرور برقرار نشد. لطفاً از بخش «ارسال پیام» استفاده کنید.");
    }
    root.querySelector(".as-send").disabled = false;
  }

  function msgForm(){
    foot(false);
    body('<button class="as-back">→ بازگشت</button>' +
      '<div class="as-sec-title">ارسال پیام به پشتیبانی</div>' +
      '<div class="as-field"><label>نام شما</label><input id="asName" placeholder="نام و نام خانوادگی"></div>' +
      '<div class="as-field"><label>ایمیل یا موبایل</label><input id="asContact" placeholder="راه ارتباطی"></div>' +
      '<div class="as-field"><label>پیام شما</label><textarea id="asBody" rows="4" placeholder="پیام خود را بنویسید…"></textarea></div>' +
      '<button class="as-submit">ارسال پیام</button>');
    root.querySelector(".as-back").onclick = home;
    root.querySelector(".as-submit").onclick = submitMsg;
  }
  async function submitMsg(){
    var name=(root.querySelector("#asName")||{}).value||"", contact=(root.querySelector("#asContact")||{}).value||"", bd=(root.querySelector("#asBody")||{}).value||"";
    if(!bd.trim()){ root.querySelector("#asBody").focus(); return; }
    var btn=root.querySelector(".as-submit"); btn.disabled=true; btn.textContent="در حال ارسال…";
    try {
      await (window.atomFetch||fetch)(API+"/support/message",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({sender:(name.trim()||"کاربر سایت")+(contact?" ("+contact+")":""), subject:"پیام از ویجت پشتیبانی", body:bd, status:"open"})});
    } catch(e){}
    body('<div class="as-note">'+CHECK+'<div><b>پیام شما ثبت شد.</b><br>تیم پشتیبانی اتم به‌زودی پاسخ می‌دهد.</div></div>' +
      '<div class="as-actions"><button data-go="home">بازگشت به خانه</button></div>');
    var h=root.querySelector('[data-go="home"]'); if(h) h.onclick=home;
  }

  function body(html){ root.querySelector(".as-body").innerHTML = html; }

  // بارگذاری پیکربندی از سرور (در صورت وجود بک‌اند)
  (async function(){
    try {
      var c = new AbortController(); var to=setTimeout(function(){c.abort();},1500);
      var r = await (window.atomFetch||fetch)(API+"/support/config",{signal:c.signal}); clearTimeout(to);
      if(r.ok){ var d = await r.json(); online = true;
        cfg.enabled = d.enabled!==false; cfg.title=d.title||cfg.title; cfg.welcome=d.welcome||cfg.welcome;
        cfg.avatar=d.avatar||""; cfg.color=d.color||cfg.color; cfg.aiEnabled=!!d.aiEnabled;
        if(Array.isArray(d.faqs)&&d.faqs.length) cfg.faqs=d.faqs;
      }
    } catch(e){ online=false; }
    render();
  })();
})();

/* ===== Hero banner slider (اتم ۳۱۳) ===== */
(function(){
  function sesc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function slideHTML(s){
    var eyebrow = s.eyebrow ? '<span class="hs-eyebrow"><svg class="icon"><use href="#icon-badge-check"/></svg> '+sesc(s.eyebrow)+'</span>' : '';
    var sub = s.subtitle ? '<p class="hs-sub">'+sesc(s.subtitle)+'</p>' : '';
    var cta = s.cta_label ? '<div class="hs-actions"><a href="'+sesc(s.cta_link||'products.html')+'" class="btn btn-primary btn-lg">'+sesc(s.cta_label)+' <svg class="icon"><use href="#icon-arrow-up-left"/></svg></a></div>' : '';
    return '<div class="hs-slide"><img src="'+sesc(s.image)+'" alt="'+sesc(s.title)+'" loading="lazy">'+
      '<div class="hs-cap"><div class="hs-inner">'+eyebrow+'<h2 class="hs-title">'+sesc(s.title)+'</h2>'+sub+cta+'</div></div></div>';
  }
  async function initSlider(){
    var root = document.querySelector("[data-slider]");
    if(!root) return;
    var track = root.querySelector("[data-slider-track]");
    // بارگذاری اسلایدها از بک‌اند؛ در صورت نبود، اسلایدهای ثابت HTML می‌مانند
    try {
      var c = new AbortController(); var to = setTimeout(function(){ c.abort(); }, 1500);
      var rs = await (window.atomFetch||fetch)("/api/public/slides", { signal:c.signal }); clearTimeout(to);
      if(rs.ok){ var d = await rs.json(); if(d && d.items && d.items.length){ track.innerHTML = d.items.map(slideHTML).join(""); } }
    } catch(e){ /* آفلاین */ }
    var slides = Array.prototype.slice.call(root.querySelectorAll(".hs-slide"));
    var dotsWrap = root.querySelector("[data-slider-dots]");
    var prevBtn = root.querySelector("[data-slider-prev]");
    var nextBtn = root.querySelector("[data-slider-next]");
    var n = slides.length;
    if(!track || n === 0) return;
    var i = 0, timer = null, DELAY = 5000;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches;

    var dots = [];
    for(var k=0;k<n;k++){ (function(k){
      var b = document.createElement("button");
      b.type = "button"; b.className = "hs-dot" + (k===0 ? " active" : "");
      b.setAttribute("aria-label", "اسلاید " + (k+1));
      b.addEventListener("click", function(){ go(k); restart(); });
      dotsWrap.appendChild(b); dots.push(b);
    })(k); }

    function go(idx){
      i = (idx % n + n) % n;
      track.style.transform = "translateX(" + (-i * root.clientWidth) + "px)";
      for(var x=0;x<n;x++){
        dots[x].classList.toggle("active", x===i);
        slides[x].classList.toggle("is-active", x===i);
      }
    }
    function nextS(){ go(i+1); }
    function prevS(){ go(i-1); }
    function start(){ if(reduce) return; stop(); timer = setInterval(nextS, DELAY); }
    function stop(){ if(timer){ clearInterval(timer); timer = null; } }
    function restart(){ stop(); start(); }

    if(nextBtn) nextBtn.addEventListener("click", function(){ nextS(); restart(); });
    if(prevBtn) prevBtn.addEventListener("click", function(){ prevS(); restart(); });
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    window.addEventListener("resize", function(){ go(i); });
    document.addEventListener("visibilitychange", function(){ if(document.hidden){ stop(); } else { start(); } });

    var x0 = null;
    root.addEventListener("touchstart", function(e){ x0 = e.touches[0].clientX; stop(); }, {passive:true});
    root.addEventListener("touchend", function(e){
      if(x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if(Math.abs(dx) > 40){ if(dx < 0) nextS(); else prevS(); }
      restart();
    }, {passive:true});

    go(0); start();
  }
  if(document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", initSlider); }
  else { initSlider(); }
})();

/* ===== Category mega-menu (اتم ۳۱۳ — Basalam-style) ===== */
(function(){
  var CATS = [
    { name:"خواروبار و سوپرمارکت", icon:"grocery", subs:["برنج و حبوبات","روغن و چاشنی","کنسرو و غذای آماده","خشکبار و آجیل","چای و قهوه","نوشیدنی"] },
    { name:"لامپ و روشنایی", icon:"lamp", subs:["لامپ LED","لامپ حبابی","مهتابی و خطی","ریسه و نور تزئینی","سرپیچ و کلید","پروژکتور"] },
    { name:"نبات و آبنبات", icon:"candy", subs:["نبات چوبی","آبنبات میوه‌ای","شکلات","پاستیل و ژله","سوهان و گز","عسل و شیرینی سنتی"] },
    { name:"کیک و کلوچه", icon:"bakery", subs:["کیک خامه‌ای","کلوچه سنتی","شیرینی خشک","بیسکویت","دسر","نان شیرین"] },
    { name:"پوشاک زنانه", icon:"dress", subs:["مانتو و پالتو","شومیز و بلوز","شلوار و دامن","شال و روسری","کیف و کفش","لباس مجلسی"] },
    { name:"خدمات حمل و نقل", icon:"transport", subs:["باربری","پیک موتوری","اسباب‌کشی","حمل بار سنگین","کرایه وانت","پست و مرسولات"] },
    { name:"طلا و سکه", icon:"gold", subs:["انگشتر","گردنبند و زنجیر","دستبند و النگو","گوشواره","سکه و شمش","ست طلا"] },
    { name:"باطری‌سازی", icon:"battery", subs:["باطری خودرو","باطری موتور","شارژر و کابل","دینام و استارت","خدمات نصب","باطری یو‌پی‌اس"] },
    { name:"وکالت و حقوقی", icon:"legal", subs:["مشاوره حقوقی","دعاوی ملکی","خانواده و طلاق","کیفری","تنظیم قرارداد","ثبت شرکت"] },
    { name:"بیمه", icon:"insurance", subs:["شخص ثالث","بیمه بدنه","بیمه عمر","بیمه درمان","آتش‌سوزی","مسئولیت"] },
    { name:"لوازم‌التحریر", icon:"stationery", subs:["دفتر و کاغذ","خودکار و مداد","لوازم رنگ‌آمیزی","لوازم مهندسی","کوله و جامدادی","چسب و کاتر"] },
    { name:"رستوران", icon:"restaurant", subs:["غذای ایرانی","فست‌فود","کبابی","غذای دریایی","غذای گیاهی","صبحانه"] },
    { name:"هتل و مهمانسرا", icon:"hotel", subs:["هتل","هتل‌آپارتمان","سوئیت و ویلا","بومگردی","مهمانسرا","رزرو آنلاین"] },
    { name:"لوازم ورزشی", icon:"sports", subs:["بدنسازی","دوچرخه و اسکوتر","کوهنوردی","ورزش‌های توپی","پوشاک ورزشی","مکمل ورزشی"] },
    { name:"ظروف", icon:"dishware", subs:["سرویس غذاخوری","ظروف پخت‌وپز","لیوان و ماگ","ظروف سرو","یکبار مصرف","سرامیک و چینی"] },
    { name:"دوربین مداربسته", icon:"cctv", subs:["دوربین بولت","دوربین دام","دستگاه DVR/NVR","پکیج کامل","نصب و راه‌اندازی","لوازم جانبی"] },
    { name:"شیرآلات", icon:"faucet", subs:["شیر روشویی","شیر آشپزخانه","شیر دوش و حمام","علم دوش","شیر توکار","لوازم یدکی"] }
  ];
  var LINK = "products.html";

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

  function initMega(){
    var trigger = document.querySelector('.site-header .nav-main a[href="categories.html"]');
    var header = document.querySelector('.site-header');
    if(!trigger || !header) return;

    var mega = document.createElement("div");
    mega.className = "cat-mega";
    mega.setAttribute("data-cat-mega","");
    var listHtml = CATS.map(function(c,i){
      return '<li class="cat-mega-item'+(i===0?' active':'')+'" data-i="'+i+'" role="button" tabindex="0">'+
        '<svg class="icon"><use href="#icon-cat-'+c.icon+'"/></svg>'+
        '<span>'+esc(c.name)+'</span>'+
        '<svg class="icon chev"><use href="#icon-chevron-left"/></svg></li>';
    }).join("");
    mega.innerHTML =
      '<div class="container"><div class="cat-mega-inner">'+
        '<ul class="cat-mega-list">'+listHtml+'</ul>'+
        '<div class="cat-mega-panel" data-panel></div>'+
      '</div></div>';
    header.appendChild(mega);

    var panel = mega.querySelector("[data-panel]");
    var items = Array.prototype.slice.call(mega.querySelectorAll(".cat-mega-item"));

    function renderPanel(i){
      var c = CATS[i];
      panel.innerHTML =
        '<div class="cat-mega-phead"><b>'+esc(c.name)+'</b>'+
          '<a href="'+LINK+'?q='+encodeURIComponent(c.name)+'">مشاهده همه <svg class="icon"><use href="#icon-chevron-left"/></svg></a></div>'+
        '<div class="cat-mega-subs">'+
          c.subs.map(function(s){ return '<a class="cat-mega-sub" href="'+LINK+'?q='+encodeURIComponent(s)+'">'+esc(s)+'</a>'; }).join("")+
        '</div>';
      panel.classList.remove("swap"); void panel.offsetWidth; panel.classList.add("swap");
    }
    function setActive(i){
      items.forEach(function(it,x){ it.classList.toggle("active", x===i); });
      renderPanel(i);
    }
    items.forEach(function(it){
      var i = +it.getAttribute("data-i");
      it.addEventListener("mouseenter", function(){ setActive(i); });
      it.addEventListener("focus", function(){ setActive(i); });
      it.addEventListener("click", function(){ window.location.href = LINK+"?q="+encodeURIComponent(CATS[i].name); });
      it.addEventListener("keydown", function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); window.location.href = LINK+"?q="+encodeURIComponent(CATS[i].name); } });
    });
    renderPanel(0);

    // open/close with hover intent
    var closeTimer = null;
    function open(){ if(closeTimer){ clearTimeout(closeTimer); closeTimer=null; } mega.classList.add("open"); trigger.setAttribute("aria-expanded","true"); }
    function scheduleClose(){ if(closeTimer) clearTimeout(closeTimer); closeTimer = setTimeout(function(){ mega.classList.remove("open"); trigger.setAttribute("aria-expanded","false"); }, 160); }
    trigger.setAttribute("aria-haspopup","true"); trigger.setAttribute("aria-expanded","false");
    trigger.addEventListener("mouseenter", open);
    trigger.addEventListener("mouseleave", scheduleClose);
    trigger.addEventListener("focus", open);
    mega.addEventListener("mouseenter", open);
    mega.addEventListener("mouseleave", scheduleClose);
    document.addEventListener("keydown", function(e){ if(e.key==="Escape") mega.classList.remove("open"); });
  }
  if(document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", initMega); }
  else { initMega(); }
})();

/* ===== تبلیغات سایت (نوار بالا + مربع گوشهٔ چپ) — مانند باسلام ===== */
(function(){
  function aesc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  // مسیر تصویرهای آپلودی؛ اگر نبود، به نمونهٔ متنی/SVG برمی‌گردد
  var FALLBACK = {
    top: [{ title:"جشنواره فروش اتم ۳۱۳", text:"همین حالا با کد ATOM20 روی همهٔ محصولات ۲۰٪ تخفیف بگیر!", link:"offers.html", cta_label:"خرید کن", bg:"#149B3E" }],
    corner: [{ title:"پیشنهاد ویژهٔ چرم", image:"assets/img/ads/corner-ad.jpg", link:"products.html" }]
  };
  function closed(key){ try{ return sessionStorage.getItem(key)==="1"; }catch(e){ return false; } }
  function close(key){ try{ sessionStorage.setItem(key,"1"); }catch(e){} }

  function renderStrip(ad){
    var bar=document.createElement("div"); bar.className="ad-strip";
    if(ad.bg) bar.style.background=ad.bg;
    var cta = ad.cta_label ? '<a class="ad-strip-cta" href="'+aesc(ad.link||"#")+'">'+aesc(ad.cta_label)+'</a>' : '';
    bar.innerHTML='<div class="container ad-strip-in">'+
      '<span class="ad-strip-ic"><svg class="icon"><use href="#icon-percent"/></svg></span>'+
      '<b class="ad-strip-title">'+aesc(ad.title||"")+'</b>'+
      (ad.text?'<span class="ad-strip-text">'+aesc(ad.text)+'</span>':'')+
      cta+'<button class="ad-strip-x" aria-label="بستن">&times;</button></div>';
    if(document.body) document.body.insertBefore(bar, document.body.firstChild);
    bar.querySelector(".ad-strip-x").onclick=function(){ bar.remove(); close("atom_ad_top"); };
  }
  function renderTop(ad){
    if(!ad || closed("atom_ad_top")) return;
    if(ad.image){
      // بنر تصویری متحرک و جذاب در بالای سایت
      var wrap=document.createElement("div"); wrap.className="ad-banner";
      wrap.innerHTML='<div class="container ad-banner-in">'+
        '<a class="ad-banner-link" href="'+aesc(ad.link||"#")+'"><img src="'+aesc(ad.image)+'" alt="'+aesc(ad.title||"تبلیغ")+'"><span class="ad-sheen"></span></a>'+
        '<button class="ad-banner-x" aria-label="بستن">&times;</button></div>';
      if(document.body) document.body.insertBefore(wrap, document.body.firstChild);
      var img=wrap.querySelector("img");
      img.onerror=function(){ wrap.remove(); renderStrip(ad); }; // تصویر نبود → نوار متنی
      wrap.querySelector(".ad-banner-x").onclick=function(e){ e.preventDefault(); wrap.remove(); close("atom_ad_top"); };
      return;
    }
    renderStrip(ad);
  }
  function renderCorner(ad){
    if(!ad || closed("atom_ad_corner")) return;
    var box=document.createElement("div"); box.className="ad-corner";
    var inner = ad.image
      ? '<img src="'+aesc(ad.image)+'" alt="'+aesc(ad.title||"تبلیغ")+'"><span class="ad-sheen"></span>'
      : '<div class="ad-corner-txt"><b>'+aesc(ad.title||"")+'</b><span>'+aesc(ad.text||"")+'</span></div>';
    box.innerHTML='<a class="ad-corner-link" href="'+aesc(ad.link||"#")+'">'+inner+'</a>'+
      '<button class="ad-corner-x" aria-label="بستن">&times;</button>';
    if(document.body) document.body.appendChild(box);
    var cim=box.querySelector("img");
    if(cim) cim.onerror=function(){ cim.onerror=null; cim.src="assets/img/ads/promo-1.svg"; }; // fallback به نمونه
    box.querySelector(".ad-corner-x").onclick=function(e){ e.preventDefault(); box.remove(); close("atom_ad_corner"); };
  }
  function boot(data){
    renderTop((data.top||[])[0]);
    renderCorner((data.corner||[])[0]);
  }
  async function init(){
    var data = FALLBACK;
    try {
      var c=new AbortController(); var to=setTimeout(function(){c.abort();},1500);
      var r=await (window.atomFetch||fetch)("/api/public/ads",{signal:c.signal}); clearTimeout(to);
      if(r.ok){ var d=await r.json(); if(d && ((d.top&&d.top.length)||(d.corner&&d.corner.length))) data=d; }
    } catch(e){ /* آفلاین → نمونهٔ پیش‌فرض */ }
    boot(data);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

/* ===== فعال‌سازی سراسری سایت: سبد خرید، جستجو، توست، فرم‌ها، فیلترها، لینک‌ها ===== */
(function(){
  "use strict";
  var FA="۰۱۲۳۴۵۶۷۸۹";
  function fa(s){ return String(s==null?"":s).replace(/[0-9]/g,function(d){return FA[+d];}); }
  function faToEn(s){ return String(s==null?"":s).replace(/[۰-۹]/g,function(d){return FA.indexOf(d);}); }
  function parsePrice(txt){ return parseInt(faToEn(txt).replace(/[^0-9]/g,""),10)||0; }
  function money(n){ return fa(String(Math.round(+n||0)).replace(/\B(?=(\d{3})+(?!\d))/g,"،"))+" ت"; }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }

  /* ---------- توست ---------- */
  var toastWrap=null;
  function Toast(msg,type){
    if(!toastWrap){ toastWrap=document.createElement("div"); toastWrap.className="toast-wrap"; document.body.appendChild(toastWrap); }
    var t=document.createElement("div"); t.className="toast"+(type?(" "+type):"");
    t.innerHTML='<svg class="icon"><use href="#icon-'+(type==="err"?"close":"check")+'"/></svg><span></span>';
    t.querySelector("span").textContent=msg; toastWrap.appendChild(t);
    requestAnimationFrame(function(){ t.classList.add("in"); });
    setTimeout(function(){ t.classList.remove("in"); setTimeout(function(){ if(t.parentNode) t.remove(); },320); },2800);
  }
  window.Toast=Toast;

  /* ---------- سبد خرید ---------- */
  var CART_KEY="atom_cart";
  function getCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)||"[]")||[]; }catch(e){ return []; } }
  function setCart(c){ try{ localStorage.setItem(CART_KEY,JSON.stringify(c)); }catch(e){} updateBadges(); renderCartPage(); }
  function cartCount(){ return getCart().reduce(function(s,i){ return s+(+i.qty||1); },0); }
  function cartTotal(){ return getCart().reduce(function(s,i){ return s+(+i.price||0)*(+i.qty||1); },0); }
  function updateBadges(){
    var n=cartCount();
    document.querySelectorAll('a[href="cart.html"] .badge-dot').forEach(function(b){
      if(n>0){ b.style.display=""; b.textContent=fa(n); } else b.style.display="none";
    });
  }
  function addToCart(item){
    var c=getCart(), q=Math.max(1,+item.qty||1); var f=c.filter(function(x){ return String(x.id)===String(item.id); })[0];
    if(f) f.qty=Math.min(99,(+f.qty||1)+q); else c.push({ id:item.id, title:item.title, price:+item.price||0, qty:q, seller:item.seller||"", thumb:item.thumb||"" });
    setCart(c);
  }
  window.AtomCart={ get:getCart, set:setCart, add:addToCart, count:cartCount, total:cartTotal, money:money, fa:fa };

  // افزودن به سبد (تفویضی) — دکمه‌های .add-btn و [data-add-cart]
  document.addEventListener("click", function(e){
    var btn=e.target.closest(".add-btn, [data-add-cart]"); if(!btn) return;
    if(btn.closest(".sd-modal, .qty-box")) return;
    e.preventDefault();
    var title="محصول", price=0, id="", seller="", thumb="", qty=1;
    if(btn.hasAttribute("data-add-cart")){
      title=btn.getAttribute("data-title")||title; price=parsePrice(btn.getAttribute("data-price")||"0");
      id=btn.getAttribute("data-id")||title; seller=btn.getAttribute("data-seller")||"";
      var qb=document.querySelector(".pd-actions") && document.querySelector("[data-qty] input"); if(qb) qty=parseInt(faToEn(qb.value),10)||1;
    } else {
      var card=btn.closest(".prod-card, .product-card, .p-card, article, [data-product]");
      if(card && card.getAttribute("data-pid")) id=card.getAttribute("data-pid");
      if(card){
        var tEl=card.querySelector(".prod-title, .product-title, h3, h1"); if(tEl) title=tEl.textContent.trim();
        // فقط قیمت اصلی (تگ b) خوانده شود، نه قیمت خط‌خوردهٔ del
        var pEl=card.querySelector(".price b")||card.querySelector(".prod-price b, .p-price b")||card.querySelector(".price, .prod-price, .p-price");
        if(pEl){ var pClone=pEl.cloneNode(true); var del=pClone.querySelector&&pClone.querySelector("del"); if(del) del.remove(); price=parsePrice(pClone.textContent); }
        var sEl=card.querySelector(".prod-seller"); if(sEl) seller=sEl.textContent.trim();
        var thEl=card.querySelector(".prod-thumb .ph, .th"); if(thEl) thumb=thEl.className;
      } else {
        // صفحهٔ جزئیات محصول
        var h=document.querySelector("h1.product-title, h1.h-1, .product-info h1"); if(h) title=h.textContent.trim();
        var pp=document.querySelector(".product-price b, .buy-price b, .price b"); if(pp) price=parsePrice(pp.textContent);
      }
      id=id||title;
    }
    addToCart({ id:id||title, title:title, price:price, seller:seller, thumb:thumb, qty:qty });
    btn.classList.add("added"); setTimeout(function(){ btn.classList.remove("added"); },600);
    Toast("«"+title+"» به سبد خرید افزوده شد");
  });

  /* ---------- کلیک روی کارت محصول → صفحهٔ جزئیات ---------- */
  document.addEventListener("click", function(e){
    var card=e.target.closest(".prod-card"); if(!card || e.target.closest("button, a, input, [data-wish]")) return;
    var tEl=card.querySelector(".prod-title"); if(!tEl) return;
    var pid=card.getAttribute("data-pid");
    var pr=card.querySelector(".price b"), old=card.querySelector(".price del"), th=card.querySelector(".prod-thumb .ph");
    var bg=th && th.style.backgroundImage || "", m=bg.match(/url\(["']?(.*?)["']?\)/);
    var info={ id:pid||"", title:tEl.textContent.trim(), cat:((card.querySelector(".prod-cat")||{}).textContent||"").trim(),
      seller:((card.querySelector(".prod-seller")||{}).textContent||"").trim(), price:pr?parsePrice(pr.textContent):0, old:old?parsePrice(old.textContent):0,
      image:m?m[1]:"", thumb:th&&!m?th.className:"" };
    try{ sessionStorage.setItem("atom_pd",JSON.stringify(info)); }catch(er){}
    location.href = pid ? "product.html?id="+encodeURIComponent(pid) : "product.html?t="+encodeURIComponent(info.title);
  });
  document.querySelectorAll(".prod-card .prod-title").forEach(function(t){ t.style.cursor="pointer"; });

  /* ---------- رندر صفحهٔ سبد خرید ---------- */
  function renderCartPage(){
    var wrap=document.getElementById("cartItems"); if(!wrap) return;
    var cart=getCart();
    var empty=document.getElementById("cartEmpty"), recv=document.getElementById("cartReceiver");
    if(!cart.length){
      wrap.innerHTML=""; if(empty) empty.hidden=false; if(recv) recv.style.display="none";
    } else {
      if(empty) empty.hidden=true; if(recv) recv.style.display="";
      wrap.innerHTML=cart.map(function(it,idx){
        var th=(it.thumb&&/ph-/.test(it.thumb))?it.thumb:"th ph-"+((idx%4)+1);
        return '<div class="cart-item" data-ci="'+idx+'">'+
          '<div class="'+esc(th.indexOf("th")===0?th:("th "+th))+'"></div>'+
          '<div class="info"><b style="font-size:.92rem;">'+esc(it.title)+'</b>'+
          (it.seller?'<div class="faint" style="font-size:.78rem; margin-top:4px;">فروشنده: '+esc(it.seller)+'</div>':'')+
          '<div class="qty-box" data-qty style="margin-top:10px;">'+
            '<button data-ci-dec="'+idx+'"><svg class="icon" style="width:14px;height:14px;"><use href="#icon-minus"/></svg></button>'+
            '<input type="text" value="'+fa(it.qty)+'" readonly>'+
            '<button data-ci-inc="'+idx+'"><svg class="icon" style="width:14px;height:14px;"><use href="#icon-plus"/></svg></button>'+
          '</div></div>'+
          '<div style="text-align:left;"><b style="display:block; font-size:.95rem;">'+money((+it.price||0)*(+it.qty||1))+'</b>'+
          '<button class="btn-icon btn-icon-sm rm" data-ci-rm="'+idx+'" style="margin-top:20px;" aria-label="حذف"><svg class="icon" style="width:15px;height:15px;"><use href="#icon-trash"/></svg></button></div>'+
          '</div>';
      }).join("");
      wrap.querySelectorAll("[data-ci-inc]").forEach(function(b){ b.onclick=function(){ var c=getCart(); var i=+b.getAttribute("data-ci-inc"); if(c[i]){ c[i].qty=(+c[i].qty||1)+1; setCart(c); } }; });
      wrap.querySelectorAll("[data-ci-dec]").forEach(function(b){ b.onclick=function(){ var c=getCart(); var i=+b.getAttribute("data-ci-dec"); if(c[i]){ c[i].qty=(+c[i].qty||1)-1; if(c[i].qty<1) c.splice(i,1); setCart(c); } }; });
      wrap.querySelectorAll("[data-ci-rm]").forEach(function(b){ b.onclick=function(){ var c=getCart(); c.splice(+b.getAttribute("data-ci-rm"),1); setCart(c); Toast("کالا از سبد حذف شد"); }; });
    }
    renderSummary();
  }

  /* ---------- خلاصهٔ سفارش: تخفیف، ارسال، جمع کل (قوانین از تنظیمات مدیریت) ---------- */
  var shopCfg={ shipping_cost:45000, free_shipping_min:500000, min_order:0 }, coupon=null;
  try{ coupon=JSON.parse(sessionStorage.getItem("atom_coupon")||"null"); }catch(e){}
  function num(v,d){ var n=parseInt(String(v==null?"":v).replace(/[^0-9]/g,""),10); return isNaN(n)?d:n; }
  function calc(){
    var sub=cartTotal(), disc=0;
    if(coupon) disc = coupon.kind==="percent" ? Math.round(sub*Math.min(100,coupon.amount)/100) : Math.min(sub,+coupon.amount||0);
    var after=sub-disc, ship = !sub ? 0 : (after>=shopCfg.free_shipping_min ? 0 : shopCfg.shipping_cost);
    return { sub:sub, disc:disc, ship:ship, total:after+ship };
  }
  function renderSummary(){
    var c=calc(), el=function(id){ return document.getElementById(id); };
    if(el("sumCount")) el("sumCount").textContent=fa(cartCount());
    if(el("sumItems")) el("sumItems").textContent=money(c.sub);
    if(el("sumDiscRow")){ el("sumDiscRow").hidden=!coupon; if(coupon){ el("sumCoupon").textContent=coupon.code; el("sumDisc").textContent="−"+money(c.disc); } }
    if(el("sumShip")) el("sumShip").textContent = c.ship ? money(c.ship) : "رایگان";
    if(el("sumShipHint")) el("sumShipHint").textContent = c.sub && c.ship ? ("برای خریدهای بالای "+money(shopCfg.free_shipping_min)+" ارسال رایگان است.") : "";
    if(el("sumTotal")) el("sumTotal").textContent=money(c.total);
    if(el("couponInput") && coupon && !el("couponInput").value) el("couponInput").value=coupon.code;
  }
  if(document.getElementById("cartItems") && window.SiteAuth){
    SiteAuth.publicSettings().then(function(d){ var s=(d&&d.settings)||{};
      shopCfg.shipping_cost=num(s.shipping_cost,shopCfg.shipping_cost); shopCfg.free_shipping_min=num(s.free_shipping_min,shopCfg.free_shipping_min); shopCfg.min_order=num(s.min_order,0);
      renderSummary(); }).catch(function(){});
    // پیش‌پر کردن گیرنده برای مشتری واردشده
    var me=SiteAuth.user(); if(me && me.role==="customer"){ var n=document.getElementById("coName"), ph=document.getElementById("coPhone"); if(n&&!n.value) n.value=me.name||""; if(ph&&!ph.value) ph.value=me.phone||""; }
  }

  var couponBtn=document.getElementById("couponBtn");
  if(couponBtn) couponBtn.addEventListener("click", async function(e){
    e.preventDefault();
    var inp=document.getElementById("couponInput"), code=(inp&&inp.value||"").trim();
    if(!code){ if(coupon){ coupon=null; try{ sessionStorage.removeItem("atom_coupon"); }catch(er){} renderSummary(); Toast("کد تخفیف حذف شد"); } else Toast("لطفاً کد تخفیف را وارد کنید.","err"); return; }
    couponBtn.disabled=true;
    try{
      var o=await SiteAuth.api("/public/offer?code="+encodeURIComponent(code));
      coupon=o; try{ sessionStorage.setItem("atom_coupon",JSON.stringify(o)); }catch(er){}
      renderSummary(); Toast("کد تخفیف «"+o.code+"» اعمال شد ✓");
    }catch(er){ coupon=null; try{ sessionStorage.removeItem("atom_coupon"); }catch(x){} renderSummary(); Toast(er.message,"err"); }
    couponBtn.disabled=false;
  });

  var checkout=document.getElementById("cartCheckout");
  if(checkout) checkout.addEventListener("click", async function(e){
    e.preventDefault();
    var cart=getCart();
    if(!cart.length){ Toast("سبد خرید شما خالی است","err"); return; }
    var v=function(id){ var x=document.getElementById(id); return x?x.value.trim():""; };
    var payload={ name:v("coName"), phone:v("coPhone"), city:v("coCity"), address:v("coAddress")+(v("coZip")?" — کد پستی "+v("coZip"):""), note:v("coNote"),
      coupon: coupon?coupon.code:"", items:cart.map(function(i){ return { id:i.id, title:i.title, price:i.price, qty:i.qty, seller:i.seller }; }) };
    if(!payload.name){ Toast("نام گیرنده را وارد کنید.","err"); document.getElementById("coName").focus(); return; }
    if(!window.SiteAuth || !SiteAuth.isMobile(payload.phone)){ Toast("شمارهٔ موبایل معتبر وارد کنید (۰۹xxxxxxxxx).","err"); document.getElementById("coPhone").focus(); return; }
    if(!v("coAddress")){ Toast("آدرس کامل را وارد کنید.","err"); document.getElementById("coAddress").focus(); return; }
    var c=calc(); if(shopCfg.min_order && c.sub<shopCfg.min_order){ Toast("حداقل مبلغ سفارش "+money(shopCfg.min_order)+" است.","err"); return; }
    checkout.disabled=true; var t=checkout.innerHTML; checkout.textContent="در حال ثبت سفارش…";
    try{
      var r=await SiteAuth.placeOrder(payload);
      try{ sessionStorage.removeItem("atom_coupon"); localStorage.setItem("atom_last_order",JSON.stringify({code:r.code,phone:payload.phone})); }catch(er){}
      coupon=null; setCart([]);
      var layout=document.querySelector(".cart-layout");
      if(layout) layout.innerHTML='<div class="panel order-done" style="grid-column:1/-1;text-align:center;padding:48px 20px;">'+
        '<div class="od-ic"><svg class="icon"><use href="#icon-check"/></svg></div>'+
        '<h2 class="h-2" style="margin:14px 0 8px;">سفارش شما با موفقیت ثبت شد</h2>'+
        '<p class="muted" style="line-height:2;">کد سفارش: <b style="font-size:1.2rem;color:var(--green-600)">'+fa(r.code)+'</b><br>مبلغ قابل پرداخت: <b>'+money(r.total)+'</b><br>همکاران ما برای هماهنگی ارسال و پرداخت با شمارهٔ '+esc(fa(payload.phone))+' تماس می‌گیرند.</p>'+
        '<div class="flex gap-8" style="justify-content:center;margin-top:22px;flex-wrap:wrap;"><a class="btn btn-primary" href="track.html?code='+encodeURIComponent(r.code)+'&phone='+encodeURIComponent(payload.phone)+'">پیگیری سفارش</a><a class="btn btn-ghost" href="products.html">ادامهٔ خرید</a></div></div>';
      var steps=document.querySelectorAll(".steps .step"); steps.forEach(function(s){ s.classList.remove("active"); s.classList.add("done"); });
      window.scrollTo({top:0,behavior:"smooth"});
    }catch(er){ Toast(er.message||"ثبت سفارش ناموفق بود.","err"); checkout.disabled=false; checkout.innerHTML=t; }
  });

  updateBadges(); renderCartPage();

  /* ---------- جستجو ---------- */
  function goSearch(q){ q=(q||"").trim(); window.location.href="products.html"+(q?("?q="+encodeURIComponent(q)):""); }
  document.querySelectorAll(".search-bar").forEach(function(bar){
    var inp=bar.querySelector("input"); if(!inp || inp.hasAttribute("data-local-search")) return;
    inp.addEventListener("keydown", function(e){ if(e.key==="Enter"){ e.preventDefault(); goSearch(inp.value); } });
    var go=bar.querySelector(".s-go"); if(go){ go.style.cursor="pointer"; go.addEventListener("click", function(){ goSearch(inp.value); }); }
  });
  // پیش‌پرکردن جستجو از ?q=
  try{
    var q=new URLSearchParams(window.location.search).get("q");
    if(q){ document.querySelectorAll(".search-bar input:not([data-local-search])").forEach(function(i){ if(!i.value) i.value=q; }); }
  }catch(e){}

  /* ---------- فیلتر/مرتب‌سازی: فعال‌سازی حالت انتخاب ---------- */
  document.querySelectorAll("[data-filter-group]").forEach(function(g){
    var opts=g.querySelectorAll("button, .filter-chip, .chip, .sort-opt, .pd-opt");
    opts.forEach(function(b){ b.addEventListener("click", function(ev){
      if(b.tagName==="A"){ var h=b.getAttribute("href"); if(h&&h!=="#") return; }
      ev.preventDefault(); opts.forEach(function(x){ x.classList.remove("active"); }); b.classList.add("active");
    }); });
  });

  /* ---------- فرم تماس (بدون تگ form) ---------- */
  var cs=document.querySelector("[data-contact-send]");
  if(cs) cs.addEventListener("click", function(e){
    e.preventDefault();
    var panel=cs.closest(".panel, section, main")||document;
    var inps=panel.querySelectorAll("input, textarea");
    var fields=[].slice.call(panel.querySelectorAll("input"));
    var name=fields[0]&&fields[0].value.trim(), contact=fields[1]&&fields[1].value.trim(), subject=fields[2]&&fields[2].value.trim(), msg=panel.querySelector("textarea");
    if(!name){ Toast("لطفاً نام خود را وارد کنید.","err"); return; }
    if(!contact){ Toast("ایمیل یا شماره موبایل را برای پاسخ وارد کنید.","err"); return; }
    if(msg && !msg.value.trim()){ Toast("لطفاً متن پیام را بنویسید.","err"); return; }
    if(!window.SiteAuth){ Toast("ارسال ممکن نیست.","err"); return; }
    cs.disabled=true;
    SiteAuth.supportMessage({ sender:name+" ("+contact+")", subject:subject||"پیام از فرم تماس", body:msg?msg.value.trim():"" })
      .then(function(){ inps.forEach(function(i){ i.value=""; }); Toast("پیام شما ثبت شد؛ به‌زودی پاسخ می‌دهیم ✓"); })
      .catch(function(er){ Toast(er.message,"err"); })
      .then(function(){ cs.disabled=false; });
  });

  /* ---------- علاقه‌مندی (پایداری + شمارنده) ---------- */
  var WISH_KEY="atom_wish";
  function getWish(){ try{ return JSON.parse(localStorage.getItem(WISH_KEY)||"[]")||[]; }catch(e){ return []; } }
  function setWish(a){ try{ localStorage.setItem(WISH_KEY,JSON.stringify(a)); }catch(e){} updateWishBadges(); }
  function updateWishBadges(){ var n=getWish().length; document.querySelectorAll('a[href="dashboard.html"] .badge-dot, [data-wish-link] .badge-dot').forEach(function(b){ if(n>0){ b.style.display=""; b.textContent=fa(n); } else b.style.display="none"; }); }
  // هر محصول با عنوانش شناخته می‌شود؛ جزئیات برای تب «علاقه‌مندی‌ها» ذخیره می‌شود
  function wishInfo(btn){
    var card=btn.closest(".prod-card, .product-card, article");
    if(card){
      var pr=card.querySelector(".price b"), th=card.querySelector(".prod-thumb .ph");
      return { title:((card.querySelector(".prod-title, h3")||{}).textContent||"").trim(), price:pr?parsePrice(pr.textContent):0,
        seller:((card.querySelector(".prod-seller")||{}).textContent||"").trim(), pid:card.getAttribute("data-pid")||"", thumb:th?th.className:"", img:th&&th.style.backgroundImage||"" };
    }
    var h=document.querySelector(".pd-title-row h1, h1.h-1"), pp=document.querySelector(".pd-price-box b");
    return { title:h?h.textContent.trim():"", price:pp?parsePrice(pp.textContent):0, seller:"", pid:new URLSearchParams(location.search).get("id")||"", thumb:"", img:"" };
  }
  function wishKeys(){ return getWish().map(function(w){ return typeof w==="string"?w:w.title; }); }
  function paintWish(root){
    var keys=wishKeys();
    (root||document).querySelectorAll("[data-wish]").forEach(function(btn){
      var on=keys.indexOf(wishInfo(btn).title)!==-1;
      btn.classList.toggle("active",on); var u=btn.querySelector("use"); if(u) u.setAttribute("href", on?"#icon-heart-filled":"#icon-heart");
    });
  }
  document.addEventListener("click", function(e){
    var btn=e.target.closest("[data-wish]"); if(!btn) return;
    e.preventDefault(); e.stopPropagation();
    var info=wishInfo(btn); if(!info.title) return;
    var w=getWish().map(function(x){ return typeof x==="string"?{title:x}:x; });
    var i=-1; w.forEach(function(x,k){ if(x.title===info.title) i=k; });
    if(i===-1){ w.push(info); Toast("«"+info.title+"» به علاقه‌مندی‌ها افزوده شد"); } else { w.splice(i,1); Toast("از علاقه‌مندی‌ها حذف شد"); }
    setWish(w); paintWish();
  });
  window.AtomWish={ get:function(){ return getWish().map(function(x){ return typeof x==="string"?{title:x}:x; }); }, set:setWish, paint:paintWish };
  paintWish();
  new MutationObserver(function(m){ m.forEach(function(r){ [].forEach.call(r.addedNodes,function(n){ if(n.nodeType===1 && (n.matches("[data-wish]")||n.querySelector("[data-wish]"))) paintWish(n.parentNode||n); }); }); }).observe(document.body,{childList:true,subtree:true});
  updateWishBadges();

  /* ---------- خنثی‌سازی لینک‌های خالی (href="#") ---------- */
  document.addEventListener("click", function(e){
    var a=e.target.closest('a[href="#"]'); if(!a) return;
    if(a.hasAttribute("data-wish")||a.hasAttribute("data-drawer-open")||a.hasAttribute("data-drawer-close")||a.hasAttribute("data-dash-tab")||a.hasAttribute("data-tab")) return;
    e.preventDefault();
    var lbl=(a.getAttribute("aria-label")||"").trim();
    if(a.closest(".footer-social")) Toast((lbl||"شبکهٔ اجتماعی")+" — به‌زودی");
  });
})();

/* ===== وضعیت حساب کاربری در هدر، لینک‌های پویا و شبکه‌های اجتماعی ===== */
(function(){
  "use strict";
  var SA = window.SiteAuth;
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  if(!SA) return;

  // «مرا به خاطر بسپار» خاموش بود و مرورگر بسته شده → خروج خودکار
  try {
    if(localStorage.getItem("atom_session_only")==="1" && !sessionStorage.getItem("atom_alive") && SA.isAuthed()){
      localStorage.removeItem("atom_token"); localStorage.removeItem("atom_user"); localStorage.removeItem("atom_session_only");
    }
  } catch(e){}

  var u = SA.user(), home = SA.home();
  var ROLE = { seller:"پنل فروشندگی", office:"پنل دفتر محله", customer:"حساب من", admin:"پنل مدیریت", editor:"پنل مدیریت", support:"پنل مدیریت" };

  // آیکن حساب در هدر
  document.querySelectorAll('.header-actions a[href="login.html"]').forEach(function(a){
    if(!u) return;
    a.href = home; a.setAttribute("aria-label", ROLE[u.role]||"حساب من"); a.title = (u.name||u.username)+" — "+(ROLE[u.role]||"");
    a.classList.add("is-authed");
  });
  // منوی کشویی موبایل: ورود ↔ حساب من + خروج
  document.querySelectorAll('.mobile-drawer a[href="login.html"]').forEach(function(a){
    if(!u) return;
    a.href = home; a.textContent = (ROLE[u.role]||"حساب من")+" — "+(u.name||u.username);
    var out = document.createElement("a"); out.href="#"; out.textContent="خروج از حساب"; out.setAttribute("data-site-logout","");
    a.insertAdjacentElement("afterend", out);
  });
  document.addEventListener("click", async function(e){
    var lo = e.target.closest("[data-site-logout]"); if(!lo) return;
    e.preventDefault(); await SA.logout(); location.href = "index.html";
  });

  // «فروشنده شوید»: اگر فروشنده نیست → فرم ثبت‌نام فروشنده
  document.querySelectorAll('a[href="seller-dashboard.html"]').forEach(function(a){
    if(/فروشنده شوید|شروع فروش/.test(a.textContent) && !(u && u.role==="seller")) a.href = "login.html#signup";
    if(/پنل فروشندگی/.test(a.textContent) && !(u && u.role==="seller")) a.href = "login.html?switch=1";
  });
  document.querySelectorAll('a[href="dashboard.html"]').forEach(function(a){
    if(a.querySelector(".badge-dot")) a.setAttribute("data-wish-link","");
    if(!u) a.href = "login.html?next=dashboard.html#customer";
    else if(u.role!=="customer") a.href = home;
  });

  // اطلاعات تماس و شبکه‌های اجتماعی از تنظیمات مدیریت
  (async function(){
    var s = {};
    try { s = (await SA.publicSettings()).settings || {}; } catch(e){}
    var map = { "اینستاگرام":"social_instagram", "تلگرام":"social_telegram", "واتساپ":"social_whatsapp", "لینکدین":"social_linkedin" };
    document.querySelectorAll(".footer-social a").forEach(function(a){
      var k = map[a.getAttribute("aria-label")]; var v = k && s[k];
      if(v){ a.href = v; a.target = "_blank"; a.rel = "noopener"; }
    });
    document.querySelectorAll(".site-footer .footer-col li").forEach(function(li){
      var ic = li.querySelector("use"); if(!ic) return; var h = ic.getAttribute("href");
      var val = h==="#icon-phone" ? s.contact_phone : h==="#icon-mail" ? s.contact_email : h==="#icon-map-pin" ? s.address : null;
      if(val){ var svg = li.querySelector("svg").outerHTML; li.innerHTML = svg+" "+esc(val); }
    });
  })();
})();

/* ===== لینک کارت‌های فروشنده به ویترین همان فروشگاه + صفحه‌بندی عمومی ===== */
(function(){
  "use strict";
  // لینک‌های دسته و زیردسته → جستجوی همان دسته در محصولات
  document.querySelectorAll('a[href="products.html"]').forEach(function(a){
    if(a.closest(".site-header, .mobile-drawer, .site-footer, .nav-main, .hs-slide")) return;
    var t=(a.querySelector("h3")||a).textContent.trim();
    if(!t){ var box=a.closest(".cat-big, .cat-card, .cat-tile, article, li"); var h=box&&box.querySelector("h3, b"); t=h?h.textContent.trim():""; }
    if(t && t.length<40 && !/^(محصولات|مشاهده|همه|خرید|شروع)/.test(t)) a.href="products.html?q="+encodeURIComponent(t);
  });
  document.querySelectorAll('a.seller-card[href="seller.html"]').forEach(function(a){
    var b=a.querySelector("b"); if(b) a.href="seller.html?name="+encodeURIComponent(b.textContent.trim());
  });
  // صفحه‌بندی سمت کاربر برای شبکه‌هایی که اسکریپت اختصاصی ندارند (مثل تخفیف‌ها)
  var page=location.pathname.split("/").pop()||"index.html";
  if(/^(products|blog|sellers|offices)\.html$/.test(page)) return;
  var FA="۰۱۲۳۴۵۶۷۸۹"; function fa(s){ return String(s).replace(/[0-9]/g,function(d){return FA[+d];}); }
  document.querySelectorAll(".pagination").forEach(function(pg){
    var grid=pg.previousElementSibling; while(grid && !grid.children.length) grid=grid.previousElementSibling;
    if(!grid) return;
    var items=[].slice.call(grid.children), PER=8, cur=1;
    function render(){
      var pages=Math.max(1,Math.ceil(items.length/PER));
      items.forEach(function(it,i){ it.style.display = (i>=(cur-1)*PER && i<cur*PER) ? "" : "none"; });
      var h=""; for(var i=1;i<=pages;i++) h+='<a href="#" data-gp="'+i+'"'+(i===cur?' class="active"':'')+'>'+fa(i)+'</a>';
      pg.innerHTML=h; pg.style.display = pages>1 ? "" : "none";
    }
    pg.addEventListener("click",function(e){ var a=e.target.closest("[data-gp]"); if(!a) return; e.preventDefault(); cur=+a.getAttribute("data-gp"); render(); grid.scrollIntoView({behavior:"smooth",block:"start"}); });
    render();
  });
})();
