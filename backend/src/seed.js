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
    const ex = process.env.SEED_DEMO === '0' ? [] : [
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

  // مقالات بلاگ (منتشرشده؛ از پنل مدیریت › بلاگ قابل ویرایش)
  if (db.prepare('SELECT COUNT(*) c FROM articles').get().c === 0) {
    const a = db.prepare(`INSERT INTO articles (title,slug,category,author,excerpt,cover,body,status,views)
                          VALUES (@title,@slug,@category,@author,@excerpt,@cover,@body,@status,@views)`);
    [
      { title:'چگونه یک فروشگاه آنلاین موفق در بازارگاه بسازیم؟', slug:'successful-online-store', category:'راهنمای فروش', author:'تیم محتوا',
        excerpt:'راهنمای گام‌به‌گام راه‌اندازی فروشگاه، عکاسی از محصول، قیمت‌گذاری هوشمند و جذب اولین مشتریان در اتم ۳۱۳.', cover:'assets/img/products/atra-leather-set.jpg', status:'published', views:12408,
        body:'<p>راه‌اندازی فروشگاه در اتم ۳۱۳ کمتر از ده دقیقه زمان می‌برد، اما موفقیت آن به چند تصمیم درست بستگی دارد.</p><h2>۱. بازار هدف را بشناسید</h2><p>پیش از بارگذاری محصول، مشخص کنید مشتری شما کیست، چه نیازی دارد و چرا باید از شما خرید کند. محصولی را انتخاب کنید که در آن تخصص دارید.</p><h2>۲. عکس و توضیح دقیق</h2><p>عکس روشن با پس‌زمینهٔ ساده و توضیحی صادقانه دربارهٔ جنس، ابعاد و شرایط ارسال، مهم‌ترین عامل تصمیم خریدار است.</p><h2>۳. قیمت‌گذاری هوشمند</h2><p>قیمت محصولات مشابه را بررسی کنید، کارمزد و هزینهٔ ارسال را در نظر بگیرید و برای شروع، با یک کد تخفیف مشتریان اول را جذب کنید.</p><h2>۴. پاسخ‌گویی سریع</h2><p>پاسخ سریع به پیام‌ها و ارسال به‌موقع سفارش، امتیاز فروشگاه شما را بالا می‌برد و شما را در نتایج جستجو جلوتر نشان می‌دهد.</p>' },
      { title:'۷ نکته برای تشخیص چرم طبیعی از مصنوعی', slug:'real-vs-fake-leather', category:'راهنمای خرید', author:'سارا محمدی',
        excerpt:'با این هفت نشانهٔ ساده هنگام خرید محصولات چرمی فریب نمی‌خورید.', cover:'assets/img/products/leather-bag-roya.jpg', status:'published', views:8940,
        body:'<p>چرم طبیعی ویژگی‌هایی دارد که با کمی دقت قابل تشخیص است.</p><ol><li><b>بو:</b> چرم طبیعی بوی خاص و ملایمی دارد؛ چرم مصنوعی بوی پلاستیک می‌دهد.</li><li><b>منافذ:</b> سطح چرم طبیعی منافذ نامنظم دارد.</li><li><b>لبه‌ها:</b> لبهٔ برش چرم طبیعی الیافی و زبر است.</li><li><b>گرما:</b> چرم طبیعی در دست زود گرم می‌شود.</li><li><b>چین‌خوردگی:</b> با فشار انگشت، چین‌های ریز و طبیعی ایجاد می‌شود.</li><li><b>قیمت:</b> چرم طبیعی هرگز بسیار ارزان نیست.</li><li><b>ضمانت:</b> از فروشندگان دارای نشان تأیید و ضمانت اصالت خرید کنید.</li></ol>' },
      { title:'داستان موفقیت فروشگاه آترا چرم', slug:'atra-leather-story', category:'کسب‌وکار', author:'تیم محتوا',
        excerpt:'چطور یک کارگاه کوچک چرم به یکی از پرفروش‌ترین فروشندگان اتم تبدیل شد.', cover:'assets/img/products/atra-leather-set.jpg', status:'published', views:5210,
        body:'<p>آترا چرم کار خود را با دو استادکار و یک کارگاه کوچک آغاز کرد. تمرکز بر کیفیت دوخت و استفاده از چرم طبیعی درجه‌یک، از روز اول هویت این برند بود.</p><h2>رمز موفقیت</h2><p>عکاسی ساده اما دقیق، پاسخ‌گویی سریع به مشتریان و ضمانت اصالت کالا باعث شد نظرات مثبت خریداران به‌سرعت افزایش پیدا کند.</p><p>امروز آترا چرم بیش از سه هزار فروش موفق دارد و همچنان هر محصول را با دست می‌دوزد.</p>' },
      { title:'اصول عکاسی حرفه‌ای از محصول با موبایل', slug:'product-photography-mobile', category:'دیجیتال مارکتینگ', author:'علی رضایی',
        excerpt:'بدون تجهیزات گران‌قیمت، عکس‌هایی جذاب برای فروشگاه خود بگیرید.', cover:'assets/img/products/ceramic-tea-set.jpg', status:'published', views:4120,
        body:'<p>برای عکس خوب به دوربین گران نیاز ندارید؛ نور و ترکیب‌بندی مهم‌تر است.</p><ul><li>از نور طبیعی کنار پنجره استفاده کنید و از فلاش پرهیز کنید.</li><li>پس‌زمینهٔ سفید یا ساده انتخاب کنید.</li><li>از چند زاویه و یک عکس نزدیک از جزئیات بگیرید.</li><li>لنز موبایل را قبل از عکاسی تمیز کنید.</li><li>در ویرایش فقط نور و کنتراست را اصلاح کنید تا رنگ واقعی کالا حفظ شود.</li></ul>' },
      { title:'آشنایی با هنر میناکاری اصفهان', slug:'isfahan-enamel', category:'صنایع‌دستی', author:'نگین کریمی',
        excerpt:'نگاهی به یکی از اصیل‌ترین هنرهای دستی ایران و بازار امروز آن.', cover:'assets/img/products/kilim-rug.jpg', status:'published', views:3380,
        body:'<p>میناکاری هنر آراستن فلز با لعاب‌های رنگی است که در کوره پخته می‌شوند. اصفهان مهم‌ترین مرکز این هنر در ایران است.</p><h2>چطور اثر اصیل بخریم؟</h2><p>ظرافت نقش، یکنواختی لعاب و امضای هنرمند نشانه‌های کیفیت هستند. آثار دست‌ساز همیشه تفاوت‌های ریز و منحصربه‌فرد دارند.</p>' },
      { title:'راهنمای انتخاب فرش و گلیم دستباف', slug:'handmade-rug-guide', category:'راهنمای خرید', author:'تیم محتوا',
        excerpt:'همه‌چیز دربارهٔ گره، نقشه و رنگ‌بندی فرش و گلیم دستباف ایرانی.', cover:'assets/img/products/kilim-rug.jpg', status:'published', views:2950,
        body:'<p>فرش و گلیم دستباف سرمایه‌ای ماندگار است. پیش از خرید به این نکات توجه کنید:</p><ul><li><b>رج‌شمار:</b> هرچه تعداد گره در هر ردیف بیشتر باشد، نقش ظریف‌تر است.</li><li><b>رنگ گیاهی:</b> رنگ‌های طبیعی با گذر زمان زیباتر می‌شوند.</li><li><b>پشت فرش:</b> نقش پشت فرش دستباف همان نقش روی آن است.</li><li><b>ابعاد:</b> اندازهٔ فضا را دقیق اندازه بگیرید.</li></ul>' },
      { title:'چگونه بهترین ارائه‌دهندهٔ خدمات را انتخاب کنیم؟', slug:'choose-service-provider', category:'خدمات', author:'سارا محمدی',
        excerpt:'معیارهای مهم برای سفارش خدمات دیجیتال با کمترین ریسک.', cover:'assets/img/products/brand-identity.jpg', status:'published', views:1870,
        body:'<p>پیش از سفارش خدمات، نمونه‌کارها را ببینید، زمان تحویل و تعداد اصلاحات را مکتوب کنید و پرداخت را مرحله‌ای انجام دهید.</p><p>امتیاز و نظرات مشتریان قبلی در اتم ۳۱۳ بهترین راهنمای شما برای انتخاب ارائه‌دهندهٔ مطمئن است.</p>' },
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
    ['site_name','اتم ۳۱۳'], ['site_title','اتم ۳۱۳ | بازارگاه دیجیتال'],
    ['domain','atom313.ir'], ['contact_email','info@atom.ir'],
    ['seller_fee','5'], ['min_order','50000'], ['maintenance','0'],
    ['registration','1'], ['online_payment','1'],
    ['contact_phone','۰۲۱-۹۱۰۰۰۰۰۰'], ['address','تهران، ایران'], ['shipping_cost','45000'], ['free_shipping_min','500000'],
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
      ['ATOM20','جشنواره فروش اتم ۳۱۳','percent',20,0,1000,'-','active'],
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
    ['chat_title', 'پشتیبان سایت'],
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

  // اسلایدهای بخش اولیهٔ سایت
  if (db.prepare('SELECT COUNT(*) c FROM slides').get().c === 0) {
    const sl = db.prepare('INSERT INTO slides (eyebrow,title,subtitle,image,cta_label,cta_link,sort,status) VALUES (?,?,?,?,?,?,?,?)');
    [
      ['فروشندهٔ طلایی','چرم دست‌دوز، اصالت در هر دوخت','کیف، کمربند و کیف‌پول چرم طبیعی — مستقیم از کارگاه آترا چرم، با ضمانت اصالت کالا.','assets/img/products/atra-leather-set.jpg','مشاهده محصولات چرم','products.html',1,'active'],
      ['صنایع‌دستی اصیل','گلیم و دستبافته‌های اصیل ایرانی','نقش‌های سنتی، رنگ‌های گیاهی و بافت کاملاً دست — مستقیم از هنرمندان بومی.','assets/img/products/kilim-rug.jpg','خرید صنایع‌دستی','products.html',2,'active'],
      ['ساخت دست','سرامیک دست‌ساز برای خانه‌ی گرم شما','سرویس چای‌خوری با لعاب طبیعی و طراحی مینیمال؛ گرمای دست‌ساز روی میز شما.','assets/img/products/ceramic-tea-set.jpg','لوازم خانه','products.html',3,'active'],
      ['خدمات دیجیتال','هویت بصری حرفه‌ای برای کسب‌وکار شما','طراحی لوگو، برندینگ و ست اداری توسط استودیوهای منتخب اتم ۳۱۳.','assets/img/products/brand-identity.jpg','سفارش خدمات','products.html',4,'active'],
      ['پرفروش‌ترین','کیف چرم طبیعی مدل رویا','طراحی مینیمال، دوخت کاملاً دستی و ضمانت اصالت ۱۸ ماهه.','assets/img/products/leather-bag-roya.jpg','خرید کیف رویا','product.html',5,'active'],
    ].forEach(r => sl.run(r));
  }

  // تبلیغات نمونه (نوار بالا + مربع گوشهٔ چپ)
  if (db.prepare('SELECT COUNT(*) c FROM ads').get().c === 0) {
    const ad = db.prepare('INSERT INTO ads (placement,title,text,image,link,cta_label,bg,sort,status) VALUES (?,?,?,?,?,?,?,?,?)');
    ad.run('top', 'جشنواره فروش اتم ۳۱۳', 'همین حالا با کد ATOM20 روی همهٔ محصولات ۲۰٪ تخفیف بگیر!', '', 'offers.html', 'خرید کن', '#149B3E', 1, 'active');
    ad.run('corner', 'پیشنهاد ویژهٔ چرم', 'تا ۲۰٪ تخفیف', 'assets/img/ads/corner-ad.jpg', 'products.html', 'مشاهده', '', 1, 'active');
  }

  // دفاتر محلات (نمونه) — کدهای ملی معتبر (رقم کنترلی صحیح)
  if (db.prepare('SELECT COUNT(*) c FROM offices').get().c === 0) {
    const of = db.prepare('INSERT INTO offices (name,manager,area,city,address,phone,national_code,license_no,owner,verified,status,rating,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
    of.run('دفتر محله ولیعصر', 'علی رضایی', 'ولیعصر', 'تهران', 'خیابان ولیعصر، کوچهٔ ۵', '09121234567', '0012345679', 'MJ-1001', 'daftar', 1, 'verified', 4.9, 'دفتر خدمات محلهٔ ولیعصر؛ رسیدگی به امور و درخواست‌های شهروندان.');
    of.run('دفتر محله سعادت‌آباد', 'مریم کریمی', 'سعادت‌آباد', 'تهران', 'میدان کاج', '09122345678', '1234567891', 'MJ-1002', '', 1, 'verified', 4.8, 'دفتر خدمات محلهٔ سعادت‌آباد.');
    of.run('دفتر محله نارمک', 'حسین محمدی', 'نارمک', 'تهران', 'میدان هفت‌حوض', '09123456789', '0499370899', 'MJ-1003', '', 0, 'pending', 5, 'در انتظار بررسی و تأیید اعتبارسنجی.');
  }

  const DEMO = process.env.SEED_DEMO !== '0';
  // حساب نمونهٔ دفتر محله (username: daftar / pass: daftar1234)
  if (DEMO && !db.prepare("SELECT id FROM admins WHERE username='daftar'").get()) {
    const hash = bcrypt.hashSync('daftar1234', 10);
    db.prepare("INSERT INTO admins (username,password_hash,name,role,status,phone,office_name) VALUES (?,?,?,?,?,?,?)")
      .run('daftar', hash, 'دفتر محله ولیعصر', 'office', 'active', '09121234567', 'دفتر محله ولیعصر');
    db.prepare("UPDATE offices SET owner='daftar' WHERE name='دفتر محله ولیعصر'").run();
    const os = db.prepare("INSERT INTO office_services (title,category,office,description,price,owner,status) VALUES (?,?,?,?,?,?,?)");
    os.run('صدور و تمدید کارت محله', 'خدمات هویتی', 'دفتر محله ولیعصر', 'صدور و تمدید کارت شهروندی محله با ارائهٔ مدارک شناسایی.', 0, 'daftar', 'active');
    os.run('ثبت درخواست خدمات شهری', 'خدمات شهری', 'دفتر محله ولیعصر', 'ثبت و پیگیری درخواست‌های رفع سد معبر، نظافت و روشنایی معابر.', 0, 'daftar', 'active');
  }

  // پیام‌های نمونهٔ گفتگوی دفتر محله (برای حساب daftar)
  if (db.prepare('SELECT COUNT(*) c FROM office_messages').get().c === 0) {
    const om = db.prepare("INSERT INTO office_messages (owner,office,sender_name,sender_phone,body,reply,status) VALUES (?,?,?,?,?,?,?)");
    om.run('daftar', 'دفتر محله ولیعصر', 'زهرا کریمی', '09120001122', 'سلام، برای تمدید کارت شهروندی محله چه مدارکی لازم است؟', 'سلام؛ کارت ملی، یک قطعه عکس و قبض آب یا برق به‌نام خودتان کافی است. همه‌روزه از ۹ تا ۱۷ می‌توانید مراجعه کنید.', 'replied');
    om.run('daftar', 'دفتر محله ولیعصر', 'محمد احمدی', '09121234000', 'در کوچهٔ ما چند چراغ معبر خاموش است، لطفاً پیگیری کنید.', '', 'open');
    om.run('daftar', 'دفتر محله ولیعصر', 'نگین موسوی', '', 'ساعت کاری دفتر در روزهای پنجشنبه چگونه است؟', '', 'open');
  }

  // کلمات ممنوعه (نمونه)
  if (db.prepare('SELECT COUNT(*) c FROM banned_words').get().c === 0) {
    const bw = db.prepare('INSERT INTO banned_words (word,note,status) VALUES (?,?,?)');
    [
      ['کلاهبرداری','نمونه','active'],
      ['فحش','نمونه','active'],
      ['اسپم','نمونه','active'],
    ].forEach(r => bw.run(r));
  }

  // حساب نمونهٔ فروشنده برای ورود به پنل فروشندگی (username: atra / pass: atra1234)
  if (DEMO && !db.prepare("SELECT id FROM admins WHERE username='atra'").get()) {
    const hash = bcrypt.hashSync('atra1234', 10);
    db.prepare("INSERT INTO admins (username,password_hash,name,role,status,phone,seller_name) VALUES (?,?,?,?,?,?,?)")
      .run('atra', hash, 'فروشگاه آترا چرم', 'seller', 'active', '09120000000', 'آترا چرم');
    // اتصال فروشگاه موجود «آترا چرم» به این حساب
    db.prepare("UPDATE sellers SET owner='atra', bio=COALESCE(bio,'آترا چرم از سال ۱۴۰۰ محصولات چرم طبیعی و دست‌دوز عرضه می‌کند.') WHERE name='آترا چرم'").run();
    // چند محصول نمونه برای این فروشنده
    const p = db.prepare("INSERT INTO products (title,category,seller,price,stock,status,owner) VALUES (?,?,?,?,?,?,?)");
    [
      ['کیف چرم طبیعی مدل رویا','کیف','آترا چرم',2450000,12,'active','atra'],
      ['کمربند چرم دست‌دوز','کمربند','آترا چرم',680000,30,'active','atra'],
      ['کیف‌پول چرم جیبی','کیف‌پول','آترا چرم',420000,45,'active','atra'],
    ].forEach(r => p.run(r));
  }
}

if (require.main === module) { seed(); console.log('✓ داده اولیه آماده شد.'); }
module.exports = seed;
