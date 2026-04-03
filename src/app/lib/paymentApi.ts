/** Тот же backend, что и поддержка: POST /api/orders, GET /api/orders/:id/status */

function apiBase(): string {
  const v = import.meta.env.VITE_SUPPORT_API_URL as string | undefined;
  return (v ?? '').replace(/\/$/, '');
}

function apiSecret(): string {
  return (import.meta.env.VITE_SUPPORT_API_SECRET as string | undefined) ?? '';
}

export function isPaymentApiConfigured(): boolean {
  return Boolean(apiBase());
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const s = apiSecret();
  if (s) h['X-Support-Secret'] = s;
  return h;
}

export type CreateOrderBody = {
  phone: string;
  amount: number;
  bookingId: string;
  classId: string;
  classTitle: string;
};

export type CreateOrderResult = {
  orderId: string;
  telegramDeepLink: string;
};

/** Таймаут запроса заказа (без него fetch на «плохом» адресе может висеть очень долго). */
const CREATE_ORDER_TIMEOUT_MS = 12_000;

export type CreateOrderResponse =
  | { ok: true; order: CreateOrderResult }
  | { ok: false; reason: 'http' | 'timeout' | 'network' | 'invalid' };

export async function createPaymentOrder(body: CreateOrderBody): Promise<CreateOrderResponse> {
  const base = apiBase();
  if (!base) return { ok: false, reason: 'invalid' };

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), CREATE_ORDER_TIMEOUT_MS);

  let r: Response;
  try {
    r = await fetch(`${base}/api/orders`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const name = e instanceof Error ? e.name : '';
    if (name === 'AbortError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'network' };
  }
  clearTimeout(timer);

  if (!r.ok) return { ok: false, reason: 'http' };

  let j: { ok?: boolean; orderId?: string; telegramDeepLink?: string };
  try {
    j = (await r.json()) as { ok?: boolean; orderId?: string; telegramDeepLink?: string };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (!j.ok || !j.orderId || !j.telegramDeepLink) return { ok: false, reason: 'invalid' };
  return {
    ok: true,
    order: { orderId: j.orderId, telegramDeepLink: j.telegramDeepLink },
  };
}

export type OrderStatusResult = {
  status: string;
  amount?: number;
  paidAt?: string | null;
};

const STATUS_TIMEOUT_MS = 10_000;

export async function fetchOrderStatus(orderId: string): Promise<OrderStatusResult | null> {
  const base = apiBase();
  if (!base) return null;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);
  let r: Response;
  try {
    r = await fetch(`${base}/api/orders/${encodeURIComponent(orderId)}/status`, {
      headers: apiSecret() ? { 'X-Support-Secret': apiSecret() } : {},
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    return null;
  }
  clearTimeout(timer);
  if (!r.ok) return null;
  const j = (await r.json()) as {
    ok?: boolean;
    status?: string;
    amount?: number;
    paidAt?: string | null;
  };
  if (!j.ok || !j.status) return null;
  return { status: j.status, amount: j.amount, paidAt: j.paidAt };
}
