# بک‌اند مارکت‌پلیس اتم

بک‌اند واقعی و امن برای سایت و پنل مدیریت اتم — با **Node.js + Express + SQLite** و
احراز هویت واقعی مبتنی بر **JWT** و رمز عبور هش‌شده با **bcrypt**.

یک سرور، همه‌چیز را سرو می‌کند: سایت اصلی، پنل `/adminpanel`، و APIهای `/api/*`.

---

## راه‌اندازی سریع

```bash
cd backend
cp .env.example .env          # و مقادیر را ویرایش کنید (به‌ویژه JWT_SECRET)
npm install
npm start
```

سپس:

| آدرس | توضیح |
|------|-------|
| `http://localhost:3000/` | سایت اصلی |
| `http://localhost:3000/adminpanel/` | پنل مدیریت |
| `http://localhost:3000/api/health` | بررسی سلامت API |

**ورود پیش‌فرض:** نام کاربری `admin` — رمز `atom313@`
(از `.env` خوانده می‌شود؛ در محیط واقعی حتماً تغییر دهید.)

> بار اول اجرا، دیتابیس `data/atom.db` ساخته و با داده نمونه پر می‌شود.

---

## پیکربندی (`.env`)

| کلید | توضیح |
|------|-------|
| `PORT` | پورت سرور (پیش‌فرض ۳۰۰۰) |
| `JWT_SECRET` | کلید امضای توکن — **حتماً یک مقدار تصادفی بلند بگذارید** |
| `JWT_EXPIRES` | مدت اعتبار توکن (مثلاً `8h`) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | مدیر اولیه (فقط بار اول) |
| `CORS_ORIGINS` | مبدأهای مجاز، با کاما |

ساخت کلید امن:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## امنیت

- رمزهای عبور با **bcrypt** هش می‌شوند (هرگز به‌صورت متن ذخیره نمی‌شوند).
- ورود با **JWT**؛ توکن در هدر `Authorization: Bearer <token>`.
- **محدودیت تلاش ورود**: حداکثر ۱۰ درخواست در ۱۵ دقیقه روی هر IP + قفل موقت پس از ۵ شکست.
- **کنترل نقش** (`admin` / `editor` / `support`) روی هر مسیر حساس.
- **لاگ فعالیت**: هر اقدام مدیر (ورود، انتشار، حذف، تغییر تنظیمات و…) ثبت می‌شود.
- هدرهای امنیتی با **helmet**.
- فایل‌های سرور (`/backend/*`) از دسترس عمومی خارج‌اند.
- **اجرای مستقیم SQL در پنل وجود ندارد**؛ همه‌چیز از طریق APIهای کنترل‌شده.

---

## نقشهٔ API

### احراز هویت — `/api/auth`
| متد | مسیر | نقش | کار |
|-----|------|-----|-----|
| POST | `/login` | — | ورود، دریافت توکن |
| GET | `/me` | هر مدیر | پروفایل جاری |
| POST | `/logout` | هر مدیر | خروج (ثبت در لاگ) |
| POST | `/change-password` | هر مدیر | تغییر رمز |

### مدیران و نقش‌ها — `/api/admins` (فقط `admin`)
`GET /` · `POST /` · `PUT /:id` · `POST /:id/status` (مسدود/تعلیق) · `DELETE /:id`

### بلاگ — `/api/articles`
`GET /public` (عمومی) · `GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id`
(نوشتن: نقش `admin` یا `editor`)

### آپلود رسانه — `/api/uploads`
`POST /` (فرم‌دیتا با فیلد `file`) → `{ url }` — تصاویر تا ۶MB.

### فروشگاه
`/api/products` · `/api/orders` · `/api/customers` — CRUD کامل با صفحه‌بندی.

### تنظیمات و فلگ‌ها — `/api/settings`
`GET /public` (عمومی) · `GET /` · `PUT /` · `GET /flags` · `PUT /flags/:key`

### آمار و گزارش
`GET /api/stats` · `GET /api/activity` · `GET /api/logins` · `GET /api/loyalty`

---

## ساختار

```
backend/
├─ server.js            # ورودی: express، امنیت، سرو استاتیک، مانت مسیرها
├─ src/
│  ├─ db.js             # اتصال SQLite + اسکیمای جدول‌ها
│  ├─ seed.js           # داده اولیه (idempotent)
│  ├─ auth.js           # JWT، نقش‌ها، ثبت فعالیت
│  ├─ validate.js       # اعتبارسنجی ورودی
│  └─ routes/           # auth, admins, articles, uploads, settings,
│                       #   resources (products/orders/customers), insights
├─ data/                # فایل SQLite (خارج از گیت)
└─ uploads/             # فایل‌های آپلودشده (خارج از گیت)
```

---

## اتصال فرانت‌اند

پنل از `adminpanel/api.js` استفاده می‌کند:
- اگر بک‌اند در دسترس باشد → از API واقعی (JWT) استفاده می‌شود.
- اگر بک‌اند نباشد (میزبانی استاتیک) → **حالت دموی محلی** با ذخیره در مرورگر فعال می‌ماند.

بنابراین همین کد هم روی سرور واقعی و هم روی میزبانی استاتیک (مثل GitHub Pages) کار می‌کند.

---

## استقرار (Production)

1. `JWT_SECRET` را به یک مقدار تصادفی بلند تغییر دهید.
2. رمز مدیر پیش‌فرض را عوض کنید.
3. سرور را پشت **HTTPS** و یک reverse-proxy (Nginx) قرار دهید.
4. برای پایداری از **pm2** یا **systemd** استفاده کنید:
   ```bash
   npm install -g pm2 && pm2 start server.js --name atom
   ```
5. از پوشهٔ `data/` و `uploads/` نسخهٔ پشتیبان بگیرید.
