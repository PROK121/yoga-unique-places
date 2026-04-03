import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, MapPin, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Navigation } from '../components/Navigation';
import { RescheduleBookingDialog } from '../components/RescheduleBookingDialog';
import { useAuth } from '../context/AuthContext';
import { useBookings, type BookingRecord } from '../context/BookingsContext';
import { parseLocalDate } from '../lib/bookingCalendar';
import { pluralBookings } from '../lib/i18n';
import {
  readPendingTelegramPay,
  clearPendingTelegramPay,
} from '../lib/telegramDeepLink';

export default function Bookings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, ready } = useAuth();
  const { upcoming, past, cancelled, cancelBooking, rescheduleBooking, getClassForBooking } =
    useBookings();
  const [showSuccess, setShowSuccess] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<BookingRecord | null>(null);
  const [telegramPayUrl, setTelegramPayUrl] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
      const t = window.setTimeout(() => setShowSuccess(false), 4000);
      return () => window.clearTimeout(t);
    }
  }, [searchParams]);

  /** Запасная кнопка, если автопереход в Telegram не сработал (встроенный браузер Instagram и т.п.) */
  useEffect(() => {
    const p = readPendingTelegramPay();
    setTelegramPayUrl(p?.url ?? null);
  }, [searchParams, upcoming]);

  useEffect(() => {
    const anyPaymentPending = upcoming.some(
      (b) => b.paymentOrderId && b.paymentStatus === 'pending',
    );
    if (!anyPaymentPending) {
      clearPendingTelegramPay();
      setTelegramPayUrl(null);
    }
  }, [upcoming]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <p className="text-gray-500">Загрузка…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Мои брони</h1>
          <p className="text-gray-600 mb-6">Войдите, чтобы видеть и управлять бронированиями</p>
          <Link
            to="/auth?next=/bookings"
            className="inline-flex px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold"
          >
            Войти
          </Link>
        </div>
        <Navigation />
      </div>
    );
  }

  const onCancel = (b: BookingRecord) => {
    if (!confirm('Отменить эту бронь?')) return;
    cancelBooking(b.id);
    toast.success('Бронь отменена');
  };

  const onRescheduleConfirm = (date: string, time: string) => {
    if (!rescheduleTarget) return;
    rescheduleBooking(rescheduleTarget.id, date, time);
    toast.success('Дата и время обновлены');
    setRescheduleTarget(null);
  };

  const rescheduleClass = rescheduleTarget
    ? getClassForBooking(rescheduleTarget.classId)
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {showSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="bg-green-500 text-white rounded-2xl p-4 shadow-xl flex items-center gap-3 animate-in slide-in-from-top">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Бронь подтверждена!</p>
              <p className="text-sm opacity-90">Запись сохранена в вашем профиле</p>
            </div>
            <button type="button" onClick={() => setShowSuccess(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {telegramPayUrl && (
        <div className="fixed bottom-24 left-4 right-4 z-40 max-w-md mx-auto">
          <div className="bg-indigo-600 text-white rounded-2xl p-4 shadow-xl border border-indigo-500/30">
            <p className="text-sm font-medium mb-3">Оплата в Telegram</p>
            <p className="text-xs text-indigo-100 mb-3">
              Если чат не открылся автоматически, нажмите кнопку (в приложениях вроде Instagram сначала
              откройте сайт в Safari/Chrome).
            </p>
            <div className="flex gap-2">
              <a
                href={telegramPayUrl}
                className="flex-1 text-center py-3 rounded-xl bg-white text-indigo-700 font-semibold text-sm"
              >
                Открыть Telegram
              </a>
              <button
                type="button"
                onClick={() => {
                  clearPendingTelegramPay();
                  setTelegramPayUrl(null);
                }}
                className="px-4 py-3 rounded-xl bg-indigo-500/80 text-white text-sm font-medium"
              >
                Скрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Мои брони</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Предстоящие</h2>
            <span className="text-sm text-gray-600">{pluralBookings(upcoming.length)}</span>
          </div>

          {upcoming.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">Нет предстоящих броней</p>
              <button
                type="button"
                onClick={() => navigate('/discover')}
                className="text-indigo-600 font-semibold"
              >
                Найти занятия →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((booking) => {
                const cls = getClassForBooking(booking.classId);
                if (!cls) return null;
                return (
                  <div
                    key={booking.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/class/${cls.id}`)}
                      className="w-full flex gap-4 p-4 text-left"
                    >
                      <img
                        src={cls.image}
                        alt={cls.title}
                        className="w-24 h-24 object-cover rounded-xl flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{cls.title}</h3>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{cls.location}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <div className="flex items-center gap-1 text-gray-700">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {parseLocalDate(booking.date).toLocaleDateString('ru-RU', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-700">
                            <Clock className="w-4 h-4" />
                            <span>{booking.time}</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          {booking.paymentOrderId && booking.paymentStatus === 'pending' ? (
                            <span className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-medium">
                              Ожидает оплаты
                            </span>
                          ) : booking.paymentOrderId && booking.paymentStatus === 'paid' ? (
                            <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                              Оплачено
                            </span>
                          ) : (
                            <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                              Подтверждено
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onCancel(booking)}
                        className="flex-1 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        Отменить
                      </button>
                      <button
                        type="button"
                        onClick={() => setRescheduleTarget(booking)}
                        className="flex-1 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        Перенести
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cancelled.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Отменённые</h2>
            <div className="space-y-2">
              {cancelled.slice(0, 5).map((booking) => {
                const cls = getClassForBooking(booking.classId);
                if (!cls) return null;
                return (
                  <div
                    key={booking.id}
                    className="bg-white rounded-xl p-3 text-sm text-gray-600 flex justify-between gap-2"
                  >
                    <span className="truncate">{cls.title}</span>
                    <span className="shrink-0 text-gray-400">
                      {parseLocalDate(booking.date).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      {booking.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-4">Прошедшие</h2>

          {past.length === 0 ? (
            <p className="text-sm text-gray-500">История появится после занятий</p>
          ) : (
            <div className="space-y-3">
              {past.map((booking) => {
                const cls = getClassForBooking(booking.classId);
                if (!cls) return null;
                return (
                  <div key={booking.id} className="bg-white rounded-2xl overflow-hidden opacity-90">
                    <div className="flex gap-4 p-4">
                      <img
                        src={cls.image}
                        alt={cls.title}
                        className="w-20 h-20 object-cover rounded-xl flex-shrink-0 grayscale"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{cls.title}</h3>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{cls.location}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                          <span>
                            {parseLocalDate(booking.date).toLocaleDateString('ru-RU', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span>{booking.time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/class/${cls.id}`)}
                        className="w-full py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        Забронировать снова
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {rescheduleTarget && rescheduleClass && (
        <RescheduleBookingDialog
          open
          booking={rescheduleTarget}
          yogaClass={rescheduleClass}
          onClose={() => setRescheduleTarget(null)}
          onConfirm={onRescheduleConfirm}
        />
      )}

      <Navigation />
    </div>
  );
}
