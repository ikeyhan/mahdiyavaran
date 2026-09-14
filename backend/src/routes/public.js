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

// فروشندگان تأییدشده برای نمایش در سایت
router.get('/sellers', (req, res) => {
  const items = db.prepare(
    "SELECT id,name,category,city,rating,sales,bio,avatar FROM sellers WHERE status='active' ORDER BY sales DESC, id DESC LIMIT 24"
  ).all();
  res.json({ items });
});

module.exports = router;
