/* کارخانه CRUD برای منابع ساده (محصولات، سفارش‌ها، مشتریان، ...) */
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, logActivity } = require('../auth');
const { str, int, oneOf, isNationalCode, isMobile } = require('../validate');
const banned = require('../banned');

// cfg: {
//   table, label, fields:[{name,type,max,allowed,def}], writeRoles,
//   ownerField,        // نام ستون مالک (مثلاً 'owner') — نقش seller فقط ردیف‌های خود را می‌بیند/می‌تواند تغییر دهد
//   ownerInject,       // { colName: adminProp } مقادیری که هنگام ساخت برای seller اجباری می‌شوند
//   bannedFields,      // ستون‌هایی که باید برای کلمات ممنوعه بررسی شوند
//   afterWrite,        // callback پس از هر نوشتن
// }
function makeResource(cfg) {
  const router = express.Router();
  router.use(requireAuth);
  const cols = cfg.fields.map(f => f.name);

  function isOwnerScoped(req) {
    return cfg.ownerField && req.admin && req.admin.role === (cfg.ownerRole || 'seller');
  }
  // نام نمایشی حساب مالک جاری (فروشگاه/دفتر)
  function ownerDisplayName(req) {
    const col = cfg.ownerNameCol || 'seller_name';
    const row = db.prepare(`SELECT ${col} AS nm FROM admins WHERE id=?`).get(req.admin.id);
    return (row && row.nm) || req.admin.name || req.admin.username;
  }

  function clean(body, existing) {
    const out = {};
    for (const f of cfg.fields) {
      let v = body[f.name];
      if (v == null && existing) { out[f.name] = existing[f.name]; continue; }
      if (f.type === 'int') out[f.name] = int(v, f.def || 0);
      else if (f.allowed) out[f.name] = oneOf(v, f.allowed, f.def || f.allowed[0]);
      else out[f.name] = str(v, f.max || 300);
    }
    return out;
  }

  function bannedCheck(res, data) {
    if (!cfg.bannedFields) return true;
    const texts = cfg.bannedFields.map(k => data[k]);
    return banned.guard(res, ...texts);
  }

  // فهرست با صفحه‌بندی و فیلتر ساده
  router.get('/', (req, res) => {
    const limit = Math.min(int(req.query.limit, 50), 200);
    const offset = int(req.query.offset, 0);
    const wh = [], args = [];
    if (req.query.status && cols.includes('status')) { wh.push('status=?'); args.push(req.query.status); }
    if (isOwnerScoped(req)) { wh.push(cfg.ownerField + '=?'); args.push(req.admin.username); }
    const where = wh.length ? 'WHERE ' + wh.join(' AND ') : '';
    const order = cols.includes('sort') ? 'sort ASC, id DESC' : 'id DESC';
    const items = db.prepare(`SELECT * FROM ${cfg.table} ${where} ORDER BY ${order} LIMIT ? OFFSET ?`)
      .all(...args, limit, offset);
    const total = db.prepare(`SELECT COUNT(*) c FROM ${cfg.table} ${where}`).get(...args).c;
    res.json({ items, total });
  });

  router.get('/:id', (req, res) => {
    const row = db.prepare(`SELECT * FROM ${cfg.table} WHERE id=?`).get(+req.params.id);
    if (!row) return res.status(404).json({ error: 'یافت نشد.' });
    if (isOwnerScoped(req) && row[cfg.ownerField] !== req.admin.username)
      return res.status(403).json({ error: 'به این مورد دسترسی ندارید.' });
    res.json({ item: row });
  });

  const writeGuard = cfg.writeRoles ? requireRole(...cfg.writeRoles) : (req, res, next) => next();

  router.post('/', writeGuard, (req, res) => {
    const data = clean(req.body, null);
    if (!bannedCheck(res, data)) return;
    // تزریق مالکیت برای فروشنده
    if (isOwnerScoped(req)) {
      data[cfg.ownerField] = req.admin.username;
      if (cfg.ownerInject) for (const [col, prop] of Object.entries(cfg.ownerInject)) {
        if (cols.includes(col)) data[col] = prop === '$ownerName' ? ownerDisplayName(req) : req.admin[prop];
      }
    }
    if (cfg.derive) cfg.derive(data, req, null);
    if (cfg.validateFn) { const err = cfg.validateFn(data, null); if (err) return res.status(400).json({ error: err }); }
    const placeholders = cols.map(c => '@' + c).join(',');
    const info = db.prepare(`INSERT INTO ${cfg.table} (${cols.join(',')}) VALUES (${placeholders})`).run(data);
    logActivity(req, `افزودن ${cfg.label}`, data[cfg.fields[0].name] || '');
    if (cfg.afterWrite) cfg.afterWrite();
    res.status(201).json({ id: info.lastInsertRowid });
  });

  router.put('/:id', writeGuard, (req, res) => {
    const existing = db.prepare(`SELECT * FROM ${cfg.table} WHERE id=?`).get(+req.params.id);
    if (!existing) return res.status(404).json({ error: 'یافت نشد.' });
    if (isOwnerScoped(req) && existing[cfg.ownerField] !== req.admin.username)
      return res.status(403).json({ error: 'اجازهٔ ویرایش این مورد را ندارید.' });
    const data = clean(req.body, existing);
    if (!bannedCheck(res, data)) return;
    if (isOwnerScoped(req)) data[cfg.ownerField] = req.admin.username; // جلوگیری از تغییر مالک
    if (cfg.derive) cfg.derive(data, req, existing);
    if (cfg.validateFn) { const err = cfg.validateFn(data, existing); if (err) return res.status(400).json({ error: err }); }
    const setClause = cols.map(c => `${c}=@${c}`).join(',');
    db.prepare(`UPDATE ${cfg.table} SET ${setClause} WHERE id=@id`).run({ ...data, id: +req.params.id });
    logActivity(req, `ویرایش ${cfg.label}`, data[cfg.fields[0].name] || ('#' + req.params.id));
    if (cfg.afterWrite) cfg.afterWrite();
    res.json({ ok: true });
  });

  router.delete('/:id', writeGuard, (req, res) => {
    const ex = db.prepare(`SELECT * FROM ${cfg.table} WHERE id=?`).get(+req.params.id);
    if (!ex) return res.status(404).json({ error: 'یافت نشد.' });
    if (isOwnerScoped(req) && ex[cfg.ownerField] !== req.admin.username)
      return res.status(403).json({ error: 'اجازهٔ حذف این مورد را ندارید.' });
    db.prepare(`DELETE FROM ${cfg.table} WHERE id=?`).run(+req.params.id);
    logActivity(req, `حذف ${cfg.label}`, ex[cfg.fields[0].name] || ('#' + req.params.id));
    if (cfg.afterWrite) cfg.afterWrite();
    res.json({ ok: true });
  });

  return router;
}

const products = makeResource({
  table: 'products', label: 'محصول', writeRoles: ['admin', 'editor', 'seller'],
  ownerField: 'owner', ownerInject: { seller: '$ownerName' }, bannedFields: ['title', 'description'],
  fields: [
    { name: 'title', max: 300 }, { name: 'category', max: 80 }, { name: 'seller', max: 120 },
    { name: 'price', type: 'int' }, { name: 'stock', type: 'int' },
    { name: 'status', allowed: ['active', 'inactive'], def: 'active' }, { name: 'image', max: 400 },
    { name: 'description', max: 4000 }, { name: 'owner', max: 60 },
  ],
});

const orders = makeResource({
  table: 'orders', label: 'سفارش', writeRoles: ['admin', 'support'],
  fields: [
    { name: 'code', max: 40 }, { name: 'customer', max: 120 }, { name: 'product', max: 300 },
    { name: 'seller', max: 120 }, { name: 'amount', type: 'int' },
    { name: 'status', allowed: ['pending', 'shipping', 'delivered', 'returned', 'review'], def: 'pending' },
  ],
});

const customers = makeResource({
  table: 'customers', label: 'مشتری', writeRoles: ['admin', 'support'],
  fields: [
    { name: 'name', max: 120 }, { name: 'phone', max: 20 }, { name: 'email', max: 160 },
    { name: 'city', max: 60 }, { name: 'total_spent', type: 'int' }, { name: 'orders_count', type: 'int' },
  ],
});

const categories = makeResource({
  table: 'categories', label: 'دسته‌بندی', writeRoles: ['admin', 'editor'],
  fields: [
    { name: 'title', max: 120 }, { name: 'slug', max: 80 }, { name: 'parent', max: 120 },
    { name: 'count', type: 'int' }, { name: 'status', allowed: ['active', 'draft'], def: 'active' },
  ],
});

const sellers = makeResource({
  table: 'sellers', label: 'فروشنده', writeRoles: ['admin', 'seller'],
  ownerField: 'owner', bannedFields: ['name', 'bio'],
  fields: [
    { name: 'name', max: 120 }, { name: 'category', max: 120 }, { name: 'city', max: 60 },
    { name: 'rating', type: 'int' }, { name: 'sales', type: 'int' },
    { name: 'status', allowed: ['active', 'pending', 'blocked'], def: 'active' },
    { name: 'bio', max: 2000 }, { name: 'avatar', max: 400 }, { name: 'phone', max: 20 }, { name: 'owner', max: 60 },
  ],
});

const offers = makeResource({
  table: 'offers', label: 'تخفیف', writeRoles: ['admin', 'editor'],
  fields: [
    { name: 'code', max: 40 }, { name: 'title', max: 160 },
    { name: 'kind', allowed: ['percent', 'amount'], def: 'percent' },
    { name: 'amount', type: 'int' }, { name: 'used', type: 'int' }, { name: 'quota', type: 'int' },
    { name: 'expires', max: 40 }, { name: 'status', allowed: ['active', 'expired'], def: 'active' },
  ],
});

const comments = makeResource({
  table: 'comments', label: 'نظر', writeRoles: ['admin', 'support', 'editor'],
  fields: [
    { name: 'author', max: 120 }, { name: 'product', max: 200 }, { name: 'body', max: 2000 },
    { name: 'rating', type: 'int' }, { name: 'status', allowed: ['pending', 'approved', 'rejected'], def: 'pending' },
  ],
});

const messages = makeResource({
  table: 'messages', label: 'پیام', writeRoles: ['admin', 'support'],
  fields: [
    { name: 'sender', max: 120 }, { name: 'subject', max: 200 }, { name: 'body', max: 4000 },
    { name: 'status', allowed: ['open', 'pending', 'closed'], def: 'open' },
  ],
});

const faqs = makeResource({
  table: 'faqs', label: 'سؤال متداول', writeRoles: ['admin', 'editor', 'support'],
  fields: [
    { name: 'question', max: 300 }, { name: 'answer', max: 4000 },
    { name: 'sort', type: 'int' }, { name: 'status', allowed: ['active', 'hidden'], def: 'active' },
  ],
});

const slides = makeResource({
  table: 'slides', label: 'اسلاید', writeRoles: ['admin', 'editor'],
  fields: [
    { name: 'title', max: 200 }, { name: 'eyebrow', max: 80 }, { name: 'subtitle', max: 400 },
    { name: 'image', max: 400 }, { name: 'cta_label', max: 80 }, { name: 'cta_link', max: 200 },
    { name: 'sort', type: 'int' }, { name: 'status', allowed: ['active', 'hidden'], def: 'active' },
  ],
});

const bannedWords = makeResource({
  table: 'banned_words', label: 'کلمهٔ ممنوعه', writeRoles: ['admin'],
  afterWrite: banned.invalidate,
  fields: [
    { name: 'word', max: 80 }, { name: 'note', max: 200 },
    { name: 'status', allowed: ['active', 'off'], def: 'active' },
  ],
});

const ads = makeResource({
  table: 'ads', label: 'تبلیغ', writeRoles: ['admin', 'editor'],
  fields: [
    { name: 'placement', allowed: ['top', 'corner'], def: 'top' },
    { name: 'title', max: 200 }, { name: 'text', max: 300 },
    { name: 'image', max: 400 }, { name: 'link', max: 200 },
    { name: 'cta_label', max: 60 }, { name: 'bg', max: 40 },
    { name: 'sort', type: 'int' }, { name: 'status', allowed: ['active', 'hidden'], def: 'active' },
  ],
});

// دفاتر محلات — با اعتبارسنجی کد ملی و گردش‌کار تأیید توسط مدیر
const offices = makeResource({
  table: 'offices', label: 'دفتر محله', writeRoles: ['admin', 'office'],
  ownerField: 'owner', ownerRole: 'office', ownerNameCol: 'office_name',
  bannedFields: ['name', 'manager', 'bio'],
  derive: (data, req, existing) => {
    // دفتر نمی‌تواند وضعیت اعتبارسنجی خودش را تغییر دهد؛ فقط مدیر تأیید می‌کند
    if (req && req.admin && req.admin.role === 'office') {
      data.status = existing ? existing.status : 'pending';
      data.verify_note = existing ? existing.verify_note : '';
    }
    data.verified = (data.status === 'verified') ? 1 : 0;
  },
  validateFn: (data) => {
    if (data.national_code && String(data.national_code).trim() && !isNationalCode(data.national_code))
      return 'کد ملی واردشده نامعتبر است. لطفاً یک کد ملی معتبر ۱۰ رقمی وارد کنید.';
    if (data.phone && String(data.phone).trim() && !isMobile(data.phone))
      return 'شمارهٔ موبایل نامعتبر است (نمونهٔ درست: 09xxxxxxxxx).';
    return null;
  },
  fields: [
    { name: 'name', max: 160 }, { name: 'manager', max: 120 }, { name: 'area', max: 120 },
    { name: 'city', max: 60 }, { name: 'address', max: 300 }, { name: 'phone', max: 20 },
    { name: 'national_code', max: 12 }, { name: 'license_no', max: 60 },
    { name: 'bio', max: 2000 }, { name: 'avatar', max: 400 },
    { name: 'verified', type: 'int' }, { name: 'rating', type: 'int' },
    { name: 'status', allowed: ['pending', 'verified', 'rejected', 'blocked'], def: 'pending' },
    { name: 'verify_note', max: 300 }, { name: 'owner', max: 60 },
  ],
});

const officeServices = makeResource({
  table: 'office_services', label: 'خدمت دفتر', writeRoles: ['admin', 'office'],
  ownerField: 'owner', ownerRole: 'office', ownerNameCol: 'office_name',
  ownerInject: { office: '$ownerName' }, bannedFields: ['title', 'description'],
  fields: [
    { name: 'title', max: 200 }, { name: 'category', max: 80 }, { name: 'office', max: 160 },
    { name: 'description', max: 4000 }, { name: 'price', type: 'int' },
    { name: 'status', allowed: ['active', 'inactive'], def: 'active' }, { name: 'owner', max: 60 },
  ],
});

// گفتگوی دفاتر محلات — دفتر پیام‌های شهروندان خود را می‌بیند و پاسخ می‌دهد
const officeMessages = makeResource({
  table: 'office_messages', label: 'پیام دفتر', writeRoles: ['admin', 'office'],
  ownerField: 'owner', ownerRole: 'office', ownerNameCol: 'office_name',
  bannedFields: ['reply'],
  derive: (data, req, existing) => {
    // ثبت پاسخ توسط دفتر → وضعیت «پاسخ داده‌شده»
    if (req && req.admin && req.admin.role === 'office' && data.reply && String(data.reply).trim() && (!existing || !existing.reply)) {
      data.status = 'replied';
    }
  },
  fields: [
    { name: 'office', max: 160 }, { name: 'sender_name', max: 120 }, { name: 'sender_phone', max: 20 },
    { name: 'body', max: 4000 }, { name: 'reply', max: 4000 },
    { name: 'status', allowed: ['open', 'replied', 'closed'], def: 'open' }, { name: 'owner', max: 60 },
  ],
});

module.exports = { products, orders, customers, categories, sellers, offers, comments, messages, faqs, slides, bannedWords, ads, offices, officeServices, officeMessages };
