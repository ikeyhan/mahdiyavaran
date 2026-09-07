/* =====================================================================
   بک‌اند واقعی مارکت‌پلیس اتم
   Express + SQLite + JWT — یک سرور همه‌چیز را می‌دهد: سایت، پنل، و API
   ===================================================================== */
const path = require('path');
// بارگذاری ساده‌ی .env بدون وابستگی خارجی
(function loadEnv() {
  const fs = require('fs');
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const seed = require('./src/seed');
seed(); // ساخت جدول‌ها و داده اولیه در صورت نبود

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..');        // ریشه سایت (index.html و adminpanel)

/* ---------- امنیت پایه ---------- */
// CSP را خاموش می‌کنیم چون سایت استاتیک از استایل/اسکریپت inline و فونت گوگل استفاده می‌کند.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const origins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true, credentials: false }));

app.use(express.json({ limit: '12mb' }));       // بدنه بزرگ برای متن مقاله
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// جلوگیری از دسترسی به فایل‌های سرور از طریق سرو استاتیک ریشه
app.use((req, res, next) => {
  if (req.path.startsWith('/backend')) return res.status(404).end();
  next();
});

/* ---------- API ---------- */
app.get('/api/health', (req, res) => res.json({ ok: true, name: 'atom-backend', time: Date.now() }));

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/admins', require('./src/routes/admins'));
app.use('/api/articles', require('./src/routes/articles'));
app.use('/api/uploads', require('./src/routes/uploads'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api', require('./src/routes/insights'));           // stats, activity, logins, loyalty

const R = require('./src/routes/resources');
app.use('/api/products', R.products);
app.use('/api/orders', R.orders);
app.use('/api/customers', R.customers);
app.use('/api/categories', R.categories);
app.use('/api/sellers', R.sellers);
app.use('/api/offers', R.offers);
app.use('/api/comments', R.comments);
app.use('/api/messages', R.messages);

/* ---------- فایل‌های آپلودشده ---------- */
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));

/* ---------- سرو سایت و پنل (استاتیک) ---------- */
app.use(express.static(ROOT, { extensions: ['html'] }));

// هر مسیر ناشناخته‌ی غیر-API → صفحه ۴۰۴ سایت
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'مسیر API یافت نشد.' });
  res.status(404).sendFile(path.join(ROOT, '404.html'), (e) => { if (e) res.end(); });
});

/* ---------- گارد خطای سراسری ---------- */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'خطای داخلی سرور.' });
});

app.listen(PORT, () => {
  console.log(`\n  اتم — بک‌اند روی http://localhost:${PORT}`);
  console.log(`  سایت:  http://localhost:${PORT}/`);
  console.log(`  پنل:   http://localhost:${PORT}/adminpanel/`);
  console.log(`  API:   http://localhost:${PORT}/api/health\n`);
});
