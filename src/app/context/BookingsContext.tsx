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
import { fetchOrderStatus, isPaymentApiConfigured } from '../lib/paymentApi';

const STORAGE_KEY = 'yoga_unique_bookings_v1';
const SYNC_EVENT = 'yoga-bookings-storage';

export type BookingRecord = {
  id: string;
  userId: string;
  classId: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
  updatedAt?: string;
  /** UUID заказа на сервере оплаты (Telegram + Kaspi) */
  paymentOrderId?: string;
  paymentStatus?: 'pending' | 'paid';
};

type BookingsContextValue = {
  bookings: BookingRecord[];
  upcoming: BookingRecord[];
  past: BookingRecord[];
  cancelled: BookingRecord[];
  addBooking: (input: {
    classId: string;
    date: string;
    time: string;
    durationMinutes: number;
  }) => BookingRecord | null;
  cancelBooking: (id: string) => void;
  rescheduleBooking: (id: string, date: string, time: string) => void;
  getClassForBooking: (classId: string) => YogaClass | undefined;
  updateBookingPayment: (
    bookingId: string,
    patch: Partial<Pick<BookingRecord, 'paymentOrderId' | 'paymentStatus'>>,
  ) => void;
};

const BookingsContext = createContext<BookingsContextValue | null>(null);

function loadAll(): BookingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as BookingRecord[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveAll(rows: BookingRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SYNC_EVENT));
  }
}

function bookingEndMs(b: BookingRecord): number {
  const [y, mo, d] = b.date.split('-').map(Number);
  const [hh, mm] = b.time.split(':').map(Number);
  const start = new Date(y, mo - 1, d, hh, mm).getTime();
  return start + b.durationMinutes * 60 * 1000;
}

function migrateCompleted(rows: BookingRecord[]): BookingRecord[] {
  const now = Date.now();
  let changed = false;
  const next = rows.map((b) => {
    if (b.status !== 'confirmed') return b;
    if (bookingEndMs(b) < now) {
      changed = true;
      return { ...b, status: 'completed' as const, updatedAt: new Date().toISOString() };
    }
    return b;
  });
  return changed ? next : rows;
}

export function BookingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { classes } = useYogaClasses();
  const [bookings, setBookings] = useState<BookingRecord[]>(() => migrateCompleted(loadAll()));

  const sync = useCallback(() => {
    setBookings(migrateCompleted(loadAll()));
  }, []);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) sync();
    };
    const onCustom = () => sync();
    window.addEventListener('storage', onStorage);
    window.addEventListener(SYNC_EVENT, onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SYNC_EVENT, onCustom);
    };
  }, [sync]);

  useEffect(() => {
    const tick = () => {
      const raw = loadAll();
      const m = migrateCompleted(raw);
      if (JSON.stringify(m) !== JSON.stringify(raw)) {
        saveAll(m);
        setBookings(m);
      } else {
        setBookings(m);
      }
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const getClassForBooking = useCallback(
    (classId: string) => classes.find((c) => c.id === classId),
    [classes],
  );

  const userBookings = useMemo(() => {
    if (!user) return [];
    return bookings.filter((b) => b.userId === user.phoneE164);
  }, [bookings, user]);

  const { upcoming, past, cancelled } = useMemo(() => {
    const now = Date.now();
    const up: BookingRecord[] = [];
    const pa: BookingRecord[] = [];
    const ca: BookingRecord[] = [];
    for (const b of userBookings) {
      if (b.status === 'cancelled') {
        ca.push(b);
        continue;
      }
      if (b.status === 'completed') {
        pa.push(b);
        continue;
      }
      if (b.status === 'confirmed') {
        if (bookingEndMs(b) >= now) up.push(b);
        else pa.push(b);
      }
    }
    up.sort((a, b) => bookingEndMs(a) - bookingEndMs(b));
    pa.sort((a, b) => bookingEndMs(b) - bookingEndMs(a));
    ca.sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
    return { upcoming: up, past: pa, cancelled: ca };
  }, [userBookings]);

  const addBooking = useCallback(
    (input: {
      classId: string;
      date: string;
      time: string;
      durationMinutes: number;
    }): BookingRecord | null => {
      if (!user) return null;
      const id = `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const row: BookingRecord = {
        id,
        userId: user.phoneE164,
        classId: input.classId,
        date: input.date,
        time: input.time,
        durationMinutes: input.durationMinutes,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };
      const all = [...loadAll(), row];
      saveAll(all);
      setBookings(migrateCompleted(all));
      return row;
    },
    [user],
  );

  const cancelBooking = useCallback((id: string) => {
    if (!user) return;
    const all = loadAll().map((b) =>
      b.id === id && b.userId === user.phoneE164 && b.status === 'confirmed'
        ? { ...b, status: 'cancelled' as const, updatedAt: new Date().toISOString() }
        : b,
    );
    saveAll(all);
    setBookings(migrateCompleted(all));
  }, [user]);

  const rescheduleBooking = useCallback(
    (id: string, date: string, time: string) => {
      if (!user) return;
      const all = loadAll().map((b) =>
        b.id === id && b.userId === user.phoneE164 && b.status === 'confirmed'
          ? { ...b, date, time, updatedAt: new Date().toISOString() }
          : b,
      );
      saveAll(all);
      setBookings(migrateCompleted(all));
    },
    [user],
  );

  const updateBookingPayment = useCallback(
    (bookingId: string, patch: Partial<Pick<BookingRecord, 'paymentOrderId' | 'paymentStatus'>>) => {
      if (!user) return;
      const all = loadAll().map((b) =>
        b.id === bookingId && b.userId === user.phoneE164
          ? { ...b, ...patch, updatedAt: new Date().toISOString() }
          : b,
      );
      saveAll(all);
      setBookings(migrateCompleted(all));
    },
    [user],
  );

  useEffect(() => {
    if (!user || !isPaymentApiConfigured()) return;
    const tick = async () => {
      const raw = loadAll();
      const mine = raw.filter(
        (b) =>
          b.userId === user.phoneE164 &&
          b.paymentOrderId &&
          b.paymentStatus === 'pending',
      );
      if (mine.length === 0) return;
      let next = raw;
      let changed = false;
      for (const b of mine) {
        const st = await fetchOrderStatus(b.paymentOrderId!);
        if (st?.status === 'paid') {
          changed = true;
          next = next.map((row) =>
            row.id === b.id ? { ...row, paymentStatus: 'paid' as const, updatedAt: new Date().toISOString() } : row,
          );
        }
      }
      if (changed) {
        saveAll(next);
        setBookings(migrateCompleted(next));
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 5000);
    return () => window.clearInterval(id);
  }, [user?.phoneE164]);

  const value = useMemo<BookingsContextValue>(
    () => ({
      bookings: userBookings,
      upcoming,
      past,
      cancelled,
      addBooking,
      cancelBooking,
      rescheduleBooking,
      getClassForBooking,
      updateBookingPayment,
    }),
    [
      userBookings,
      upcoming,
      past,
      cancelled,
      addBooking,
      cancelBooking,
      rescheduleBooking,
      getClassForBooking,
      updateBookingPayment,
    ],
  );

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export function useBookings() {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error('useBookings must be used within BookingsProvider');
  return ctx;
}
