/* داده اولیه — فقط زمانی که جدول‌ها خالی‌اند اجرا می‌شود (idempotent) */
const bcrypt = require('bcryptjs');
const db = require('./db');

function seed() {
  // مدیر اولیه
  const adminCount = db.prepare('SELECT COUNT(*) c FROM admins').get().c;
  if (adminCount === 0) {
    const user = process.env.ADMIN_USERNAME || 'admin';
    const pass = process.env.ADMIN_PASSWORD || 'atom313@';
    const hash = bcrypt.hashSync(pass, 10);
    db.prepare(`INSERT INTO admins (username,password_hash,name,email,role,status)
                VALUES (?,?,?,?,?,?)`)
      .run(user, hash, 'مدیر اصلی', 'admin@atom.ir', 'admin', 'active');
    // چند مدیر نمونه با نقش‌های مختلف
    const ex = [
      ['reza', 'رضا کاظمی', 'reza@atom.ir', 'editor'],
      ['samira', 'سمیرا نادری', 'samira@atom.ir', 'support'],
    ];
    for (const [u, n, e, r] of ex) {
      db.prepare(`INSERT INTO admins (username,password_hash,name,email,role,status)
                  VALUES (?,?,?,?,?,?)`)
        .run(u, bcrypt.hashSync('atom123', 10), n, e, r, 'active');
    }
    console.log('✓ مدیر اولیه ساخته شد:', user);
  }

  // مقالات نمونه
  if (db.prepare('SELECT COUNT(*) c FROM articles').get().c === 0) {
    const a = db.prepare(`INSERT INTO articles (title,slug,category,author,excerpt,cover,body,status,views)
                          VALUES (@title,@slug,@category,@author,@excerpt,@cover,@body,@status,@views)`);
    [
      { title:'چگونه یک فروشگاه آنلاین موفق در بازارگاه بسازیم؟', slug:'successful-online-store',
        category:'راهنمای فروش', author:'تیم محتوا', excerpt:'راهنمای گام‌به‌گام راه‌اندازی و رشد فروشگاه.',
        cover:'', body:'<p>راه‌اندازی یک فروشگاه آنلاین موفق نیازمند برنامه‌ریزی دقیق است.</p><h2>۱. انتخاب محصول</h2><p>بازار هدف خود را بشناسید.</p>', status:'published', views:12408 },
      { title:'۷ نکته برای تشخیص چرم طبیعی از مصنوعی', slug:'real-vs-fake-leather',
        category:'راهنمای خرید', author:'سارا محمدی', excerpt:'با این هفت نشانه ساده چرم اصل را تشخیص دهید.',
        cover:'', body:'<p>چرم طبیعی ویژگی‌های منحصربه‌فردی دارد.</p>', status:'published', views:8940 },
      { title:'راهنمای انتخاب فرش دستباف', slug:'handmade-rug-guide',
        category:'راهنمای خرید', author:'تیم محتوا', excerpt:'', cover:'', body:'<p>پیش‌نویس…</p>', status:'draft', views:0 },
    ].forEach(x => a.run(x));
  }

  // محصولات نمونه
  if (db.prepare('SELECT COUNT(*) c FROM products').get().c === 0) {
    const p = db.prepare(`INSERT INTO products (title,category,seller,price,stock,status)
                          VALUES (?,?,?,?,?,?)`);
    [
      ['کیف چرم طبیعی دست‌دوز مدل رویا','پوشاک','آترا چرم',2450000,24,'active'],
      ['گلیم دستباف سنتی کرمان','صنایع‌دستی','هنرکده پارسیان',1890000,8,'active'],
      ['سرویس چای‌خوری سرامیکی','لوازم خانه','سفال سبز',1240000,15,'active'],
      ['کفش چرم دست‌دوز مردانه','پوشاک','چرم گالری',1650000,9,'active'],
      ['شال ابریشم طرح اصفهان','پوشاک','حریر نقش',720000,40,'active'],
      ['میناکاری دستی روی مس','صنایع‌دستی','هنر اصفهان',980000,0,'inactive'],
    ].forEach(r => p.run(r));
  }

  // مشتریان نمونه (total_spent به تومان)
  if (db.prepare('SELECT COUNT(*) c FROM customers').get().c === 0) {
    const c = db.prepare(`INSERT INTO customers (name,phone,email,city,total_spent,orders_count)
                          VALUES (?,?,?,?,?,?)`);
    [
      ['مریم حسینی','09102223344','maryam@example.com','تهران',520000000,31],
      ['سارا محمدی','09123456789','sara@example.com','تهران',280000000,24],
      ['علی رضایی','09121112233','ali@example.com','اصفهان',165000000,18],
      ['نگین کریمی','09354445566','negin@example.com','شیراز',96000000,12],
      ['زهرا کریمی','09390001122','zahra@example.com','اصفهان',74000000,14],
      ['محمد احمدی','09198889900','mohammad@example.com','مشهد',42000000,9],
      ['رضا موسوی','09377776655','reza@example.com','تبریز',18000000,6],
    ].forEach(r => c.run(r));
  }

  // سفارش‌های نمونه
  if (db.prepare('SELECT COUNT(*) c FROM orders').get().c === 0) {
    const o = db.prepare(`INSERT INTO orders (code,customer,product,seller,amount,status)
                          VALUES (?,?,?,?,?,?)`);
    [
      ['1084','سارا محمدی','کیف چرم رویا','آترا چرم',2450000,'delivered'],
      ['1083','علی رضایی','کفش چرم کلاسیک','چرم گالری',1650000,'shipping'],
      ['1082','نگین کریمی','گلیم دستباف کرمان','هنرکده پارسیان',1890000,'delivered'],
      ['1081','محمد احمدی','فرش ماشینی ۶ متری','فرش ایران',3900000,'returned'],
      ['1080','مریم حسینی','سرویس چای‌خوری','سفال سبز',1240000,'delivered'],
    ].forEach(r => o.run(r));
  }

  // تنظیمات پیش‌فرض
  const setDef = db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)');
  [
    ['site_name','اتم'], ['site_title','اتم | بازارگاه دیجیتال'],
    ['domain','atom313.ir'], ['contact_email','info@atom.ir'],
    ['seller_fee','5'], ['min_order','50000'], ['maintenance','0'],
    ['registration','1'], ['online_payment','1'],
  ].forEach(r => setDef.run(r));

  // فیچرفلگ‌ها
  if (db.prepare('SELECT COUNT(*) c FROM feature_flags').get().c === 0) {
    const f = db.prepare('INSERT INTO feature_flags (key,name,enabled,description) VALUES (?,?,?,?)');
    [
      ['feature.registration','ثبت‌نام کاربران جدید',1,'امکان ساخت حساب جدید'],
      ['feature.online_payment','پرداخت آنلاین',1,'درگاه پرداخت اینترنتی'],
      ['feature.live_chat','چت آنلاین پشتیبانی',1,'ویجت گفتگوی زنده'],
      ['feature.wallet','کیف پول کاربران',0,'شارژ و پرداخت از کیف پول'],
      ['feature.loyalty','باشگاه مشتریان',1,'سطوح برنزی تا پلاتینیوم'],
      ['feature.affiliate','همکاری در فروش',1,'بازاریابی پورسانتی'],
      ['feature.installment','خرید اقساطی',0,'پرداخت اقساطی'],
    ].forEach(r => f.run(r));
  }
}

if (require.main === module) { seed(); console.log('✓ داده اولیه آماده شد.'); }
module.exports = seed;
