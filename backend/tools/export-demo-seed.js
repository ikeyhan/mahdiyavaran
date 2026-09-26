/* خروجی دادهٔ پایگاه داده برای «حالت HTML» (بدون سرور)
   اجرا:  node tools/export-demo-seed.js
   خروجی: assets/js/demo-seed.js — همان داده‌های سرور، برای اجرای کامل سایت و پنل
   به‌صورت فایل‌های استاتیک. رمزهای عبور هش‌شده هرگز خروجی گرفته نمی‌شوند؛
   فقط حساب‌های نمونه با رمز نمونه در حالت HTML قابل ورودند. */
const fs = require('fs');
const path = require('path');
const seed = require('../src/seed');
seed();
const db = require('../src/db');

const DEMO_PASSWORDS = { admin: 'atom313@', reza: 'atom123', samira: 'atom123', atra: 'atra1234', daftar: 'daftar1234' };
const TABLES = ['admins', 'articles', 'products', 'customers', 'orders', 'settings', 'feature_flags', 'categories',
  'sellers', 'offers', 'comments', 'messages', 'faqs', 'slides', 'banned_words', 'offices', 'office_services',
  'office_messages', 'ads', 'activity_log', 'login_attempts', 'chat_messages'];

const out = {};
for (const t of TABLES) {
  let rows = db.prepare(`SELECT * FROM ${t}`).all();
  if (t === 'admins') rows = rows.map(r => { const { password_hash, ...rest } = r; return { ...rest, password: DEMO_PASSWORDS[r.username] || null }; });
  if (t === 'settings') rows = rows.map(r => r.key === 'ai_api_key' ? { ...r, value: '' } : r);
  if (t === 'activity_log' || t === 'login_attempts') rows = rows.slice(-40);
  out[t] = rows;
}
const file = path.join(__dirname, '..', '..', 'assets', 'js', 'demo-seed.js');
fs.writeFileSync(file, '/* تولید خودکار — backend/tools/export-demo-seed.js */\nwindow.ATOM_DEMO_SEED = ' + JSON.stringify(out) + ';\n');
console.log('✓', file, Math.round(fs.statSync(file).size / 1024) + 'KB');
