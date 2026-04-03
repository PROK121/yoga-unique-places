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
 * Телефоны и планшеты: после `fetch` надёжнее не дергать `location.assign`, а показать
 * пользователю настоящую ссылку `<a href>` (см. экран «Мои брони»).
 */
export function prefersManualTelegramLink(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  const narrow =
    typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches;
  return coarse || (touch && narrow);
}

/**
 * Открыть Telegram после async (создание заказа). На десктопе — переход по https://t.me/…
 * (не window.open — его режут после await).
 */
export function openTelegramForPayment(telegramDeepLink: string) {
  window.location.assign(telegramDeepLink);
}
