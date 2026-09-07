/* تنظیمات سایت + فیچرفلگ‌ها */
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, logActivity } = require('../auth');
const { str } = require('../validate');

const router = express.Router();

// خواندن تنظیمات عمومی (برای سایت) — بدون احراز هویت، فقط کلیدهای امن
const PUBLIC_KEYS = ['site_name', 'site_title', 'domain', 'maintenance', 'registration', 'online_payment'];
router.get('/public', (req, res) => {
  const rows = db.prepare(`SELECT key,value FROM settings`).all()
    .filter(r => PUBLIC_KEYS.includes(r.key));
  const obj = {}; rows.forEach(r => obj[r.key] = r.value);
  res.json({ settings: obj });
});

router.use(requireAuth);

// همه تنظیمات
router.get('/', (req, res) => {
  const obj = {};
  db.prepare('SELECT key,value FROM settings').all().forEach(r => obj[r.key] = r.value);
  res.json({ settings: obj });
});

// ذخیره تنظیمات — نقش admin
router.put('/', requireRole('admin'), (req, res) => {
  const entries = Object.entries(req.body || {});
  const up = db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  const tx = db.transaction(() => { for (const [k, v] of entries) up.run(str(k, 60), str(v, 2000)); });
  tx();
  logActivity(req, 'تغییر تنظیمات', `${entries.length} کلید به‌روزرسانی شد`);
  res.json({ ok: true });
});

// --- فیچرفلگ‌ها ---
router.get('/flags', (req, res) => {
  res.json({ items: db.prepare('SELECT * FROM feature_flags ORDER BY key').all() });
});

router.put('/flags/:key', requireRole('admin'), (req, res) => {
  const key = req.params.key;
  const f = db.prepare('SELECT * FROM feature_flags WHERE key=?').get(key);
  if (!f) return res.status(404).json({ error: 'فلگ یافت نشد.' });
  const enabled = req.body.enabled ? 1 : 0;
  db.prepare('UPDATE feature_flags SET enabled=? WHERE key=?').run(enabled, key);
  logActivity(req, 'تغییر فیچرفلگ', `${f.name} → ${enabled ? 'روشن' : 'خاموش'}`);
  res.json({ ok: true });
});

module.exports = router;
