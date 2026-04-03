import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  WEEKDAYS,
  buildMonthCells,
  formatLocalDate,
  startOfDay,
} from '../lib/bookingCalendar';

type Props = {
  selectedDate: string;
  onChange: (dateStr: string) => void;
  /** Нижняя граница выбора (включительно), по умолчанию сегодня */
  minDate?: Date;
};

export function BookingMonthPicker({ selectedDate, onChange, minDate }: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayStr = formatLocalDate(today);
  const floor = minDate ? startOfDay(minDate) : today;

  const initial = useMemo(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return { y, m: m - 1 };
  }, [selectedDate]);

  const [viewMonth, setViewMonth] = useState(initial);

  useEffect(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    setViewMonth({ y, m: m - 1 });
  }, [selectedDate]);

  const monthCells = useMemo(
    () => buildMonthCells(viewMonth.y, viewMonth.m),
    [viewMonth.y, viewMonth.m],
  );

  const monthTitle = useMemo(
    () =>
      new Date(viewMonth.y, viewMonth.m, 1).toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric',
      }),
    [viewMonth.y, viewMonth.m],
  );

  const firstOfViewMonth = new Date(viewMonth.y, viewMonth.m, 1);
  const firstOfFloorMonth = new Date(floor.getFullYear(), floor.getMonth(), 1);
  const canGoPrev = firstOfViewMonth > firstOfFloorMonth;

  const goPrevMonth = () => {
    if (!canGoPrev) return;
    setViewMonth((vm) => {
      const d = new Date(vm.y, vm.m - 1, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const goNextMonth = () => {
    setViewMonth((vm) => {
      const d = new Date(vm.y, vm.m + 1, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goPrevMonth}
          disabled={!canGoPrev}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          aria-label="Предыдущий месяц"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold capitalize text-base">{monthTitle}</span>
        <button
          type="button"
          onClick={goNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Следующий месяц"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthCells.map((date, idx) => {
          if (!date) {
            return <div key={`pad-${idx}`} className="aspect-square" />;
          }
          const dateStr = formatLocalDate(date);
          const isSelected = dateStr === selectedDate;
          const isPast = startOfDay(date) < floor;
          const isToday = dateStr === todayStr;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast}
              onClick={() => onChange(dateStr)}
              className={`aspect-square rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center min-h-[2.5rem] ${
                isPast
                  ? 'text-gray-300 cursor-not-allowed'
                  : isSelected
                    ? 'bg-indigo-600 text-white shadow-md'
                    : isToday
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100'
                      : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
              }`}
            >
              <span>{date.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
