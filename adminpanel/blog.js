/* =====================================================================
   اتم — ویرایشگر و انتشار بلاگ (Blog editor & publisher)
   ویرایشگر WYSIWYG با نوار ابزار قالب‌بندی، درج لینک حرفه‌ای،
   آپلود تصویر شاخص در اندازه استاندارد سایت (۱۲۰۰×۶۳۰) و تصاویر
   درون‌متنی در سه اندازه. مقاله‌ها در localStorage ذخیره می‌شوند.
   ===================================================================== */
(function () {
  "use strict";
  if (!document.querySelector('[data-blog-view="editor"]')) return; // فقط صفحه بلاگ

  var LS_KEY = "atom_blog_posts_v1";
  var COVER_W = 1200, COVER_H = 630, INLINE_MAX = 1000;
  var FA = "۰۱۲۳۴۵۶۷۸۹";
  function toFa(s){ return String(s).replace(/[0-9]/g,function(d){return FA[+d];}); }
  function num(n){ return toFa(String(n).replace(/\B(?=(\d{3})+(?!\d))/g,"٬")); }
  function today(){ return "۱۴۰۴/۰۶/۱۲"; }
  function slugify(t){
    return (t||"").trim().replace(/\s+/g,"-").replace(/[^؀-ۿ\w-]/g,"").slice(0,60) || "مقاله-جدید";
  }
  function esc(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  /* ---------- data ---------- */
  var posts = [];
  function seed(){
    return [
      { id:1, title:"چگونه یک فروشگاه آنلاین موفق در بازارگاه بسازیم؟", slug:"successful-online-store",
        cat:"راهنمای فروش", author:"تیم محتوا", views:12408, date:"۱۴۰۴/۰۶/۱۲", status:"published",
        excerpt:"راهنمای گام‌به‌گام راه‌اندازی و رشد یک فروشگاه پرفروش در مارکت‌پلیس اتم.",
        cover:"", body:"<p>راه‌اندازی یک فروشگاه آنلاین موفق نیازمند برنامه‌ریزی دقیق است. در این مقاله مراحل کلیدی را مرور می‌کنیم.</p><h2>۱. انتخاب محصول مناسب</h2><p>پیش از هر چیز باید بازار هدف خود را بشناسید.</p>" },
      { id:2, title:"۷ نکته برای تشخیص چرم طبیعی از مصنوعی", slug:"real-vs-fake-leather",
        cat:"راهنمای خرید", author:"سارا محمدی", views:8940, date:"۱۴۰۴/۰۶/۱۰", status:"published",
        excerpt:"با این هفت نشانه ساده، چرم اصل را از مصنوعی تشخیص دهید.",
        cover:"", body:"<p>چرم طبیعی ویژگی‌های منحصربه‌فردی دارد که با کمی دقت قابل تشخیص است.</p>" },
      { id:3, title:"راهنمای انتخاب فرش دستباف", slug:"handmade-rug-guide",
        cat:"راهنمای خرید", author:"تیم محتوا", views:0, date:"—", status:"draft",
        excerpt:"", cover:"", body:"<p>پیش‌نویس…</p>" }
    ];
  }
  function load(){
    try { posts = JSON.parse(localStorage.getItem(LS_KEY)) || seed(); }
    catch(e){ posts = seed(); }
    if (!Array.isArray(posts) || !posts.length) posts = seed();
  }
  function save(){
    try { localStorage.setItem(LS_KEY, JSON.stringify(posts)); return true; }
    catch(e){ alert("فضای ذخیره‌سازی مرورگر پر شد. برای ذخیره تصاویر بیشتر، برخی مقالات قدیمی را حذف کنید."); return false; }
  }
  function nextId(){ return posts.reduce(function(m,p){return Math.max(m,p.id||0);},0)+1; }

  /* ---------- image resize via canvas ---------- */
  function fileToCover(file, cb){
    var r = new FileReader();
    r.onload = function(){
      var img = new Image();
      img.onload = function(){
        var c = document.createElement("canvas"); c.width=COVER_W; c.height=COVER_H;
        var ctx = c.getContext("2d");
        // cover-fit crop
        var sr = img.width/img.height, dr = COVER_W/COVER_H, sx,sy,sw,sh;
        if (sr > dr){ sh=img.height; sw=sh*dr; sx=(img.width-sw)/2; sy=0; }
        else { sw=img.width; sh=sw/dr; sx=0; sy=(img.height-sh)/2; }
        ctx.drawImage(img, sx,sy,sw,sh, 0,0,COVER_W,COVER_H);
        cb(c.toDataURL("image/jpeg", 0.82));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }
  function fileToInline(file, cb){
    var r = new FileReader();
    r.onload = function(){
      var img = new Image();
      img.onload = function(){
        var w=img.width, h=img.height;
        if (w > INLINE_MAX){ h = Math.round(h*INLINE_MAX/w); w = INLINE_MAX; }
        var c = document.createElement("canvas"); c.width=w; c.height=h;
        c.getContext("2d").drawImage(img,0,0,w,h);
        cb(c.toDataURL("image/jpeg", 0.82));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }

  /* ---------- views ---------- */
  function showView(v){
    document.querySelectorAll("[data-blog-view]").forEach(function(s){
      s.hidden = s.getAttribute("data-blog-view") !== v;
    });
    window.scrollTo(0,0);
  }

  /* ---------- list ---------- */
  var curFilter = "all";
  function renderList(){
    var pub = posts.filter(function(p){return p.status==="published";}).length;
    var dr = posts.filter(function(p){return p.status==="draft";}).length;
    var views = posts.reduce(function(s,p){return s+(p.views||0);},0);
    document.getElementById("blogStats").innerHTML =
      statCard("blog", toFa(posts.length), "کل مقالات") +
      statCard("check", toFa(pub), "منتشرشده") +
      statCard("edit", toFa(dr), "پیش‌نویس") +
      statCard("eye", num(views), "کل بازدید");

    var list = posts.filter(function(p){ return curFilter==="all" || p.status===curFilter; })
                    .sort(function(a,b){return b.id-a.id;});
    var tb = document.getElementById("blogList");
    if (!list.length){ tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--a-text-3);">مقاله‌ای یافت نشد.</td></tr>'; return; }
    tb.innerHTML = list.map(function(p){
      var scls = p.status==="published" ? "ok" : "pend";
      var sname = p.status==="published" ? "منتشرشده" : "پیش‌نویس";
      var thumb = p.cover
        ? '<span class="th-img" style="background-image:url('+p.cover+');"></span>'
        : '<span class="th-img av" style="background:linear-gradient(135deg,#22B14C,#0E7A38);">'+icon("blog")+'</span>';
      return '<tr>'+
        '<td><div class="row-th">'+thumb+'<div><b>'+esc(p.title)+'</b><span>'+esc(p.excerpt||"").slice(0,48)+'</span></div></div></td>'+
        '<td>'+esc(p.cat)+'</td><td>'+esc(p.author)+'</td>'+
        '<td>'+(p.views?num(p.views):"—")+'</td><td>'+p.date+'</td>'+
        '<td><span class="chip '+scls+'">'+sname+'</span></td>'+
        '<td><div class="act-icons">'+
          '<button data-view="'+p.id+'" title="پیش‌نمایش">'+icon("eye")+'</button>'+
          '<button data-edit="'+p.id+'" title="ویرایش">'+icon("edit")+'</button>'+
          '<button class="dl" data-del="'+p.id+'" title="حذف">'+icon("trash")+'</button>'+
        '</div></td></tr>';
    }).join("");
    tb.querySelectorAll("[data-edit]").forEach(function(b){ b.onclick=function(){ openEditor(+b.getAttribute("data-edit")); }; });
    tb.querySelectorAll("[data-view]").forEach(function(b){ b.onclick=function(){ var p=byId(+b.getAttribute("data-view")); if(p) openPreview(p); }; });
    tb.querySelectorAll("[data-del]").forEach(function(b){ b.onclick=function(){ var id=+b.getAttribute("data-del");
      if(confirm("حذف این مقاله؟")){ posts=posts.filter(function(p){return p.id!==id;}); save(); renderList(); } }; });
  }
  function statCard(ic,v,l){ return '<div class="stat"><div class="head"><div class="ic">'+icon(ic)+'</div></div><b style="font-size:1.5rem;">'+v+'</b><span>'+l+'</span></div>'; }
  function icon(n){ return '<svg class="icon"><use href="#i-'+n+'"/></svg>'; }
  function byId(id){ return posts.find(function(p){return p.id===id;}); }

  /* ---------- editor ---------- */
  var editingId = null, coverData = "";
  var $title=id("postTitle"), $slug=id("postSlug"), $body=id("postBody"),
      $cat=id("postCat"), $author=id("postAuthor"), $excerpt=id("postExcerpt"), $status=id("postStatus");
  function id(x){ return document.getElementById(x); }

  function openEditor(pid){
    editingId = pid || null;
    var p = pid ? byId(pid) : null;
    id("editorHeading").textContent = p ? "ویرایش مقاله" : "نوشتن مقاله جدید";
    $title.value = p ? p.title : "";
    $slug.value = p ? p.slug : "";
    $cat.value = p ? p.cat : $cat.options[0].value;
    $author.value = p ? p.author : "مدیر اصلی";
    $excerpt.value = p ? p.excerpt : "";
    $status.value = p ? p.status : "draft";
    $body.innerHTML = p ? p.body : "<p>متن مقاله را اینجا بنویسید…</p>";
    setCover(p ? p.cover : "");
    updateStatusChip();
    showView("editor");
    $title.focus();
  }
  function setCover(data){
    coverData = data || "";
    var prev=id("coverPreview"), empty=id("coverEmpty"), rm=id("coverRemove");
    if (coverData){ prev.src=coverData; prev.hidden=false; empty.hidden=true; rm.hidden=false; }
    else { prev.hidden=true; empty.hidden=false; rm.hidden=true; }
  }
  function updateStatusChip(){
    var c=id("editorStatusChip");
    if ($status.value==="published"){ c.textContent="منتشرشده"; c.className="chip ok"; }
    else { c.textContent="پیش‌نویس"; c.className="chip pend"; }
  }
  function collect(status){
    var title=$title.value.trim();
    if(!title){ alert("عنوان مقاله را وارد کنید."); $title.focus(); return null; }
    return {
      id: editingId || nextId(),
      title: title, slug: $slug.value.trim() || slugify(title),
      cat: $cat.value, author: $author.value.trim() || "مدیر اصلی",
      excerpt: $excerpt.value.trim(), cover: coverData,
      body: $body.innerHTML, status: status,
      views: (editingId && byId(editingId)) ? byId(editingId).views : 0,
      date: status==="published" ? today() : ((editingId && byId(editingId) && byId(editingId).date) || "—")
    };
  }
  function store(status){
    var a = collect(status); if(!a) return;
    var i = posts.findIndex(function(p){return p.id===a.id;});
    if (i>=0) posts[i]=a; else posts.push(a);
    if (save()){ renderList(); showView("list");
      toast(status==="published" ? "مقاله با موفقیت منتشر شد ✓" : "پیش‌نویس ذخیره شد ✓"); }
  }

  /* ---------- toolbar / formatting ---------- */
  var savedRange = null;
  function saveSel(){ var s=window.getSelection(); if(s.rangeCount && $body.contains(s.anchorNode)) savedRange=s.getRangeAt(0).cloneRange(); }
  function restoreSel(){ if(savedRange){ var s=window.getSelection(); s.removeAllRanges(); s.addRange(savedRange); } }
  $body.addEventListener("keyup", saveSel);
  $body.addEventListener("mouseup", saveSel);

  var toolbar = id("toolbar");
  toolbar.addEventListener("mousedown", function(e){ if(e.target.closest(".tb-btn")) e.preventDefault(); });
  toolbar.querySelectorAll(".tb-btn[data-cmd]").forEach(function(b){
    b.onclick = function(){ $body.focus(); restoreSel(); document.execCommand(b.getAttribute("data-cmd"), false, null); saveSel(); };
  });
  toolbar.querySelector("[data-block]").onchange = function(){
    $body.focus(); restoreSel();
    var v=this.value; document.execCommand("formatBlock", false, v==="p"?"<p>":"<"+v+">"); saveSel(); this.value="p";
  };
  toolbar.querySelector('[data-action="link"]').onclick = function(){ saveSel(); openLink(); };
  toolbar.querySelector('[data-action="image"]').onclick = function(){ saveSel(); openImg(); };

  /* auto slug from title */
  $title.addEventListener("input", function(){ if(!editingId) $slug.value = slugify($title.value); });
  $status.addEventListener("change", updateStatusChip);

  /* ---------- link dialog ---------- */
  function openLink(){
    var sel = window.getSelection();
    id("linkText").value = sel && $body.contains(sel.anchorNode) ? sel.toString() : "";
    id("linkUrl").value = ""; id("linkBlank").checked = true;
    id("linkModal").hidden = false; id("linkUrl").focus();
  }
  function closeLink(){ id("linkModal").hidden = true; }
  id("linkInsert").onclick = function(){
    var text=id("linkText").value.trim(), url=id("linkUrl").value.trim();
    if(!url){ alert("آدرس لینک را وارد کنید."); return; }
    if(!/^https?:\/\//i.test(url) && !url.startsWith("/")) url = "https://"+url;
    var blank = id("linkBlank").checked;
    var rel = blank ? ' target="_blank" rel="noopener noreferrer"' : '';
    var a = '<a href="'+esc(url)+'"'+rel+'>'+esc(text||url)+'</a>';
    $body.focus(); restoreSel();
    document.execCommand("insertHTML", false, a);
    saveSel(); closeLink();
  };

  /* ---------- image dialog ---------- */
  var pendingImg = "";
  function openImg(){ pendingImg=""; id("imgPreview").hidden=true; id("imgAlt").value="";
    id("imgModal").hidden=false; }
  function closeImg(){ id("imgModal").hidden=true; }
  id("imgInput").onchange = function(){
    if(!this.files[0]) return;
    fileToInline(this.files[0], function(data){ pendingImg=data; var pv=id("imgPreview"); pv.src=data; pv.hidden=false; });
  };
  id("imgInsert").onclick = function(){
    if(!pendingImg){ alert("ابتدا یک تصویر انتخاب کنید."); return; }
    var sz = (document.querySelector('input[name="imgsz"]:checked')||{}).value || "img-md";
    var alt = esc(id("imgAlt").value.trim());
    var html = '<figure class="post-fig '+sz+'"><img src="'+pendingImg+'" alt="'+alt+'">'+(alt?'<figcaption>'+alt+'</figcaption>':'')+'</figure><p></p>';
    $body.focus(); restoreSel();
    document.execCommand("insertHTML", false, html);
    saveSel(); closeImg();
  };

  /* ---------- cover upload ---------- */
  id("coverDrop").addEventListener("click", function(e){ if(e.target.closest("#coverRemove")) return; id("coverInput").click(); });
  id("coverInput").onchange = function(){ if(this.files[0]) fileToCover(this.files[0], function(d){ setCover(d); }); };
  id("coverRemove").onclick = function(e){ e.stopPropagation(); setCover(""); id("coverInput").value=""; };

  /* ---------- preview ---------- */
  function articleHTML(p){
    var cover = p.cover ? '<div class="article-cover"><img src="'+p.cover+'" alt="'+esc(p.title)+'"></div>' : '';
    return cover +
      '<div class="article-meta"><span class="chip info">'+esc(p.cat)+'</span>'+
      '<span>'+esc(p.author)+'</span><span>'+(p.date==="—"?today():p.date)+'</span></div>'+
      '<h1 class="article-title">'+esc(p.title)+'</h1>'+
      (p.excerpt?'<p class="article-lead">'+esc(p.excerpt)+'</p>':'')+
      '<div class="article-body">'+p.body+'</div>';
  }
  function openPreview(p){ id("previewBody").innerHTML = articleHTML(p); id("previewModal").hidden=false; }
  function openPreviewLive(){ var a=collect($status.value); if(a) openPreview(a); }

  /* ---------- toast ---------- */
  function toast(msg){
    var t=document.createElement("div"); t.className="atom-toast"; t.innerHTML=icon("check")+" "+msg;
    document.body.appendChild(t); setTimeout(function(){t.classList.add("show");},10);
    setTimeout(function(){ t.classList.remove("show"); setTimeout(function(){t.remove();},300); }, 2600);
  }

  /* ---------- wiring ---------- */
  document.querySelector("[data-new-post]").onclick = function(){ openEditor(null); };
  document.querySelectorAll("[data-blog-back]").forEach(function(b){ b.onclick=function(){ showView("list"); }; });
  document.querySelector("[data-blog-savedraft]").onclick = function(){ store("draft"); };
  document.querySelector("[data-blog-publish]").onclick = function(){ store("published"); };
  document.querySelector("[data-blog-preview]").onclick = openPreviewLive;
  document.querySelectorAll("[data-link-cancel]").forEach(function(b){ b.onclick=closeLink; });
  document.querySelectorAll("[data-img-cancel]").forEach(function(b){ b.onclick=closeImg; });
  document.querySelectorAll("[data-preview-close]").forEach(function(b){ b.onclick=function(){ id("previewModal").hidden=true; }; });
  id("previewModal").addEventListener("click", function(e){ if(e.target.id==="previewModal") this.hidden=true; });
  id("blogFilter").querySelectorAll("button").forEach(function(b){
    b.onclick = function(){ id("blogFilter").querySelectorAll("button").forEach(function(x){x.classList.remove("active");});
      b.classList.add("active"); curFilter=b.getAttribute("data-filter"); renderList(); };
  });

  load(); renderList(); showView("list");
})();
