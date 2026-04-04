import type { YogaClass } from '../data/classes';

function apiBase(): string {
  return (import.meta.env.VITE_SUPPORT_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const s = (import.meta.env.VITE_SUPPORT_API_SECRET as string | undefined) ?? '';
  if (s) h['X-Support-Secret'] = s;
  return h;
}

export function isYogaClassesSyncConfigured(): boolean {
  return Boolean(apiBase());
}

/** Подтянуть каталог с сервера (один источник для всех устройств). */
export async function fetchYogaClassesFromServer(): Promise<{
  classes: YogaClass[];
  empty: boolean;
} | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const r = await fetch(`${base}/api/yoga-classes`);
    if (!r.ok) return null;
    const j = (await r.json()) as {
      ok?: boolean;
      classes?: unknown;
      empty?: boolean;
    };
    if (!j.ok || !Array.isArray(j.classes)) return null;
    return {
      classes: j.classes as YogaClass[],
      empty: Boolean(j.empty),
    };
  } catch {
    return null;
  }
}

/** Сохранить каталог на сервер (после правок в админке). */
export async function pushYogaClassesToServer(classes: YogaClass[]): Promise<boolean> {
  const base = apiBase();
  if (!base) return false;
  try {
    const r = await fetch(`${base}/api/yoga-classes`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ classes }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
