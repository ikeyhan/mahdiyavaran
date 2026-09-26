/* =====================================================================
   اتم — فعال‌ساز سراسری پنل مدیریت
   هر دکمه، تب، جدول، فیلتر، فرم و کلید در همهٔ صفحات پنل کار می‌کند:
   - تب‌ها: فیلتر وضعیت جدول یا نمایش بخش مربوط
   - ردیف‌ها: مشاهده / ویرایش / حذف / اجرای مجدد (با ذخیرهٔ ماندگار)
   - افزودن مورد جدید با فرم خودکار، خروجی CSV/چاپ PDF
   - ذخیرهٔ ماندگار فرم‌ها و کلیدها (روی سرور و در مرورگر)
   - جستجو، فیلتر، صفحه‌بندی، اعلان‌ها، پشتیبان‌گیری، سلامت سیستم
   جدول‌هایی که pages.js به API وصل کرده (data-bound) دست‌نخورده می‌مانند
   و فقط فیلتر/جستجو/صفحه‌بندی روی آن‌ها اعمال می‌شود.
   ===================================================================== */
(function () {
  "use strict";
  var main = document.querySelector(".admin-main[data-page]");
  if (!main) return;
  var page = main.getAttribute("data-page");
  var API = window.AtomAPI;
  var OWN_PAGES = { accounting: 1, blog: 1 }; // این صفحات اسکریپت اختصاصی کامل دارند

  /* ---------- ابزارها ---------- */
  var FA = "۰۱۲۳۴۵۶۷۸۹";
  function fa(s) { return String(s == null ? "" : s).replace(/[0-9]/g, function (d) { return FA[+d]; }); }
  function en(s) { return String(s == null ? "" : s).replace(/[۰-۹]/g, function (d) { return FA.indexOf(d); }).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }); }
  function norm(s) { return en(String(s || "")).replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌\s]+/g, " ").trim().toLowerCase(); }
  function money(n) { return fa(String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, "٬")) + " ت"; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function text(el) { return el ? (el.textContent || "").replace(/\s+/g, " ").trim() : ""; }
  function label(el) { return text(el).replace(/\([^)]*\)/g, "").trim(); }
  function icon(n) { return '<svg class="icon"><use href="#i-' + n + '"/></svg>'; }
  function today() {
    try { return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replace(/‎/g, ""); }
    catch (e) { return fa(new Date().toISOString().slice(0, 10).replace(/-/g, "/")); }
  }
  function nowTime() { var d = new Date(); return fa(("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2)); }
  function toast(msg, bad) {
    var t = document.createElement("div"); t.className = "atom-toast" + (bad ? " bad" : "");
    t.innerHTML = icon(bad ? "x" : "check") + " " + esc(msg);
    document.body.appendChild(t); setTimeout(function () { t.classList.add("show"); }, 10);
    setTimeout(function () { t.classList.remove("show"); setTimeout(function () { t.remove(); }, 300); }, 2800);
  }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function download(name, content, type) {
    var blob = new Blob([content], { type: type || "text/plain;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function busy(btn, ms, done) {
    var html = btn.innerHTML; btn.disabled = true; btn.innerHTML = icon("refresh") + " در حال انجام…";
    setTimeout(function () { btn.disabled = false; btn.innerHTML = html; if (done) done(); }, ms || 900);
  }

  /* ---------- جدول‌ها ---------- */
  function tables() { return [].slice.call(main.querySelectorAll("table.tbl")); }
  function listTable() { var ts = tables(); return ts.filter(function (t) { return !t.closest(".card"); })[0] || ts[0] || null; }
  function isBound(t) { return !!(t && t.hasAttribute("data-bound")); }
  function heads(t) { return [].slice.call(t.querySelectorAll("thead th")).map(text); }
  function bodyRows(t) { return t && t.tBodies[0] ? [].slice.call(t.tBodies[0].rows).filter(function (r) { return !r.hasAttribute("data-empty") && r.cells.length > 1; }) : []; }
  function nearTable(el) {
    var card = el.closest(".card");
    if (card) { var t = card.querySelector("table.tbl"); if (t) return t; }
    return listTable();
  }
  function colIndex(t, re) { var h = heads(t); for (var i = 0; i < h.length; i++) if (re.test(h[i])) return i; return -1; }

  /* ---------- ماندگاری جدول‌ها و فهرست‌های ایستا ---------- */
  var SKEY = "atom_panel_static_v1:" + page + ":";
  function stores() { return [].slice.call(main.querySelectorAll("table.tbl tbody, .perm-list")); }
  function storeKey(el) { return SKEY + stores().indexOf(el); }
  function persist(el) {
    if (!el) return;
    if (el.tagName === "TABLE") el = el.tBodies[0];
    if (!el || (el.closest("table") && isBound(el.closest("table")))) return;
    var clone = el.cloneNode(true);
    [].slice.call(clone.querySelectorAll("[data-empty]")).forEach(function (x) { x.remove(); });
    [].slice.call(clone.children).forEach(function (x) { x.style.display = ""; x.removeAttribute("data-hide"); });
    lsSet(storeKey(el), clone.innerHTML);
  }
  function restore() {
    stores().forEach(function (el) {
      var t = el.closest("table"); if (t && isBound(t)) return;
      var saved = lsGet(storeKey(el), null);
      if (typeof saved === "string") el.innerHTML = saved;
    });
  }

  /* ---------- مودال فرم عمومی ---------- */
  var modal;
  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement("div"); modal.className = "mini-modal"; modal.hidden = true;
    modal.innerHTML = '<div class="mini-card"><div class="mini-head"><h3></h3><button class="icon-btn" data-x>' + icon("x") + '</button></div><div class="mini-body"></div><div class="mini-foot"><button class="abtn" data-x>انصراف</button><button class="abtn primary" data-ok>ذخیره</button></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener("click", function (e) { if (e.target === modal || e.target.closest("[data-x]")) modal.hidden = true; });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal) modal.hidden = true; });
    return modal;
  }
  // fields: [{label, value, type:'text'|'select'|'textarea'|'readonly'|'password'|'file', options:[]}]
  function openForm(title, fields, onOk, okLabel) {
    ensureModal();
    modal.querySelector("h3").textContent = title;
    var body = modal.querySelector(".mini-body");
    body.innerHTML = fields.map(function (f, i) {
      var id = "af_" + i, v = f.value == null ? "" : f.value;
      if (f.type === "readonly") return '<div class="field"><label>' + esc(f.label) + '</label><div class="ro-val" style="padding:10px 12px;border:1px solid var(--a-border);border-radius:10px;background:var(--a-surface-2,transparent);font-size:.86rem;line-height:1.9;white-space:pre-wrap">' + (esc(v) || "—") + "</div></div>";
      if (f.type === "select") return '<div class="field"><label>' + esc(f.label) + '</label><select id="' + id + '">' + f.options.map(function (o) { return "<option" + (o === v ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select></div>";
      if (f.type === "textarea") return '<div class="field"><label>' + esc(f.label) + '</label><textarea id="' + id + '" rows="4">' + esc(v) + "</textarea></div>";
      if (f.type === "file") return '<div class="field"><label>' + esc(f.label) + '</label><input type="file" id="' + id + '"' + (f.accept ? ' accept="' + f.accept + '"' : "") + "></div>";
      return '<div class="field"><label>' + esc(f.label) + '</label><input type="' + (f.type === "password" ? "password" : "text") + '" id="' + id + '" value="' + esc(v) + '"' + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "") + "></div>";
    }).join("");
    var ok = modal.querySelector("[data-ok]");
    ok.style.display = onOk ? "" : "none";
    ok.textContent = okLabel || "ذخیره";
    ok.onclick = async function () {
      var vals = fields.map(function (f, i) {
        var el = document.getElementById("af_" + i);
        if (!el) return f.value; if (f.type === "file") return el.files[0] || null; return el.value;
      });
      try { var r = await onOk(vals); if (r !== false) modal.hidden = true; }
      catch (e) { toast(e.message || "خطا", true); }
    };
    modal.hidden = false;
    var first = body.querySelector("input:not([type=file]),textarea,select"); if (first) setTimeout(function () { first.focus(); }, 30);
  }

  /* ---------- ویرایش/افزودن ردیف جدول ایستا ---------- */
  function columnChips(t, ci) {
    var map = {};
    bodyRows(t).forEach(function (r) { var c = r.cells[ci] && r.cells[ci].querySelector(".chip"); if (c) map[text(c)] = c.className; });
    return map;
  }
  function rowFields(t, row) {
    var h = heads(t), out = [];
    h.forEach(function (lbl, i) {
      if (!lbl) return; // ستون عملیات
      var cell = row ? row.cells[i] : null, chips = columnChips(t, i);
      var chip = cell && cell.querySelector(".chip");
      if (chip || (!row && Object.keys(chips).length)) {
        var opts = Object.keys(chips); var cur = chip ? text(chip) : opts[0];
        if (cur && opts.indexOf(cur) === -1) opts.unshift(cur);
        out.push({ label: lbl, value: cur, type: "select", options: opts, ci: i });
      } else {
        var v = cell ? text(cell.querySelector(".row-th b, b.sm") || cell) : "";
        out.push({ label: lbl, value: v, type: v.length > 60 ? "textarea" : "text", ci: i });
      }
    });
    return out;
  }
  function writeCell(t, cell, ci, val) {
    var chips = columnChips(t, ci);
    var chip = cell.querySelector(".chip");
    if (chip) { chip.textContent = val; if (chips[val]) chip.className = chips[val]; return; }
    var b = cell.querySelector(".row-th b, b.sm");
    if (b) { b.textContent = val; return; }
    var strong = cell.querySelector("b");
    if (strong && cell.children.length === 1) { strong.textContent = val; return; }
    cell.textContent = val;
  }
  function editRow(t, row) {
    var fields = rowFields(t, row);
    openForm("ویرایش مورد", fields, function (vals) {
      fields.forEach(function (f, k) { writeCell(t, row.cells[f.ci], f.ci, vals[k]); });
      persist(t); refresh(t); toast("تغییرات ذخیره شد ✓");
    });
  }
  function viewRow(t, row) {
    var h = heads(t);
    openForm("جزئیات", h.map(function (lbl, i) { return lbl ? { label: lbl, value: text(row.cells[i]), type: "readonly" } : null; }).filter(Boolean), null);
  }
  function addRow(t, title) {
    var fields = rowFields(t, null);
    if (!fields.length) return toast("این بخش فرم افزودن ندارد.", true);
    openForm(title || "افزودن مورد جدید", fields, function (vals) {
      if (!String(vals[0] || "").trim()) { toast("فیلد «" + fields[0].label + "» الزامی است.", true); return false; }
      var tpl = bodyRows(t)[0], tr;
      if (tpl) {
        tr = tpl.cloneNode(true); tr.style.display = ""; tr.removeAttribute("data-hide");
        fields.forEach(function (f, k) { writeCell(t, tr.cells[f.ci], f.ci, vals[k]); });
      } else {
        tr = document.createElement("tr");
        heads(t).forEach(function (lbl, i) {
          var td = document.createElement("td");
          var f = fields.filter(function (x) { return x.ci === i; })[0];
          td.innerHTML = f ? esc(vals[fields.indexOf(f)]) : '<div class="act-icons"><button title="ویرایش">' + icon("edit") + '</button><button class="dl" title="حذف">' + icon("trash") + "</button></div>";
          tr.appendChild(td);
        });
      }
      var empty = t.tBodies[0].querySelector("[data-empty]"); if (empty) empty.remove();
      t.tBodies[0].insertBefore(tr, t.tBodies[0].firstChild);
      persist(t); refresh(t); toast("مورد جدید افزوده شد ✓");
    }, "افزودن");
  }
  function exportCSV(t, name) {
    if (!t) return toast("جدولی برای خروجی وجود ندارد.", true);
    var h = heads(t), keep = h.map(function (x) { return !!x; });
    var lines = [h.filter(function (x, i) { return keep[i]; })];
    bodyRows(t).filter(function (r) { return r.style.display !== "none" || r.hasAttribute("data-page-hide"); }).forEach(function (r) {
      lines.push([].slice.call(r.cells).filter(function (c, i) { return keep[i]; }).map(text));
    });
    var csv = "﻿" + lines.map(function (l) { return l.map(function (v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); }).join("\r\n");
    download((name || page) + "-" + new Date().toISOString().slice(0, 10) + ".csv", csv, "text/csv;charset=utf-8");
    toast("فایل خروجی دانلود شد ✓");
  }

  /* ---------- فیلتر + جستجو + صفحه‌بندی ---------- */
  var PAGE_SIZE = 10;
  function refresh(t) {
    if (!t || !t.tBodies[0]) return;
    var st = t.__st || (t.__st = { filter: null, q: "", extra: null, page: 1 });
    var rows = bodyRows(t), shown = [];
    rows.forEach(function (r) {
      var ok = (!st.filter || st.filter(r)) && (!st.q || norm(r.textContent).indexOf(st.q) !== -1) && (!st.extra || st.extra(r));
      r.setAttribute("data-hide", ok ? "0" : "1");
      if (ok) shown.push(r);
    });
    var pgn = pagerFor(t);
    var pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
    if (!pgn) { rows.forEach(function (r) { r.style.display = r.getAttribute("data-hide") === "1" ? "none" : ""; }); }
    else {
      if (st.page > pages) st.page = pages;
      rows.forEach(function (r) { r.style.display = "none"; });
      shown.slice((st.page - 1) * PAGE_SIZE, st.page * PAGE_SIZE).forEach(function (r) { r.style.display = ""; });
      var html = "";
      if (pages > 1) html += '<a href="#" data-pg="' + Math.max(1, st.page - 1) + '" aria-label="قبلی">' + icon("chevron-right") + "</a>";
      for (var i = 1; i <= pages; i++) html += '<a href="#" data-pg="' + i + '"' + (i === st.page ? ' class="active"' : "") + ">" + fa(i) + "</a>";
      if (pages > 1) html += '<a href="#" data-pg="' + Math.min(pages, st.page + 1) + '" aria-label="بعدی">' + icon("chevron-left") + "</a>";
      pgn.innerHTML = html;
    }
    var old = t.tBodies[0].querySelector("[data-empty]");
    if (!shown.length && rows.length + (old ? 0 : 0) >= 0) {
      if (!old && (rows.length || st.filter || st.q || st.extra)) {
        var tr = document.createElement("tr"); tr.setAttribute("data-empty", "1");
        tr.innerHTML = '<td colspan="' + Math.max(1, heads(t).length) + '" style="text-align:center;padding:26px;color:var(--a-text-3)">موردی یافت نشد.</td>';
        t.tBodies[0].appendChild(tr);
      }
    } else if (old) old.remove();
  }
  function pagerFor(t) {
    var wrap = t.closest(".tbl-wrap") || t; var n = wrap.nextElementSibling;
    return n && n.classList.contains("pgn") ? n : null;
  }
  main.addEventListener("click", function (e) {
    var a = e.target.closest(".pgn a"); if (!a) return;
    e.preventDefault();
    var pgn = a.closest(".pgn"), wrap = pgn.previousElementSibling, t = wrap && (wrap.matches("table") ? wrap : wrap.querySelector("table.tbl"));
    if (!t) return; t.__st = t.__st || { page: 1 };
    t.__st.page = +a.getAttribute("data-pg") || 1; refresh(t);
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------- تب‌ها ---------- */
  var STOP = { "در": 1, "و": 1, "حال": 1, "همه": 1, "از": 1, "به": 1 };
  function keywords(lbl) {
    return norm(lbl).split(" ").filter(function (w) { return w.length > 1 && !STOP[w]; })
      .map(function (w) { return w.replace(/(شده|ها|های)$/, "").trim(); }).filter(function (w) { return w.length > 1; });
  }
  function sections() {
    return [].slice.call(main.querySelectorAll(".card")).filter(function (c) { return !c.closest(".mini-modal") && c.querySelector(".card-head h3"); });
  }
  function showAllSections() {
    sections().forEach(function (c) { c.style.display = ""; });
    [].slice.call(main.querySelectorAll(".grid-2,.grid-3,.tbl-wrap,.pgn,.chart-card,.filter-row")).forEach(function (g) { g.style.display = ""; });
  }
  function applyTab(idx, lbl) {
    var t = listTable();
    showAllSections();
    if (t) { t.__st = t.__st || { page: 1 }; t.__st.filter = null; t.__st.page = 1; }
    if (idx === 0 || /^همه/.test(lbl)) { if (t) refresh(t); return; }
    var kws = keywords(lbl); if (!kws.length) return;
    var k0 = kws[0];
    // ۱) فیلتر وضعیت جدول اصلی (بر اساس چیپ وضعیت)
    if (t && !t.closest(".card")) {
      var special = null;
      if (/موجودی کم/.test(lbl)) { var si = colIndex(t, /موجودی/); if (si >= 0) special = function (r) { var n = +en(text(r.cells[si])).replace(/[^0-9]/g, ""); return n > 0 && n <= 10; }; }
      var chipMatch = function (r) { return [].slice.call(r.querySelectorAll(".chip")).some(function (c) { return norm(text(c)).indexOf(k0) !== -1; }); };
      var textMatch = function (r) { var s = norm(r.textContent); return kws.some(function (k) { return s.indexOf(k) !== -1; }); };
      var fn = special || (bodyRows(t).some(chipMatch) ? chipMatch : (bodyRows(t).some(textMatch) ? textMatch : null));
      if (fn || isBound(t)) { t.__st.filter = fn || chipMatch; refresh(t); return; }
    }
    // ۲) نمایش بخش (کارت) مرتبط با تب
    var secs = sections(), hit = secs.filter(function (c) { var h = norm(text(c.querySelector(".card-head h3"))); return kws.some(function (k) { return h.indexOf(k) !== -1; }); });
    if (hit.length) {
      secs.forEach(function (c) { c.style.display = hit.indexOf(c) === -1 ? "none" : ""; });
      [].slice.call(main.querySelectorAll(".grid-2,.grid-3")).forEach(function (g) {
        var vis = [].slice.call(g.children).some(function (c) { return c.style.display !== "none"; }); g.style.display = vis ? "" : "none";
      });
      if (t && !t.closest(".card")) { var w = t.closest(".tbl-wrap"); if (w) w.style.display = "none"; var p = pagerFor(t); if (p) p.style.display = "none"; }
      hit[0].scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // ۳) جستجوی متنی در همهٔ جدول‌ها
    var any = false;
    tables().forEach(function (tb) {
      var m = function (r) { var s = norm(r.textContent); return kws.some(function (k) { return s.indexOf(k) !== -1; }); };
      if (bodyRows(tb).some(m)) { any = true; tb.__st = tb.__st || { page: 1 }; tb.__st.filter = m; refresh(tb); }
    });
    if (!any) toast("بخش «" + lbl + "» — هنوز موردی برای نمایش ثبت نشده است.");
  }
  function bindTabs() {
    [].slice.call(main.querySelectorAll(".section-bar .tabs, .card-head .tabs")).forEach(function (bar) {
      var btns = [].slice.call(bar.querySelectorAll("button"));
      if (bar.id || btns.some(function (b) { return b.onclick || b.hasAttribute("data-view") || b.hasAttribute("data-tab") || b.hasAttribute("data-filter") || b.hasAttribute("data-acc-view"); })) return;
      btns.forEach(function (b, i) {
        b.addEventListener("click", function () {
          btns.forEach(function (x) { x.classList.remove("active"); }); b.classList.add("active");
          applyTab(i, label(b));
        });
      });
    });
  }

  /* ---------- فیلترهای بالای جدول (filter-row) ---------- */
  function bindFilterRow() {
    [].slice.call(main.querySelectorAll(".filter-row, .filter-bar")).forEach(function (row) {
      var t = listTable(); if (!t) return;
      // پرکردن فهرست‌های «همه …» از ستون متناظر جدول
      function fillSelects() {
        [].slice.call(row.querySelectorAll("select")).forEach(function (sel) {
          var first = sel.options[0] ? text(sel.options[0]) : "";
          var m = first.match(/^همه\s+(.+)$/); if (!m) return;
          var ci = -1, key = keywords(m[1])[0] || "";
          heads(t).forEach(function (h, i) { if (ci === -1 && key && norm(h).indexOf(key.slice(0, 4)) !== -1) ci = i; });
          if (ci === -1) return;
          var cur = sel.value, vals = {};
          bodyRows(t).forEach(function (r) { var v = text(r.cells[ci]); if (v) vals[v] = 1; });
          sel.innerHTML = "<option>" + esc(first) + "</option>" + Object.keys(vals).sort().map(function (v) { return "<option" + (v === cur ? " selected" : "") + ">" + esc(v) + "</option>"; }).join("");
          sel.setAttribute("data-col", ci);
        });
      }
      function apply() {
        fillSelects();
        var q = "", conds = [];
        [].slice.call(row.querySelectorAll("input")).forEach(function (inp) {
          if (inp.type === "date" && inp.value) {
            var d = new Date(inp.value + "T12:00:00"), g = fa(inp.value.replace(/-/g, "/")), j = "";
            try { j = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d).replace(/‎/g, ""); } catch (e) {}
            conds.push(function (r) { var s = r.textContent; return s.indexOf(g) !== -1 || (j && s.indexOf(j) !== -1); });
          } else if (inp.type !== "date" && inp.value.trim()) q = norm(inp.value);
        });
        [].slice.call(row.querySelectorAll("select")).forEach(function (sel) {
          if (sel.selectedIndex <= 0) return;
          var v = norm(sel.value), ci = sel.getAttribute("data-col");
          conds.push(function (r) { return norm(ci != null && r.cells[ci] ? r.cells[ci].textContent : r.textContent).indexOf(v) !== -1; });
        });
        t.__st = t.__st || { page: 1 }; t.__st.q = q; t.__st.page = 1;
        t.__st.extra = conds.length ? function (r) { return conds.every(function (c) { return c(r); }); } : null;
        refresh(t);
      }
      row.addEventListener("input", function (e) { if (e.target.matches("input[type=text],input:not([type])")) apply(); });
      row.addEventListener("change", apply);
      row.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b && !b.onclick) { e.preventDefault(); apply(); toast("فیلتر اعمال شد ✓"); } });
      setTimeout(fillSelects, 50);
    });
  }

  /* ---------- جستجوی تاپ‌بار ---------- */
  function bindSearch() {
    var inp = main.querySelector(".admin-topbar .search input"); if (!inp) return;
    inp.addEventListener("input", function () {
      var q = norm(inp.value);
      tables().forEach(function (t) { t.__st = t.__st || { page: 1 }; t.__st.q = q; t.__st.page = 1; refresh(t); });
      [].slice.call(main.querySelectorAll(".perm-list .perm")).forEach(function (p) { p.style.display = !q || norm(p.textContent).indexOf(q) !== -1 ? "" : "none"; });
    });
    inp.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var q = norm(inp.value); if (!q) return;
      var hasRows = tables().some(function (t) { return bodyRows(t).some(function (r) { return r.style.display !== "none"; }); });
      var link = [].slice.call(document.querySelectorAll(".admin-side a[href$='.html']")).filter(function (a) { return norm(a.textContent).indexOf(q) !== -1; })[0];
      if (link && (!hasRows || e.shiftKey)) location.href = link.getAttribute("href");
      else if (!hasRows) toast("نتیجه‌ای برای «" + inp.value + "» یافت نشد.", true);
    });
  }

  /* ---------- ذخیرهٔ ماندگار فرم‌ها و کلیدها ---------- */
  var FKEY = "panel:" + page;
  function formFields() {
    return [].slice.call(main.querySelectorAll("input, select, textarea")).filter(function (el) {
      return !el.closest(".filter-row, .filter-bar, .admin-topbar, .mini-modal, .tbl, #previewModal, [data-no-persist]") &&
        el.type !== "password" && el.type !== "file" && el.type !== "hidden" && !el.disabled && !el.id.match(/^(sup_|ofc)/);
    });
  }
  function fieldKey(el, i) {
    var f = el.closest(".field, .perm-toggle, .perm, label"); var l = f ? text(f.querySelector("label, .pt-main, b, span") || f) : (el.placeholder || el.name || "");
    return (l || "f").slice(0, 40) + "#" + i;
  }
  function collect() {
    var out = {};
    formFields().forEach(function (el, i) { out[fieldKey(el, i)] = el.type === "checkbox" || el.type === "radio" ? (el.checked ? 1 : 0) : el.value; });
    return out;
  }
  function applyValues(v) {
    if (!v) return;
    formFields().forEach(function (el, i) {
      var k = fieldKey(el, i); if (!(k in v)) return;
      if (el.type === "checkbox" || el.type === "radio") el.checked = !!v[k]; else el.value = v[k];
    });
  }
  var saving = null;
  async function saveForm(quiet) {
    var v = collect(); lsSet("atom_" + FKEY, v);
    var remote = false;
    try { await API.saveSettings((function () { var o = {}; o[FKEY] = JSON.stringify(v); return o; })()); remote = true; } catch (e) {}
    if (!quiet) toast(remote ? "تغییرات ذخیره شد ✓" : "تغییرات در این مرورگر ذخیره شد (ذخیره روی سرور فقط برای مدیر کل).");
  }
  async function loadForm() {
    var v = null;
    try { var d = await API.settings(); if (d && d.settings && d.settings[FKEY]) v = JSON.parse(d.settings[FKEY]); } catch (e) {}
    applyValues(v || lsGet("atom_" + FKEY, null));
  }
  function bindToggles() {
    main.addEventListener("change", function (e) {
      var el = e.target;
      if (!el.matches || !el.matches('input[type="checkbox"]') || el.onchange || el.closest(".mini-modal, .tbl, .filter-row")) return;
      if (page === "flags") return;
      clearTimeout(saving); saving = setTimeout(function () { saveForm(true); }, 300);
      var t = el.closest(".perm-toggle, label"); var l = t ? text(t.querySelector(".pt-main, span") || t) : "گزینه";
      toast("«" + l.slice(0, 40) + "» " + (el.checked ? "فعال شد" : "غیرفعال شد"));
    });
  }

  /* ---------- پشتیبان‌گیری ---------- */
  var BACKUP_RES = ["products", "orders", "customers", "categories", "sellers", "offers", "comments", "messages", "faqs", "slides", "bannedWords", "ads", "offices", "officeServices", "officeMessages", "articles"];
  async function fullBackup() {
    var data = { app: "atom313", created: new Date().toISOString(), mode: (await API.available()) ? "server" : "html", tables: {} };
    for (var i = 0; i < BACKUP_RES.length; i++) {
      try { var d = await API[BACKUP_RES[i]].list("limit=200"); data.tables[BACKUP_RES[i]] = d.items || []; } catch (e) {}
    }
    try { data.settings = (await API.settings()).settings; } catch (e) {}
    var name = "atom313-backup-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".json";
    var json = JSON.stringify(data, null, 1);
    download(name, json, "application/json");
    return { name: name, size: json.length };
  }

  /* ---------- اعلان‌های تاپ‌بار ---------- */
  function bindBell() {
    var bell = main.querySelector('.admin-topbar .icon-btn[aria-label="اعلان‌ها"]'); if (!bell) return;
    var box = null;
    async function counts() {
      var q = [
        ["comments", "status=pending&limit=200", "نظر در انتظار تأیید", "comments.html"],
        ["messages", "status=open&limit=200", "پیام باز پشتیبانی", "messages.html"],
        ["orders", "status=pending&limit=200", "سفارش در انتظار", "orders.html"],
        ["offices", "status=pending&limit=200", "دفتر در انتظار اعتبارسنجی", "localoffices.html"],
        ["officeMessages", "status=open&limit=200", "پیام بی‌پاسخ دفاتر", "officemessages.html"],
      ];
      var out = [];
      for (var i = 0; i < q.length; i++) { try { var d = await API[q[i][0]].list(q[i][1]); var n = (d.items || []).length; if (n) out.push({ n: n, t: q[i][2], h: q[i][3] }); } catch (e) {} }
      return out;
    }
    counts().then(function (list) { var dot = bell.querySelector(".dot"); if (dot) dot.style.display = list.length ? "" : "none"; });
    bell.addEventListener("click", async function (e) {
      e.stopPropagation();
      if (box) { box.remove(); box = null; return; }
      box = document.createElement("div"); box.className = "bell-pop";
      box.innerHTML = '<b class="bp-h">اعلان‌ها</b><div class="bp-l">در حال بارگذاری…</div>';
      bell.parentNode.style.position = "relative"; bell.parentNode.appendChild(box);
      var list = await counts(); if (!box) return;
      box.querySelector(".bp-l").innerHTML = list.length ? list.map(function (x) { return '<a href="' + x.h + '"><span class="bp-n">' + fa(x.n) + "</span>" + esc(x.t) + "</a>"; }).join("") : '<div class="bp-e">مورد جدیدی نیست ✓</div>';
    });
    document.addEventListener("click", function (e) { if (box && !box.contains(e.target)) { box.remove(); box = null; } });
  }

  /* ---------- آمار زنده برای صفحات ایستا ---------- */
  function setStatBy(re, val) {
    [].slice.call(main.querySelectorAll(".stat-grid .stat")).forEach(function (s) {
      var sp = s.querySelector(":scope > span"); if (!sp || !re.test(text(sp))) return;
      var b = s.querySelector(":scope > b"); if (b) b.textContent = val;
      var tr = s.querySelector(".trend"); if (tr) tr.remove(); // روند نمونه با دادهٔ واقعی جایگزین شد
    });
  }
  /* ---------- شمارنده‌های واقعی منوی کناری ---------- */
  async function sideCounts() {
    var map = [
      ["products.html", "products", "limit=200", null],
      ["orders.html", "orders", "status=pending&limit=200", "در انتظار"],
      ["comments.html", "comments", "status=pending&limit=200", "در انتظار تأیید"],
      ["messages.html", "messages", "status=open&limit=200", "باز"],
      ["localoffices.html", "offices", "status=pending&limit=200", "در انتظار اعتبارسنجی"],
      ["officemessages.html", "officeMessages", "status=open&limit=200", "بی‌پاسخ"],
    ];
    for (var i = 0; i < map.length; i++) {
      var a = document.querySelector('.admin-side a[href="' + map[i][0] + '"]'); if (!a) continue;
      try {
        var d = await API[map[i][1]].list(map[i][2]); var n = d.total != null ? d.total : (d.items || []).length;
        var c = a.querySelector(".cnt"); if (!c) { c = document.createElement("span"); c.className = "cnt"; a.appendChild(c); }
        c.textContent = fa(n); c.style.display = n ? "" : "none"; if (map[i][3]) c.title = fa(n) + " مورد " + map[i][3];
      } catch (e) { var c2 = a.querySelector(".cnt"); if (c2) c2.style.display = "none"; }
    }
  }
  async function liveStats() {
    try {
      if (page === "customers") {
        var c = (await API.customers.list("limit=200")).items || [];
        setStatBy(/کل مشتریان/, fa(c.length)); setStatBy(/مشتریان فعال/, fa(c.filter(function (x) { return x.orders_count > 0; }).length));
        setStatBy(/بازگشتی/, fa(c.length ? Math.round(100 * c.filter(function (x) { return x.orders_count > 1; }).length / c.length) : 0) + "٪");
        var tot = c.reduce(function (s, x) { return s + (+x.total_spent || 0); }, 0), cnt = c.reduce(function (s, x) { return s + (+x.orders_count || 0); }, 0);
        setStatBy(/میانگین سبد/, money(cnt ? tot / cnt : 0));
      }
      if (page === "offers") {
        var o = (await API.offers.list("limit=200")).items || [];
        setStatBy(/کدهای فعال/, fa(o.filter(function (x) { return x.status === "active"; }).length));
        setStatBy(/دفعات استفاده/, fa(o.reduce(function (s, x) { return s + (+x.used || 0); }, 0)));
      }
      if (page === "admins") {
        var a = (await API.admins.list()).items || [];
        setStatBy(/کل مدیران/, fa(a.length)); setStatBy(/فعال اکنون/, fa(a.filter(function (x) { return x.status === "active"; }).length));
        try { var act = (await API.activity(200)).items || []; var td = new Date().toISOString().slice(0, 10); setStatBy(/اقدام امروز/, fa(act.filter(function (x) { return String(x.created_at || "").slice(0, 10) === td; }).length)); } catch (e) {}
      }
      if (page === "loyalty") {
        var l = await API.loyalty(); setStatBy(/کل اعضای باشگاه/, fa((l.members || []).length));
      }
      if (page === "finance") {
        var ord = ((await API.orders.list("limit=200")).items || []).filter(function (o) { return o.status !== "returned"; });
        var fee = 5; try { var st = (await API.settings()).settings || {}; fee = parseFloat(en(st.seller_fee)) || 5; } catch (er) {}
        var now = new Date(), total = 0, month = 0, delivered = 0;
        ord.forEach(function (o) {
          var a = +o.amount || 0; total += a;
          var d = new Date(String(o.created_at || "").replace(" ", "T")); if (!isNaN(d) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) month += a;
          if (o.status === "delivered") delivered += a;
        });
        var sp = [].slice.call(main.querySelectorAll(".stat-grid .stat > span"));
        if (sp[0]) sp[0].textContent = "فروش کل";
        setStatBy(/فروش کل/, money(total)); setStatBy(/درآمد این ماه/, money(month));
        setStatBy(/کارمزد پلتفرم/, money(total * fee / 100)); setStatBy(/در انتظار تسویه/, money(delivered * (1 - fee / 100)));
      }
      if (page === "reports") await reports();
      if (page === "dbmanage") await dbTables();
    } catch (e) {}
  }
  async function reports() {
    var orders = (await API.orders.list("limit=200")).items || [];
    var ok = orders.filter(function (o) { return o.status !== "returned"; });
    var rev = ok.reduce(function (s, o) { return s + (+o.amount || 0); }, 0);
    var codes = {}; ok.forEach(function (o) { codes[o.code] = 1; });
    var nOrders = Object.keys(codes).length || ok.length;
    setStatBy(/فروش کل/, money(rev)); setStatBy(/تعداد سفارش/, fa(nOrders)); setStatBy(/میانگین سبد/, money(nOrders ? rev / nOrders : 0));
    // پرفروش‌ترین محصولات
    var agg = {}; ok.forEach(function (o) { var k = String(o.product || "").replace(/\s×.*$/, ""); agg[k] = agg[k] || { n: 0, r: 0 }; agg[k].n++; agg[k].r += +o.amount || 0; });
    var top = Object.keys(agg).map(function (k) { return { k: k, n: agg[k].n, r: agg[k].r }; }).sort(function (a, b) { return b.r - a.r; }).slice(0, 6);
    var tt = tables().filter(function (t) { return /محصول/.test(heads(t)[0] || ""); })[0];
    if (tt && top.length) { tt.setAttribute("data-bound", "1"); tt.tBodies[0].innerHTML = top.map(function (x) { return "<tr><td>" + esc(x.k) + "</td><td>" + fa(x.n) + "</td><td>" + money(x.r) + "</td></tr>"; }).join(""); }
    // نمودار فروش ۶ ماه اخیر (تقویم شمسی)
    var bars = [].slice.call(main.querySelectorAll(".bars .col, .bar-chart .col")); if (!bars.length) return;
    var fmt; try { fmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "short" }); } catch (e) { return; }
    var months = [], now = new Date();
    for (var i = bars.length - 1; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth() - i, 15); months.push({ d: d, lbl: fmt.format(d), sum: 0 }); }
    var mf = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "numeric" });
    ok.forEach(function (o) { var d = new Date(String(o.created_at || "").replace(" ", "T")); if (isNaN(d)) return; var key = mf.format(d); months.forEach(function (m) { if (mf.format(m.d) === key) m.sum += +o.amount || 0; }); });
    var max = Math.max.apply(null, months.map(function (m) { return m.sum; }).concat([1]));
    bars.forEach(function (col, i) { var m = months[i]; var b = col.querySelector(".bar"); var l = col.querySelector(".lbl"); if (b) { b.style.height = Math.max(3, Math.round(100 * m.sum / max)) + "%"; b.title = money(m.sum); } if (l) l.textContent = m.lbl; });
  }
  async function dbTables() {
    var t = tables()[0]; if (!t) return;
    var map = [["products", "products"], ["orders", "orders"], ["customers", "customers"], ["sellers", "sellers"], ["categories", "categories"], ["comments", "comments"], ["messages", "messages"], ["offices", "offices"], ["office_messages", "officeMessages"], ["articles", "articles"]];
    var rows = [], total = 0;
    for (var i = 0; i < map.length; i++) {
      try { var d = await API[map[i][1]].list("limit=200"); var n = (d.items || []).length; total += n; var kb = Math.max(1, Math.round(JSON.stringify(d.items || []).length / 1024));
        rows.push("<tr><td class='mono'>" + map[i][0] + "</td><td>" + fa(n) + "</td><td>" + fa(kb) + " KB</td><td>" + today() + "</td><td><div class='act-icons'><button title='مشاهده' data-db-view='" + map[i][1] + "'>" + icon("eye") + "</button><button title='خروجی' data-db-export='" + map[i][1] + "'>" + icon("external") + "</button></div></td></tr>");
      } catch (e) {}
    }
    if (rows.length) { t.setAttribute("data-bound", "1"); t.tBodies[0].innerHTML = rows.join(""); setStatBy(/تعداد جداول/, fa(rows.length)); setStatBy(/کل رکوردها/, fa(total)); }
  }

  /* ---------- سلامت سیستم (بررسی واقعی) ---------- */
  async function healthCheck(btn) {
    var t0 = performance.now(), online = await API.available(), ms = Math.round(performance.now() - t0);
    var t1 = performance.now(), okSite = false; try { var r = await fetch("../index.html", { cache: "no-store" }); okSite = r.ok; } catch (e) {}
    var ms2 = Math.round(performance.now() - t1);
    setStatBy(/آپ‌تایم|دسترس‌پذیری|وضعیت/, online ? "آنلاین" : "حالت HTML");
    setStatBy(/پاسخ|تأخیر|Latency/i, fa(ms) + "ms");
    toast("بررسی انجام شد — سرور: " + (online ? "آنلاین (" + fa(ms) + "ms)" : "در دسترس نیست؛ حالت HTML فعال") + " · سایت: " + (okSite ? "سالم (" + fa(ms2) + "ms)" : "خطا"), !okSite);
  }

  /* ---------- مسیریاب کلیک دکمه‌ها ---------- */
  var SKIP_ATTR = ["data-side-toggle", "data-logout", "data-mask-toggle", "data-save-support", "data-open-widget", "data-demo-reset", "data-x", "data-ok", "data-edit", "data-del", "data-approve", "data-save", "data-pg"];
  main.addEventListener("click", async function (e) {
    var btn = e.target.closest("button, a.abtn, a[href='#']");
    if (!btn || !main.contains(btn) || btn.closest(".mini-modal, #previewModal, .blog-editor, .admin-topbar")) return;
    if (btn.onclick || SKIP_ATTR.some(function (a) { return btn.hasAttribute(a); })) return;
    if (btn.closest(".tabs, .pgn")) return;
    var href = btn.getAttribute("href"); if (href && href !== "#") return;
    if (OWN_PAGES[page]) return;
    if (btn.type === "submit" && btn.closest("form")) return;
    var lbl = label(btn) || btn.getAttribute("title") || btn.getAttribute("aria-label") || "";
    var title = btn.getAttribute("title") || "";
    e.preventDefault();

    // ----- اقدامات ردیف جدول/فهرست -----
    var acts = btn.closest(".act-icons");
    if (acts) {
      var row = btn.closest("tr"), perm = btn.closest(".perm"), t = row && row.closest("table");
      if (btn.hasAttribute("data-db-view")) { var r0 = btn.getAttribute("data-db-view"); var dd = await API[r0].list("limit=5"); openForm("نمونه رکوردهای " + r0, (dd.items || []).map(function (x, i) { return { label: "#" + fa(x.id || i + 1), value: JSON.stringify(x, null, 1).slice(0, 600), type: "readonly" }; }), null); return; }
      if (btn.hasAttribute("data-db-export")) { var r1 = btn.getAttribute("data-db-export"); var de = await API[r1].list("limit=200"); download(r1 + ".json", JSON.stringify(de.items || [], null, 1), "application/json"); toast("خروجی جدول دانلود شد ✓"); return; }
      if (btn.classList.contains("dl") || /حذف/.test(title)) {
        if (!confirm("این مورد حذف شود؟")) return;
        var holder = (row && row.parentNode) || (perm && perm.parentNode);
        (row || perm).remove(); persist(holder); if (t) refresh(t); toast("حذف شد ✓"); return;
      }
      if (/ویرایش/.test(title)) {
        if (row && t) return editRow(t, row);
        if (perm) {
          var b = perm.querySelector("b"), s = perm.querySelector("span");
          openForm("ویرایش", [{ label: "عنوان", value: text(b) }, { label: "توضیح", value: text(s) }], function (v) { b.textContent = v[0]; if (s) s.textContent = v[1]; persist(perm.parentNode); toast("ذخیره شد ✓"); });
          return;
        }
      }
      if (/مشاهده|جزئیات/.test(title)) { if (row && t) return viewRow(t, row); if (perm) return openForm("جزئیات", [{ label: "عنوان", value: text(perm.querySelector("b")), type: "readonly" }, { label: "توضیح", value: text(perm.querySelector("span")), type: "readonly" }], null); }
      if (/اجرا|تلاش مجدد|اجرای مجدد/.test(title) && row && t) {
        var chip = row.querySelector(".chip"); if (chip) { chip.className = "chip info"; chip.textContent = "در حال اجرا"; }
        busy(btn, 1200, function () {
          if (chip) { chip.className = "chip ok"; chip.textContent = "موفق"; }
          var di = colIndex(t, /آخرین اجرا|زمان|تاریخ/); if (di >= 0) row.cells[di].textContent = today() + " " + nowTime();
          persist(t); toast("کار با موفقیت اجرا شد ✓");
        });
        return;
      }
      if (/دانلود|خروجی/.test(title) && row && t) { var h = heads(t); download("row.txt", h.map(function (x, i) { return x ? x + ": " + text(row.cells[i]) : ""; }).filter(Boolean).join("\n")); return; }
      if (/تأیید|فعال/.test(title) && row) { var c1 = row.querySelector(".chip"); if (c1) { c1.className = "chip ok"; c1.textContent = "تأییدشده"; } persist(t); return toast("تأیید شد ✓"); }
      if (/مسدود|رد|توقف|لغو/.test(title) && row) { var c2 = row.querySelector(".chip"); if (c2) { c2.className = "chip err"; c2.textContent = /مسدود/.test(title) ? "مسدود" : /توقف|لغو/.test(title) ? "متوقف" : "رد شده"; } persist(t); return toast("انجام شد ✓"); }
      toast("«" + (title || lbl) + "» انجام شد ✓"); return;
    }

    // ----- پشتیبان‌گیری -----
    if (page === "backups" && /پشتیبان جدید|دانلود آخرین/.test(lbl)) {
      busy(btn, 400);
      var info = await fullBackup();
      var bt = tables()[0];
      if (bt && /پشتیبان جدید/.test(lbl)) {
        var tr = bodyRows(bt)[0] ? bodyRows(bt)[0].cloneNode(true) : null;
        if (tr) { tr.cells[0].textContent = info.name; tr.cells[1].textContent = fa(Math.max(1, Math.round(info.size / 1024))) + " KB"; var ch = tr.querySelector(".chip"); if (ch) { ch.className = "chip ok"; ch.textContent = "کامل"; } if (tr.cells[3]) tr.cells[3].textContent = today() + " " + nowTime(); bt.tBodies[0].insertBefore(tr, bt.tBodies[0].firstChild); persist(bt); }
        setStatBy(/آخرین پشتیبان/, today());
      }
      toast("پشتیبان کامل داده‌ها دانلود شد ✓"); return;
    }

    // ----- خروجی -----
    if (/خروجی|دانلود|CSV|Excel/i.test(lbl)) {
      if (/PDF/i.test(lbl)) { window.print(); return; }
      return exportCSV(nearTable(btn), page);
    }
    // ----- تغییر رمز -----
    if (/به‌روزرسانی رمز|تغییر رمز/.test(lbl)) {
      var card = btn.closest(".card") || main;
      var pw = [].slice.call(card.querySelectorAll('input[type="password"]'));
      if (pw.length < 2) return;
      var cur = pw[0].value, nx = pw[1].value, rp = pw[2] ? pw[2].value : nx;
      if (!cur || !nx) return toast("رمز فعلی و رمز جدید را وارد کنید.", true);
      if (nx !== rp) return toast("تکرار رمز جدید با رمز جدید یکسان نیست.", true);
      try { await API.changePassword(cur, nx); pw.forEach(function (p) { p.value = ""; }); toast("رمز عبور با موفقیت تغییر کرد ✓"); }
      catch (er) { toast(er.message, true); }
      return;
    }
    // ----- ارسال اعلان -----
    if (/ارسال اعلان|ارسال پیام|ارسال خبرنامه/.test(lbl)) {
      var cd = btn.closest(".card") || main;
      var ttl = cd.querySelector('input[type="text"]'), msg = cd.querySelector("textarea");
      if (ttl && !ttl.value.trim()) return toast("عنوان را وارد کنید.", true);
      if (msg && !msg.value.trim()) return toast("متن را وارد کنید.", true);
      var chan = cd.querySelector(".seg input:checked"); var chName = chan ? text(chan.parentNode) : "داخل سایت";
      var sel = cd.querySelectorAll("select"); var sch = sel[1] ? sel[1].value : "ارسال فوری";
      var nt = tables().filter(function (x) { return x !== nearTable(cd) || true; }).filter(function (x) { return !cd.contains(x); })[0] || tables()[0];
      if (nt) {
        var nr = document.createElement("tr");
        nr.innerHTML = "<td>" + esc(ttl ? ttl.value : lbl) + "</td><td>" + esc(chName) + "</td><td>" + esc(sel[0] ? sel[0].value : "همه") + "</td><td>" + (/زمان/.test(sch) ? '<span class="chip pend">زمان‌بندی</span>' : '<span class="chip ok">ارسال شد</span>') + "</td>";
        nt.tBodies[0].insertBefore(nr, nt.tBodies[0].firstChild); persist(nt);
      }
      if (ttl) ttl.value = ""; if (msg) msg.value = "";
      toast(/زمان/.test(sch) ? "اعلان زمان‌بندی شد ✓" : "اعلان ثبت و ارسال شد ✓"); return;
    }
    // ----- بارگذاری فایل (رسانه) -----
    if (/بارگذاری|آپلود/.test(lbl)) {
      var fi = document.createElement("input"); fi.type = "file"; fi.accept = "image/*,video/*,application/pdf,.zip";
      fi.onchange = async function () {
        var f = fi.files[0]; if (!f) return;
        try {
          var up = /^image\//.test(f.type) ? await API.upload(f) : { url: "" };
          var gt = nearTable(btn);
          if (gt) {
            var tpl = bodyRows(gt)[0]; var row2 = tpl ? tpl.cloneNode(true) : document.createElement("tr");
            if (tpl) { writeCell(gt, row2.cells[0], 0, f.name); if (row2.cells[1]) row2.cells[1].textContent = fa(Math.max(1, Math.round(f.size / 1024))) + " KB"; }
            else row2.innerHTML = "<td>" + esc(f.name) + "</td><td>" + fa(Math.round(f.size / 1024)) + " KB</td>";
            gt.tBodies[0].insertBefore(row2, gt.tBodies[0].firstChild); persist(gt);
          } else {
            var grid = main.querySelector(".media-grid, .gallery");
            if (grid && up.url) { var it = document.createElement("div"); it.className = (grid.firstElementChild && grid.firstElementChild.className) || "m-item"; it.innerHTML = '<img src="' + esc(up.url) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:10px">'; grid.insertBefore(it, grid.firstChild); persist(grid); }
          }
          toast("فایل «" + f.name + "» بارگذاری شد ✓");
        } catch (er) { toast(er.message, true); }
      };
      fi.click(); return;
    }
    // ----- افزودن مورد جدید -----
    if (/افزودن|جدید|تعریف|تسویه دستی|مسدودسازی IP|^\s*(بنر|منو|صفحه|سؤال|قانون|ریدایرکت)\s*$/.test(lbl)) {
      var card2 = btn.closest(".card");
      var permList = card2 && card2.querySelector(".perm-list");
      var tb = card2 && card2.querySelector("table.tbl");
      if (/مسدودسازی IP/.test(lbl)) {
        return openForm("مسدودسازی IP", [{ label: "آدرس IP", value: "", placeholder: "مثلاً 185.12.34.56" }, { label: "دلیل", value: "" }], function (v) {
          if (!/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(en(v[0]).trim())) { toast("آدرس IP نامعتبر است.", true); return false; }
          var lt = tb || tables().filter(function (x) { return /IP/.test(heads(x).join(" ")); })[0];
          if (lt) { var r = document.createElement("tr"); r.innerHTML = heads(lt).map(function (hh, i) { return "<td>" + (i === 0 ? esc(en(v[0]).trim()) : /دلیل|توضیح/.test(hh) ? esc(v[1]) : /وضعیت/.test(hh) ? '<span class="chip err">مسدود</span>' : /تاریخ|زمان/.test(hh) ? today() : hh ? "—" : '<div class="act-icons"><button class="dl" title="حذف">' + icon("trash") + "</button></div>") + "</td>"; }).join(""); lt.tBodies[0].insertBefore(r, lt.tBodies[0].firstChild); persist(lt); }
          toast("IP مسدود شد ✓");
        });
      }
      if (tb && !isBound(tb)) return addRow(tb, lbl);
      if (permList && !tb) {
        return openForm(lbl, [{ label: "عنوان", value: "" }, { label: "توضیح", value: "" }], function (v) {
          if (!v[0].trim()) { toast("عنوان را وارد کنید.", true); return false; }
          var tplp = permList.querySelector(".perm"); var np = tplp ? tplp.cloneNode(true) : document.createElement("div");
          if (tplp) { np.querySelector("b").textContent = v[0]; var sp = np.querySelector("div > span"); if (sp) sp.textContent = v[1]; }
          else { np.className = "perm"; np.innerHTML = "<div><b>" + esc(v[0]) + "</b><span>" + esc(v[1]) + "</span></div>"; }
          permList.insertBefore(np, permList.firstChild); persist(permList); toast("افزوده شد ✓");
        }, "افزودن");
      }
      var lt2 = listTable();
      if (lt2 && !isBound(lt2)) return addRow(lt2, lbl);
      if (lt2 && isBound(lt2)) return; // pages.js فرم خودش را دارد
      return openForm(lbl, [{ label: "عنوان", value: "" }, { label: "توضیحات", value: "", type: "textarea" }], function (v) {
        if (!v[0].trim()) { toast("عنوان را وارد کنید.", true); return false; }
        var sec = main.querySelector(".card .perm-list") || null; if (sec) { var d = document.createElement("div"); d.className = "perm"; d.innerHTML = "<div><b>" + esc(v[0]) + "</b><span>" + esc(v[1]) + "</span></div>"; sec.insertBefore(d, sec.firstChild); persist(sec); }
        toast("«" + v[0] + "» ثبت شد ✓");
      }, "ثبت");
    }
    // ----- ذخیره -----
    if (/ذخیره|ثبت تغییرات|اعمال تغییرات/.test(lbl)) { await saveForm(false); return; }
    // ----- بررسی سلامت -----
    if (/بررسی مجدد/.test(lbl) && page === "health") { busy(btn, 700); return healthCheck(btn); }
    // ----- کارهای نگهداری -----
    if (/پاک‌سازی|بهینه‌سازی|بازسازی|تحلیل حجم|همگام|بازنشانی کش/.test(lbl)) {
      var p = btn.closest(".perm");
      busy(btn, 1100, function () {
        if (p) { var s = p.querySelector("span"); if (s) s.textContent = "۰ MB — پاک‌سازی شد (" + nowTime() + ")"; }
        if (/کل کش/.test(lbl)) [].slice.call(main.querySelectorAll(".perm span")).forEach(function (s) { if (/MB|صفحه/.test(s.textContent)) s.textContent = "۰ MB — پاک‌سازی شد"; });
        if (/کش/.test(lbl) || page === "cache") { try { sessionStorage.clear(); } catch (er) {} }
        toast("«" + lbl + "» با موفقیت انجام شد ✓");
      });
      return;
    }
    if (/مشاهده همه/.test(lbl)) { location.href = page === "dashboard" ? "orders.html" : "customers.html"; return; }
    if (/همه مشتریان/.test(lbl)) { location.href = "customers.html"; return; }
    if (/مشاهده سایت|مشاهده در سایت/.test(lbl)) { window.open("../index.html", "_blank"); return; }
    toast("«" + lbl + "» انجام شد ✓");
  });

  /* ---------- dropzone و ورودی فایل ---------- */
  main.addEventListener("change", function (e) {
    var el = e.target; if (!el.matches('input[type="file"]') || el.closest(".mini-modal, #previewModal") || el.id) return;
    var f = el.files && el.files[0]; if (!f) return;
    var dz = el.closest(".dropzone"); if (dz) { var b = dz.querySelector("b"); if (b) b.textContent = "فایل انتخاب شد: " + f.name; }
    if (page === "backups" && /\.json$/i.test(f.name)) {
      var rd = new FileReader(); rd.onload = function () {
        try {
          var d = JSON.parse(rd.result); if (!d || !d.tables) throw new Error();
          toast("فایل پشتیبان معتبر است: " + fa(Object.keys(d.tables).length) + " جدول، تاریخ " + String(d.created || "").slice(0, 10));
        } catch (er) { toast("فایل پشتیبان نامعتبر است.", true); }
      }; rd.readAsText(f); return;
    }
    toast("فایل «" + f.name + "» آماده است ✓");
  });

  /* ---------- راه‌اندازی ---------- */
  var started = false;
  function start() {
    if (started) return; started = true;
    if (!OWN_PAGES[page]) { restore(); bindTabs(); bindFilterRow(); bindToggles(); loadForm(); }
    bindSearch(); bindBell(); liveStats(); sideCounts();
    tables().forEach(function (t) {
      if (pagerFor(t) || isBound(t)) refresh(t);
      if (isBound(t)) new MutationObserver(function (m) { if (t.__busy) return; t.__busy = true; refresh(t); setTimeout(function () { t.__busy = false; }, 0); }).observe(t, { childList: true });
    });
  }
  document.addEventListener("atom:pages-ready", start);
  setTimeout(start, 2500); // اگر رویداد نرسید
})();
