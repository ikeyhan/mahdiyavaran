/* هسته امنیت — امضا/بررسی JWT، نقش‌ها، و ثبت فعالیت */
const jwt = require('jsonwebtoken');
const db = require('./db');

const SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const EXPIRES = process.env.JWT_EXPIRES || '8h';

function sign(admin) {
  return jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role, name: admin.name },
    SECRET, { expiresIn: EXPIRES }
  );
}

function verify(token) {
  try { return jwt.verify(token, SECRET); } catch (e) { return null; }
}

function bearer(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  return null;
}

// نیازمند ورود — هر مسیر محافظت‌شده
function requireAuth(req, res, next) {
  const payload = verify(bearer(req));
  if (!payload) return res.status(401).json({ error: 'برای دسترسی باید وارد شوید.' });
  // اطمینان از فعال‌بودن حساب
  const row = db.prepare('SELECT status FROM admins WHERE id=?').get(payload.id);
  if (!row || row.status !== 'active') return res.status(403).json({ error: 'حساب شما غیرفعال یا مسدود است.' });
  req.admin = payload;
  next();
}

// نیازمند نقش خاص (سطح دسترسی)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: 'ابتدا وارد شوید.' });
    if (!roles.includes(req.admin.role))
      return res.status(403).json({ error: 'برای این عملیات دسترسی کافی ندارید.' });
    next();
  };
}

// ثبت اقدام مدیر در لاگ فعالیت (برای رهگیری خطا و سوءاستفاده)
function logActivity(req, action, target) {
  try {
    db.prepare('INSERT INTO activity_log (actor,action,target,ip) VALUES (?,?,?,?)')
      .run(req.admin ? req.admin.username : 'ناشناس', action, target || '', clientIp(req));
  } catch (e) { /* لاگ نباید جریان اصلی را متوقف کند */ }
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      || req.socket.remoteAddress || '';
}

module.exports = { sign, verify, requireAuth, requireRole, logActivity, clientIp, SECRET };
