/* داده‌های عمومی سایت — بدون احراز هویت (فقط خواندنی و امن) */
const express = require('express');
const db = require('../db');
const { str, int, isMobile } = require('../validate');
const rateLimit = require('express-rate-limit');
const { verify, clientIp } = require('../auth');
const banned = require('../banned');
const router = express.Router();

// ارسال پیام شهروند به یک دفتر محله (گفتگو)
router.post('/office-message', (req, res) => {
  const officeId = parseInt(req.body.office_id, 10);
  const name = str(req.body.name, 120).trim() || 'شهروند';
  const phone = str(req.body.phone, 20).trim();
  const body = str(req.body.body, 4000).trim();
  if (!officeId || !body) return res.status(400).json({ error: 'انتخاب دفتر و متن پیام الزامی است.' });
  if (!banned.guard(res, name, body)) return;
  const office = db.prepare("SELECT id,name,owner FROM offices WHERE id=? AND status='verified'").get(officeId);
  if (!office) return res.status(404).json({ error: 'دفتر یافت نشد یا هنوز تأیید نشده است.' });
  db.prepare("INSERT INTO office_messages (owner,office,sender_name,sender_phone,body,status) VALUES (?,?,?,?,?,?)")
    .run(office.owner || '', office.name, name, phone, body, 'open');
  res.status(201).json({ ok: true });
});

// اسلایدهای فعال بخش اولیهٔ سایت
router.get('/slides', (req, res) => {
  const items = db.prepare(
    "SELECT id,eyebrow,title,subtitle,image,cta_label,cta_link FROM slides WHERE status='active' ORDER BY sort ASC, id ASC"
  ).all();
  res.json({ items });
});

// تبلیغات فعال سایت (نوار بالا + مربع گوشه)
router.get('/ads', (req, res) => {
  const items = db.prepare(
    "SELECT id,placement,title,text,image,link,cta_label,bg FROM ads WHERE status='active' ORDER BY sort ASC, id ASC"
  ).all();
  res.json({
    top: items.filter(a => a.placement === 'top'),
    corner: items.filter(a => a.placement === 'corner'),
  });
});

// دفاتر محلات تأییدشده برای نمایش در سایت
router.get('/offices', (req, res) => {
  const items = db.prepare(
    "SELECT id,name,manager,area,city,address,phone,bio,avatar,rating,created_at FROM offices WHERE status='verified' ORDER BY rating DESC, id DESC LIMIT 48"
  ).all();
  res.json({ items });
});

// خدمات یک دفتر (عمومی) — با شناسهٔ دفتر (نام‌کاربری حساب‌ها افشا نمی‌شود)
router.get('/office-services', (req, res) => {
  const officeId = parseInt(req.query.office_id, 10);
  let owner = '';
  if (officeId) {
    const o = db.prepare("SELECT owner FROM offices WHERE id=? AND status='verified'").get(officeId);
    if (!o) return res.json({ items: [] });
    owner = o.owner || '';
  }
  const rows = officeId
    ? db.prepare("SELECT id,title,category,office,description,price FROM office_services WHERE status='active' AND owner=? ORDER BY id DESC").all(owner)
    : db.prepare("SELECT id,title,category,office,description,price FROM office_services WHERE status='active' ORDER BY id DESC LIMIT 60").all();
  res.json({ items: rows });
});

// فروشندگان تأییدشده برای نمایش در سایت
router.get('/sellers', (req, res) => {
  const items = db.prepare(
    "SELECT id,name,category,city,rating,sales,bio,avatar,created_at FROM sellers WHERE status='active' ORDER BY sales DESC, id DESC LIMIT 24"
  ).all();
  res.json({ items });
});

// محصولات فعال (برای جستجو و فهرست سایت)
router.get('/products', (req, res) => {
  const items = db.prepare(
    "SELECT id,title,category,seller,price,stock,image,description FROM products WHERE status='active' ORDER BY id DESC LIMIT 200"
  ).all();
  res.json({ items });
});

function setting(key, def) { const r = db.prepare('SELECT value FROM settings WHERE key=?').get(key); return r && r.value !== '' ? r.value : def; }
function numSetting(key, def) { const n = parseInt(String(setting(key, def)).replace(/[^0-9]/g, ''), 10); return isNaN(n) ? def : n; }
function findOffer(code) {
  code = str(code, 40).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).trim().toUpperCase();
  if (!code) return null;
  const o = db.prepare("SELECT code,title,kind,amount,used,quota,status FROM offers WHERE UPPER(code)=?").get(code);
  if (!o || o.status !== 'active' || (o.quota > 0 && o.used >= o.quota)) return null;
  return o;
}

// بررسی کد تخفیف
router.get('/offer', (req, res) => {
  const o = findOffer(req.query.code);
  if (!o) return res.status(404).json({ error: 'کد تخفیف نامعتبر یا منقضی است.' });
  res.json({ code: o.code, title: o.title, kind: o.kind, amount: o.amount });
});

// ثبت سفارش از سبد خرید — بدون نیاز به ورود (در صورت ورود مشتری، به حساب او متصل می‌شود)
const orderLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'تعداد درخواست‌های ثبت سفارش بیش از حد مجاز است. کمی بعد تلاش کنید.' } });
router.post('/order', orderLimiter, (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : [];
  const name = str(req.body.name, 120).trim();
  const phone = str(req.body.phone, 20).trim();
  const address = str(req.body.address, 600).trim();
  const city = str(req.body.city, 60).trim();
  if (!items.length) return res.status(400).json({ error: 'سبد خرید خالی است.' });
  if (!name || !address) return res.status(400).json({ error: 'نام گیرنده و آدرس کامل را وارد کنید.' });
  if (!isMobile(phone)) return res.status(400).json({ error: 'شمارهٔ موبایل نامعتبر است (نمونهٔ درست: 09xxxxxxxxx).' });
  if (!banned.guard(res, name, address, req.body.note)) return;

  // اگر مشتری وارد شده باشد، سفارش به حساب او متصل می‌شود
  const h = req.headers.authorization || '';
  const who = h.startsWith('Bearer ') ? verify(h.slice(7)) : null;
  const owner = who ? who.username : '';

  // قیمت هر قلم از جدول محصولات خوانده می‌شود؛ اگر محصول در پایگاه داده نبود، قیمت کاتالوگ سایت
  const lines = items.map(it => {
    const qty = Math.max(1, Math.min(99, int(it.qty, 1)));
    const p = it.id && /^\d+$/.test(String(it.id)) ? db.prepare("SELECT title,price,seller FROM products WHERE id=? AND status='active'").get(+it.id) : null;
    const price = p ? p.price : Math.max(0, int(it.price, 0));
    return { qty, price, title: p ? p.title : str(it.title, 300), seller: (p && p.seller) || str(it.seller, 120) || 'اتم ۳۱۳', amount: qty * price };
  });
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const minOrder = numSetting('min_order', 0);
  if (subtotal < minOrder) return res.status(400).json({ error: 'حداقل مبلغ سفارش ' + minOrder.toLocaleString('fa-IR') + ' تومان است.' });
  // کد تخفیف (سمت سرور دوباره بررسی می‌شود)
  const offer = req.body.coupon ? findOffer(req.body.coupon) : null;
  if (req.body.coupon && !offer) return res.status(400).json({ error: 'کد تخفیف نامعتبر یا منقضی است.' });
  let discount = 0;
  if (offer) discount = offer.kind === 'percent' ? Math.round(subtotal * Math.min(100, offer.amount) / 100) : Math.min(subtotal, offer.amount);
  const afterDisc = subtotal - discount;
  const shipping = afterDisc >= numSetting('free_shipping_min', 500000) ? 0 : numSetting('shipping_cost', 0);
  const total = afterDisc + shipping;
  // تخفیف به نسبت مبلغ روی اقلام پخش می‌شود تا جمع ردیف‌ها = مبلغ پرداختی
  let left = discount;
  lines.forEach((l, i) => { const share = i === lines.length - 1 ? left : Math.round(discount * l.amount / (subtotal || 1)); l.amount -= share; left -= share; });
  const note = [offer ? 'کد تخفیف ' + offer.code + ' (−' + discount + ' ت)' : '', shipping ? 'هزینهٔ ارسال ' + shipping + ' ت' : 'ارسال رایگان', str(req.body.note, 300)].filter(Boolean).join(' · ');

  const last = db.prepare("SELECT MAX(CAST(code AS INTEGER)) m FROM orders").get().m || 1000;
  const code = String(Math.max(1000, last) + 1);
  const ins = db.prepare("INSERT INTO orders (code,customer,product,seller,amount,status,phone,address,owner,note) VALUES (?,?,?,?,?,?,?,?,?,?)");
  const tx = db.transaction(() => {
    lines.forEach((l, i) => {
      ins.run(code, name, l.title + (l.qty > 1 ? ' ×' + l.qty : ''), l.seller, l.amount + (i === 0 ? shipping : 0), 'pending', phone, address + (city ? '، ' + city : ''), owner, note);
    });
    if (offer) db.prepare('UPDATE offers SET used=used+1 WHERE code=?').run(offer.code);
    const c = db.prepare('SELECT id FROM customers WHERE phone=?').get(phone);
    if (c) db.prepare('UPDATE customers SET orders_count=orders_count+1, total_spent=total_spent+? WHERE id=?').run(total, c.id);
    else db.prepare('INSERT INTO customers (name,phone,email,city,total_spent,orders_count) VALUES (?,?,?,?,?,1)').run(name, phone, '', city, total);
    db.prepare('INSERT INTO activity_log (actor,action,target,ip) VALUES (?,?,?,?)').run(name, 'ثبت سفارش', '#' + code, clientIp(req));
  });
  tx();
  res.status(201).json({ ok: true, code, subtotal, discount, shipping, total });
});

// نظرات تأییدشدهٔ یک محصول
router.get('/comments', (req, res) => {
  const product = str(req.query.product, 200).trim();
  const items = product
    ? db.prepare("SELECT id,author,product,body,rating,created_at FROM comments WHERE status='approved' AND product=? ORDER BY id DESC LIMIT 100").all(product)
    : db.prepare("SELECT id,author,product,body,rating,created_at FROM comments WHERE status='approved' ORDER BY id DESC LIMIT 200").all();
  res.json({ items });
});

// ثبت نظر خریدار — پس از تأیید مدیر در سایت نمایش داده می‌شود
const commentLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'تعداد نظرات ارسالی بیش از حد مجاز است. کمی بعد تلاش کنید.' } });
router.post('/comment', commentLimiter, (req, res) => {
  const author = str(req.body.author, 120).trim();
  const product = str(req.body.product, 200).trim();
  const body = str(req.body.body, 2000).trim();
  const rating = Math.max(1, Math.min(5, int(req.body.rating, 5)));
  if (!author || !product || body.length < 5) return res.status(400).json({ error: 'نام، محصول و متن نظر (حداقل ۵ نویسه) الزامی است.' });
  if (!banned.guard(res, author, body)) return;
  db.prepare("INSERT INTO comments (author,product,body,rating,status) VALUES (?,?,?,?,'pending')").run(author, product, body, rating);
  res.status(201).json({ ok: true });
});

// پیگیری سفارش با کد سفارش + موبایل
router.get('/track', (req, res) => {
  const code = str(req.query.code, 40).trim();
  const phone = str(req.query.phone, 20).trim();
  if (!code || !phone) return res.status(400).json({ error: 'کد سفارش و موبایل را وارد کنید.' });
  const items = db.prepare("SELECT code,product,seller,amount,status,created_at FROM orders WHERE code=? AND phone=?").all(code, phone);
  if (!items.length) return res.status(404).json({ error: 'سفارشی با این مشخصات یافت نشد.' });
  res.json({ items });
});

module.exports = router;
