/* فیلتر کلمات ممنوعه — کش سبک با ابطال هنگام تغییر */
const db = require('./db');

let cache = null, cacheAt = 0;
const TTL = 10000; // ۱۰ ثانیه

function words() {
  if (cache && Date.now() - cacheAt < TTL) return cache;
  cache = db.prepare("SELECT word FROM banned_words WHERE status='active'").all()
    .map(r => String(r.word || '').trim().toLowerCase())
    .filter(Boolean);
  cacheAt = Date.now();
  return cache;
}

function invalidate() { cache = null; cacheAt = 0; }

// اولین کلمهٔ ممنوعهٔ یافت‌شده در متن را برمی‌گرداند، وگرنه null
function findBanned() {
  const list = words();
  if (!list.length) return null;
  for (let i = 0; i < arguments.length; i++) {
    const t = String(arguments[i] == null ? '' : arguments[i]).toLowerCase();
    if (!t) continue;
    for (const w of list) { if (w && t.indexOf(w) !== -1) return w; }
  }
  return null;
}

// نگهبان: اگر کلمهٔ ممنوعه بود، پاسخ ۴۰۰ می‌فرستد و false برمی‌گرداند
function guard(res, ...texts) {
  const w = findBanned(...texts);
  if (w) {
    res.status(400).json({ error: 'متن شامل کلمهٔ غیرمجاز «' + w + '» است. لطفاً آن را اصلاح کنید.' });
    return false;
  }
  return true;
}

module.exports = { findBanned, guard, invalidate, words };
