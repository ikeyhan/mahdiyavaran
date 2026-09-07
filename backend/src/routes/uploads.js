/* آپلود فایل رسانه — تصاویر (تصویر شاخص و درون‌متنی بلاگ) */
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAuth, logActivity } = require('../auth');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().slice(0, 6);
    const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
    cb(null, name);
  },
});

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 }, // ۶ مگابایت
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error('فقط فایل تصویری مجاز است (JPG, PNG, WEBP, GIF, SVG).'));
  },
});

router.post('/', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشد.' });
    const url = '/uploads/' + req.file.filename;
    logActivity(req, 'آپلود رسانه', req.file.filename);
    res.status(201).json({ url, size: req.file.size, name: req.file.filename });
  });
});

module.exports = router;
