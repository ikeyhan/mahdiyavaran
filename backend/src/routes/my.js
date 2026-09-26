/* بخش «حساب من» برای مشتریان سایت */
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, logActivity } = require('../auth');
const { str, isMobile } = require('../validate');
const banned = require('../banned');

const router = express.Router();
router.use(requireAuth);

// سفارش‌های کاربر جاری (بر اساس حساب یا موبایل ثبت‌شده)
router.get('/orders', (req, res) => {
  const me = db.prepare('SELECT username,phone FROM admins WHERE id=?').get(req.admin.id) || {};
  const items = db.prepare('SELECT * FROM orders WHERE owner=? OR (phone<>\'\' AND phone=?) ORDER BY id DESC LIMIT 200')
    .all(me.username || '', me.phone || '-');
  res.json({ items });
});

// فروشنده: سفارش‌های فروشگاه خودش
function shopName(req) {
  const a = db.prepare('SELECT seller_name,name FROM admins WHERE id=?').get(req.admin.id) || {};
  return a.seller_name || a.name || '';
}
router.get('/seller-orders', requireRole('seller'), (req, res) => {
  res.json({ items: db.prepare('SELECT id,code,customer,product,seller,amount,status,address,note,created_at FROM orders WHERE seller=? ORDER BY id DESC LIMIT 200').all(shopName(req)) });
});
// فروشنده وضعیت ارسال سفارش خود را به‌روز می‌کند (ارسال شد / تحویل شد)
router.put('/seller-orders/:id', requireRole('seller'), (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(+req.params.id);
  if (!o || o.seller !== shopName(req)) return res.status(404).json({ error: 'سفارش یافت نشد.' });
  const next = String(req.body.status || '');
  const allowed = { pending: ['shipping'], review: ['shipping'], shipping: ['delivered'] };
  if (!(allowed[o.status] || []).includes(next)) return res.status(400).json({ error: 'تغییر وضعیت مجاز نیست.' });
  db.prepare('UPDATE orders SET status=? WHERE id=?').run(next, o.id);
  logActivity(req, 'به‌روزرسانی سفارش', '#' + o.code + ' → ' + next);
  res.json({ ok: true });
});
// فروشنده: نظرات خریداران دربارهٔ محصولات خودش
router.get('/seller-comments', requireRole('seller'), (req, res) => {
  const titles = db.prepare('SELECT title FROM products WHERE owner=?').all(req.admin.username).map(r => r.title);
  const all = db.prepare("SELECT id,author,product,body,rating,status,created_at FROM comments WHERE status IN ('approved','pending') ORDER BY id DESC LIMIT 300").all();
  const shop = shopName(req);
  const words = t => String(t || '').split(/\s+/).filter(w => w.length > 1);
  const items = all.filter(c => titles.some(t => t === c.product || t.includes(c.product) || (words(c.product).length > 1 && words(c.product).every(w => t.includes(w)))) || (shop && String(c.product || '').includes(shop)));
  res.json({ items });
});

// پروفایل حساب جاری
router.get('/profile', (req, res) => {
  const u = db.prepare('SELECT id,username,name,email,phone,city,address,role,created_at FROM admins WHERE id=?').get(req.admin.id);
  res.json({ user: u });
});
router.put('/profile', (req, res) => {
  const cur = db.prepare('SELECT * FROM admins WHERE id=?').get(req.admin.id);
  if (!cur) return res.status(404).json({ error: 'حساب یافت نشد.' });
  const name = str(req.body.name, 120).trim() || cur.name;
  const email = str(req.body.email, 160).trim();
  const phone = str(req.body.phone, 20).trim() || cur.phone || '';
  const city = str(req.body.city, 60).trim();
  const address = str(req.body.address, 600).trim();
  if (phone && !isMobile(phone)) return res.status(400).json({ error: 'شمارهٔ موبایل نامعتبر است (نمونهٔ درست: 09xxxxxxxxx).' });
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'ایمیل نامعتبر است.' });
  if (!banned.guard(res, name, address)) return;
  db.prepare('UPDATE admins SET name=?, email=?, phone=?, city=?, address=? WHERE id=?').run(name, email, phone, city, address, cur.id);
  if (cur.role === 'customer' && cur.phone) db.prepare('UPDATE customers SET name=?, email=?, city=?, phone=? WHERE phone=?').run(name, email, city, phone, cur.phone);
  logActivity(req, 'ویرایش پروفایل', cur.username);
  res.json({ ok: true, user: { id: cur.id, username: cur.username, name, email, phone, city, address, role: cur.role } });
});

module.exports = router;
