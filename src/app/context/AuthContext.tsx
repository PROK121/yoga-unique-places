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
import { normalizeRuPhone } from '../lib/phone';

const STORAGE_KEY = 'yoga_unique_phone_auth';

export type AuthUser = {
  phoneE164: string;
  registeredAt: string;
};

type PendingOtp = {
  phoneE164: string;
  code: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  /** Отправить SMS (демо: код генерируется и возвращается для ввода без бэкенда) */
  sendOtp: (rawPhone: string) => { ok: boolean; error?: string; demoCode?: string };
  verifyOtp: (rawPhone: string, code: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AuthUser;
    if (data?.phoneE164 && data?.registeredAt) return data;
  } catch {
    /* ignore */
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const pendingRef = useRef<PendingOtp | null>(null);

  useEffect(() => {
    setUser(loadUser());
    setReady(true);
  }, []);

  const sendOtp = useCallback((rawPhone: string) => {
    const phoneE164 = normalizeRuPhone(rawPhone);
    if (!phoneE164) {
      return { ok: false, error: 'Введите корректный номер РФ (+7)' };
    }
    const code = String(100000 + Math.floor(Math.random() * 900000));
    pendingRef.current = { phoneE164, code };
    return { ok: true, demoCode: code };
  }, []);

  const verifyOtp = useCallback((rawPhone: string, code: string) => {
    const phoneE164 = normalizeRuPhone(rawPhone);
    if (!phoneE164) return false;
    const pending = pendingRef.current;
    if (!pending || pending.phoneE164 !== phoneE164) return false;
    const trimmed = code.replace(/\D/g, '');
    if (trimmed.length !== 6 || trimmed !== pending.code) return false;
    const next: AuthUser = {
      phoneE164,
      registeredAt: new Date().toISOString(),
    };
    setUser(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    pendingRef.current = null;
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    pendingRef.current = null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      sendOtp,
      verifyOtp,
      logout,
    }),
    [user, ready, sendOtp, verifyOtp, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
