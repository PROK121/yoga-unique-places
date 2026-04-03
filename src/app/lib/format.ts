/** Формат суммы в тенге (KZT) для интерфейса. */
export function formatKzt(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} ₸`;
}

/** Короткая подпись для узких элементов (например, маркер на карте). */
export function formatKztCompact(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000;
    const s = Number.isInteger(k) ? String(k) : k.toFixed(1).replace(/\.0$/, '');
    return `${s}k ₸`;
  }
  return `${amount} ₸`;
}
