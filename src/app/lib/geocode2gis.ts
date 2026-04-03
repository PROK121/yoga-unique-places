/** Обратное геокодирование 2GIS Catalog API (тот же ключ, что и для MapGL). */

/**
 * Ключ MapGL / Catalog API. В Vite в клиент попадают только переменные с префиксом `VITE_`.
 * Поддерживаются запасные имена — если в .env указали другое имя.
 */
export function get2gisApiKey(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const raw =
    env.VITE_2GIS_API_KEY || env.VITE_MAPGL_KEY || env.VITE_2GIS_KEY || env.VITE_DGIS_API_KEY;
  return raw?.trim() ?? '';
}

function pickAddressFromItem(item: Record<string, unknown>): string | null {
  const fa = item.full_address_name;
  if (typeof fa === 'string' && fa.trim()) return fa.trim();

  const fn = item.full_name;
  if (typeof fn === 'string' && fn.trim()) return fn.trim();

  const an = item.address_name;
  if (typeof an === 'string' && an.trim()) return an.trim();

  const name = item.name;
  if (typeof name === 'string' && name.trim()) return name.trim();

  const addr = item.address;
  if (addr && typeof addr === 'object') {
    const a = addr as {
      building_name?: string;
      landmark_name?: string;
      components?: Array<{ street?: string; number?: string }>;
    };
    const parts: string[] = [];
    if (a.landmark_name) parts.push(a.landmark_name);
    if (a.building_name) parts.push(a.building_name);
    const c0 = a.components?.[0];
    if (c0?.street) {
      const line = [c0.street, c0.number].filter(Boolean).join(', ');
      if (line) parts.push(line);
    }
    if (parts.length) return parts.join(', ');
  }

  const adm = item.adm_div;
  if (Array.isArray(adm) && adm.length > 0) {
    const first = adm[0] as { name?: string };
    if (typeof first?.name === 'string' && first.name.trim()) return first.name.trim();
  }

  return null;
}

export async function reverseGeocode2gis(lat: number, lng: number): Promise<string | null> {
  const key = get2gisApiKey();
  if (!key) return null;

  const url = new URL('https://catalog.api.2gis.com/3.0/items/geocode');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  /** См. документацию: поля `items.full_name` / `items.address_name` в `fields` не задаются — нужны `full_address_name`, `address`. */
  url.searchParams.set(
    'fields',
    'items.full_address_name,items.address,items.adm_div,items.full_name,items.address_name,items.name',
  );
  url.searchParams.set('key', key);
  url.searchParams.set('locale', 'ru_KZ');

  try {
    const r = await fetch(url.toString());
    if (!r.ok) return null;
    const data = (await r.json()) as {
      meta?: { code?: number; error?: { message?: string } };
      result?: { total?: number; items?: Array<Record<string, unknown>> };
    };
    const code = data.meta?.code;
    if (code !== undefined && code !== 200) return null;
    const item = data?.result?.items?.[0];
    if (!item) return null;
    return pickAddressFromItem(item);
  } catch {
    return null;
  }
}

/** Добавляет блок с адресом в конец описания (без дубликата). */
export function appendLocationToDescription(description: string, address: string): string {
  const line = `📍 Место: ${address}`;
  if (description.includes(address)) return description;
  const base = description.trimEnd();
  return base ? `${base}\n\n${line}` : line;
}
