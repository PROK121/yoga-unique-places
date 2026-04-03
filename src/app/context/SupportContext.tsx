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
import { useAuth } from './AuthContext';

export type SupportMessage = {
  id: string;
  text: string;
  at: string;
  from: 'user' | 'support';
};

type SupportContextValue = {
  messages: SupportMessage[];
  sendMessage: (text: string) => Promise<void>;
  /** Сервер поддержки доступен (последняя проверка) */
  serverReachable: boolean | null;
};

const SupportContext = createContext<SupportContextValue | null>(null);

function storageKey(phone: string) {
  return `yoga_support_chat_${phone}`;
}

function loadLocal(phone: string): SupportMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(phone));
    if (!raw) return [];
    const data = JSON.parse(raw) as SupportMessage[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveLocal(phone: string, messages: SupportMessage[]) {
  localStorage.setItem(storageKey(phone), JSON.stringify(messages));
}

function apiBase(): string {
  const v = import.meta.env.VITE_SUPPORT_API_URL as string | undefined;
  return (v ?? '').replace(/\/$/, '');
}

function isSupportBackendConfigured(): boolean {
  return Boolean(apiBase());
}

function apiSecret(): string {
  return (import.meta.env.VITE_SUPPORT_API_SECRET as string | undefined) ?? '';
}

/** Путь API: с базой или относительный (dev + proxy Vite). */
function supportUrl(path: string): string {
  const base = apiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}

async function fetchSend(phone: string, text: string, clientMessageId: string) {
  const url = supportUrl('/api/support/send');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const s = apiSecret();
  if (s) headers['X-Support-Secret'] = s;
  const r = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ phone, text, clientMessageId }),
  });
  return r.ok;
}

async function fetchPoll(phone: string, since: string): Promise<SupportMessage[]> {
  const q = new URLSearchParams({ phone, since });
  const url = `${supportUrl('/api/support/poll')}?${q.toString()}`;
  const headers: Record<string, string> = {};
  const s = apiSecret();
  if (s) headers['X-Support-Secret'] = s;
  const r = await fetch(url, { headers });
  if (!r.ok) return [];
  const j = (await r.json()) as { ok?: boolean; messages?: SupportMessage[] };
  if (!j.ok || !Array.isArray(j.messages)) return [];
  return j.messages.filter((m) => m.from === 'support');
}

function maxSupportAt(messages: SupportMessage[]): string {
  const sup = messages.filter((m) => m.from === 'support');
  if (sup.length === 0) return new Date(0).toISOString();
  return sup.reduce((a, b) => (a.at > b.at ? a : b)).at;
}

export function SupportProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);
  const lastPollAt = useRef<string>(new Date(0).toISOString());

  useEffect(() => {
    if (!user) {
      setMessages([]);
      return;
    }
    const local = loadLocal(user.phoneE164);
    setMessages(local);
    lastPollAt.current = maxSupportAt(local);
  }, [user?.phoneE164]);

  const mergeIncoming = useCallback(
    (incoming: SupportMessage[]) => {
      if (!user || incoming.length === 0) return;
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        for (const m of incoming) {
          if (!ids.has(m.id)) {
            merged.push(m);
            ids.add(m.id);
          }
        }
        merged.sort((a, b) => a.at.localeCompare(b.at));
        saveLocal(user.phoneE164, merged);
        return merged;
      });
    },
    [user],
  );

  const poll = useCallback(async () => {
    if (!user) return;
    if (!isSupportBackendConfigured()) {
      setServerReachable(null);
      return;
    }
    try {
      const since = lastPollAt.current;
      const incoming = await fetchPoll(user.phoneE164, since);
      setServerReachable(true);
      if (incoming.length > 0) {
        const latest = incoming.reduce((a, b) => (a.at > b.at ? a : b));
        lastPollAt.current = latest.at;
        mergeIncoming(incoming);
      }
    } catch {
      setServerReachable(false);
    }
  }, [user, mergeIncoming]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      void poll();
    }, 5000);
    void poll();
    return () => window.clearInterval(id);
  }, [user, poll]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !user) return;
      const msg: SupportMessage = {
        id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text: trimmed,
        at: new Date().toISOString(),
        from: 'user',
      };
      setMessages((prev) => {
        const next = [...prev, msg];
        saveLocal(user.phoneE164, next);
        return next;
      });

      if (!isSupportBackendConfigured()) {
        setServerReachable(null);
        return;
      }
      try {
        const ok = await fetchSend(user.phoneE164, trimmed, msg.id);
        setServerReachable(ok);
      } catch {
        setServerReachable(false);
      }
    },
    [user],
  );

  const value = useMemo<SupportContextValue>(
    () => ({
      messages,
      sendMessage,
      serverReachable,
    }),
    [messages, sendMessage, serverReachable],
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport() {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupport must be used within SupportProvider');
  return ctx;
}
