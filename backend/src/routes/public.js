/* داده‌های عمومی سایت — بدون احراز هویت (فقط خواندنی و امن) */
const express = require('express');
const db = require('../db');
const { str } = require('../validate');
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
