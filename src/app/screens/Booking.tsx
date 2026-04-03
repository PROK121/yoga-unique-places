import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBookings } from '../context/BookingsContext';
import { useYogaClasses } from '../context/YogaClassesContext';
import { BookingMonthPicker } from '../components/BookingMonthPicker';
import { parseLocalDate } from '../lib/bookingCalendar';
import { levelLabel } from '../lib/i18n';
import { formatKzt } from '../lib/format';
import { createPaymentOrder, isPaymentApiConfigured } from '../lib/paymentApi';
import {
  openTelegramForPayment,
  prefersManualTelegramLink,
  rememberPendingTelegramPay,
} from '../lib/telegramDeepLink';
import { toast } from 'sonner';

export default function Booking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addBooking, updateBookingPayment } = useBookings();
  const { classes: yogaClasses } = useYogaClasses();
  const [selectedDate, setSelectedDate] = useState(() => {
    const n = new Date();
    const y = n.getFullYear();
    const m = String(n.getMonth() + 1).padStart(2, '0');
    const day = String(n.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [selectedTime, setSelectedTime] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  const yogaClass = yogaClasses.find((c) => c.id === id);

  if (!yogaClass) {
    return <div>Занятие не найдено</div>;
  }

  const handleBook = async () => {
    if (!selectedTime || !user) return;

    setIsBooking(true);
    try {
      const row = addBooking({
        classId: yogaClass.id,
        date: selectedDate,
        time: selectedTime,
        durationMinutes: yogaClass.duration,
      });
      if (!row) {
        toast.error('Не удалось сохранить бронь');
        return;
      }

      if (isPaymentApiConfigured()) {
        const result = await createPaymentOrder({
          phone: user.phoneE164,
          amount: yogaClass.price,
          bookingId: row.id,
          classId: yogaClass.id,
          classTitle: yogaClass.title,
        });

        if (result.ok) {
          const { order } = result;
          updateBookingPayment(row.id, {
            paymentOrderId: order.orderId,
            paymentStatus: 'pending',
          });
          rememberPendingTelegramPay(order.telegramDeepLink);
          navigate('/bookings?success=true');
          if (!prefersManualTelegramLink()) {
            openTelegramForPayment(order.telegramDeepLink);
          }
          return;
        }

        if (result.reason === 'timeout') {
          toast.error(
            'Сервер оплаты не ответил вовремя. Если вы с телефона — в .env не подходит адрес 127.0.0.1 (это сам телефон). Укажите IP вашего компьютера в сети, например http://192.168.0.5:8787',
            { duration: 12_000 },
          );
        } else if (result.reason === 'network') {
          toast.error('Не удалось подключиться к серверу оплаты. Проверьте Wi‑Fi и адрес API.');
        } else {
          toast.warning(
            'Бронь сохранена. Оформить оплату в Telegram не вышло (ошибка сервера или секрета). Напишите в поддержку.',
          );
        }
      } else {
        toast.message('Бронь сохранена. Онлайн-оплата недоступна', {
          description:
            import.meta.env.DEV
              ? 'Создайте .env.local в корне проекта: VITE_SUPPORT_API_URL=http://127.0.0.1:8787 и перезапустите npm run dev.'
              : 'В панели хостинга (Render и т.п.) добавьте переменную VITE_SUPPORT_API_URL = публичный HTTPS-URL сервера (node server/telegram-support.mjs), не localhost. Сохраните и выполните новый деплой.',
          duration: 14_000,
        });
      }

      navigate('/bookings?success=true');
    } finally {
      setIsBooking(false);
    }
  };

  const selectedDateObj = parseLocalDate(selectedDate);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 pb-32">
        <p className="text-gray-700 text-center mb-4">Войдите, чтобы оформить бронь и видеть её в профиле</p>
        <Link
          to={`/auth?next=${encodeURIComponent(`/booking/${id}`)}`}
          className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold"
        >
          Войти по телефону
        </Link>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 text-indigo-600 text-sm font-medium"
        >
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Бронирование</h1>
            <p className="text-sm text-gray-600">{yogaClass.title}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Class Preview */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="flex gap-4 p-4">
            <img
              src={yogaClass.image}
              alt={yogaClass.title}
              className="w-24 h-24 object-cover rounded-xl"
            />
            <div className="flex-1">
              <h3 className="font-semibold">{yogaClass.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{yogaClass.location}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {yogaClass.duration} мин
                </span>
                <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {levelLabel(yogaClass.level)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Select Date — календарь текущего / выбранного месяца */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
              1
            </div>
            <h2 className="font-semibold text-lg">Выберите дату</h2>
          </div>

          <BookingMonthPicker
            selectedDate={selectedDate}
            onChange={(d) => {
              setSelectedDate(d);
              setSelectedTime('');
            }}
            minDate={new Date()}
          />
        </div>

        {/* Step 2: Select Time */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                selectedDate ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              2
            </div>
            <h2 className="font-semibold text-lg">Выберите время</h2>
          </div>

          {!selectedDate ? (
            <p className="text-sm text-gray-500">Сначала выберите дату</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {yogaClass.availableSlots.map((time) => {
                const isSelected = time === selectedTime;

                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-3 rounded-xl font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 3: Confirm */}
        {selectedTime && (
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                3
              </div>
              <h2 className="font-semibold text-lg">Итого</h2>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Дата</span>
                <span className="font-medium">
                  {selectedDateObj.toLocaleDateString('ru-RU', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Время</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Длительность</span>
                <span className="font-medium">{yogaClass.duration} мин</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Инструктор</span>
                <span className="font-medium">{yogaClass.instructor}</span>
              </div>

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">К оплате</span>
                  <span className="text-2xl font-bold text-indigo-600">
                    {formatKzt(yogaClass.price)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Info */}
        {selectedTime && (
          <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
            <p className="text-sm text-indigo-900">
              💳 После нажатия «Оплатить» откроется наш Telegram-бот: там сумма, ссылка Kaspi и приём чека.
            </p>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      {selectedTime && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleBook}
              disabled={isBooking}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                isBooking
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-98'
              }`}
            >
              {isBooking ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Обработка…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  Оплатить {formatKzt(yogaClass.price)}
                </span>
              )}
            </button>
            <p className="text-xs text-gray-500 text-center mt-3">
              Бесплатная отмена за 24 часа до начала
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
