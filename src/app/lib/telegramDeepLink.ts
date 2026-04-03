const STORAGE_KEY = 'yoga_telegram_pay';

export type PendingTelegramPay = { url: string; ts: number };

/** Сохраняем ссылку — если автопереход не сработал, покажем кнопку на экране броней. */
export function rememberPendingTelegramPay(url: string) {
  try {
    const payload: PendingTelegramPay = { url, ts: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readPendingTelegramPay(): PendingTelegramPay | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingTelegramPay;
    if (!p?.url || typeof p.url !== 'string') return null;
    if (Date.now() - (p.ts || 0) > 60 * 60 * 1000) {
      clearPendingTelegramPay();
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearPendingTelegramPay() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Открыть Telegram после async (создание заказа). Не используем window.open —
 * на телефонах его часто блокируют после await. Полный переход по https://t.me/…
 * открывает приложение Telegram.
 */
export function openTelegramForPayment(telegramDeepLink: string) {
  window.location.assign(telegramDeepLink);
}
