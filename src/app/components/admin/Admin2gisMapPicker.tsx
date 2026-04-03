import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { get2gisApiKey } from '../../lib/geocode2gis';
import { Button } from '../ui/button';

type Props = {
  /** Смена карточки — пересоздать карту с новым центром */
  formKey: string;
  lat: number;
  lng: number;
  onCoordinatesChange: (lat: number, lng: number) => void;
};

type MapInstance = {
  map: { destroy: () => void; setCenter: (c: number[]) => void; invalidateSize: () => void };
  marker: { setCoordinates: (c: number[]) => void };
};

/** Карта 2GIS (MapGL): клик — ставит маркер и координаты. Нужен `VITE_2GIS_API_KEY`. */
export function Admin2gisMapPicker({ formKey, lat, lng, onCoordinatesChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instRef = useRef<MapInstance | null>(null);
  const onPosRef = useRef(onCoordinatesChange);
  onPosRef.current = onCoordinatesChange;
  const coordsRef = useRef({ lat, lng });
  coordsRef.current = { lat, lng };

  const key = get2gisApiKey();

  useEffect(() => {
    if (!key || !containerRef.current) return;

    const el = containerRef.current;
    let cancelled = false;

    void (async () => {
      const { load } = await import('@2gis/mapgl');
      const mapgl = await load();
      if (cancelled || !el) return;

      const { lat: curLat, lng: curLng } = coordsRef.current;
      const center: [number, number] = [curLng, curLat];
      const map = new mapgl.Map(el, {
        center,
        zoom: 15,
        key,
      });

      const marker = new mapgl.Marker(map, {
        coordinates: center,
      });

      map.on('click', (e) => {
        const [clng, clat] = e.lngLat;
        marker.setCoordinates([clng, clat]);
        onPosRef.current(clat, clng);
      });

      instRef.current = { map, marker };
      window.setTimeout(() => map.invalidateSize(), 300);
    })();

    return () => {
      cancelled = true;
      instRef.current?.map.destroy();
      instRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- центр при смене formKey; lat/lng внутри замыкания
  }, [key, formKey]);

  useEffect(() => {
    const inst = instRef.current;
    if (!inst) return;
    const c: [number, number] = [lng, lat];
    inst.marker.setCoordinates(c);
    inst.map.setCenter(c);
  }, [lat, lng]);

  if (!key) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p className="font-medium">Карта 2GIS</p>
        <p className="mt-1 text-xs leading-relaxed space-y-2">
          <span className="block">
            Ключ не подхвачен приложением. Нужна переменная окружения{' '}
            <code className="rounded bg-amber-100 px-1">VITE_2GIS_API_KEY</code> (только с префиксом{' '}
            <code className="rounded bg-amber-100 px-1">VITE_</code>
            ), значение — из{' '}
            <a
              href="https://dev.2gis.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              dev.2gis.com
            </a>
            .
          </span>
          {import.meta.env.DEV ? (
            <span className="block text-amber-800">
              Локально: в <strong>корне проекта</strong> создайте или правьте{' '}
              <code className="rounded bg-amber-100 px-1">.env.local</code>, строка вида{' '}
              <code className="rounded bg-amber-100 px-1 break-all">
                VITE_2GIS_API_KEY=ваш_ключ
              </code>
              , затем <strong>остановите и снова запустите</strong> <code>npm run dev</code>.
            </span>
          ) : (
            <span className="block text-amber-800">
              На продакшене (Render и т.д.): добавьте <code className="rounded bg-amber-100 px-1">VITE_2GIS_API_KEY</code> в Environment и{' '}
              <strong>пересоберите</strong> проект — иначе ключ не попадёт в сборку.
            </span>
          )}
          <span className="block text-amber-800/90">
            Без ключа карта скрыта; координаты можно ввести вручную или через «Моё местоположение».
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
      />
      <p className="text-xs text-gray-500">Нажмите на карту, чтобы выбрать точку занятия.</p>
    </div>
  );
}

type GeoBtnProps = {
  onPosition: (lat: number, lng: number) => void;
  onError?: () => void;
};

/** Определение координат устройства (не требует ключа карты). */
export function AdminGeolocationButton({ onPosition, onError }: GeoBtnProps) {
  const run = () => {
    if (!navigator.geolocation) {
      onError?.();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPosition(pos.coords.latitude, pos.coords.longitude);
      },
      () => onError?.(),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  return (
    <Button type="button" variant="outline" className="w-full sm:w-auto gap-2" onClick={run}>
      <MapPin className="h-4 w-4" />
      Моё местоположение
    </Button>
  );
}
