/* مقالات بلاگ — CRUD واقعی (نقش admin یا editor برای نوشتن) */
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, logActivity } = require('../auth');
const { str, oneOf } = require('../validate');

const router = express.Router();

// فهرست عمومی مقالات منتشرشده (برای نمایش در سایت) — بدون احراز هویت
router.get('/public', (req, res) => {
  const rows = db.prepare(
    `SELECT id,title,slug,category,author,excerpt,cover,body,views,created_at
     FROM articles WHERE status='published' ORDER BY id DESC`).all();
  res.json({ items: rows });
});

// از اینجا به بعد نیازمند ورود
router.use(requireAuth);

router.get('/', (req, res) => {
  const f = req.query.status;
  const rows = (f === 'published' || f === 'draft')
    ? db.prepare('SELECT * FROM articles WHERE status=? ORDER BY id DESC').all(f)
    : db.prepare('SELECT * FROM articles ORDER BY id DESC').all();
  res.json({ items: rows });
});

router.get('/:id', (req, res) => {
  const a = db.prepare('SELECT * FROM articles WHERE id=?').get(+req.params.id);
  if (!a) return res.status(404).json({ error: 'مقاله یافت نشد.' });
  res.json({ item: a });
});

function slugify(t) {
  return String(t || '').trim().replace(/\s+/g, '-').replace(/[^؀-ۿ\w-]/g, '').slice(0, 80) || 'article';
}

// نوشتن/انتشار — نقش admin یا editor
router.post('/', requireRole('admin', 'editor'), (req, res) => {
  const title = str(req.body.title, 300).trim();
  if (!title) return res.status(400).json({ error: 'عنوان مقاله الزامی است.' });
  const status = oneOf(req.body.status, ['draft', 'published'], 'draft');
  const info = db.prepare(
    `INSERT INTO articles (title,slug,category,author,excerpt,cover,body,status,views)
     VALUES (@title,@slug,@category,@author,@excerpt,@cover,@body,@status,0)`
  ).run({
    title, slug: str(req.body.slug, 100).trim() || slugify(title),
    category: str(req.body.category, 80), author: str(req.body.author, 120) || req.admin.name,
    excerpt: str(req.body.excerpt, 600), cover: str(req.body.cover, 400),
    body: str(req.body.body, 200000), status,
  });
  logActivity(req, status === 'published' ? 'انتشار مقاله' : 'ذخیره پیش‌نویس', `«${title}»`);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', requireRole('admin', 'editor'), (req, res) => {
  const id = +req.params.id;
  const a = db.prepare('SELECT * FROM articles WHERE id=?').get(id);
  if (!a) return res.status(404).json({ error: 'مقاله یافت نشد.' });
  const title = str(req.body.title, 300).trim() || a.title;
  const status = oneOf(req.body.status, ['draft', 'published'], a.status);
  db.prepare(
    `UPDATE articles SET title=@title, slug=@slug, category=@category, author=@author,
     excerpt=@excerpt, cover=@cover, body=@body, status=@status, updated_at=datetime('now')
     WHERE id=@id`
  ).run({
    id, title, slug: str(req.body.slug, 100).trim() || a.slug,
    category: str(req.body.category, 80) || a.category, author: str(req.body.author, 120) || a.author,
    excerpt: str(req.body.excerpt, 600), cover: str(req.body.cover, 400),
    body: str(req.body.body, 200000), status,
  });
  logActivity(req, 'ویرایش مقاله', `«${title}»`);
  res.json({ ok: true });
});

router.delete('/:id', requireRole('admin', 'editor'), (req, res) => {
  const a = db.prepare('SELECT title FROM articles WHERE id=?').get(+req.params.id);
  if (!a) return res.status(404).json({ error: 'مقاله یافت نشد.' });
  db.prepare('DELETE FROM articles WHERE id=?').run(+req.params.id);
  logActivity(req, 'حذف مقاله', `«${a.title}»`);
  res.json({ ok: true });
});

module.exports = router;
