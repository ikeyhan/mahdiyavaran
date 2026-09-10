/* آمار داشبورد، لاگ فعالیت، و باشگاه مشتریان (سطوح محاسبه‌شده) */
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { int } = require('../validate');

const router = express.Router();
// نکته: این روتر روی مسیر /api سوار می‌شود؛ به‌جای router.use سراسری،
// احراز هویت را روی هر مسیر جداگانه اعمال می‌کنیم تا روترهای دیگرِ /api
// (مثل /api/support عمومی) مسدود نشوند.

// آمار داشبورد — از داده واقعی محاسبه می‌شود
router.get('/stats', requireAuth, (req, res) => {
  const revenue = db.prepare("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status IN ('delivered','shipping')").get().s;
  const cnt = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
  res.json({
    revenue,
    orders: cnt('orders'),
    customers: cnt('customers'),
    products: cnt('products'),
    sellers: cnt('sellers'),
    categories: cnt('categories'),
    articles: cnt('articles'),
    published: db.prepare("SELECT COUNT(*) c FROM articles WHERE status='published'").get().c,
    pendingComments: db.prepare("SELECT COUNT(*) c FROM comments WHERE status='pending'").get().c,
    openMessages: db.prepare("SELECT COUNT(*) c FROM messages WHERE status='open'").get().c,
    recentOrders: db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 5').all(),
    ordersByStatus: db.prepare('SELECT status, COUNT(*) c FROM orders GROUP BY status').all(),
  });
});

// لاگ فعالیت مدیران (رهگیری اقدامات)
router.get('/activity', requireAuth, (req, res) => {
  const limit = Math.min(int(req.query.limit, 50), 200);
  res.json({
    items: db.prepare('SELECT * FROM activity_log ORDER BY id DESC LIMIT ?').all(limit),
  });
});

// ورودهای اخیر و تلاش‌های ناموفق (امنیت)
router.get('/logins', requireAuth, (req, res) => {
  res.json({
    items: db.prepare('SELECT username,ip,success,created_at FROM login_attempts ORDER BY id DESC LIMIT 50').all(),
  });
});

// --- باشگاه مشتریان: سطح از روی مجموع خرید محاسبه می‌شود ---
const TIERS = [
  { key: 'platinum', name: 'پلاتینیوم', min: 400_000_000 },
  { key: 'gold', name: 'طلایی', min: 150_000_000 },
  { key: 'silver', name: 'نقره‌ای', min: 50_000_000 },
  { key: 'bronze', name: 'برنزی', min: 0 },
];
function tierOf(total) {
  return TIERS.find(t => total >= t.min) || TIERS[TIERS.length - 1];
}
router.get('/loyalty', requireAuth, (req, res) => {
  const custs = db.prepare('SELECT id,name,total_spent FROM customers ORDER BY total_spent DESC').all();
  const counts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  const members = custs.map(c => {
    const t = tierOf(c.total_spent); counts[t.key]++;
    return { id: c.id, name: c.name, total_spent: c.total_spent, tier: t.key, tierName: t.name };
  });
  res.json({ tiers: TIERS, counts, members });
});

module.exports = router;
