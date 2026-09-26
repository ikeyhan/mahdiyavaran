/* مسیرهای احراز هویت — ورود امن، تغییر رمز، پروفایل */
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { sign, requireAuth, logActivity, clientIp } = require('../auth');
const { str, isNationalCode, isMobile } = require('../validate');
const banned = require('../banned');

const router = express.Router();

// کلید «امکان ثبت‌نام کاربران جدید» در تنظیمات مدیریت
function registrationOpen(res) {
  const r = db.prepare("SELECT value FROM settings WHERE key='registration'").get();
  if (r && r.value === '0') { res.status(403).json({ error: 'ثبت‌نام حساب جدید موقتاً غیرفعال است.' }); return false; }
  return true;
}

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
    user: { id: admin.id, username: admin.username, name: admin.name, role: admin.role, email: admin.email, phone: admin.phone || '', seller_name: admin.seller_name || undefined, office_name: admin.office_name || undefined },
  });
});

// ثبت‌نام فروشنده از سایت (عمومی) — حساب نقش seller + فروشگاه می‌سازد
router.post('/register', loginLimiter, (req, res) => {
  if (!registrationOpen(res)) return;
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

// ثبت‌نام دفتر محله (عمومی) — با اعتبارسنجی کد ملی؛ در وضعیت «در انتظار تأیید»
router.post('/register-office', loginLimiter, (req, res) => {
  if (!registrationOpen(res)) return;
  const office = str(req.body.office_name, 160).trim();
  const manager = str(req.body.manager, 120).trim();
  const area = str(req.body.area, 120).trim();
  const city = str(req.body.city, 60).trim();
  const address = str(req.body.address, 300).trim();
  const phone = str(req.body.phone, 20).trim();
  const nationalCode = str(req.body.national_code, 12).trim();
  const license = str(req.body.license_no, 60).trim();
  const username = str(req.body.username, 60).trim().toLowerCase();
  const password = str(req.body.password, 200);

  if (!office || !username || !password || !manager || !nationalCode)
    return res.status(400).json({ error: 'نام دفتر، مسئول، کد ملی، نام کاربری و رمز عبور الزامی است.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد.' });
  if (!/^[a-zA-Z0-9_.]{3,}$/.test(username))
    return res.status(400).json({ error: 'نام کاربری فقط حروف و عدد انگلیسی و حداقل ۳ کاراکتر باشد.' });
  // اعتبارسنجی کد ملی (رقم کنترلی رسمی)
  if (!isNationalCode(nationalCode))
    return res.status(400).json({ error: 'کد ملی واردشده نامعتبر است. لطفاً یک کد ملی معتبر وارد کنید.' });
  if (phone && !isMobile(phone))
    return res.status(400).json({ error: 'شمارهٔ موبایل نامعتبر است (نمونهٔ درست: 09xxxxxxxxx).' });

  const w = banned.findBanned(office, manager, username);
  if (w) return res.status(400).json({ error: 'استفاده از کلمهٔ «' + w + '» مجاز نیست.' });
  if (db.prepare('SELECT id FROM admins WHERE username=?').get(username))
    return res.status(409).json({ error: 'این نام کاربری قبلاً ثبت شده است.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    "INSERT INTO admins (username,password_hash,name,role,status,phone,office_name) VALUES (?,?,?,?,?,?,?)"
  ).run(username, hash, manager || office, 'office', 'active', phone, office);
  db.prepare(
    "INSERT INTO offices (name,manager,area,city,address,phone,national_code,license_no,owner,verified,status,rating) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
  ).run(office, manager, area, city, address, phone, nationalCode, license, username, 0, 'pending', 5);
  db.prepare('INSERT INTO activity_log (actor,action,target,ip) VALUES (?,?,?,?)')
    .run(username, 'ثبت‌نام دفتر محله', office, clientIp(req));

  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(info.lastInsertRowid);
  const token = sign(admin);
  res.status(201).json({
    token,
    user: { id: admin.id, username: admin.username, name: admin.name, role: admin.role, office_name: office },
  });
});

// ثبت‌نام مشتری (خریدار) از سایت — حساب نقش customer + ردیف مشتری
router.post('/register-customer', loginLimiter, (req, res) => {
  if (!registrationOpen(res)) return;
  const name = str(req.body.name, 120).trim();
  const phone = str(req.body.phone, 20).trim();
  const email = str(req.body.email, 160).trim();
  const city = str(req.body.city, 60).trim();
  const username = str(req.body.username, 60).trim().toLowerCase();
  const password = str(req.body.password, 200);
  if (!name || !phone || !username || !password)
    return res.status(400).json({ error: 'نام، موبایل، نام کاربری و رمز عبور الزامی است.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد.' });
  if (!/^[a-zA-Z0-9_.]{3,}$/.test(username))
    return res.status(400).json({ error: 'نام کاربری فقط حروف و عدد انگلیسی و حداقل ۳ کاراکتر باشد.' });
  if (!isMobile(phone))
    return res.status(400).json({ error: 'شمارهٔ موبایل نامعتبر است (نمونهٔ درست: 09xxxxxxxxx).' });
  const w = banned.findBanned(name, username);
  if (w) return res.status(400).json({ error: 'استفاده از کلمهٔ «' + w + '» مجاز نیست.' });
  if (db.prepare('SELECT id FROM admins WHERE username=?').get(username))
    return res.status(409).json({ error: 'این نام کاربری قبلاً ثبت شده است.' });

  const info = db.prepare(
    "INSERT INTO admins (username,password_hash,name,email,role,status,phone) VALUES (?,?,?,?,?,?,?)"
  ).run(username, bcrypt.hashSync(password, 10), name, email, 'customer', 'active', phone);
  if (!db.prepare('SELECT id FROM customers WHERE phone=?').get(phone))
    db.prepare('INSERT INTO customers (name,phone,email,city,total_spent,orders_count) VALUES (?,?,?,?,0,0)').run(name, phone, email, city);
  db.prepare('INSERT INTO activity_log (actor,action,target,ip) VALUES (?,?,?,?)').run(username, 'ثبت‌نام مشتری', name, clientIp(req));
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(info.lastInsertRowid);
  res.status(201).json({ token: sign(admin), user: { id: admin.id, username, name, role: 'customer', phone } });
});

// پروفایل کاربر جاری
router.get('/me', requireAuth, (req, res) => {
  const a = db.prepare('SELECT id,username,name,email,role,status,last_login,phone,seller_name,office_name FROM admins WHERE id=?')
    .get(req.admin.id);
  const out = { user: a };
  // هشدارهای امنیتی راه‌اندازی — فقط برای مدیر کل
  if (a && a.role === 'admin') {
    const me = db.prepare('SELECT password_hash FROM admins WHERE id=?').get(a.id);
    const DEMO = { atra: 'atra1234', daftar: 'daftar1234', reza: 'atom123', samira: 'atom123' };
    const demo = db.prepare("SELECT username,password_hash FROM admins WHERE status='active' AND username IN ('atra','daftar','reza','samira')").all()
      .filter(r => bcrypt.compareSync(DEMO[r.username], r.password_hash)).map(r => r.username);
    out.security = { defaultPassword: bcrypt.compareSync('atom313@', me.password_hash), demoAccounts: demo };
  }
  res.json(out);
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
