import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import type { YogaClass } from '../data/classes';
import { useAdmin } from '../context/AdminContext';
import { useNotifications } from '../context/NotificationsContext';
import { useYogaClasses } from '../context/YogaClassesContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { formatKzt } from '../lib/format';
import {
  appendLocationToDescription,
  get2gisApiKey,
  reverseGeocode2gis,
} from '../lib/geocode2gis';
import { Admin2gisMapPicker, AdminGeolocationButton } from '../components/admin/Admin2gisMapPicker';

function newEmptyClass(): YogaClass {
  const id = `custom-${Date.now()}`;
  return {
    id,
    title: 'Новое занятие',
    location: 'Алматы',
    price: 2500,
    rating: 5,
    image:
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80&auto=format&fit=crop',
    instructor: 'Инструктор',
    level: 'beginner',
    duration: 60,
    style: 'Виньяса',
    description: 'Описание занятия.',
    highlights: ['Вид', 'Атмосфера'],
    whatToBring: ['Коврик', 'Вода'],
    coordinates: { lat: 43.24, lng: 76.95 },
    availableSlots: ['10:00', '12:00', '18:00'],
    maxParticipants: 15,
    currentParticipants: 0,
  };
}

function AdminLoginForm() {
  const { login } = useAdmin();
  const [pwd, setPwd] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(pwd)) {
      toast.success('Вход выполнен');
      setPwd('');
    } else {
      toast.error('Неверный пароль');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h1 className="text-xl font-bold text-center">Администратор</h1>
        <p className="text-sm text-gray-500 text-center">
          Введите пароль для управления карточками
        </p>
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Пароль"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="h-11"
          />
          <Button type="submit" className="w-full h-11">
            Войти
          </Button>
        </form>
        <Link to="/" className="block text-center text-sm text-indigo-600">
          ← На главную
        </Link>
      </div>
    </div>
  );
}

export default function Admin() {
  const { isAdmin, logout } = useAdmin();
  const { sendBroadcastToUsers } = useNotifications();
  const { classes, addClass, replaceClass, deleteClass, resetToDefaults } = useYogaClasses();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<YogaClass | null>(null);
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');

  if (!isAdmin) {
    return <AdminLoginForm />;
  }

  const saveEdit = (row: YogaClass) => {
    replaceClass(row);
    setEditing(null);
    toast.success('Сохранено');
  };

  const remove = (id: string) => {
    if (!confirm('Удалить эту карточку?')) return;
    deleteClass(id);
    if (editing?.id === id) setEditing(null);
    toast.success('Удалено');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg truncate">Карточки</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('Сбросить все карточки к встроенному набору?')) {
                resetToDefaults();
                setEditing(null);
                toast.success('Сброшено');
              }
            }}
          >
            Сброс
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const n = newEmptyClass();
              addClass(n);
              setEditing(n);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Новая
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {classes.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-xl border p-3 flex gap-3 items-start shadow-sm"
          >
            <img
              src={c.image}
              alt=""
              className="w-20 h-20 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{c.title}</p>
              <p className="text-xs text-gray-500 truncate">{c.location}</p>
              <p className="text-xs text-indigo-600 mt-1">{formatKzt(c.price)}</p>
            </div>
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9"
                onClick={() => setEditing({ ...c })}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 text-red-600"
                onClick={() => remove(c.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-3 border-t border-gray-200">
        <h2 className="font-semibold text-base">Push-уведомления</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Рассылка сохраняется в приложении: авторизованные пользователи увидят уведомление при открытии
          приложения; при разрешении браузера — также системное уведомление. Без сервера сообщения
          доступны на этом устройстве и в других вкладках с тем же сайтом.
        </p>
        <div>
          <Label>Заголовок</Label>
          <Input
            value={pushTitle}
            onChange={(e) => setPushTitle(e.target.value)}
            placeholder="Например: Новая практика на крыше"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Текст</Label>
          <Textarea
            value={pushBody}
            onChange={(e) => setPushBody(e.target.value)}
            placeholder="Краткий текст для пользователей…"
            className="mt-1 min-h-[88px]"
          />
        </div>
        <Button
          type="button"
          className="w-full"
          disabled={!pushTitle.trim()}
          onClick={() => {
            sendBroadcastToUsers(pushTitle, pushBody);
            setPushTitle('');
            setPushBody('');
          }}
        >
          Отправить пользователям
        </Button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 space-y-3 shadow-xl">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">Редактирование</h2>
              <button
                type="button"
                className="text-sm text-gray-500"
                onClick={() => setEditing(null)}
              >
                Закрыть
              </button>
            </div>

            <ClassForm
              value={editing}
              onPatch={(p) =>
                setEditing((prev) => (prev ? { ...prev, ...p } : prev))
              }
              onSave={(row) => saveEdit(row)}
            />
          </div>
        </div>
      )}

      <div className="fixed bottom-4 left-0 right-0 text-center">
        <Link to="/" className="text-sm text-indigo-600">
          На главную
        </Link>
      </div>
    </div>
  );
}

function ClassForm({
  value,
  onPatch,
  onSave,
}: {
  value: YogaClass;
  /** Слияние с актуальным состоянием в родителе — без устаревшего замыкания */
  onPatch: (p: Partial<YogaClass>) => void;
  onSave: (row: YogaClass) => void;
}) {
  const patch = (p: Partial<YogaClass>) => onPatch(p);

  return (
    <div className="space-y-3 pb-8">
      <div>
        <Label>Название</Label>
        <Input
          value={value.title}
          onChange={(e) => patch({ title: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Локация</Label>
        <Input
          value={value.location}
          onChange={(e) => patch({ location: e.target.value })}
          className="mt-1"
        />
      </div>

      <div className="space-y-2">
        <Label>Локация на карте 2GIS</Label>
        <Admin2gisMapPicker
          formKey={value.id}
          lat={value.coordinates.lat}
          lng={value.coordinates.lng}
          onCoordinatesChange={(la, ln) =>
            patch({ coordinates: { lat: la, lng: ln } })
          }
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <AdminGeolocationButton
            onPosition={(la, ln) => {
              patch({ coordinates: { lat: la, lng: ln } });
              toast.success('Координаты обновлены по геолокации');
            }}
            onError={() =>
              toast.error('Не удалось определить местоположение')
            }
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={async () => {
              if (!get2gisApiKey()) {
                toast.error(
                  'Нет ключа карты: в .env.local задайте VITE_2GIS_API_KEY и перезапустите npm run dev',
                );
                return;
              }
              const { lat, lng } = value.coordinates;
              const addr = await reverseGeocode2gis(lat, lng);
              if (!addr) {
                toast.error(
                  '2GIS не вернул адрес для этих координат. Проверьте ключ в кабинете dev.2gis.com и доступ к catalog.api.2gis.com',
                );
                return;
              }
              patch({
                location: addr,
                description: appendLocationToDescription(value.description, addr),
              });
              toast.success('Адрес добавлен в локацию и описание');
            }}
          >
            Адрес в локацию и описание
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Цена (₸)</Label>
          <Input
            type="number"
            value={value.price}
            onChange={(e) => patch({ price: Number(e.target.value) || 0 })}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Рейтинг</Label>
          <Input
            type="number"
            step="0.1"
            value={value.rating}
            onChange={(e) => patch({ rating: Number(e.target.value) || 0 })}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label>URL изображения</Label>
        <Input
          value={value.image}
          onChange={(e) => patch({ image: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Инструктор</Label>
        <Input
          value={value.instructor}
          onChange={(e) => patch({ instructor: e.target.value })}
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Уровень</Label>
          <select
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={value.level}
            onChange={(e) =>
              patch({ level: e.target.value as YogaClass['level'] })
            }
          >
            <option value="beginner">Начинающий</option>
            <option value="intermediate">Средний</option>
            <option value="advanced">Продвинутый</option>
          </select>
        </div>
        <div>
          <Label>Минуты</Label>
          <Input
            type="number"
            value={value.duration}
            onChange={(e) => patch({ duration: Number(e.target.value) || 0 })}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label>Стиль</Label>
        <Input
          value={value.style}
          onChange={(e) => patch({ style: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Описание</Label>
        <Textarea
          value={value.description}
          onChange={(e) => patch({ description: e.target.value })}
          className="mt-1 min-h-[80px]"
        />
      </div>
      <div>
        <Label>Особенности (каждая с новой строки)</Label>
        <Textarea
          value={value.highlights.join('\n')}
          onChange={(e) =>
            patch({
              highlights: e.target.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          className="mt-1 min-h-[72px]"
        />
      </div>
      <div>
        <Label>Что взять (каждая с новой строки)</Label>
        <Textarea
          value={value.whatToBring.join('\n')}
          onChange={(e) =>
            patch({
              whatToBring: e.target.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          className="mt-1 min-h-[72px]"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Широта</Label>
          <Input
            type="number"
            step="any"
            value={value.coordinates.lat}
            onChange={(e) =>
              patch({
                coordinates: {
                  ...value.coordinates,
                  lat: Number(e.target.value) || 0,
                },
              })
            }
            className="mt-1"
          />
        </div>
        <div>
          <Label>Долгота</Label>
          <Input
            type="number"
            step="any"
            value={value.coordinates.lng}
            onChange={(e) =>
              patch({
                coordinates: {
                  ...value.coordinates,
                  lng: Number(e.target.value) || 0,
                },
              })
            }
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label>Слоты времени (через запятую, например 10:00, 12:00)</Label>
        <Input
          value={value.availableSlots.join(', ')}
          onChange={(e) =>
            patch({
              availableSlots: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Макс. участников</Label>
          <Input
            type="number"
            value={value.maxParticipants}
            onChange={(e) =>
              patch({ maxParticipants: Number(e.target.value) || 0 })
            }
            className="mt-1"
          />
        </div>
        <div>
          <Label>Уже записалось</Label>
          <Input
            type="number"
            value={value.currentParticipants}
            onChange={(e) =>
              patch({ currentParticipants: Number(e.target.value) || 0 })
            }
            className="mt-1"
          />
        </div>
      </div>
      <Button
        type="button"
        className="w-full h-11"
        onClick={() => onSave(value)}
      >
        Сохранить
      </Button>
    </div>
  );
}
