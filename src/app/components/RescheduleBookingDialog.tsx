import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BookingMonthPicker } from './BookingMonthPicker';
import type { BookingRecord } from '../context/BookingsContext';
import type { YogaClass } from '../data/classes';
type Props = {
  open: boolean;
  onClose: () => void;
  booking: BookingRecord;
  yogaClass: YogaClass;
  onConfirm: (date: string, time: string) => void;
};

export function RescheduleBookingDialog({
  open,
  onClose,
  booking,
  yogaClass,
  onConfirm,
}: Props) {
  const [date, setDate] = useState(booking.date);
  const [time, setTime] = useState(booking.time);

  useEffect(() => {
    if (open) {
      setDate(booking.date);
      setTime(booking.time);
    }
  }, [open, booking.date, booking.time]);

  if (!open) return null;

  const submit = () => {
    onConfirm(date, time);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-title"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h2 id="reschedule-title" className="font-semibold text-lg">
            Перенос брони
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">{yogaClass.title}</p>

          <div>
            <p className="text-sm font-medium mb-2">Новая дата</p>
            <BookingMonthPicker
              selectedDate={date}
              onChange={(d) => {
                setDate(d);
                setTime('');
              }}
              minDate={new Date()}
            />
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Время</p>
            <div className="grid grid-cols-3 gap-2">
              {yogaClass.availableSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={`py-3 rounded-xl font-medium text-sm transition-all ${
                    time === slot
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!time}
            onClick={submit}
            className="w-full py-3 rounded-xl font-semibold bg-indigo-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-indigo-700"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
