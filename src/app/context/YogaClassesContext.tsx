import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_YOGA_CLASSES, type YogaClass } from '../data/classes';

const STORAGE_KEY = 'yoga_unique_classes_v1';

function loadFromStorage(): YogaClass[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_YOGA_CLASSES];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return [...DEFAULT_YOGA_CLASSES];
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
    saveToStorage(list);
  }, []);

  const updateClass = useCallback(
    (id: string, patch: Partial<YogaClass>) => {
      setClassesState((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
        saveToStorage(next);
        return next;
      });
    },
    [],
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
      saveToStorage(next);
      return next;
    });
  }, []);

  const addClass = useCallback((item: YogaClass) => {
    setClassesState((prev) => {
      const next = [item, ...prev];
      saveToStorage(next);
      return next;
    });
  }, []);

  const deleteClass = useCallback((id: string) => {
    setClassesState((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    const next = [...DEFAULT_YOGA_CLASSES];
    setClassesState(next);
    saveToStorage(next);
  }, []);

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
