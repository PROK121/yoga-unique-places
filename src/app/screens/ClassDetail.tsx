import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Clock, Users, Heart, Share2, Info } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { useYogaClasses } from '../context/YogaClassesContext';
import { levelLabel } from '../lib/i18n';
import { formatKzt } from '../lib/format';

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { classes } = useYogaClasses();
  const { isFavorite, toggleFavorite } = useFavorites();

  const yogaClass = classes.find((c) => c.id === id);

  if (!yogaClass) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Занятие не найдено</p>
      </div>
    );
  }

  const spotsLeft = yogaClass.maxParticipants - yogaClass.currentParticipants;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hero Image */}
      <div className="relative h-[50vh]">
        <img
          src={yogaClass.image}
          alt={yogaClass.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => toggleFavorite(yogaClass.id)}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg"
              aria-label={isFavorite(yogaClass.id) ? 'Убрать из избранного' : 'В избранное'}
            >
              <Heart
                className={`w-5 h-5 ${
                  isFavorite(yogaClass.id) ? 'fill-red-500 text-red-500' : 'text-gray-700'
                }`}
              />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
              {yogaClass.style}
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
              {levelLabel(yogaClass.level)}
            </div>
          </div>
          <h1 className="text-3xl font-bold">{yogaClass.title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Quick Info */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 text-center">
            <Star className="w-5 h-5 mx-auto mb-1 fill-yellow-400 text-yellow-400" />
            <p className="font-semibold text-sm">{yogaClass.rating}</p>
            <p className="text-xs text-gray-500">Рейтинг</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
            <p className="font-semibold text-sm">{yogaClass.duration} мин</p>
            <p className="text-xs text-gray-500">Длительность</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
            <p className="font-semibold text-sm">{spotsLeft}</p>
            <p className="text-xs text-gray-500">Места</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">💰</div>
            <p className="font-semibold text-sm">{formatKzt(yogaClass.price)}</p>
            <p className="text-xs text-gray-500">Цена</p>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Локация</p>
              <p className="text-sm text-gray-600 mt-1">{yogaClass.location}</p>
              <a
                href="https://2gis.kz/almaty"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-medium text-indigo-600"
              >
                На карте →
              </a>
            </div>
          </div>
        </div>

        {/* Instructor */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
              {yogaClass.instructor.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{yogaClass.instructor}</p>
              <p className="text-sm text-gray-600">Сертифицированный инструктор</p>
            </div>
            <button type="button" className="text-sm text-indigo-600 font-medium">
              Профиль
            </button>
          </div>
        </div>

        {/* Experience Highlights */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <span>✨</span> Особенности
          </h3>
          <div className="space-y-2">
            {yogaClass.highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="font-semibold text-lg mb-2">О занятии</h3>
          <p className="text-gray-700 leading-relaxed">{yogaClass.description}</p>
        </div>

        {/* What to Bring */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-600" />
            С собой
          </h3>
          <div className="space-y-2">
            {yogaClass.whatToBring.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 bg-indigo-100 rounded flex items-center justify-center text-xs">
                  ✓
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews Preview */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Отзывы</h3>
            <button type="button" className="text-sm text-indigo-600 font-medium">
              Все
            </button>
          </div>
          
          {/* Sample Review */}
          <div className="space-y-4">
            <div className="border-b border-gray-100 pb-4 last:border-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-orange-400 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  SK
                </div>
                <div>
                  <p className="font-medium text-sm">Сара К.</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700">
                «Волшебный опыт! Рассвет и вид — непередаваемо, инструктор супер. Рекомендую!»
              </p>
            </div>

            <div className="border-b border-gray-100 pb-4 last:border-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  MJ
                </div>
                <div>
                  <p className="font-medium text-sm">Михаил Ю.</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700">
                «Отлично для новичков. Локация и атмосфера — отдельная любовь. Обязательно вернусь!»
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-gray-600">От</p>
            <p className="text-2xl font-bold">{formatKzt(yogaClass.price)}</p>
          </div>
          <button
            onClick={() => navigate(`/booking/${yogaClass.id}`)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-semibold transition-colors"
          >
            Забронировать
          </button>
        </div>
      </div>
    </div>
  );
}
