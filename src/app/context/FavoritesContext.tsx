import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { useYogaClasses } from './YogaClassesContext';
import type { YogaClass } from '../data/classes';

const SYNC_EVENT = 'yoga-favorites-storage';

function keyForUser(userId: string) {
  return `yoga_unique_favorites_${userId}`;
}

function loadIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(keyForUser(userId));
    if (!raw) return [];
    const data = JSON.parse(raw) as string[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveIds(userId: string, ids: string[]) {
  localStorage.setItem(keyForUser(userId), JSON.stringify(ids));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SYNC_EVENT));
  }
}

type FavoritesContextValue = {
  favoriteIds: ReadonlySet<string>;
  favoriteClasses: YogaClass[];
  isFavorite: (classId: string) => boolean;
  toggleFavorite: (classId: string) => void;
  removeFavorite: (classId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { classes } = useYogaClasses();
  const userId = user?.phoneE164 ?? 'guest';

  const [ids, setIds] = useState<string[]>(() => loadIds(userId));

  const sync = useCallback(() => {
    setIds(loadIds(userId));
  }, [userId]);

  useEffect(() => {
    setIds(loadIds(userId));
  }, [userId]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === keyForUser(userId) || e.key === null) sync();
    };
    const onCustom = () => sync();
    window.addEventListener('storage', onStorage);
    window.addEventListener(SYNC_EVENT, onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SYNC_EVENT, onCustom);
    };
  }, [userId, sync]);

  /** После входа переносим гостевое избранное в аккаунт (без дубликатов). */
  useEffect(() => {
    if (!user) return;
    const guest = loadIds('guest');
    if (guest.length === 0) return;
    const merged = new Set(loadIds(user.phoneE164));
    let changed = false;
    for (const id of guest) {
      if (!merged.has(id)) {
        merged.add(id);
        changed = true;
      }
    }
    if (changed) {
      saveIds(user.phoneE164, [...merged]);
      localStorage.removeItem(keyForUser('guest'));
      setIds(loadIds(user.phoneE164));
    }
  }, [user]);

  const favoriteIds = useMemo(() => new Set(ids), [ids]);

  const favoriteClasses = useMemo(() => {
    const set = favoriteIds;
    return classes.filter((c) => set.has(c.id));
  }, [classes, favoriteIds]);

  const persist = useCallback(
    (next: string[]) => {
      saveIds(userId, next);
      setIds(next);
    },
    [userId],
  );

  const toggleFavorite = useCallback(
    (classId: string) => {
      const cur = loadIds(userId);
      const s = new Set(cur);
      if (s.has(classId)) s.delete(classId);
      else s.add(classId);
      persist([...s]);
    },
    [userId, persist],
  );

  const removeFavorite = useCallback(
    (classId: string) => {
      const cur = loadIds(userId);
      persist(cur.filter((id) => id !== classId));
    },
    [userId, persist],
  );

  const isFavorite = useCallback(
    (classId: string) => favoriteIds.has(classId),
    [favoriteIds],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds,
      favoriteClasses,
      isFavorite,
      toggleFavorite,
      removeFavorite,
    }),
    [favoriteIds, favoriteClasses, isFavorite, toggleFavorite, removeFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
