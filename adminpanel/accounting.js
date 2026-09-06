/* =====================================================================
   اتم — موتور حسابداری دوطرفه (Double-Entry Accounting Engine)
   محاسبات کاملاً پویا از روی اسناد دفتر روزنامه انجام می‌شود:
   دفتر کل، تراز آزمایشی، صورت سود و زیان و ترازنامه به‌صورت زنده
   بر اساس معادله حسابداری  دارایی = بدهی + حقوق صاحبان سهام  ساخته می‌شوند.
   داده‌ها در localStorage نگهداری می‌شوند.  (نمونه‌ی آموزشی/دمو)
   ===================================================================== */
(function () {
  "use strict";

  /* ---------------- کدینگ استاندارد حساب‌ها ---------------- */
  // type تعیین‌کننده ماهیت (مانده طبیعی):
  //   asset, expense, cogs      → ماهیت بدهکار (debit)
  //   liability, equity, revenue, contra-asset → ماهیت بستانکار (credit)
  var ACCOUNTS = [
    // دارایی‌های جاری
    { code: "1101", name: "صندوق", type: "asset", group: "دارایی‌های جاری" },
    { code: "1102", name: "بانک ملت", type: "asset", group: "دارایی‌های جاری" },
    { code: "1103", name: "حساب‌های دریافتنی", type: "asset", group: "دارایی‌های جاری" },
    { code: "1104", name: "موجودی کالا", type: "asset", group: "دارایی‌های جاری" },
    { code: "1105", name: "پیش‌پرداخت‌ها", type: "asset", group: "دارایی‌های جاری" },
    // دارایی‌های غیرجاری
    { code: "1201", name: "اموال، ماشین‌آلات و تجهیزات", type: "asset", group: "دارایی‌های غیرجاری" },
    { code: "1202", name: "استهلاک انباشته", type: "contra-asset", group: "دارایی‌های غیرجاری" },
    // بدهی‌های جاری
    { code: "2101", name: "حساب‌های پرداختنی", type: "liability", group: "بدهی‌های جاری" },
    { code: "2102", name: "مالیات بر ارزش افزوده پرداختنی", type: "liability", group: "بدهی‌های جاری" },
    { code: "2103", name: "حقوق و دستمزد پرداختنی", type: "liability", group: "بدهی‌های جاری" },
    { code: "2104", name: "تسویه فروشندگان پرداختنی", type: "liability", group: "بدهی‌های جاری" },
    { code: "2105", name: "مالیات بر درآمد پرداختنی", type: "liability", group: "بدهی‌های جاری" },
    // بدهی‌های غیرجاری
    { code: "2201", name: "تسهیلات بلندمدت", type: "liability", group: "بدهی‌های غیرجاری" },
    // حقوق صاحبان سهام
    { code: "3101", name: "سرمایه", type: "equity", group: "حقوق صاحبان سهام" },
    { code: "3102", name: "سود انباشته", type: "equity", group: "حقوق صاحبان سهام" },
    { code: "3103", name: "برداشت مالک", type: "contra-equity", group: "حقوق صاحبان سهام" },
    // درآمدها
    { code: "4101", name: "درآمد فروش کالا", type: "revenue", group: "درآمدها" },
    { code: "4102", name: "درآمد کارمزد فروشندگان", type: "revenue", group: "درآمدها" },
    { code: "4103", name: "درآمد خدمات و اشتراک", type: "revenue", group: "درآمدها" },
    // بهای تمام‌شده
    { code: "5101", name: "بهای تمام‌شده کالای فروش‌رفته", type: "cogs", group: "بهای تمام‌شده کالای فروش‌رفته" },
    // هزینه‌های عملیاتی
    { code: "6101", name: "هزینه حقوق و دستمزد", type: "expense", group: "هزینه‌های عملیاتی" },
    { code: "6102", name: "هزینه اجاره", type: "expense", group: "هزینه‌های عملیاتی" },
    { code: "6103", name: "هزینه بازاریابی و تبلیغات", type: "expense", group: "هزینه‌های عملیاتی" },
    { code: "6104", name: "هزینه حمل و نقل و لجستیک", type: "expense", group: "هزینه‌های عملیاتی" },
    { code: "6105", name: "هزینه استهلاک", type: "expense", group: "هزینه‌های عملیاتی" },
    { code: "6106", name: "هزینه آب، برق، اینترنت", type: "expense", group: "هزینه‌های عملیاتی" },
    { code: "6107", name: "کارمزد بانکی و درگاه پرداخت", type: "expense", group: "هزینه‌های عملیاتی" },
    // مالیات بر درآمد (غیرعملیاتی — بعد از سود عملیاتی)
    { code: "6201", name: "هزینه مالیات بر درآمد", type: "tax", group: "مالیات بر درآمد" }
  ];

  var DEBIT_NORMAL = { asset: 1, expense: 1, cogs: 1, tax: 1, "contra-equity": 1 };
  // هر چیز دیگری ماهیت بستانکار دارد

  var VAT_RATE = 0.10; // مالیات بر ارزش افزوده ۱۰٪
  var LS_KEY = "atom_ledger_v1";

  function acc(code) { return ACCOUNTS.find(function (a) { return a.code === code; }); }
  function isDebitNormal(type) { return !!DEBIT_NORMAL[type]; }

  /* ---------------- اسناد نمونه (تراز و منطقی) ---------------- */
  // هر سند مجموع بدهکار = مجموع بستانکار دارد.
  function seed() {
    return [
      { id: 1, date: "۱۴۰۴/۰۳/۰۱", desc: "آورده نقدی مالک بابت سرمایه اولیه",
        lines: [{ code: "1102", d: 500000000, c: 0 }, { code: "3101", d: 0, c: 500000000 }] },
      { id: 2, date: "۱۴۰۴/۰۳/۰۳", desc: "خرید تجهیزات و ماشین‌آلات (نقدی)",
        lines: [{ code: "1201", d: 120000000, c: 0 }, { code: "1102", d: 0, c: 120000000 }] },
      { id: 3, date: "۱۴۰۴/۰۳/۰۵", desc: "خرید موجودی کالا به‌صورت نسیه",
        lines: [{ code: "1104", d: 260000000, c: 0 }, { code: "2101", d: 0, c: 260000000 }] },
      { id: 4, date: "۱۴۰۴/۰۴/۱۰", desc: "فروش نقدی کالا همراه با مالیات بر ارزش افزوده",
        lines: [{ code: "1102", d: 330000000, c: 0 }, { code: "4101", d: 0, c: 300000000 }, { code: "2102", d: 0, c: 30000000 }] },
      { id: 5, date: "۱۴۰۴/۰۴/۱۰", desc: "ثبت بهای تمام‌شده کالای فروش‌رفته",
        lines: [{ code: "5101", d: 180000000, c: 0 }, { code: "1104", d: 0, c: 180000000 }] },
      { id: 6, date: "۱۴۰۴/۰۴/۱۵", desc: "درآمد کارمزد از فروشندگان مارکت‌پلیس",
        lines: [{ code: "1103", d: 42000000, c: 0 }, { code: "4102", d: 0, c: 42000000 }] },
      { id: 7, date: "۱۴۰۴/۰۴/۲۰", desc: "درآمد اشتراک و خدمات دیجیتال (نقدی)",
        lines: [{ code: "1102", d: 28000000, c: 0 }, { code: "4103", d: 0, c: 28000000 }] },
      { id: 8, date: "۱۴۰۴/۰۴/۳۱", desc: "پرداخت حقوق کارکنان",
        lines: [{ code: "6101", d: 65000000, c: 0 }, { code: "1102", d: 0, c: 65000000 }] },
      { id: 9, date: "۱۴۰۴/۰۴/۳۱", desc: "پرداخت اجاره دفتر و انبار",
        lines: [{ code: "6102", d: 24000000, c: 0 }, { code: "1102", d: 0, c: 24000000 }] },
      { id: 10, date: "۱۴۰۴/۰۵/۰۵", desc: "هزینه کمپین بازاریابی و تبلیغات",
        lines: [{ code: "6103", d: 18000000, c: 0 }, { code: "1102", d: 0, c: 18000000 }] },
      { id: 11, date: "۱۴۰۴/۰۵/۱۰", desc: "هزینه حمل و نقل سفارش‌ها",
        lines: [{ code: "6104", d: 9500000, c: 0 }, { code: "1102", d: 0, c: 9500000 }] },
      { id: 12, date: "۱۴۰۴/۰۵/۱۵", desc: "دریافت وجه از حساب‌های دریافتنی",
        lines: [{ code: "1102", d: 30000000, c: 0 }, { code: "1103", d: 0, c: 30000000 }] },
      { id: 13, date: "۱۴۰۴/۰۵/۲۰", desc: "پرداخت بخشی از بدهی به تأمین‌کنندگان",
        lines: [{ code: "2101", d: 150000000, c: 0 }, { code: "1102", d: 0, c: 150000000 }] },
      { id: 14, date: "۱۴۰۴/۰۵/۲۵", desc: "هزینه آب، برق و اینترنت",
        lines: [{ code: "6106", d: 6200000, c: 0 }, { code: "1102", d: 0, c: 6200000 }] },
      { id: 15, date: "۱۴۰۴/۰۵/۳۱", desc: "کارمزد بانکی و درگاه پرداخت",
        lines: [{ code: "6107", d: 4300000, c: 0 }, { code: "1102", d: 0, c: 4300000 }] },
      { id: 16, date: "۱۴۰۴/۰۵/۳۱", desc: "ثبت استهلاک ماهانه تجهیزات",
        lines: [{ code: "6105", d: 2000000, c: 0 }, { code: "1202", d: 0, c: 2000000 }] },
      { id: 17, date: "۱۴۰۴/۰۵/۳۱", desc: "ذخیره مالیات بر درآمد دوره (۱۵٪ سود عملیاتی)",
        lines: [{ code: "6201", d: 9150000, c: 0 }, { code: "2105", d: 0, c: 9150000 }] }
    ];
  }

  /* ---------------- ذخیره / بازیابی ---------------- */
  var entries = [];
  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      entries = raw ? JSON.parse(raw) : seed();
    } catch (e) { entries = seed(); }
    if (!Array.isArray(entries) || !entries.length) entries = seed();
  }
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(entries)); } catch (e) {}
  }
  function nextId() {
    return entries.reduce(function (m, e) { return Math.max(m, e.id || 0); }, 0) + 1;
  }

  /* ---------------- ابزار قالب‌بندی ---------------- */
  var FA = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  function toFa(s) { return String(s).replace(/[0-9]/g, function (d) { return FA[+d]; }); }
  function faToEn(s) { return String(s).replace(/[۰-۹]/g, function (d) { return FA.indexOf(d); }).replace(/,/g, "").replace(/٬/g, ""); }
  function money(n) {
    n = Math.round(n || 0);
    var sign = n < 0 ? "−" : "";
    var s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
    return sign + toFa(s);
  }
  function moneyT(n) { return money(n) + " ت"; }

  /* ---------------- محاسبات موتور ---------------- */
  // مجموع بدهکار/بستانکار هر حساب
  function computeTotals() {
    var t = {};
    ACCOUNTS.forEach(function (a) { t[a.code] = { d: 0, c: 0 }; });
    entries.forEach(function (e) {
      (e.lines || []).forEach(function (ln) {
        if (!t[ln.code]) t[ln.code] = { d: 0, c: 0 };
        t[ln.code].d += (+ln.d || 0);
        t[ln.code].c += (+ln.c || 0);
      });
    });
    return t;
  }
  // مانده حساب با علامت ماهیت طبیعی (همیشه مثبت اگر در سمت طبیعی باشد)
  function balanceOf(code, totals) {
    var a = acc(code); if (!a) return 0;
    var x = totals[code] || { d: 0, c: 0 };
    return isDebitNormal(a.type) ? (x.d - x.c) : (x.c - x.d);
  }
  function sumByType(type, totals) {
    return ACCOUNTS.filter(function (a) { return a.type === type; })
      .reduce(function (s, a) { return s + balanceOf(a.code, totals); }, 0);
  }

  function financials() {
    var t = computeTotals();
    var revenue = sumByType("revenue", t);
    var cogs = sumByType("cogs", t);
    var grossProfit = revenue - cogs;
    var opex = sumByType("expense", t);
    var operatingIncome = grossProfit - opex;
    // مالیات بر درآمد از سند ذخیره‌شده خوانده می‌شود (اصل تطابق و ثبت واقعی)،
    // نه یک عدد فرضی؛ به همین دلیل ترازنامه همیشه متوازن می‌ماند.
    var incomeTax = sumByType("tax", t);
    var netIncome = operatingIncome - incomeTax;

    var assetsGross = sumByType("asset", t);
    var contraAsset = sumByType("contra-asset", t);
    var assets = assetsGross - contraAsset;
    var liabilities = sumByType("liability", t);
    var equityAccounts = sumByType("equity", t) - sumByType("contra-equity", t);
    var equity = equityAccounts + netIncome;   // شامل سود دوره جاری
    var liabPlusEquity = liabilities + equity;

    return {
      totals: t,
      revenue: revenue, cogs: cogs, grossProfit: grossProfit,
      opex: opex, operatingIncome: operatingIncome,
      incomeTax: incomeTax, netIncome: netIncome,
      assetsGross: assetsGross, contraAsset: contraAsset, assets: assets,
      liabilities: liabilities, equityAccounts: equityAccounts, equity: equity,
      liabPlusEquity: liabPlusEquity,
      vatPayable: balanceOf("2102", t),
      cash: balanceOf("1101", t) + balanceOf("1102", t),
      balanced: Math.abs(assets - liabPlusEquity) < 1
    };
  }

  /* ---------------- ابزار DOM ---------------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function icon(name) { return '<svg class="icon"><use href="#i-' + name + '"/></svg>'; }
  function panel(name) { return document.querySelector('[data-panel="' + name + '"]'); }

  /* ---------------- رندر: داشبورد مالی ---------------- */
  function renderOverview() {
    var f = financials();
    var p = panel("overview"); p.innerHTML = "";

    var grid = el("div", "stat-grid");
    grid.innerHTML =
      statCard("wallet", moneyT(f.cash), "موجودی نقد و بانک") +
      statCard("trend-up", moneyT(f.revenue), "کل درآمد دوره") +
      statCard("coins", moneyT(f.netIncome), "سود خالص دوره") +
      statCard("scale", moneyT(f.assets), "جمع دارایی‌ها");
    p.appendChild(grid);

    // معادله حسابداری
    var eq = el("div", "card acc-equation");
    eq.innerHTML =
      '<div class="card-head"><h3>معادله حسابداری</h3>' +
      '<span class="chip ' + (f.balanced ? "ok" : "err") + '">' +
      (f.balanced ? "تراز است" : "عدم توازن") + '</span></div>' +
      '<div class="eqbar">' +
        '<div class="eqbox"><span>دارایی‌ها</span><b>' + moneyT(f.assets) + '</b></div>' +
        '<div class="eqop">=</div>' +
        '<div class="eqbox"><span>بدهی‌ها</span><b>' + moneyT(f.liabilities) + '</b></div>' +
        '<div class="eqop">+</div>' +
        '<div class="eqbox"><span>حقوق صاحبان سهام</span><b>' + moneyT(f.equity) + '</b></div>' +
      '</div>';
    p.appendChild(eq);

    // خلاصه سود و زیان + نسبت‌ها
    var g2 = el("div", "grid-2");
    var gm = f.revenue ? (f.grossProfit / f.revenue * 100) : 0;
    var nm = f.revenue ? (f.netIncome / f.revenue * 100) : 0;
    g2.innerHTML =
      '<div class="card"><div class="card-head"><h3>خلاصه عملکرد</h3></div>' +
        miniRow("درآمد کل", moneyT(f.revenue)) +
        miniRow("بهای تمام‌شده", "(" + moneyT(f.cogs) + ")") +
        miniRow("سود ناخالص", moneyT(f.grossProfit), "strong") +
        miniRow("هزینه‌های عملیاتی", "(" + moneyT(f.opex) + ")") +
        miniRow("سود عملیاتی", moneyT(f.operatingIncome), "strong") +
        miniRow("مالیات بر درآمد (۱۵٪)", "(" + moneyT(f.incomeTax) + ")") +
        miniRow("سود خالص", moneyT(f.netIncome), "total") +
      '</div>' +
      '<div class="card"><div class="card-head"><h3>نسبت‌های کلیدی</h3></div>' +
        '<div class="ratio-grid">' +
          ratio("حاشیه سود ناخالص", toFa(gm.toFixed(1)) + "٪") +
          ratio("حاشیه سود خالص", toFa(nm.toFixed(1)) + "٪") +
          ratio("مالیات ارزش‌افزوده پرداختنی", moneyT(f.vatPayable)) +
          ratio("جمع بدهی‌ها", moneyT(f.liabilities)) +
        '</div>' +
      '</div>';
    p.appendChild(g2);
  }
  function statCard(ic, val, lbl) {
    return '<div class="stat"><div class="head"><div class="ic">' + icon(ic) + '</div></div>' +
      '<b style="font-size:1.3rem;">' + val + '</b><span>' + lbl + '</span></div>';
  }
  function miniRow(l, v, cls) {
    return '<div class="mini-row ' + (cls || "") + '"><span>' + l + '</span><b>' + v + '</b></div>';
  }
  function ratio(l, v) {
    return '<div class="ratio"><span>' + l + '</span><b>' + v + '</b></div>';
  }

  /* ---------------- رندر: دفتر روزنامه ---------------- */
  function renderJournal() {
    var p = panel("journal"); p.innerHTML = "";
    var head = el("div", "card-head");
    head.innerHTML = '<h3>دفتر روزنامه — همه اسناد (' + toFa(entries.length) + ' سند)</h3>';
    var card = el("div", "card");
    card.appendChild(head);

    var wrap = el("div", "tbl-wrap flush");
    var rows = "";
    entries.slice().sort(function (a, b) { return a.id - b.id; }).forEach(function (e) {
      var tot = e.lines.reduce(function (s, l) { return s + (+l.d || 0); }, 0);
      var first = true;
      e.lines.forEach(function (ln) {
        var a = acc(ln.code) || { name: ln.code, code: ln.code };
        rows +=
          '<tr class="' + (first ? "jrn-first" : "") + '">' +
            '<td>' + (first ? '<b>#' + toFa(e.id) + '</b>' : "") + '</td>' +
            '<td>' + (first ? e.date : "") + '</td>' +
            '<td class="' + (ln.d ? "" : "indent") + '"><span class="mono">' + toFa(a.code) + '</span> ' + a.name + '</td>' +
            '<td class="num">' + (ln.d ? money(ln.d) : "") + '</td>' +
            '<td class="num">' + (ln.c ? money(ln.c) : "") + '</td>' +
            '<td>' + (first ? '<span class="preview">' + e.desc + '</span>' : "") + '</td>' +
            '<td>' + (first ? '<div class="act-icons"><button class="dl" data-del="' + e.id + '" title="حذف سند">' + icon("trash") + '</button></div>' : "") + '</td>' +
          '</tr>';
        first = false;
      });
    });
    wrap.innerHTML =
      '<table class="tbl acc-journal"><thead><tr>' +
      '<th>سند</th><th>تاریخ</th><th>حساب</th><th>بدهکار</th><th>بستانکار</th><th>شرح</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
    card.appendChild(wrap);
    p.appendChild(card);

    card.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = +b.getAttribute("data-del");
        if (confirm("حذف سند #" + toFa(id) + "؟")) {
          entries = entries.filter(function (e) { return e.id !== id; });
          save(); renderAll();
        }
      });
    });
  }

  /* ---------------- رندر: دفتر کل ---------------- */
  function renderLedger() {
    var p = panel("ledger"); p.innerHTML = "";
    var used = ACCOUNTS.filter(function (a) {
      return entries.some(function (e) { return e.lines.some(function (l) { return l.code === a.code; }); });
    });
    var current = p.getAttribute("data-current") || (used[0] && used[0].code) || "1102";

    var bar = el("div", "section-bar");
    var opts = used.map(function (a) {
      return '<option value="' + a.code + '"' + (a.code === current ? " selected" : "") + '>' +
        toFa(a.code) + " — " + a.name + '</option>';
    }).join("");
    bar.innerHTML =
      '<div class="left"><div class="title">دفتر کل حساب</div>' +
      '<div class="field" style="margin:0;min-width:280px;"><select id="ledgerSel">' + opts + '</select></div></div>';
    p.appendChild(bar);

    p.appendChild(ledgerCard(current));

    var sel = bar.querySelector("#ledgerSel");
    sel.addEventListener("change", function () {
      p.setAttribute("data-current", sel.value);
      renderLedger();
    });
  }
  function ledgerCard(code) {
    var a = acc(code) || { name: code, code: code, type: "asset" };
    var deb = isDebitNormal(a.type);
    var card = el("div", "card");
    var running = 0, rows = "";
    var evs = [];
    entries.slice().sort(function (x, y) { return x.id - y.id; }).forEach(function (e) {
      e.lines.forEach(function (ln) { if (ln.code === code) evs.push({ e: e, ln: ln }); });
    });
    evs.forEach(function (o) {
      running += deb ? ((+o.ln.d || 0) - (+o.ln.c || 0)) : ((+o.ln.c || 0) - (+o.ln.d || 0));
      rows +=
        '<tr><td><b>#' + toFa(o.e.id) + '</b></td><td>' + o.e.date + '</td>' +
        '<td><span class="preview">' + o.e.desc + '</span></td>' +
        '<td class="num">' + (o.ln.d ? money(o.ln.d) : "") + '</td>' +
        '<td class="num">' + (o.ln.c ? money(o.ln.c) : "") + '</td>' +
        '<td class="num"><b>' + money(running) + '</b></td></tr>';
    });
    var td = evs.reduce(function (s, o) { return s + (+o.ln.d || 0); }, 0);
    var tc = evs.reduce(function (s, o) { return s + (+o.ln.c || 0); }, 0);
    card.innerHTML =
      '<div class="card-head"><h3><span class="mono">' + toFa(a.code) + '</span> — ' + a.name +
      ' <span class="chip info">ماهیت ' + (deb ? "بدهکار" : "بستانکار") + '</span></h3>' +
      '<b>مانده: ' + moneyT(deb ? (td - tc) : (tc - td)) + '</b></div>' +
      '<div class="tbl-wrap flush"><table class="tbl"><thead><tr>' +
      '<th>سند</th><th>تاریخ</th><th>شرح</th><th>بدهکار</th><th>بستانکار</th><th>مانده</th>' +
      '</tr></thead><tbody>' + rows +
      '<tr class="tbl-total"><td colspan="3">جمع گردش</td><td class="num">' + money(td) +
      '</td><td class="num">' + money(tc) + '</td><td class="num">' + money(deb ? (td - tc) : (tc - td)) + '</td></tr>' +
      '</tbody></table></div>';
    return card;
  }

  /* ---------------- رندر: تراز آزمایشی ---------------- */
  function renderTrial() {
    var p = panel("trial"); p.innerHTML = "";
    var t = computeTotals();
    var rows = "", sumD = 0, sumC = 0;
    ACCOUNTS.forEach(function (a) {
      var x = t[a.code] || { d: 0, c: 0 };
      if (!x.d && !x.c) return;
      var bal = isDebitNormal(a.type) ? (x.d - x.c) : (x.c - x.d);
      var dCol = 0, cCol = 0;
      if (isDebitNormal(a.type)) { if (bal >= 0) dCol = bal; else cCol = -bal; }
      else { if (bal >= 0) cCol = bal; else dCol = -bal; }
      sumD += dCol; sumC += cCol;
      rows +=
        '<tr><td><span class="mono">' + toFa(a.code) + '</span></td><td>' + a.name + '</td>' +
        '<td class="num">' + (dCol ? money(dCol) : "—") + '</td>' +
        '<td class="num">' + (cCol ? money(cCol) : "—") + '</td></tr>';
    });
    var ok = Math.abs(sumD - sumC) < 1;
    var card = el("div", "card");
    card.innerHTML =
      '<div class="card-head"><h3>تراز آزمایشی</h3>' +
      '<span class="chip ' + (ok ? "ok" : "err") + '">' + (ok ? "متوازن ✓" : "نامتوازن") + '</span></div>' +
      '<div class="tbl-wrap flush"><table class="tbl"><thead><tr>' +
      '<th>کد</th><th>عنوان حساب</th><th>بدهکار</th><th>بستانکار</th>' +
      '</tr></thead><tbody>' + rows +
      '<tr class="tbl-total"><td colspan="2">جمع کل</td>' +
      '<td class="num">' + money(sumD) + '</td><td class="num">' + money(sumC) + '</td></tr>' +
      '</tbody></table></div>';
    p.appendChild(card);
  }

  /* ---------------- رندر: صورت سود و زیان ---------------- */
  function renderIncome() {
    var p = panel("income"); p.innerHTML = "";
    var f = financials(), t = f.totals;
    function line(l, v, cls) { return miniRow(l, v, cls); }
    var revRows = ACCOUNTS.filter(function (a) { return a.type === "revenue"; })
      .map(function (a) { var b = balanceOf(a.code, t); return b ? line(a.name, moneyT(b)) : ""; }).join("");
    var expRows = ACCOUNTS.filter(function (a) { return a.type === "expense"; })
      .map(function (a) { var b = balanceOf(a.code, t); return b ? line(a.name, "(" + moneyT(b) + ")") : ""; }).join("");

    var card = el("div", "card acc-statement");
    card.innerHTML =
      '<div class="card-head"><h3>صورت سود و زیان</h3><span class="chip info">دوره جاری</span></div>' +
      '<div class="stmt-sec"><div class="stmt-h">درآمدها</div>' + revRows +
        line("جمع درآمد", moneyT(f.revenue), "strong") + '</div>' +
      '<div class="stmt-sec"><div class="stmt-h">بهای تمام‌شده کالای فروش‌رفته</div>' +
        line("بهای تمام‌شده کالای فروش‌رفته", "(" + moneyT(f.cogs) + ")") +
        line("سود ناخالص", moneyT(f.grossProfit), "strong") + '</div>' +
      '<div class="stmt-sec"><div class="stmt-h">هزینه‌های عملیاتی</div>' + expRows +
        line("جمع هزینه‌های عملیاتی", "(" + moneyT(f.opex) + ")", "strong") + '</div>' +
      '<div class="stmt-sec">' +
        line("سود عملیاتی", moneyT(f.operatingIncome), "strong") +
        line("مالیات بر درآمد (۱۵٪)", "(" + moneyT(f.incomeTax) + ")") +
        line("سود (زیان) خالص دوره", moneyT(f.netIncome), "total") + '</div>';
    p.appendChild(card);
  }

  /* ---------------- رندر: ترازنامه ---------------- */
  function renderBalance() {
    var p = panel("balance"); p.innerHTML = "";
    var f = financials(), t = f.totals;

    function grp(type, title, contra) {
      var items = ACCOUNTS.filter(function (a) { return a.type === type; })
        .map(function (a) { var b = balanceOf(a.code, t); return b ? miniRow(a.name, moneyT(b)) : ""; }).join("");
      return items ? '<div class="stmt-h">' + title + '</div>' + items : "";
    }
    // دارایی‌ها (جاری، غیرجاری، منهای استهلاک انباشته)
    var curAssets = ACCOUNTS.filter(function (a) { return a.type === "asset" && a.group === "دارایی‌های جاری"; })
      .map(function (a) { var b = balanceOf(a.code, t); return b ? miniRow(a.name, moneyT(b)) : ""; }).join("");
    var nonCur = ACCOUNTS.filter(function (a) { return a.type === "asset" && a.group === "دارایی‌های غیرجاری"; })
      .map(function (a) { var b = balanceOf(a.code, t); return b ? miniRow(a.name, moneyT(b)) : ""; }).join("");
    var contra = balanceOf("1202", t);
    if (contra) nonCur += miniRow("کسر: استهلاک انباشته", "(" + moneyT(contra) + ")");

    var assetCard = el("div", "card acc-statement");
    assetCard.innerHTML =
      '<div class="card-head"><h3>دارایی‌ها</h3></div>' +
      '<div class="stmt-sec"><div class="stmt-h">دارایی‌های جاری</div>' + curAssets + '</div>' +
      '<div class="stmt-sec"><div class="stmt-h">دارایی‌های غیرجاری</div>' + nonCur + '</div>' +
      miniRow("جمع کل دارایی‌ها", moneyT(f.assets), "total");

    var liabItems = ACCOUNTS.filter(function (a) { return a.type === "liability"; })
      .map(function (a) { var b = balanceOf(a.code, t); return b ? miniRow(a.name, moneyT(b)) : ""; }).join("");
    var eqItems = ACCOUNTS.filter(function (a) { return a.type === "equity"; })
      .map(function (a) { var b = balanceOf(a.code, t); return b ? miniRow(a.name, moneyT(b)) : ""; }).join("");
    var drawing = balanceOf("3103", t);
    if (drawing) eqItems += miniRow("کسر: برداشت مالک", "(" + moneyT(drawing) + ")");
    eqItems += miniRow("سود انباشته دوره جاری", moneyT(f.netIncome));

    var liabCard = el("div", "card acc-statement");
    liabCard.innerHTML =
      '<div class="card-head"><h3>بدهی‌ها و حقوق صاحبان سهام</h3></div>' +
      '<div class="stmt-sec"><div class="stmt-h">بدهی‌ها</div>' + liabItems +
        miniRow("جمع بدهی‌ها", moneyT(f.liabilities), "strong") + '</div>' +
      '<div class="stmt-sec"><div class="stmt-h">حقوق صاحبان سهام</div>' + eqItems +
        miniRow("جمع حقوق صاحبان سهام", moneyT(f.equity), "strong") + '</div>' +
      miniRow("جمع بدهی‌ها و حقوق صاحبان سهام", moneyT(f.liabPlusEquity), "total");

    var g2 = el("div", "grid-2");
    g2.appendChild(assetCard); g2.appendChild(liabCard);
    p.appendChild(g2);

    var chk = el("div", "card acc-check " + (f.balanced ? "ok" : "err"));
    chk.innerHTML = (f.balanced
      ? icon("check") + " ترازنامه متوازن است: جمع دارایی‌ها برابر با جمع بدهی‌ها و حقوق صاحبان سهام."
      : icon("x") + " اختلاف توازن: " + moneyT(Math.abs(f.assets - f.liabPlusEquity)));
    p.appendChild(chk);
  }

  /* ---------------- رندر: کدینگ حساب‌ها ---------------- */
  function renderCOA() {
    var p = panel("coa"); p.innerHTML = "";
    var groups = {};
    ACCOUNTS.forEach(function (a) { (groups[a.group] = groups[a.group] || []).push(a); });
    var typeName = {
      asset: "دارایی", "contra-asset": "کاهنده دارایی", liability: "بدهی",
      equity: "حقوق صاحبان سهام", "contra-equity": "کاهنده حقوق", revenue: "درآمد",
      cogs: "بهای تمام‌شده", expense: "هزینه"
    };
    var card = el("div", "card");
    var rows = "";
    Object.keys(groups).forEach(function (g) {
      rows += '<tr class="grp-row"><td colspan="4">' + g + '</td></tr>';
      groups[g].forEach(function (a) {
        rows += '<tr><td><span class="mono">' + toFa(a.code) + '</span></td><td>' + a.name + '</td>' +
          '<td>' + typeName[a.type] + '</td>' +
          '<td><span class="chip ' + (isDebitNormal(a.type) ? "info" : "ok") + '">' +
          (isDebitNormal(a.type) ? "بدهکار" : "بستانکار") + '</span></td></tr>';
      });
    });
    card.innerHTML =
      '<div class="card-head"><h3>کدینگ حساب‌ها (' + toFa(ACCOUNTS.length) + ' حساب)</h3></div>' +
      '<div class="tbl-wrap flush"><table class="tbl"><thead><tr>' +
      '<th>کد</th><th>عنوان حساب</th><th>گروه</th><th>ماهیت</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    p.appendChild(card);
  }

  /* ---------------- سند جدید (مودال) ---------------- */
  var TEMPLATES = {
    sale: { desc: "فروش نقدی کالا همراه با مالیات بر ارزش افزوده", base: 100000000,
      make: function (base) {
        var vat = Math.round(base * VAT_RATE);
        return [
          { code: "1102", d: base + vat, c: 0 },
          { code: "4101", d: 0, c: base },
          { code: "2102", d: 0, c: vat }
        ];
      } },
    purchase: { desc: "خرید موجودی کالا به‌صورت نسیه", base: 80000000,
      make: function (base) { return [{ code: "1104", d: base, c: 0 }, { code: "2101", d: 0, c: base }]; } },
    salary: { desc: "پرداخت حقوق کارکنان", base: 60000000,
      make: function (base) { return [{ code: "6101", d: base, c: 0 }, { code: "1102", d: 0, c: base }]; } },
    rent: { desc: "پرداخت اجاره", base: 24000000,
      make: function (base) { return [{ code: "6102", d: base, c: 0 }, { code: "1102", d: 0, c: base }]; } },
    depr: { desc: "ثبت استهلاک ماهانه", base: 2000000,
      make: function (base) { return [{ code: "6105", d: base, c: 0 }, { code: "1202", d: 0, c: base }]; } }
  };

  function accountOptions(sel) {
    return '<option value="">— انتخاب حساب —</option>' + ACCOUNTS.map(function (a) {
      return '<option value="' + a.code + '"' + (a.code === sel ? " selected" : "") + '>' +
        toFa(a.code) + " — " + a.name + '</option>';
    }).join("");
  }
  function lineRow(data) {
    data = data || { code: "", d: "", c: "" };
    var r = el("div", "entry-line");
    r.innerHTML =
      '<select class="ln-acc">' + accountOptions(data.code) + '</select>' +
      '<input class="ln-d num" inputmode="numeric" placeholder="۰" value="' + (data.d ? money(data.d) : "") + '">' +
      '<input class="ln-c num" inputmode="numeric" placeholder="۰" value="' + (data.c ? money(data.c) : "") + '">' +
      '<button class="ln-del" title="حذف ردیف">' + icon("x") + '</button>';
    r.querySelector(".ln-del").addEventListener("click", function () { r.remove(); recalcBalance(); });
    r.querySelectorAll("input").forEach(function (inp) {
      inp.addEventListener("input", function () {
        // چون هر ردیف یا بدهکار است یا بستانکار، ورود در یکی دیگری را صفر می‌کند
        var d = r.querySelector(".ln-d"), c = r.querySelector(".ln-c");
        if (inp === d && faToEn(d.value)) c.value = "";
        if (inp === c && faToEn(c.value)) d.value = "";
        recalcBalance();
      });
      inp.addEventListener("blur", function () {
        var v = faToEn(inp.value);
        inp.value = v ? money(v) : "";
        recalcBalance();
      });
    });
    return r;
  }
  function recalcBalance() {
    var lines = document.querySelectorAll("#entryLines .entry-line");
    var td = 0, tc = 0;
    lines.forEach(function (r) {
      td += +faToEn(r.querySelector(".ln-d").value) || 0;
      tc += +faToEn(r.querySelector(".ln-c").value) || 0;
    });
    var diff = td - tc;
    var box = document.getElementById("entBalance");
    var ok = diff === 0 && td > 0;
    box.className = "entry-balance " + (ok ? "ok" : (td || tc ? "err" : ""));
    box.innerHTML =
      '<div><span>جمع بدهکار</span><b>' + money(td) + '</b></div>' +
      '<div><span>جمع بستانکار</span><b>' + money(tc) + '</b></div>' +
      '<div><span>اختلاف</span><b>' + money(diff) + '</b></div>' +
      '<div class="bal-flag">' + (ok ? icon("check") + " تراز" : (td || tc ? icon("x") + " نامتوازن" : "در انتظار ورود")) + '</div>';
    return { td: td, tc: tc, ok: ok };
  }
  function openModal() {
    var m = document.getElementById("entryModal");
    document.getElementById("entDate").value = "۱۴۰۴/۰۶/۱۲";
    document.getElementById("entDesc").value = "";
    var box = document.getElementById("entryLines");
    box.innerHTML = "";
    box.appendChild(lineRow()); box.appendChild(lineRow());
    recalcBalance();
    m.hidden = false;
  }
  function closeModal() { document.getElementById("entryModal").hidden = true; }
  function applyTemplate(key) {
    var tpl = TEMPLATES[key]; if (!tpl) return;
    var base = prompt("مبلغ پایه (تومان):", tpl.base);
    if (base == null) return;
    base = +faToEn(base) || tpl.base;
    document.getElementById("entDesc").value = tpl.desc;
    var box = document.getElementById("entryLines"); box.innerHTML = "";
    tpl.make(base).forEach(function (ln) { box.appendChild(lineRow(ln)); });
    recalcBalance();
  }
  function saveEntry() {
    var b = recalcBalance();
    if (!b.ok) { alert("سند متوازن نیست: مجموع بدهکار باید برابر مجموع بستانکار و بزرگ‌تر از صفر باشد."); return; }
    var lines = [];
    document.querySelectorAll("#entryLines .entry-line").forEach(function (r) {
      var code = r.querySelector(".ln-acc").value;
      var d = +faToEn(r.querySelector(".ln-d").value) || 0;
      var c = +faToEn(r.querySelector(".ln-c").value) || 0;
      if (code && (d || c)) lines.push({ code: code, d: d, c: c });
    });
    if (lines.length < 2) { alert("حداقل دو ردیف حساب معتبر لازم است."); return; }
    if (lines.some(function (l) { return !l.code; })) { alert("برای همه ردیف‌ها حساب انتخاب کنید."); return; }
    var desc = document.getElementById("entDesc").value.trim() || "سند بدون شرح";
    var date = document.getElementById("entDate").value.trim() || "۱۴۰۴/۰۶/۱۲";
    entries.push({ id: nextId(), date: date, desc: desc, lines: lines });
    save(); closeModal(); renderAll();
    switchTab("journal");
  }

  /* ---------------- خروجی CSV ---------------- */
  function exportCSV() {
    var rows = [["سند", "تاریخ", "کد حساب", "نام حساب", "بدهکار", "بستانکار", "شرح"]];
    entries.slice().sort(function (a, b) { return a.id - b.id; }).forEach(function (e) {
      e.lines.forEach(function (ln) {
        var a = acc(ln.code) || { name: ln.code };
        rows.push([e.id, e.date, ln.code, a.name, ln.d || 0, ln.c || 0, e.desc]);
      });
    });
    var csv = "﻿" + rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(",");
    }).join("\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "atom-journal.csv"; document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  }

  /* ---------------- تب‌ها و رندر کلی ---------------- */
  function switchTab(name) {
    document.querySelectorAll(".acc-tabs button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === name);
    });
    document.querySelectorAll("[data-panel]").forEach(function (s) {
      s.hidden = s.getAttribute("data-panel") !== name;
    });
  }
  function renderAll() {
    renderOverview(); renderJournal(); renderLedger();
    renderTrial(); renderIncome(); renderBalance(); renderCOA();
  }

  /* ---------------- اتصال رویدادها ---------------- */
  function init() {
    if (!document.querySelector('[data-panel="overview"]')) return; // فقط صفحه حسابداری
    load();
    renderAll();

    document.querySelectorAll(".acc-tabs button").forEach(function (b) {
      b.addEventListener("click", function () { switchTab(b.getAttribute("data-tab")); });
    });
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-open-entry]")) openModal();
      if (e.target.closest("[data-close-entry]")) closeModal();
      if (e.target.closest("[data-add-line]")) { document.getElementById("entryLines").appendChild(lineRow()); recalcBalance(); }
      var tpl = e.target.closest("[data-tpl]");
      if (tpl) applyTemplate(tpl.getAttribute("data-tpl"));
      if (e.target.closest("[data-acc-export]")) exportCSV();
      if (e.target.closest("[data-acc-reset]")) {
        if (confirm("بازگرداندن داده‌ها به اسناد نمونه؟ همه تغییرات شما حذف می‌شود.")) {
          entries = seed(); save(); renderAll(); switchTab("overview");
        }
      }
    });
    document.getElementById("saveEntry").addEventListener("click", saveEntry);
    // بستن مودال با کلیک روی پس‌زمینه
    document.getElementById("entryModal").addEventListener("click", function (e) {
      if (e.target.id === "entryModal") closeModal();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
