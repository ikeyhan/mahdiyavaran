/* =====================================================================
   اتم ۳۱۳ — «حساب من» (dashboard.html) برای خریداران
   سفارش‌های واقعی، علاقه‌مندی‌ها، پیام به پشتیبانی، اعلان‌های سفارش،
   ویرایش پروفایل و تغییر رمز — روی سرور یا در حالت HTML.
   ===================================================================== */
(function () {
  "use strict";
  var SA = window.SiteAuth; if (!SA) return;
  if (!SA.isAuthed()) { location.replace("login.html?next=dashboard.html#customer"); return; }
  var me = SA.user() || {};
  if (me.role !== "customer") { location.replace(SA.home()); return; }

  var FA = "۰۱۲۳۴۵۶۷۸۹";
  function fa(s) { return String(s == null ? "" : s).replace(/[0-9]/g, function (d) { return FA[+d]; }); }
  function money(n) { return fa(String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")) + " ت"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pdate(s) {
    var d = new Date(String(s || "").replace(" ", "T")); if (isNaN(d)) return fa(String(s || "").slice(0, 10));
    try { return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d); } catch (e) { return fa(String(s).slice(0, 10)); }
  }
  function $(s) { return document.querySelector(s); }
  function panel(k) { return document.querySelector('[data-dash-panel="' + k + '"]'); }
  var ST = { pending: ["در انتظار تأیید", "pend"], review: ["در حال بررسی", "pend"], shipping: ["در حال ارسال", "pend"], delivered: ["تحویل شد", "ok"], returned: ["مرجوع شد", "cancel"] };
  function chip(s) { var m = ST[s] || [s, "pend"]; return '<span class="status-chip ' + m[1] + '">' + esc(m[0]) + "</span>"; }

  /* ---------- پروفایل کناری ---------- */
  function paintProfile(u) {
    var side = $(".dash-profile");
    if (side) {
      var ava = side.querySelector(".ava"); if (ava) { ava.className = "ava"; ava.style.cssText = "border-radius:50%;background:linear-gradient(135deg,#0E7A38,#37C463);display:grid;place-items:center;color:#fff;font-weight:800;font-size:1.4rem;"; ava.textContent = (u.name || u.username || "?").charAt(0); }
      var b = side.querySelector("b"); if (b) b.textContent = u.name || u.username;
      var sp = side.querySelector("span"); if (sp) sp.textContent = u.created_at ? "عضو از " + pdate(u.created_at).slice(0, 4) : "حساب خریدار";
    }
    var hi = panel("overview") && panel("overview").querySelector("h1"); if (hi) hi.textContent = "سلام " + (u.name || u.username).split(" ")[0] + "، خوش آمدی 👋";
    [["pfName", "name"], ["pfPhone", "phone"], ["pfEmail", "email"], ["pfCity", "city"], ["pfAddress", "address"]].forEach(function (p) { var el = document.getElementById(p[0]); if (el) el.value = u[p[1]] || ""; });
  }
  paintProfile(me);

  /* ---------- سفارش‌ها ---------- */
  var groups = [];
  function groupOrders(rows) {
    var map = {}, order = [];
    rows.forEach(function (o) {
      if (!map[o.code]) { map[o.code] = { code: o.code, items: [], amount: 0, status: o.status, date: o.created_at, address: o.address, note: o.note, phone: o.phone }; order.push(o.code); }
      var g = map[o.code]; g.items.push(o); g.amount += +o.amount || 0;
      if (o.status !== "delivered") g.status = o.status;
    });
    return order.map(function (c) { return map[c]; });
  }
  function orderRow(g, withSeller) {
    var names = g.items.map(function (i) { return i.product; }).join("، ");
    return "<tr><td class=\"flex gap-12\"><div class=\"prow-thumb ph-" + ((+g.code % 6) + 1) + "\"></div> <span><b>#" + fa(g.code) + "</b><br><span class=\"faint\" style=\"font-size:.78rem\">" + esc(names.length > 60 ? names.slice(0, 60) + "…" : names) + "</span></span></td>" +
      (withSeller ? "<td>" + esc(g.items.map(function (i) { return i.seller; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join("، ")) + "</td>" : "") +
      "<td>" + pdate(g.date) + "</td><td>" + money(g.amount) + "</td><td>" + chip(g.status) + "</td>" +
      (withSeller ? '<td><button class="btn btn-sm" data-order="' + esc(g.code) + '">جزئیات</button></td>' : "") + "</tr>";
  }
  function renderOrders() {
    var ov = panel("overview"), op = panel("orders");
    var cards = ov ? ov.querySelectorAll(".dash-card") : [];
    function card(i, v, l) { if (!cards[i]) return; var b = cards[i].querySelector("b"), s = cards[i].querySelector(":scope > span"); if (b) b.textContent = v; if (s && l) s.textContent = l; var tr = cards[i].querySelector(".trend-up"); if (tr) tr.remove(); }
    card(0, fa(groups.length), "کل سفارش‌ها");
    card(1, fa(groups.filter(function (g) { return g.status === "shipping" || g.status === "pending" || g.status === "review"; }).length), "در جریان");
    card(2, fa(window.AtomWish ? AtomWish.get().length : 0), "علاقه‌مندی");
    card(3, money(groups.reduce(function (s, g) { return s + (g.status === "returned" ? 0 : g.amount); }, 0)), "مجموع خرید");
    var empty = '<tr><td colspan="6" style="text-align:center;padding:26px;color:var(--text-3)">هنوز سفارشی ثبت نکرده‌اید. <a href="products.html" style="color:var(--green-600);font-weight:700">شروع خرید</a></td></tr>';
    var t1 = ov && ov.querySelector("table tbody"); if (t1) t1.innerHTML = groups.length ? groups.slice(0, 5).map(function (g) { return orderRow(g, false); }).join("") : empty;
    var t2 = op && op.querySelector("table tbody"); if (t2) t2.innerHTML = groups.length ? groups.map(function (g) { return orderRow(g, true); }).join("") : empty;
    renderNotifications();
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-order]"); if (!b) return;
    var g = groups.filter(function (x) { return String(x.code) === b.getAttribute("data-order"); })[0]; if (!g) return;
    var tr = b.closest("tr"), nx = tr.nextElementSibling;
    if (nx && nx.classList.contains("order-detail")) { nx.remove(); return; }
    var d = document.createElement("tr"); d.className = "order-detail";
    d.innerHTML = '<td colspan="6"><div class="od-box">' + g.items.map(function (i) { return '<div class="flex between"><span>' + esc(i.product) + ' <span class="faint">— ' + esc(i.seller) + "</span></span><b>" + money(i.amount) + "</b></div>"; }).join("") +
      (g.address ? '<div class="faint" style="margin-top:8px">آدرس: ' + esc(g.address) + "</div>" : "") + (g.note ? '<div class="faint">' + esc(g.note) + "</div>" : "") +
      '<a class="btn btn-sm" style="margin-top:10px" href="track.html?code=' + encodeURIComponent(g.code) + "&phone=" + encodeURIComponent(g.phone || me.phone || "") + '">پیگیری سفارش</a></div></td>';
    tr.insertAdjacentElement("afterend", d);
  });
  document.querySelectorAll("[data-dash-tab-link]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); var t = document.querySelector('[data-dash-tab="' + a.getAttribute("data-dash-tab-link") + '"]'); if (t) t.click(); });
  });

  /* ---------- علاقه‌مندی‌ها ---------- */
  function renderFavs() {
    var grid = panel("favorites") && panel("favorites").querySelector(".fav-grid"); if (!grid || !window.AtomWish) return;
    var list = AtomWish.get();
    grid.innerHTML = list.length ? list.map(function (w, i) {
      var thumb = w.img ? '<div class="ph" style="background:#EEF3EF ' + esc(w.img) + ' center/cover no-repeat"></div>' : '<div class="' + esc(w.thumb || "ph ph-" + ((i % 6) + 1)) + '"></div>';
      return '<article class="prod-card"' + (w.pid ? ' data-pid="' + esc(w.pid) + '"' : "") + '><div class="prod-thumb">' + thumb + '<button class="wish-btn active" data-wish aria-label="حذف از علاقه‌مندی"><svg class="icon"><use href="#icon-heart-filled"/></svg></button></div>' +
        '<div class="prod-body"><h3 class="prod-title">' + esc(w.title) + "</h3>" + (w.seller ? '<span class="prod-seller">' + esc(w.seller) + "</span>" : "") +
        '<div class="prod-foot"><div class="price"><b>' + (w.price ? money(w.price) : "—") + '</b></div><button class="add-btn" aria-label="افزودن به سبد"><svg class="icon"><use href="#icon-cart"/></svg></button></div></div></article>';
    }).join("") : '<div class="cat-empty"><svg class="icon"><use href="#icon-heart"/></svg><b>فهرست علاقه‌مندی شما خالی است</b><span>با زدن ♡ روی هر محصول، آن را اینجا ذخیره کنید.</span><a class="btn btn-primary btn-sm" href="products.html">مشاهدهٔ محصولات</a></div>';
  }
  document.addEventListener("click", function (e) { if (e.target.closest(".fav-grid [data-wish]")) setTimeout(function () { renderFavs(); renderOrders(); }, 30); });

  /* ---------- پیام به پشتیبانی ---------- */
  function renderMessages() {
    var p = panel("messages"); if (!p) return;
    var box = p.querySelector(".panel"); if (!box) return;
    var sent = []; try { sent = JSON.parse(localStorage.getItem("atom_my_msgs_" + me.username) || "[]"); } catch (e) {}
    box.innerHTML = '<form id="msgForm"><div class="field"><label>موضوع</label><input type="text" id="msgSubject" placeholder="مثلاً پیگیری سفارش #۱۰۰۱"></div>' +
      '<div class="field" style="margin-top:12px"><label>متن پیام</label><textarea id="msgBody" placeholder="پیام خود را برای پشتیبانی اتم بنویسید…"></textarea></div>' +
      '<button class="btn btn-primary" style="margin-top:14px" type="submit">ارسال به پشتیبانی</button></form>' +
      (sent.length ? '<h3 class="h-3" style="margin:24px 0 8px">پیام‌های ارسال‌شده</h3>' + sent.map(function (m) { return '<div class="msg-item"><div class="ava" style="background:var(--surface-2);display:grid;place-items:center"><svg class="icon"><use href="#icon-chat"/></svg></div><div style="flex:1"><div class="flex between"><b style="font-size:.88rem">' + esc(m.subject) + '</b><span class="faint" style="font-size:.72rem">' + esc(m.date) + '</span></div><p class="muted" style="font-size:.83rem;margin:4px 0 0">' + esc(m.body) + "</p></div></div>"; }).join("") : "");
    var f = document.getElementById("msgForm");
    f.onsubmit = async function (e) {
      e.preventDefault();
      var sub = document.getElementById("msgSubject").value.trim(), body = document.getElementById("msgBody").value.trim();
      if (!body) return Toast("متن پیام را بنویسید.", "err");
      var btn = f.querySelector("button"); btn.disabled = true;
      try {
        await SA.supportMessage({ sender: (me.name || me.username) + " (" + (me.phone || me.username) + ")", subject: sub || "پیام از حساب کاربری", body: body });
        sent.unshift({ subject: sub || "پیام از حساب کاربری", body: body, date: pdate(new Date().toISOString()) });
        try { localStorage.setItem("atom_my_msgs_" + me.username, JSON.stringify(sent.slice(0, 30))); } catch (er) {}
        Toast("پیام شما برای پشتیبانی ارسال شد ✓"); renderMessages();
      } catch (er) { Toast(er.message, "err"); btn.disabled = false; }
    };
  }

  /* ---------- اعلان‌ها (از روی وضعیت سفارش‌ها) ---------- */
  function renderNotifications() {
    var p = panel("notifications"); if (!p) return; var box = p.querySelector(".panel"); if (!box) return;
    var MSG = { pending: ["box", "سفارش #{c} ثبت شد و در انتظار تأیید است"], review: ["shield", "سفارش #{c} در حال بررسی است"], shipping: ["truck", "سفارش #{c} ارسال شد"], delivered: ["badge-check", "سفارش #{c} تحویل داده شد"], returned: ["box", "مرجوعی سفارش #{c} ثبت شد"] };
    var list = groups.map(function (g) { var m = MSG[g.status] || MSG.pending; return '<div class="notif-item"><div class="ic"><svg class="icon"><use href="#icon-' + m[0] + '"/></svg></div><div><b style="font-size:.86rem; display:block;">' + esc(m[1].replace("{c}", fa(g.code))) + '</b><span class="faint" style="font-size:.78rem;">' + pdate(g.date) + " · " + money(g.amount) + "</span></div></div>"; });
    list.push('<div class="notif-item"><div class="ic"><svg class="icon"><use href="#icon-badge-check"/></svg></div><div><b style="font-size:.86rem; display:block;">به اتم ۳۱۳ خوش آمدید</b><span class="faint" style="font-size:.78rem;">حساب خریدار شما فعال است</span></div></div>');
    box.innerHTML = list.join("");
  }

  /* ---------- ذخیرهٔ پروفایل و تغییر رمز ---------- */
  var sv = document.getElementById("pfSave");
  if (sv) sv.addEventListener("click", async function () {
    var d = {}; [["pfName", "name"], ["pfPhone", "phone"], ["pfEmail", "email"], ["pfCity", "city"], ["pfAddress", "address"]].forEach(function (p) { d[p[1]] = document.getElementById(p[0]).value.trim(); });
    if (!d.name) return Toast("نام را وارد کنید.", "err");
    sv.disabled = true;
    try { var r = await SA.saveProfile(d); me = SA.user(); paintProfile(Object.assign({}, me, r.user)); Toast("پروفایل ذخیره شد ✓"); } catch (e) { Toast(e.message, "err"); }
    sv.disabled = false;
  });
  var rs = document.getElementById("pfReset"); if (rs) rs.addEventListener("click", function () { loadProfile(); Toast("تغییرات لغو شد"); });
  var pw = document.getElementById("pwSave");
  if (pw) pw.addEventListener("click", async function () {
    var c = document.getElementById("pwCur").value, n = document.getElementById("pwNew").value;
    if (!c || !n) return Toast("رمز فعلی و جدید را وارد کنید.", "err");
    pw.disabled = true;
    try { await SA.changePassword(c, n); document.getElementById("pwCur").value = document.getElementById("pwNew").value = ""; Toast("رمز عبور تغییر کرد ✓"); } catch (e) { Toast(e.message, "err"); }
    pw.disabled = false;
  });

  async function loadProfile() { try { var d = await SA.profile(); if (d && d.user) paintProfile(d.user); } catch (e) {} }
  async function loadOrders() { try { var d = await SA.myOrders(); groups = groupOrders(d.items || []); } catch (e) { groups = []; } renderOrders(); }
  var tab = (location.hash || "").slice(1); var tb = tab && document.querySelector('[data-dash-tab="' + tab + '"]'); if (tb) setTimeout(function () { tb.click(); }, 0);
  loadProfile(); loadOrders(); renderFavs(); renderMessages();
})();
