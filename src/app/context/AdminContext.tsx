import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const SESSION_KEY = 'yoga_unique_admin';

const getPassword = () =>
  (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined)?.trim() || 'yoga-admin';

type AdminContextValue = {
  isAdmin: boolean;
  login: (password: string) => boolean;
  logout: () => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1',
  );

  const login = useCallback((password: string) => {
    if (password === getPassword()) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setIsAdmin(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAdmin(false);
  }, []);

  const value = useMemo(
    () => ({ isAdmin, login, logout }),
    [isAdmin, login, logout],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
