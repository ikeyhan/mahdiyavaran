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

// دفاتر محلات تأییدشده برای نمایش در سایت
router.get('/offices', (req, res) => {
  const items = db.prepare(
    "SELECT id,name,manager,area,city,address,phone,bio,avatar,rating FROM offices WHERE status='verified' ORDER BY rating DESC, id DESC LIMIT 48"
  ).all();
  res.json({ items });
});

// خدمات یک دفتر (عمومی) — با شناسهٔ مالک
router.get('/office-services', (req, res) => {
  const owner = String(req.query.owner || '').slice(0, 60);
  const rows = owner
    ? db.prepare("SELECT id,title,category,office,description,price FROM office_services WHERE status='active' AND owner=? ORDER BY id DESC").all(owner)
    : db.prepare("SELECT id,title,category,office,description,price FROM office_services WHERE status='active' ORDER BY id DESC LIMIT 60").all();
  res.json({ items: rows });
});

// فروشندگان تأییدشده برای نمایش در سایت
router.get('/sellers', (req, res) => {
  const items = db.prepare(
    "SELECT id,name,category,city,rating,sales,bio,avatar FROM sellers WHERE status='active' ORDER BY sales DESC, id DESC LIMIT 24"
  ).all();
  res.json({ items });
});

module.exports = router;
