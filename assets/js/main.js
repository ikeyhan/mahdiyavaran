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
      var r = await fetch(API+"/support/chat", {method:"POST",headers:{"Content-Type":"application/json"},
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
      await fetch(API+"/support/message",{method:"POST",headers:{"Content-Type":"application/json"},
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
      var r = await fetch(API+"/support/config",{signal:c.signal}); clearTimeout(to);
      if(r.ok){ var d = await r.json(); online = true;
        cfg.enabled = d.enabled!==false; cfg.title=d.title||cfg.title; cfg.welcome=d.welcome||cfg.welcome;
        cfg.avatar=d.avatar||""; cfg.color=d.color||cfg.color; cfg.aiEnabled=!!d.aiEnabled;
        if(Array.isArray(d.faqs)&&d.faqs.length) cfg.faqs=d.faqs;
      }
    } catch(e){ online=false; }
    render();
  })();
})();
