/* داده‌های عمومی سایت — بدون احراز هویت (فقط خواندنی و امن) */
const express = require('express');
const db = require('../db');
const router = express.Router();

// اسلایدهای فعال بخش اولیهٔ سایت
router.get('/slides', (req, res) => {
  const items = db.prepare(
    "SELECT id,eyebrow,title,subtitle,image,cta_label,cta_link FROM slides WHERE status='active' ORDER BY sort ASC, id ASC"
  ).all();
  res.json({ items });
});

// فروشندگان تأییدشده برای نمایش در سایت
router.get('/sellers', (req, res) => {
  const items = db.prepare(
    "SELECT id,name,category,city,rating,sales,bio,avatar FROM sellers WHERE status='active' ORDER BY sales DESC, id DESC LIMIT 24"
  ).all();
  res.json({ items });
});

module.exports = router;
