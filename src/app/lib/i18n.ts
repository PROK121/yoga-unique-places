import type { YogaClass } from '../data/classes';

export const LEVEL_LABEL_RU: Record<YogaClass['level'], string> = {
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};

export function levelLabel(level: YogaClass['level']): string {
  return LEVEL_LABEL_RU[level];
}

export function levelFilterLabel(key: 'all' | YogaClass['level']): string {
  if (key === 'all') return 'Все';
  return LEVEL_LABEL_RU[key];
}

/** «1 занятие», «2 занятия», «5 занятий» */
export function pluralBookings(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} занятий`;
  if (mod10 === 1) return `${n} занятие`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} занятия`;
  return `${n} занятий`;
}
