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
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

const BROADCAST_KEY = 'yoga_unique_broadcasts_v1';
const SYNC_EVENT = 'yoga-broadcasts-updated';

export type BroadcastMessage = {
  id: string;
  title: string;
  body: string;
  sentAt: string;
};

type NotificationsContextValue = {
  broadcasts: BroadcastMessage[];
  permission: NotificationPermission | 'unsupported';
  requestBrowserPermission: () => Promise<NotificationPermission | 'unsupported'>;
  sendBroadcastToUsers: (title: string, body: string) => void;
  markBroadcastSeen: (id: string) => void;
  unseenBroadcastIds: string[];
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const EMPTY_IDS: string[] = [];

function loadBroadcasts(): BroadcastMessage[] {
  try {
    const raw = localStorage.getItem(BROADCAST_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as BroadcastMessage[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveBroadcasts(items: BroadcastMessage[]) {
  localStorage.setItem(BROADCAST_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(SYNC_EVENT));
}

function seenKey(phone: string) {
  return `yoga_unique_broadcast_seen_${phone}`;
}

function loadSeen(phone: string): string[] {
  try {
    const raw = localStorage.getItem(seenKey(phone));
    if (!raw) return [];
    const data = JSON.parse(raw) as string[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveSeen(phone: string, ids: string[]) {
  localStorage.setItem(seenKey(phone), JSON.stringify(ids));
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>(() => loadBroadcasts());
  const [seenRev, setSeenRev] = useState(0);
  const [permState, setPermState] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  );
  const deliveredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    deliveredRef.current = new Set();
  }, [user?.phoneE164]);

  const sync = useCallback(() => {
    setBroadcasts(loadBroadcasts());
    if (typeof Notification !== 'undefined') {
      setPermState(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === BROADCAST_KEY || e.key === null) sync();
    };
    const onCustom = () => sync();
    window.addEventListener('storage', onStorage);
    window.addEventListener(SYNC_EVENT, onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SYNC_EVENT, onCustom);
    };
  }, [sync]);

  /** Новый пользователь: не показываем архив рассылок как новые. */
  useEffect(() => {
    if (!user) return;
    const br = loadBroadcasts();
    const seen = loadSeen(user.phoneE164);
    if (seen.length === 0 && br.length > 0) {
      saveSeen(
        user.phoneE164,
        br.map((b) => b.id),
      );
      setSeenRev((x) => x + 1);
    }
  }, [user]);

  const unseenBroadcastIds = useMemo(() => {
    if (!user) return EMPTY_IDS;
    const seen = new Set(loadSeen(user.phoneE164));
    const ids = broadcasts.filter((b) => !seen.has(b.id)).map((b) => b.id);
    return ids.length === 0 ? EMPTY_IDS : ids;
  }, [user, broadcasts, seenRev]);

  const unseenKey = unseenBroadcastIds.join('|');

  useEffect(() => {
    if (!user || unseenBroadcastIds.length === 0) return;

    const phone = user.phoneE164;
    const seen = loadSeen(phone);
    const toShow = broadcasts.filter((b) => unseenBroadcastIds.includes(b.id));

    for (const b of toShow) {
      if (deliveredRef.current.has(b.id)) continue;
      deliveredRef.current.add(b.id);
      toast.info(b.title, { description: b.body, duration: 8000 });
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(b.title, { body: b.body });
        } catch {
          /* ignore */
        }
      }
      seen.push(b.id);
    }
    saveSeen(phone, [...new Set(seen)]);
    setSeenRev((x) => x + 1);
  }, [user, broadcasts, unseenKey]);

  const requestBrowserPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      setPermState('unsupported');
      return 'unsupported';
    }
    const r = await Notification.requestPermission();
    setPermState(r);
    return r;
  }, []);

  const sendBroadcastToUsers = useCallback((title: string, body: string) => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle) return;
    const id = `bc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const next: BroadcastMessage = {
      id,
      title: trimmedTitle,
      body: trimmedBody,
      sentAt: new Date().toISOString(),
    };
    saveBroadcasts([next, ...loadBroadcasts()]);
    setBroadcasts(loadBroadcasts());
    toast.success('Рассылка отправлена', {
      description: 'Пользователи получат уведомление в приложении',
    });
  }, []);

  const markBroadcastSeen = useCallback(
    (id: string) => {
      if (!user) return;
      const phone = user.phoneE164;
      const seen = new Set(loadSeen(phone));
      seen.add(id);
      saveSeen(phone, [...seen]);
      setSeenRev((x) => x + 1);
    },
    [user],
  );

  const permission = permState;

  const value = useMemo<NotificationsContextValue>(
    () => ({
      broadcasts,
      permission,
      requestBrowserPermission,
      sendBroadcastToUsers,
      markBroadcastSeen,
      unseenBroadcastIds,
    }),
    [
      broadcasts,
      permission,
      requestBrowserPermission,
      sendBroadcastToUsers,
      markBroadcastSeen,
      unseenBroadcastIds,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
