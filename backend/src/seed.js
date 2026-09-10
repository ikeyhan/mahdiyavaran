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

  // دسته‌بندی‌ها
  if (db.prepare('SELECT COUNT(*) c FROM categories').get().c === 0) {
    const c = db.prepare('INSERT INTO categories (title,slug,parent,count,status) VALUES (?,?,?,?,?)');
    [
      ['خواروبار و سوپرمارکت','grocery','برنج و حبوبات، روغن، کنسرو، نوشیدنی',24800,'active'],
      ['لامپ','lamp','LED، کم‌مصرف، لوستر، هالوژن',6400,'active'],
      ['نبات و آبنبات','candy','نبات زعفرانی، آبنبات، شکلات، پاستیل',3200,'active'],
      ['کیک و کلوچه','bakery','کیک خامه‌ای، کلوچه، شیرینی خشک، دسر',5900,'active'],
      ['پوشاک زنانه','women','مانتو، شومیز، شال و روسری، لباس مجلسی',31500,'active'],
      ['خدمات حمل و نقل','transport','پیک موتوری، اتوبار، باربری، حمل بار',2800,'active'],
      ['طلا و سکه','gold','طلای آب‌شده، سکه، النگو، نیم‌سکه',4800,'active'],
      ['باطری‌سازی','battery','باتری خودرو، باتری UPS، آبگیری، امداد باتری',1900,'active'],
      ['وکالت','legal','وکیل پایه یک، مشاوره حقوقی، قرارداد، دعاوی ملکی',1400,'active'],
      ['بیمه','insurance','شخص ثالث، بدنه، عمر، درمان',3100,'active'],
      ['لوازم‌التحریر','stationery','دفتر، خودکار، نقاشی، لوازم اداری',9600,'active'],
      ['رستوران','restaurant','ایرانی، فست‌فود، کبابی، دریایی',2700,'active'],
      ['هتل و مهمانسرا','hotel','هتل، مهمانپذیر، سوئیت، اقامتگاه بوم‌گردی',1600,'active'],
      ['لوازم ورزشی','sports','بدنسازی، فوتبال، کوهنوردی، دوچرخه',12300,'active'],
      ['ظروف','dishware','سرویس غذاخوری، قابلمه، بلور و کریستال، یکبار مصرف',8400,'active'],
      ['دوربین مداربسته','cctv','دوربین، دستگاه ضبط، آیفون تصویری، دزدگیر',3500,'active'],
      ['شیرآلات','faucet','شیر ظرفشویی، دوش حمام، علم یونیکا، شیر پیسوار',4200,'active'],
    ].forEach(r => c.run(r));
  }

  // فروشندگان
  if (db.prepare('SELECT COUNT(*) c FROM sellers').get().c === 0) {
    const s = db.prepare('INSERT INTO sellers (name,category,city,rating,sales,status) VALUES (?,?,?,?,?,?)');
    [
      ['آترا چرم','محصولات چرم طبیعی','تهران',4.9,3200,'active'],
      ['هنرکده پارسیان','صنایع‌دستی اصیل','اصفهان',4.8,1800,'active'],
      ['استودیو نگاره','طراحی و برندینگ','تهران',5.0,980,'active'],
      ['سفال سبز','سرامیک و سفال','لالجین',4.7,1400,'active'],
      ['چرم گالری','کفش چرم','تبریز',4.7,2100,'active'],
      ['باغ طبیعت','خشکبار و ادویه','مشهد',4.6,2100,'active'],
      ['فرش ایران','فرش و موکت','کاشان',4.5,4500,'pending'],
    ].forEach(r => s.run(r));
  }

  // تخفیف‌ها
  if (db.prepare('SELECT COUNT(*) c FROM offers').get().c === 0) {
    const o = db.prepare('INSERT INTO offers (code,title,kind,amount,used,quota,expires,status) VALUES (?,?,?,?,?,?,?,?)');
    [
      ['ATOM40','فروش شگفت‌انگیز','percent',40,218,500,'۱۴۰۴/۰۶/۲۰','active'],
      ['NEWUSER','خوش‌آمدگویی','amount',100000,942,0,'-','active'],
      ['LEATHER25','ویژه محصولات چرم','percent',25,67,200,'۱۴۰۴/۰۷/۰۱','active'],
      ['SUMMER20','تخفیف تابستانه','percent',20,500,500,'۱۴۰۴/۰۶/۰۵','expired'],
      ['VIP15','مشتریان ویژه','percent',15,30,100,'۱۴۰۴/۱۲/۲۹','active'],
    ].forEach(r => o.run(r));
  }

  // نظرات
  if (db.prepare('SELECT COUNT(*) c FROM comments').get().c === 0) {
    const cm = db.prepare('INSERT INTO comments (author,product,body,rating,status) VALUES (?,?,?,?,?)');
    [
      ['مریم احمدی','کیف چرم رویا','کیفیت چرم فوق‌العاده است و بسته‌بندی بسیار شیک بود.',5,'pending'],
      ['حسین قاسمی','کفش چرم کلاسیک','ارسال سریع بود و جنس با عکس‌ها مطابقت داشت.',5,'pending'],
      ['سارا محمدی','سرویس چای‌خوری','کیفیت عالی و بسته‌بندی خوب. پیشنهاد می‌کنم.',4,'approved'],
      ['علی رضایی','گلیم دستباف','رنگ‌بندی زیبا و بافت مرغوب.',5,'approved'],
      ['رضا موسوی','بسته ادویه','بسته‌بندی ضعیف بود.',2,'rejected'],
    ].forEach(r => cm.run(r));
  }

  // پیام‌ها/تیکت‌ها
  if (db.prepare('SELECT COUNT(*) c FROM messages').get().c === 0) {
    const m = db.prepare('INSERT INTO messages (sender,subject,body,status) VALUES (?,?,?,?)');
    [
      ['سارا محمدی','مشکل در ارسال سفارش','سلام، سفارش من چهار روز پیش ثبت شده ولی هنوز ارسال نشده…','open'],
      ['علی رضایی','درخواست بازگشت وجه','محصول ایراد داشت، لطفاً راهنمایی کنید…','open'],
      ['نگین کریمی','سؤال درباره ضمانت','آیا این محصول شامل ضمانت هست؟','pending'],
      ['محمد احمدی','تشکر از پشتیبانی','بابت پاسخگویی سریع سپاسگزارم!','closed'],
    ].forEach(r => m.run(r));
  }

  // سؤالات متداول چت‌بات
  if (db.prepare('SELECT COUNT(*) c FROM faqs').get().c === 0) {
    const q = db.prepare('INSERT INTO faqs (question,answer,sort,status) VALUES (?,?,?,?)');
    [
      ['چطور سفارش خود را پیگیری کنم؟', 'پس از ثبت سفارش، از بخش «داشبورد › سفارش‌های من» می‌توانید وضعیت لحظه‌ای سفارش و کد رهگیری پستی را ببینید. همچنین لینک پیگیری از طریق پیامک برایتان ارسال می‌شود.', 1, 'active'],
      ['روش‌های پرداخت کدام‌اند؟', 'پرداخت آنلاین از طریق درگاه امن (زرین‌پال و بانک ملت)، کیف پول اتم، و در برخی شهرها پرداخت در محل امکان‌پذیر است.', 2, 'active'],
      ['شرایط مرجوعی کالا چیست؟', 'تا ۷ روز پس از دریافت کالا، در صورت سالم بودن و باز نشدن بسته‌بندی اصلی، امکان مرجوعی و بازگشت وجه وجود دارد. کافی است از بخش سفارش‌ها درخواست مرجوعی ثبت کنید.', 3, 'active'],
      ['هزینه و زمان ارسال چقدر است؟', 'ارسال با پست پیشتاز و تیپاکس انجام می‌شود؛ زمان تحویل ۲ تا ۴ روز کاری است. برای خریدهای بالای ۵۰۰ هزار تومان ارسال رایگان است.', 4, 'active'],
      ['چطور فروشنده شوم؟', 'از دکمه «فروشنده شوید» در بالای سایت ثبت‌نام کنید؛ پس از تأیید مدارک، پنل فروشندگی برایتان فعال می‌شود.', 5, 'active'],
    ].forEach(r => q.run(r));
  }

  // تنظیمات چت‌بات و هوش مصنوعی
  [
    ['chat_enabled', '1'],
    ['chat_title', 'پشتیبانی اتم'],
    ['chat_welcome', 'سلام! 👋 من دستیار پشتیبانی اتم هستم. می‌توانید یکی از سؤالات متداول را انتخاب کنید، با هوش مصنوعی گفتگو کنید، یا برای ما پیام بگذارید.'],
    ['chat_avatar', ''],
    ['chat_color', '#149B3E'],
    ['ai_provider', 'openai'],
    ['ai_base_url', 'https://api.openai.com/v1'],
    ['ai_model', 'gpt-4o-mini'],
    ['ai_api_key', ''],
    ['ai_system_prompt', 'تو دستیار پشتیبانی فروشگاه اینترنتی «اتم» هستی؛ یک بازارگاه دیجیتال ایرانی. همیشه به زبان فارسی، مؤدب، کوتاه و دقیق پاسخ بده. فقط دربارهٔ خرید، سفارش، ارسال، پرداخت، مرجوعی، فروشندگی و خدمات سایت راهنمایی کن. اگر چیزی را نمی‌دانی یا نیاز به پیگیری انسانی دارد، کاربر را به ثبت پیام برای تیم پشتیبانی راهنمایی کن.'],
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
