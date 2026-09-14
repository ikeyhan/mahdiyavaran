/* مسیرهای احراز هویت — ورود امن، تغییر رمز، پروفایل */
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { sign, requireAuth, logActivity, clientIp } = require('../auth');
const { str } = require('../validate');
const banned = require('../banned');

const router = express.Router();

// محدودیت تلاش ورود روی هر IP: حداکثر ۱۰ بار در ۱۵ دقیقه
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تلاش‌های ورود بیش از حد مجاز. چند دقیقه صبر کنید.' },
});

const MAX_FAILS = 5;         // قفل پس از ۵ شکست متوالی
const LOCK_MINUTES = 15;

router.post('/login', loginLimiter, (req, res) => {
  const username = str(req.body.username, 60).trim();
  const password = str(req.body.password, 200);
  const ip = clientIp(req);

  if (!username || !password)
    return res.status(400).json({ error: 'نام کاربری و رمز عبور را وارد کنید.' });

  // قفل بر اساس شکست‌های اخیر همین کاربر
  const recentFails = db.prepare(
    `SELECT COUNT(*) c FROM login_attempts
     WHERE username=? AND success=0 AND created_at > datetime('now', ?)`
  ).get(username, `-${LOCK_MINUTES} minutes`).c;
  if (recentFails >= MAX_FAILS)
    return res.status(429).json({ error: `به دلیل تلاش‌های ناموفق، حساب موقتاً قفل شد. ${LOCK_MINUTES} دقیقه بعد تلاش کنید.` });

  const admin = db.prepare('SELECT * FROM admins WHERE username=?').get(username);
  const ok = admin && admin.status === 'active' && bcrypt.compareSync(password, admin.password_hash);

  db.prepare('INSERT INTO login_attempts (username,ip,success) VALUES (?,?,?)')
    .run(username, ip, ok ? 1 : 0);

  if (!ok) return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });

  db.prepare("UPDATE admins SET last_login=datetime('now') WHERE id=?").run(admin.id);
  db.prepare('INSERT INTO activity_log (actor,action,target,ip) VALUES (?,?,?,?)')
    .run(admin.username, 'ورود', 'ورود موفق به پنل', ip);

  const token = sign(admin);
  res.json({
    token,
    user: { id: admin.id, username: admin.username, name: admin.name, role: admin.role, email: admin.email },
  });
});

// ثبت‌نام فروشنده از سایت (عمومی) — حساب نقش seller + فروشگاه می‌سازد
router.post('/register', loginLimiter, (req, res) => {
  const name = str(req.body.name, 120).trim();
  const store = str(req.body.seller_name, 120).trim();
  const username = str(req.body.username, 60).trim().toLowerCase();
  const password = str(req.body.password, 200);
  const phone = str(req.body.phone, 20).trim();
  const city = str(req.body.city, 60).trim();
  const category = str(req.body.category, 120).trim();

  if (!store || !username || !password)
    return res.status(400).json({ error: 'نام فروشگاه، نام کاربری و رمز عبور الزامی است.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد.' });
  if (!/^[a-zA-Z0-9_.]{3,}$/.test(username))
    return res.status(400).json({ error: 'نام کاربری فقط حروف و عدد انگلیسی و حداقل ۳ کاراکتر باشد.' });

  const w = banned.findBanned(name, store, username);
  if (w) return res.status(400).json({ error: 'استفاده از کلمهٔ «' + w + '» مجاز نیست.' });

  if (db.prepare('SELECT id FROM admins WHERE username=?').get(username))
    return res.status(409).json({ error: 'این نام کاربری قبلاً ثبت شده است.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    "INSERT INTO admins (username,password_hash,name,role,status,phone,seller_name) VALUES (?,?,?,?,?,?,?)"
  ).run(username, hash, name || store, 'seller', 'active', phone, store);
  db.prepare(
    "INSERT INTO sellers (name,category,city,rating,sales,status,owner,phone) VALUES (?,?,?,?,?,?,?,?)"
  ).run(store, category || 'فروشگاه', city, 5, 0, 'active', username, phone);
  db.prepare('INSERT INTO activity_log (actor,action,target,ip) VALUES (?,?,?,?)')
    .run(username, 'ثبت‌نام فروشنده', store, clientIp(req));

  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(info.lastInsertRowid);
  const token = sign(admin);
  res.status(201).json({
    token,
    user: { id: admin.id, username: admin.username, name: admin.name, role: admin.role, seller_name: store },
  });
});

// پروفایل کاربر جاری
router.get('/me', requireAuth, (req, res) => {
  const a = db.prepare('SELECT id,username,name,email,role,status,last_login FROM admins WHERE id=?')
    .get(req.admin.id);
  res.json({ user: a });
});

// خروج (ثبت در لاگ — با معماری JWT، ابطال توکن سمت کلاینت انجام می‌شود)
router.post('/logout', requireAuth, (req, res) => {
  logActivity(req, 'خروج', 'خروج از پنل');
  res.json({ ok: true });
});

// تغییر رمز عبور مدیر جاری
router.post('/change-password', requireAuth, (req, res) => {
  const current = str(req.body.current, 200);
  const next = str(req.body.next, 200);
  if (next.length < 8)
    return res.status(400).json({ error: 'رمز جدید باید حداقل ۸ کاراکتر باشد.' });
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.admin.id);
  if (!bcrypt.compareSync(current, admin.password_hash))
    return res.status(400).json({ error: 'رمز فعلی نادرست است.' });
  db.prepare('UPDATE admins SET password_hash=? WHERE id=?')
    .run(bcrypt.hashSync(next, 10), admin.id);
  logActivity(req, 'تغییر رمز', 'رمز عبور خود را تغییر داد');
  res.json({ ok: true });
});

module.exports = router;
