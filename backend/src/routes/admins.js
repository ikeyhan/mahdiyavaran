/* مدیران، نقش‌ها و سطح دسترسی — فقط نقش admin */
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireRole, logActivity } = require('../auth');
const { str, oneOf, required } = require('../validate');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const ROLES = ['admin', 'editor', 'support'];
const STATUS = ['active', 'suspended', 'blocked'];
const pub = 'id,username,name,email,role,status,last_login,created_at';

router.get('/', (req, res) => {
  res.json({ items: db.prepare(`SELECT ${pub} FROM admins WHERE role IN ('admin','editor','support') ORDER BY id`).all() });
});

router.post('/', (req, res) => {
  const miss = required(req.body, ['username', 'password']);
  if (miss) return res.status(400).json({ error: `فیلد ${miss} الزامی است.` });
  const username = str(req.body.username, 60).trim();
  if (db.prepare('SELECT 1 FROM admins WHERE username=?').get(username))
    return res.status(409).json({ error: 'این نام کاربری قبلاً ثبت شده است.' });
  const info = db.prepare(`INSERT INTO admins (username,password_hash,name,email,role,status)
                           VALUES (?,?,?,?,?,?)`)
    .run(username, bcrypt.hashSync(str(req.body.password, 200), 10),
      str(req.body.name, 120), str(req.body.email, 160),
      oneOf(req.body.role, ROLES, 'support'), 'active');
  logActivity(req, 'ساخت مدیر', `کاربر «${username}» را ایجاد کرد`);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const id = +req.params.id;
  const a = db.prepare('SELECT * FROM admins WHERE id=?').get(id);
  if (!a) return res.status(404).json({ error: 'مدیر یافت نشد.' });
  db.prepare('UPDATE admins SET name=?, email=?, role=?, status=? WHERE id=?')
    .run(str(req.body.name, 120) || a.name, str(req.body.email, 160) || a.email,
      oneOf(req.body.role, ROLES, a.role), oneOf(req.body.status, STATUS, a.status), id);
  if (req.body.password) // تغییر رمز توسط مدیر کل
    db.prepare('UPDATE admins SET password_hash=? WHERE id=?')
      .run(bcrypt.hashSync(str(req.body.password, 200), 10), id);
  logActivity(req, 'ویرایش مدیر', `کاربر «${a.username}» را ویرایش کرد`);
  res.json({ ok: true });
});

// مسدودسازی/تعلیق سریع
// غیرفعال‌سازی حساب‌های نمونه (فروشنده، دفتر و کارکنان نمونه با رمز پیش‌فرض) پیش از راه‌اندازی
router.post('/demo-cleanup', (req, res) => {
  const DEMO = { atra: 'atra1234', daftar: 'daftar1234', reza: 'atom123', samira: 'atom123' };
  const rows = db.prepare("SELECT id,username,password_hash FROM admins WHERE status='active' AND username IN ('atra','daftar','reza','samira')").all()
    .filter(r => bcrypt.compareSync(DEMO[r.username], r.password_hash));
  const up = db.prepare("UPDATE admins SET status='blocked' WHERE id=?");
  rows.forEach(r => up.run(r.id));
  logActivity(req, 'امن‌سازی راه‌اندازی', rows.length + ' حساب نمونه غیرفعال شد');
  res.json({ ok: true, blocked: rows.map(r => r.username) });
});

router.post('/:id/status', (req, res) => {
  const id = +req.params.id;
  const a = db.prepare('SELECT * FROM admins WHERE id=?').get(id);
  if (!a) return res.status(404).json({ error: 'مدیر یافت نشد.' });
  if (a.role === 'admin' && req.body.status !== 'active')
    return res.status(400).json({ error: 'نمی‌توان مدیر کل را مسدود کرد.' });
  const status = oneOf(req.body.status, STATUS, 'active');
  db.prepare('UPDATE admins SET status=? WHERE id=?').run(status, id);
  logActivity(req, 'تغییر وضعیت مدیر', `وضعیت «${a.username}» → ${status}`);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const id = +req.params.id;
  const a = db.prepare('SELECT * FROM admins WHERE id=?').get(id);
  if (!a) return res.status(404).json({ error: 'مدیر یافت نشد.' });
  if (a.id === req.admin.id) return res.status(400).json({ error: 'نمی‌توانید حساب خودتان را حذف کنید.' });
  if (a.role === 'admin' && db.prepare("SELECT COUNT(*) c FROM admins WHERE role='admin'").get().c <= 1)
    return res.status(400).json({ error: 'حداقل یک مدیر کل باید باقی بماند.' });
  db.prepare('DELETE FROM admins WHERE id=?').run(id);
  logActivity(req, 'حذف مدیر', `کاربر «${a.username}» را حذف کرد`);
  res.json({ ok: true });
});

module.exports = router;
