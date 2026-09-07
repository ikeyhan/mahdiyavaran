/* کارخانه CRUD برای منابع ساده (محصولات، سفارش‌ها، مشتریان) */
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, logActivity } = require('../auth');
const { str, int, oneOf } = require('../validate');

// cfg: { table, label, fields:[{name,type,max,allowed,def}], writeRoles }
function makeResource(cfg) {
  const router = express.Router();
  router.use(requireAuth);
  const cols = cfg.fields.map(f => f.name);

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

  // فهرست با صفحه‌بندی و فیلتر ساده
  router.get('/', (req, res) => {
    const limit = Math.min(int(req.query.limit, 50), 200);
    const offset = int(req.query.offset, 0);
    let where = '', args = [];
    if (req.query.status && cols.includes('status')) { where = 'WHERE status=?'; args = [req.query.status]; }
    const items = db.prepare(`SELECT * FROM ${cfg.table} ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
      .all(...args, limit, offset);
    const total = db.prepare(`SELECT COUNT(*) c FROM ${cfg.table} ${where}`).get(...args).c;
    res.json({ items, total });
  });

  router.get('/:id', (req, res) => {
    const row = db.prepare(`SELECT * FROM ${cfg.table} WHERE id=?`).get(+req.params.id);
    if (!row) return res.status(404).json({ error: 'یافت نشد.' });
    res.json({ item: row });
  });

  const writeGuard = cfg.writeRoles ? requireRole(...cfg.writeRoles) : (req, res, next) => next();

  router.post('/', writeGuard, (req, res) => {
    const data = clean(req.body, null);
    const placeholders = cols.map(c => '@' + c).join(',');
    const info = db.prepare(`INSERT INTO ${cfg.table} (${cols.join(',')}) VALUES (${placeholders})`).run(data);
    logActivity(req, `افزودن ${cfg.label}`, data[cfg.fields[0].name] || '');
    res.status(201).json({ id: info.lastInsertRowid });
  });

  router.put('/:id', writeGuard, (req, res) => {
    const existing = db.prepare(`SELECT * FROM ${cfg.table} WHERE id=?`).get(+req.params.id);
    if (!existing) return res.status(404).json({ error: 'یافت نشد.' });
    const data = clean(req.body, existing);
    const setClause = cols.map(c => `${c}=@${c}`).join(',');
    db.prepare(`UPDATE ${cfg.table} SET ${setClause} WHERE id=@id`).run({ ...data, id: +req.params.id });
    logActivity(req, `ویرایش ${cfg.label}`, data[cfg.fields[0].name] || ('#' + req.params.id));
    res.json({ ok: true });
  });

  router.delete('/:id', writeGuard, (req, res) => {
    const ex = db.prepare(`SELECT * FROM ${cfg.table} WHERE id=?`).get(+req.params.id);
    if (!ex) return res.status(404).json({ error: 'یافت نشد.' });
    db.prepare(`DELETE FROM ${cfg.table} WHERE id=?`).run(+req.params.id);
    logActivity(req, `حذف ${cfg.label}`, ex[cfg.fields[0].name] || ('#' + req.params.id));
    res.json({ ok: true });
  });

  return router;
}

const products = makeResource({
  table: 'products', label: 'محصول', writeRoles: ['admin', 'editor'],
  fields: [
    { name: 'title', max: 300 }, { name: 'category', max: 80 }, { name: 'seller', max: 120 },
    { name: 'price', type: 'int' }, { name: 'stock', type: 'int' },
    { name: 'status', allowed: ['active', 'inactive'], def: 'active' }, { name: 'image', max: 400 },
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

module.exports = { products, orders, customers };
