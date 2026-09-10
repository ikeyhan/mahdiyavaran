/* پشتیبانی و چت‌بات هوش مصنوعی
   - GET  /api/support/config  (عمومی) پیکربندی نمایشی ویجت + سؤالات متداول (بدون کلید)
   - POST /api/support/chat    (عمومی) گفتگو با هوش مصنوعی از طریق کلید ذخیره‌شده در سرور
   - GET  /api/support/conversations (مدیر) تاریخچهٔ گفتگوها
   کلید API فقط سمت سرور استفاده می‌شود و هرگز به مرورگر ارسال نمی‌شود. */
const express = require('express');
const db = require('../db');
const { requireAuth, clientIp } = require('../auth');
const { str } = require('../validate');

const router = express.Router();

function getSetting(key, def) {
  var r = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return r ? r.value : def;
}
function activeFaqs() {
  return db.prepare("SELECT id,question,answer FROM faqs WHERE status='active' ORDER BY sort,id").all();
}

// پیکربندی عمومی ویجت (بدون کلید API)
router.get('/config', (req, res) => {
  res.json({
    enabled: getSetting('chat_enabled', '1') === '1',
    title: getSetting('chat_title', 'پشتیبانی اتم'),
    welcome: getSetting('chat_welcome', ''),
    avatar: getSetting('chat_avatar', ''),
    color: getSetting('chat_color', '#149B3E'),
    aiEnabled: !!getSetting('ai_api_key', ''),
    faqs: activeFaqs(),
  });
});

// گفتگو با هوش مصنوعی
router.post('/chat', async (req, res) => {
  var apiKey = getSetting('ai_api_key', '');
  var provider = getSetting('ai_provider', 'openai');
  var model = getSetting('ai_model', provider === 'anthropic' ? 'claude-opus-5' : 'gpt-4o-mini');
  var baseUrl = getSetting('ai_base_url', 'https://api.openai.com/v1');
  var sysPrompt = getSetting('ai_system_prompt', 'تو دستیار پشتیبانی فروشگاه اتم هستی. فارسی و کوتاه پاسخ بده.');
  var session = str(req.body.session, 80) || ('s-' + Date.now());

  var msgs = Array.isArray(req.body.messages) ? req.body.messages.slice(-12) : [];
  msgs = msgs.filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
             .map(m => ({ role: m.role, content: str(m.content, 4000) }));
  if (!msgs.length) return res.status(400).json({ error: 'پیامی ارسال نشد.' });

  if (!apiKey) {
    return res.status(503).json({
      error: 'no_key',
      reply: 'در حال حاضر گفتگوی هوشمند فعال نیست. لطفاً از بخش سؤالات متداول استفاده کنید یا برای تیم پشتیبانی پیام بگذارید.',
    });
  }

  // بافت سؤالات متداول را به دستور سیستمی اضافه می‌کنیم
  var faqs = activeFaqs();
  var faqText = faqs.map(f => 'س: ' + f.question + '\nج: ' + f.answer).join('\n\n');
  var system = sysPrompt + (faqText ? '\n\nدانش پایه (سؤالات متداول سایت):\n' + faqText : '');

  try {
    var reply = provider === 'anthropic'
      ? await callAnthropic(apiKey, model, system, msgs)
      : await callOpenAICompatible(apiKey, baseUrl, model, system, msgs);

    // ثبت در تاریخچه
    var last = msgs[msgs.length - 1];
    var log = db.prepare('INSERT INTO chat_messages (session,role,content) VALUES (?,?,?)');
    log.run(session, 'user', last.content);
    log.run(session, 'assistant', reply);

    res.json({ reply: reply, session: session });
  } catch (e) {
    console.error('AI error:', e.message);
    res.status(502).json({ error: 'ai_failed', reply: 'در حال حاضر امکان پاسخ‌گویی هوشمند نیست. لطفاً چند لحظه بعد دوباره تلاش کنید یا برای پشتیبانی پیام بگذارید.' });
  }
});

// --- Anthropic (Claude) از طریق SDK رسمی ---
async function callAnthropic(apiKey, model, system, msgs) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: apiKey });
  const resp = await client.messages.create({
    model: model || 'claude-opus-5',
    max_tokens: 1024,
    system: system,
    messages: msgs,
  });
  const parts = (resp.content || []).filter(b => b.type === 'text').map(b => b.text);
  return parts.join('\n').trim() || 'متأسفم، پاسخی دریافت نشد.';
}

// --- OpenAI-compatible (OpenAI و درگاه‌های سازگار) ---
async function callOpenAICompatible(apiKey, baseUrl, model, system, msgs) {
  const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions';
  const body = {
    model: model || 'gpt-4o-mini',
    max_tokens: 1024,
    messages: [{ role: 'system', content: system }].concat(msgs),
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('provider ' + r.status + ': ' + t.slice(0, 200));
  }
  const d = await r.json();
  return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content || '').trim()
    || 'متأسفم، پاسخی دریافت نشد.';
}

// ثبت پیام از ویجت (عمومی — بازدیدکننده لازم نیست وارد شده باشد)
router.post('/message', (req, res) => {
  var sender = str(req.body.sender, 200).trim() || 'کاربر سایت';
  var subject = str(req.body.subject, 200).trim() || 'پیام از ویجت پشتیبانی';
  var body = str(req.body.body, 4000).trim();
  if (!body) return res.status(400).json({ error: 'متن پیام را وارد کنید.' });
  db.prepare('INSERT INTO messages (sender,subject,body,status) VALUES (?,?,?,?)')
    .run(sender, subject, body, 'open');
  res.status(201).json({ ok: true });
});

// تاریخچهٔ گفتگوها (مدیر)
router.get('/conversations', requireAuth, (req, res) => {
  res.json({
    items: db.prepare('SELECT session,role,content,created_at FROM chat_messages ORDER BY id DESC LIMIT 100').all(),
  });
});

module.exports = router;
