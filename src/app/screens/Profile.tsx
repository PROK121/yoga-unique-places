import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Heart,
  Star,
  Settings,
  LogOut,
  Bell,
  CreditCard,
  HelpCircle,
  ChevronRight,
  Calendar,
  Headphones,
  X,
} from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../context/AdminContext';
import { useBookings } from '../context/BookingsContext';
import { useFavorites } from '../context/FavoritesContext';
import { useNotifications } from '../context/NotificationsContext';
import { parseLocalDate } from '../lib/bookingCalendar';
import { formatPhoneDisplay } from '../lib/phone';
import { levelLabel } from '../lib/i18n';
import { formatKzt } from '../lib/format';

export default function Profile() {
  const navigate = useNavigate();
  const { user, ready, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const { favoriteClasses, removeFavorite } = useFavorites();
  const { upcoming, past, getClassForBooking } = useBookings();
  const {
    broadcasts,
    permission,
    requestBrowserPermission,
    markBroadcastSeen,
    unseenBroadcastIds,
  } = useNotifications();
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [notifOpen, setNotifOpen] = useState(false);

  const stats = {
    sessionsCompleted: past.length,
    favoriteLocations: favoriteClasses.length,
    totalMinutes: Math.max(0, past.length * 60),
    currentStreak: 3,
  };

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
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
          <div className="max-w-md mx-auto px-4 pt-12 pb-10 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Профиль</h1>
            <p className="text-white/85 text-sm mb-6">
              Войдите по номеру телефона, чтобы сохранять брони и избранное
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center w-full max-w-xs py-3.5 rounded-2xl bg-white text-indigo-600 font-semibold shadow-lg"
            >
              Регистрация / вход
            </Link>
          </div>
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
        <div className="max-w-md mx-auto px-4 pt-8 pb-8">
          {/* Profile Info */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white/30">
              <User className="w-10 h-10" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Профиль</h1>
              <p className="text-white/85 text-sm">{formatPhoneDisplay(user.phoneE164)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                  {levelLabel(level)}
                </span>
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                  🔥 {stats.currentStreak} дн. подряд
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
              <p className="text-2xl font-bold">{stats.sessionsCompleted}</p>
              <p className="text-xs text-white/80 mt-1">Занятий</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
              <p className="text-2xl font-bold">{stats.totalMinutes}</p>
              <p className="text-xs text-white/80 mt-1">Минут</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
              <p className="text-2xl font-bold">{favoriteClasses.length}</p>
              <p className="text-xs text-white/80 mt-1">Избранное</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
              <p className="text-2xl font-bold">4.9</p>
              <p className="text-xs text-white/80 mt-1">Рейтинг</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Level Selection */}
        <div className="bg-white rounded-2xl p-4">
          <h2 className="font-semibold mb-3">Ваш уровень</h2>
          <div className="flex gap-2">
            {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevel(lvl)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  level === lvl
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {levelLabel(lvl)}
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming bookings */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Брони
            </h2>
            <button
              type="button"
              onClick={() => navigate('/bookings')}
              className="text-sm text-indigo-600 font-medium"
            >
              Все
            </button>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">Нет предстоящих броней</p>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 3).map((b) => {
                const cls = getClassForBooking(b.classId);
                if (!cls) return null;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => navigate('/bookings')}
                    className="w-full flex gap-3 text-left hover:bg-gray-50 -mx-2 px-2 py-2 rounded-xl transition-colors"
                  >
                    <img
                      src={cls.image}
                      alt=""
                      className="w-14 h-14 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{cls.title}</p>
                      <p className="text-xs text-gray-500">
                        {parseLocalDate(b.date).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        · {b.time}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Favorites */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Избранное
            </h2>
            <button
              type="button"
              onClick={() => navigate('/discover')}
              className="text-sm text-indigo-600 font-medium"
            >
              Все
            </button>
          </div>

          {favoriteClasses.length === 0 ? (
            <p className="text-sm text-gray-500">Добавляйте занятия сердечком на главной</p>
          ) : (
            <div className="space-y-2">
              {favoriteClasses.map((favorite) => (
                <div
                  key={favorite.id}
                  className="flex items-stretch gap-1 -mx-1 px-1"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/class/${favorite.id}`)}
                    className="flex flex-1 min-w-0 gap-3 text-left hover:bg-gray-50 px-2 py-2 rounded-xl transition-colors"
                  >
                    <img
                      src={favorite.image}
                      alt={favorite.title}
                      className="w-16 h-16 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{favorite.title}</h3>
                      <p className="text-xs text-gray-600 truncate">{favorite.location}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-medium">{favorite.rating}</span>
                        </div>
                        <span className="text-xs text-gray-500">{formatKzt(favorite.price)}</span>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFavorite(favorite.id)}
                    className="shrink-0 self-center p-2.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Убрать из избранного"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center relative">
                <Bell className="w-5 h-5 text-indigo-600" />
                {unseenBroadcastIds.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unseenBroadcastIds.length}
                  </span>
                )}
              </div>
              <div className="text-left">
                <span className="font-medium block">Уведомления</span>
                <span className="text-xs text-gray-500">
                  {permission === 'granted'
                    ? 'Системные включены'
                    : permission === 'denied'
                      ? 'В браузере отклонено'
                      : 'Нажмите, чтобы настроить'}
                </span>
              </div>
            </div>
            <ChevronRight
              className={`w-5 h-5 text-gray-400 transition-transform ${notifOpen ? 'rotate-90' : ''}`}
            />
          </button>

          {notifOpen && (
            <div className="px-4 pb-4 space-y-3 border-b border-gray-100">
              {permission !== 'unsupported' && permission !== 'granted' && (
                <button
                  type="button"
                  onClick={() => requestBrowserPermission()}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium"
                >
                  Разрешить push в браузере
                </button>
              )}
              {permission === 'unsupported' && (
                <p className="text-xs text-gray-500">Браузер не поддерживает уведомления</p>
              )}
              <p className="text-xs text-gray-500">Последние сообщения от сервиса:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {broadcasts.length === 0 ? (
                  <p className="text-sm text-gray-400">Пока нет рассылок</p>
                ) : (
                  broadcasts.slice(0, 8).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => markBroadcastSeen(b.id)}
                      className={`w-full text-left p-2 rounded-lg text-sm ${
                        unseenBroadcastIds.includes(b.id) ? 'bg-indigo-50' : 'bg-gray-50'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{b.title}</p>
                      {b.body ? <p className="text-gray-600 text-xs mt-0.5">{b.body}</p> : null}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(b.sentAt).toLocaleString('ru-RU')}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <span className="font-medium">Способы оплаты</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-orange-600" />
              </div>
              <span className="font-medium">Настройки</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/support')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                <Headphones className="w-5 h-5 text-violet-600" />
              </div>
              <span className="font-medium">Чат поддержки</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-medium">Помощь</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-center gap-2 text-red-600 font-medium hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Выйти
        </button>

        {/* App Info */}
        <div className="text-center text-sm text-gray-500 pt-4">
          <p>Yoga Unique</p>
          <p className="text-xs mt-1">Версия 1.0.0</p>
          {isAdmin && (
            <Link
              to="/admin"
              className="mt-3 inline-block text-xs font-medium text-indigo-600"
            >
              Управление карточками
            </Link>
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
}
