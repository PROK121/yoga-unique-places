/** Нормализация российского номера в E.164 (+7XXXXXXXXXX) */
export function normalizeRuPhone(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('8') && d.length === 11) d = '7' + d.slice(1);
  if (d.length === 10 && d[0] === '9') d = '7' + d;
  if (d.length === 11 && d[0] === '7') return `+${d}`;
  return null;
}

/** Красивое отображение: +7 (999) 123-45-67 */
export function formatPhoneDisplay(e164: string): string {
  const d = e164.replace(/\D/g, '').slice(-10);
  if (d.length !== 10) return e164;
  return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}`;
}

/** Маска для шапки: +7 ••• ••• 12 34 */
export function maskPhoneE164(e164: string): string {
  const d = e164.replace(/\D/g, '');
  if (d.length < 4) return e164;
  const last = d.slice(-4);
  return `+7 ••• ••• ${last.slice(0, 2)} ${last.slice(2)}`;
}
