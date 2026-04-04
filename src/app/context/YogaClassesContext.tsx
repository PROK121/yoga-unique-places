import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_YOGA_CLASSES, type YogaClass } from '../data/classes';
import {
  fetchYogaClassesFromServer,
  isYogaClassesSyncConfigured,
  pushYogaClassesToServer,
} from '../lib/yogaClassesSync';

const STORAGE_KEY = 'yoga_unique_classes_v1';

function loadFromStorage(): YogaClass[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_YOGA_CLASSES];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_YOGA_CLASSES];
    return parsed as YogaClass[];
  } catch {
    return [...DEFAULT_YOGA_CLASSES];
  }
}

function saveToStorage(list: YogaClass[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('yoga-classes-storage'));
  }
}

type YogaClassesContextValue = {
  classes: YogaClass[];
  setClasses: (list: YogaClass[]) => void;
  updateClass: (id: string, patch: Partial<YogaClass>) => void;
  replaceClass: (row: YogaClass) => void;
  addClass: (item: YogaClass) => void;
  deleteClass: (id: string) => void;
  resetToDefaults: () => void;
};

const YogaClassesContext = createContext<YogaClassesContextValue | null>(null);

export function YogaClassesProvider({ children }: { children: ReactNode }) {
  const [classes, setClassesState] = useState<YogaClass[]>(() =>
    typeof window !== 'undefined' ? loadFromStorage() : [...DEFAULT_YOGA_CLASSES],
  );
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePushToServer = useCallback((list: YogaClass[]) => {
    if (!isYogaClassesSyncConfigured()) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null;
      void pushYogaClassesToServer(list);
    }, 900);
  }, []);

  const persist = useCallback(
    (list: YogaClass[]) => {
      saveToStorage(list);
      schedulePushToServer(list);
    },
    [schedulePushToServer],
  );

  /** Один каталог для всех: при старте подтянуть с API, если задан VITE_SUPPORT_API_URL */
  useEffect(() => {
    void (async () => {
      const result = await fetchYogaClassesFromServer();
      if (!result) return;
      const { classes: remote, empty } = result;
      if (empty && remote.length === 0) return;
      setClassesState(remote);
      saveToStorage(remote);
    })();
  }, []);

  /** Другая вкладка или расширение записали localStorage — подтягиваем в React */
  useEffect(() => {
    const sync = () => {
      setClassesState(loadFromStorage());
    };
    window.addEventListener('storage', sync);
    window.addEventListener('yoga-classes-storage', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('yoga-classes-storage', sync);
    };
  }, []);

  const setClasses = useCallback((list: YogaClass[]) => {
    setClassesState(list);
    persist(list);
  }, [persist]);

  const updateClass = useCallback(
    (id: string, patch: Partial<YogaClass>) => {
      setClassesState((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const replaceClass = useCallback((row: YogaClass) => {
    const copy = { ...row, coordinates: { ...row.coordinates } };
    setClassesState((prev) => {
      const idx = prev.findIndex((c) => c.id === copy.id);
      let next: YogaClass[];
      if (idx === -1) {
        next = [copy, ...prev];
      } else {
        next = prev.map((c) => (c.id === copy.id ? copy : c));
      }
      persist(next);
      return next;
    });
  }, [persist]);

  const addClass = useCallback((item: YogaClass) => {
    setClassesState((prev) => {
      const next = [item, ...prev];
      persist(next);
      return next;
    });
  }, [persist]);

  const deleteClass = useCallback((id: string) => {
    setClassesState((prev) => {
      const next = prev.filter((c) => c.id !== id);
      persist(next);
      return next;
    });
  }, [persist]);

  const resetToDefaults = useCallback(() => {
    const next = [...DEFAULT_YOGA_CLASSES];
    setClassesState(next);
    persist(next);
  }, [persist]);

  const value = useMemo(
    () => ({
      classes,
      setClasses,
      updateClass,
      replaceClass,
      addClass,
      deleteClass,
      resetToDefaults,
    }),
    [classes, setClasses, updateClass, replaceClass, addClass, deleteClass, resetToDefaults],
  );

  return (
    <YogaClassesContext.Provider value={value}>{children}</YogaClassesContext.Provider>
  );
}

export function useYogaClasses() {
  const ctx = useContext(YogaClassesContext);
  if (!ctx) throw new Error('useYogaClasses must be used within YogaClassesProvider');
  return ctx;
}
