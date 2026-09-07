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
module.exports = { str, int, oneOf, required };
