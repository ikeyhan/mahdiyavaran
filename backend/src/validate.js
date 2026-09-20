/* اعتبارسنجی سبک ورودی‌ها */
function str(v, max = 5000) {
  if (v == null) return '';
  return String(v).slice(0, max);
}
function int(v, def = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}
function oneOf(v, allowed, def) {
  return allowed.includes(v) ? v : def;
}
function required(obj, fields) {
  for (const f of fields) {
    if (obj[f] == null || String(obj[f]).trim() === '') return f;
  }
  return null;
}

// اعتبارسنجی کد ملی ایران (الگوریتم رقم کنترلی رسمی)
function isNationalCode(code) {
  code = String(code == null ? '' : code).replace(/[^0-9]/g, '');
  if (!/^\d{10}$/.test(code)) return false;
  if (/^(\d)\1{9}$/.test(code)) return false; // ده رقم یکسان نامعتبر است
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(code[i], 10) * (10 - i);
  const r = sum % 11;
  const check = parseInt(code[9], 10);
  return (r < 2) ? (check === r) : (check === (11 - r));
}

// اعتبارسنجی شمارهٔ موبایل ایران
function isMobile(m) {
  m = String(m == null ? '' : m).replace(/[^0-9]/g, '');
  return /^09\d{9}$/.test(m);
}

module.exports = { str, int, oneOf, required, isNationalCode, isMobile };
