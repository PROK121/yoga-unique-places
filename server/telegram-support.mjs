/**
 * Мост: поддержка (админ ↔ пользователь) + заказы и оплата через Telegram + Kaspi.
 *
 * Запуск:
 *   TELEGRAM_BOT_TOKEN=... TELEGRAM_ADMIN_CHAT_ID=... node server/telegram-support.mjs
 *
 * TELEGRAM_BOT_USERNAME опционален: если не задать, при старте запрашивается через Telegram getMe.
 *
 * Опционально:
 *   PORT=8787
 *   SUPPORT_API_SECRET=...
 *   KASPI_PAY_LINK=https://kaspi.kz/  (или ваша ссылка на оплату)
 *
 * Telegram на хостинге со сном (Render free и т.п.): long polling не получает апдейты, пока сервис спит.
 * Задайте публичный origin API — включится webhook (Telegram POST → /telegram/webhook, будит процесс):
 *   TELEGRAM_WEBHOOK_BASE_URL=https://ваш-сервис.onrender.com
 *   или на Render часто достаточно RENDER_EXTERNAL_URL (подставляется автоматически).
 * Опционально: TELEGRAM_WEBHOOK_SECRET — тот же секрет в заголовке X-Telegram-Bot-Api-Secret-Token.
 *
 * Фронт: VITE_SUPPORT_API_URL=http://127.0.0.1:8787
 *
 * Заказы пишутся в data/orders.json — чтобы после перезапуска (Render) бот находил order по deep link.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

const DATA_DIR = process.env.YOGA_CLASSES_DATA_DIR
  ? path.resolve(process.env.YOGA_CLASSES_DATA_DIR)
  : path.join(process.cwd(), 'data');
const YOGA_CLASSES_FILE = path.join(DATA_DIR, 'yoga-classes.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

function readYogaClassesPayload() {
  try {
    if (!fs.existsSync(YOGA_CLASSES_FILE)) {
      return { classes: [], empty: true };
    }
    const raw = fs.readFileSync(YOGA_CLASSES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { classes: [], empty: false };
    return { classes: parsed, empty: false };
  } catch (e) {
    console.error('[yoga-classes] read', e);
    return { classes: [], empty: true };
  }
}

function writeYogaClassesFile(classes) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(YOGA_CLASSES_FILE, JSON.stringify(classes), 'utf8');
}

const BOT = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT = process.env.TELEGRAM_ADMIN_CHAT_ID;
/** Имя бота без @; может дополниться из getMe при старте */
let botUsername = (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
const PORT = Number(process.env.PORT || 8787);
const API_SECRET = process.env.SUPPORT_API_SECRET || '';
const KASPI_PAY_LINK = process.env.KASPI_PAY_LINK || 'https://kaspi.kz/';
/** Публичный https://origin без пути — для setWebhook; иначе пусто = только long polling */
const WEBHOOK_BASE = (
  process.env.TELEGRAM_WEBHOOK_BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  ''
)
  .trim()
  .replace(/\/+$/, '');
const WEBHOOK_SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();

/** @type {Map<string, object>} */
const orders = new Map();

function loadOrdersFromDisk() {
  try {
    if (!fs.existsSync(ORDERS_FILE)) return;
    const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    for (const o of arr) {
      if (o && typeof o.id === 'string') orders.set(o.id, o);
    }
    console.log('[orders] loaded from disk:', orders.size);
  } catch (e) {
    console.error('[orders] load', e);
  }
}

function saveOrdersToDisk() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([...orders.values()]), 'utf8');
  } catch (e) {
    console.error('[orders] save', e);
  }
}

/** Для /health: был ли webhook до сброса (диагностика «бот молчит»). */
let webhookUrlBeforeDelete = null;

/** Исходящие в Telegram: message_id → телефон пользователя (reply поддержки) */
const telegramMessageToPhone = new Map();
/** Очередь ответов поддержки по телефону */
const supportReplies = new Map();

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Support-Secret');
}

function checkSecret(req) {
  if (!API_SECRET) return true;
  return req.headers['x-support-secret'] === API_SECRET;
}

async function tg(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${BOT}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

/** Если в env нет TELEGRAM_BOT_USERNAME — подставить из Telegram (нужен TELEGRAM_BOT_TOKEN). */
async function ensureBotUsername() {
  if (botUsername) return;
  if (!BOT) return;
  const j = await tg('getMe', {});
  if (j.ok && j.result?.username) {
    botUsername = j.result.username;
    console.log('[telegram-support] Имя бота из Telegram getMe:', botUsername);
  }
}

/**
 * Long polling (getUpdates) не работает, пока у бота включён webhook.
 * Частая причина «в боте ничего не происходит» после экспериментов с другими сервисами.
 */
async function ensureLongPollingMode() {
  if (!BOT) return;
  const info = await tg('getWebhookInfo', {});
  if (info.ok && info.result) {
    webhookUrlBeforeDelete = info.result.url || null;
    if (webhookUrlBeforeDelete) {
      console.warn(
        '[telegram-support] Обнаружен webhook (getUpdates не получал сообщения):',
        webhookUrlBeforeDelete,
      );
    }
  }
  const del = await tg('deleteWebhook', { drop_pending_updates: false });
  if (!del.ok) {
    console.error('[telegram-support] deleteWebhook:', del);
  } else {
    console.log('[telegram-support] Webhook сброшен — бот слушает через getUpdates.');
  }
}

async function sendUserMessage(chatId, text, extra = {}) {
  const j = await tg('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
    ...extra,
  });
  if (!j.ok) {
    console.error('[sendMessage] failed', { chatId, err: j });
  }
  return j;
}

/** Payload из /start или /start@BotName payload */
function extractStartPayload(text) {
  const t = (text || '').trim();
  const m = t.match(/^\/start(?:@\S+)?(?:\s+(\S+))?/);
  return (m?.[1] || '').trim();
}

async function sendToAdmin(phone, text) {
  const payload = `📩 <b>Поддержка</b>\n👤 <code>${escapeHtml(phone)}</code>\n\n${escapeHtml(text)}`;
  const j = await tg('sendMessage', {
    chat_id: ADMIN_CHAT,
    text: payload,
    parse_mode: 'HTML',
  });
  if (!j.ok) {
    console.error('Telegram sendMessage:', j);
    return null;
  }
  return j.result?.message_id ?? null;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Извлечь сумму в тенге из текста (чек или ответ пользователя). */
function parseAmountFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const t = text.trim();
  const strict = t.match(/^(\d{2,7})\s*(₸|тг|тенге|tg|Tenge|KZT)?\s*$/i);
  if (strict) return parseInt(strict[1], 10);
  const onlyDigits = t.match(/^(\d{2,7})$/);
  if (onlyDigits) return parseInt(onlyDigits[1], 10);
  const inner = t.match(/(\d{2,7})\s*(₸|тг)?/i);
  if (inner) return parseInt(inner[1], 10);
  return null;
}

function findPendingOrderByChat(chatId) {
  for (const o of orders.values()) {
    if (o.telegramChatId === chatId && o.status === 'pending') return o;
  }
  return null;
}

async function notifyAdminPayment(order) {
  if (!ADMIN_CHAT || !BOT) return;
  const text =
    `✅ <b>Оплата подтверждена</b>\n` +
    `Заказ: <code>${order.id}</code>\n` +
    `Сумма: ${order.amount} ₸\n` +
    `Телефон: <code>${escapeHtml(order.phone)}</code>\n` +
    `Бронь: <code>${order.bookingId}</code>`;
  await tg('sendMessage', { chat_id: ADMIN_CHAT, text, parse_mode: 'HTML' });
}

async function sendOrderPaymentMessage(chatId, order) {
  const link = KASPI_PAY_LINK;
  const msg =
    `💳 <b>Заказ ${order.id.slice(0, 8)}…</b>\n\n` +
    `Сумма к оплате: <b>${order.amount.toLocaleString('ru-RU')} ₸</b>\n` +
    `Занятие: ${escapeHtml(order.classTitle || '')}\n\n` +
    `🔗 Оплата Kaspi:\n<a href="${escapeHtml(link)}">${escapeHtml(link)}</a>\n\n` +
    `После оплаты пришлите <b>фото чека</b> и затем <b>сумму одним числом</b> (например <code>4500</code>) — так мы сверим платёж.\n` +
    `Или в одном сообщении: только число суммы после оплаты в Kaspi.`;
  await sendUserMessage(chatId, msg);
}

async function handlePrivateBotMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const isStart = /^\/start(?:@\S+)?/i.test(text.trim());

  if (isStart) {
    const payload = extractStartPayload(text);
    if (payload.startsWith('order_')) {
      const orderId = payload.slice('order_'.length);
      const order = orders.get(orderId);
      if (!order) {
        await sendUserMessage(chatId, 'Заказ не найден или устарел.');
        return;
      }
      order.telegramChatId = chatId;
      order.status = 'pending';
      saveOrdersToDisk();
      await sendOrderPaymentMessage(chatId, order);
      return;
    }
    await sendUserMessage(
      chatId,
      'Откройте ссылку из приложения после нажатия «Оплатить», чтобы оплатить занятие.',
    );
    return;
  }

  const order = findPendingOrderByChat(chatId);
  if (!order) {
    await sendUserMessage(
      chatId,
      'Нет активного заказа. Оформите бронь в приложении и нажмите «Оплатить».',
    );
    return;
  }

  if (msg.photo && msg.photo.length) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    order.receiptFileId = fileId;
    order.receiptReceivedAt = new Date().toISOString();
    saveOrdersToDisk();
    const cap = msg.caption || '';
    const fromCaption = parseAmountFromText(cap);
    if (fromCaption != null && fromCaption === order.amount) {
      order.status = 'paid';
      order.paidAt = new Date().toISOString();
      saveOrdersToDisk();
      await sendUserMessage(chatId, '✅ Чек и сумма совпадают. Оплата подтверждена!');
      await notifyAdminPayment(order);
      return;
    }
    await sendUserMessage(
      chatId,
      'Чек получили. Отправьте <b>сумму одним числом</b> (например 4500) — как в Kaspi.',
    );
    return;
  }

  const amt = parseAmountFromText(text);
  if (amt == null) {
    await sendUserMessage(
      chatId,
      'Нужна сумма в тенге одним числом (например: 4500) или пришлите фото чека.',
    );
    return;
  }

  if (amt !== order.amount) {
    await sendUserMessage(
      chatId,
      `Сумма не совпадает. Ожидается <b>${order.amount.toLocaleString('ru-RU')} ₸</b>, вы указали ${amt.toLocaleString('ru-RU')} ₸.`,
    );
    return;
  }

  order.status = 'paid';
  order.paidAt = new Date().toISOString();
  saveOrdersToDisk();
  await sendUserMessage(chatId, '✅ Оплата подтверждена. Спасибо!');
  await notifyAdminPayment(order);
}

async function handleTelegramUpdate(u) {
  const msg = u.message;
  if (!msg) return;

  /**
   * Ответы поддержки: только ответ (reply) на сообщение бота с заявкой.
   * Обычные сообщения того же chat_id (в т.ч. /start order_… у админа) не глотаем —
   * иначе при TELEGRAM_ADMIN_CHAT_ID = вашему аккаунту оплата в боте «молчала».
   */
  const isAdminChat =
    ADMIN_CHAT && String(msg.chat.id) === String(ADMIN_CHAT) && msg.chat.type === 'private';
  const replyToId = msg.reply_to_message?.message_id;
  if (isAdminChat && msg.text && replyToId) {
    const phone = telegramMessageToPhone.get(replyToId);
    if (phone) {
      const list = supportReplies.get(phone) || [];
      list.push({
        id: `tg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text: msg.text,
        at: new Date().toISOString(),
        from: 'support',
      });
      supportReplies.set(phone, list);
      return;
    }
  }

  if (msg.chat.type === 'private') {
    await handlePrivateBotMessage(msg);
  }
}

async function telegramLongPollLoop() {
  if (!BOT) {
    console.warn('[telegram-support] Нет TELEGRAM_BOT_TOKEN.');
    return;
  }
  let offset = 0;
  console.log('[telegram-support] Long polling Telegram…');
  for (;;) {
    try {
      const url = `https://api.telegram.org/bot${BOT}/getUpdates?offset=${offset}&timeout=30`;
      const r = await fetch(url);
      const j = await r.json();
      if (!j.ok) {
        console.error('getUpdates:', j);
        await delay(3000);
        continue;
      }
      for (const u of j.result || []) {
        offset = u.update_id + 1;
        try {
          await handleTelegramUpdate(u);
        } catch (e) {
          console.error('[telegram-support] handleTelegramUpdate', e);
        }
      }
    } catch (e) {
      console.error(e);
      await delay(3000);
    }
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function configureTelegramMode() {
  if (!BOT) return;
  if (WEBHOOK_BASE) {
    const webhookUrl = `${WEBHOOK_BASE}/telegram/webhook`;
    const body = {
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query', 'edited_message'],
      drop_pending_updates: false,
    };
    if (WEBHOOK_SECRET) body.secret_token = WEBHOOK_SECRET;
    const j = await tg('setWebhook', body);
    if (!j.ok) {
      console.error('[telegram-support] setWebhook failed:', j);
    } else {
      console.log('[telegram-support] Webhook active (Render/sleep-safe):', webhookUrl);
    }
  } else {
    await ensureLongPollingMode();
    telegramLongPollLoop();
  }
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const u = new URL(req.url || '/', `http://${req.headers.host}`);

  /** Входящие апдейты от Telegram (режим webhook). */
  if (u.pathname === '/telegram/webhook' && req.method === 'POST') {
    if (WEBHOOK_SECRET) {
      const got = req.headers['x-telegram-bot-api-secret-token'];
      if (got !== WEBHOOK_SECRET) {
        res.writeHead(403);
        res.end();
        return;
      }
    }
    let raw;
    try {
      raw = await readBody(req);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    let update;
    try {
      update = JSON.parse(raw);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('OK');
    void Promise.resolve(handleTelegramUpdate(update)).catch((e) =>
      console.error('[telegram-support] webhook update', e),
    );
    return;
  }

  /** Каталог занятий (карточки) — общий для всех устройств; GET без секрета, PUT с секретом. */
  if (u.pathname === '/api/yoga-classes' && req.method === 'GET') {
    const { classes, empty } = readYogaClassesPayload();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, classes, empty }));
    return;
  }

  if (u.pathname === '/api/yoga-classes' && req.method === 'PUT') {
    if (!checkSecret(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
      return;
    }
    let data;
    try {
      data = JSON.parse(await readBody(req));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'json' }));
      return;
    }
    const classes = data.classes;
    if (!Array.isArray(classes)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'classes must be array' }));
      return;
    }
    try {
      writeYogaClassesFile(classes);
    } catch (e) {
      console.error('[yoga-classes] write', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'write_failed' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (u.pathname === '/api/orders' && req.method === 'POST') {
    if (!checkSecret(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
      return;
    }
    let data;
    try {
      data = JSON.parse(await readBody(req));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'json' }));
      return;
    }
    const phone = String(data.phone || '').trim();
    const amount = Number(data.amount);
    const bookingId = String(data.bookingId || '').trim();
    const classId = String(data.classId || '').trim();
    const classTitle = String(data.classTitle || '').trim();
    if (!phone || !Number.isFinite(amount) || amount <= 0 || !bookingId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'phone/amount/bookingId' }));
      return;
    }
    if (!botUsername) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: false,
          error: 'TELEGRAM_BOT_USERNAME unavailable',
          hint: 'Set TELEGRAM_BOT_TOKEN and restart, or set TELEGRAM_BOT_USERNAME=YourBotName',
        }),
      );
      return;
    }
    const id = randomUUID();
    const order = {
      id,
      amount: Math.round(amount),
      phone,
      bookingId,
      classId,
      classTitle,
      status: 'pending',
      telegramChatId: null,
      receiptFileId: null,
      receiptReceivedAt: null,
      paidAt: null,
      createdAt: new Date().toISOString(),
    };
    orders.set(id, order);
    saveOrdersToDisk();
    const telegramDeepLink = `https://t.me/${botUsername}?start=order_${id}`;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        orderId: id,
        telegramDeepLink,
      }),
    );
    return;
  }

  const orderStatusMatch = u.pathname.match(/^\/api\/orders\/([^/]+)\/status$/);
  if (orderStatusMatch && req.method === 'GET') {
    const id = orderStatusMatch[1];
    const order = orders.get(id);
    if (!order) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'not_found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        status: order.status,
        amount: order.amount,
        paidAt: order.paidAt,
      }),
    );
    return;
  }

  if (u.pathname === '/api/support/send' && req.method === 'POST') {
    if (!checkSecret(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
      return;
    }
    let data;
    try {
      data = JSON.parse(await readBody(req));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'json' }));
      return;
    }
    const phone = data.phone;
    const text = String(data.text || '').trim();
    if (!phone || !text) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'phone/text' }));
      return;
    }
    if (!BOT || !ADMIN_CHAT) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'telegram_not_configured' }));
      return;
    }
    const mid = await sendToAdmin(phone, text);
    if (mid != null) telegramMessageToPhone.set(mid, phone);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, telegramMessageId: mid }));
    return;
  }

  if (u.pathname === '/api/support/poll' && req.method === 'GET') {
    if (!checkSecret(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
      return;
    }
    const phone = u.searchParams.get('phone');
    const since = u.searchParams.get('since') || '';
    if (!phone) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'phone' }));
      return;
    }
    const list = supportReplies.get(phone) || [];
    const parsed = since ? Date.parse(since) : 0;
    const sinceMs = Number.isFinite(parsed) ? parsed : 0;
    const messages = list.filter((m) => Date.parse(m.at) > sinceMs);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, messages }));
    return;
  }

  if (u.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        telegram: Boolean(BOT && ADMIN_CHAT),
        orders: orders.size,
        botUsername: botUsername || null,
        /** Если при последнем старте был webhook — он был сброшен; иначе null */
        hadWebhookBeforeReset: webhookUrlBeforeDelete || null,
        telegramMode: WEBHOOK_BASE ? 'webhook' : 'long_poll',
        webhookBase: WEBHOOK_BASE || null,
      }),
    );
    return;
  }

  res.writeHead(404);
  res.end();
});

async function main() {
  loadOrdersFromDisk();
  await ensureBotUsername();
  if (!botUsername && BOT) {
    console.warn(
      '[telegram-support] Не удалось получить username бота (getMe). Задайте TELEGRAM_BOT_USERNAME.',
    );
  }
  server.listen(PORT, async () => {
    console.log(`[telegram-support] http://127.0.0.1:${PORT}`);
    console.log('  GET  /api/yoga-classes');
    console.log('  PUT  /api/yoga-classes');
    console.log('  POST /api/orders');
    console.log('  GET  /api/orders/:id/status');
    console.log('  POST /api/support/send');
    console.log('  GET  /api/support/poll?phone=...&since=ISO');
    console.log('  POST /telegram/webhook  (если задан TELEGRAM_WEBHOOK_BASE_URL или RENDER_EXTERNAL_URL)');
    await configureTelegramMode();
    if (WEBHOOK_BASE) {
      console.log('[telegram-support] Long polling отключён — используется webhook.');
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
