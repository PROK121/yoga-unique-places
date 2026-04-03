import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Sliders, Map as MapIcon, Grid3x3 } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { useYogaClasses } from '../context/YogaClassesContext';
import { levelFilterLabel, levelLabel, pluralBookings } from '../lib/i18n';
import { formatKzt, formatKztCompact } from '../lib/format';

export default function Discovery() {
  const navigate = useNavigate();
  const { classes: yogaClasses } = useYogaClasses();
  const [viewMode, setViewMode] = useState<'feed' | 'map'>('feed');
  const [filters, setFilters] = useState({
    level: 'all',
    style: 'all',
    priceMax: 50_000,
  });
  const [showFilters, setShowFilters] = useState(false);

  const filteredClasses = yogaClasses.filter(cls => {
    if (filters.level !== 'all' && cls.level !== filters.level) return false;
    if (filters.style !== 'all' && cls.style !== filters.style) return false;
    if (cls.price > filters.priceMax) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Поиск</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <Sliders className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'feed' ? 'map' : 'feed')}
                className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
              >
                {viewMode === 'feed' ? (
                  <MapIcon className="w-5 h-5" />
                ) : (
                  <Grid3x3 className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Место, стиль…"
            className="w-full px-4 py-3 bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="border-t border-gray-200 bg-white p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Уровень</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setFilters({ ...filters, level })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filters.level === level
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {levelFilterLabel(level)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Макс. цена: {formatKzt(filters.priceMax)}
              </label>
              <input
                type="range"
                min="0"
                max="100000"
                step="500"
                value={filters.priceMax}
                onChange={(e) => setFilters({ ...filters, priceMax: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto">
        {viewMode === 'feed' ? (
          /* Feed View */
          <div className="space-y-4 p-4">
            {filteredClasses.map((yogaClass) => (
              <div
                key={yogaClass.id}
                onClick={() => navigate(`/class/${yogaClass.id}`)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="relative h-56">
                  <img
                    src={yogaClass.image}
                    alt={yogaClass.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full font-semibold text-sm">
                    {formatKzt(yogaClass.price)}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{yogaClass.title}</h3>
                      <div className="flex items-center gap-1 text-gray-600 text-sm mt-1">
                        <MapPin className="w-4 h-4" />
                        <span>{yogaClass.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-sm">{yogaClass.rating}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="bg-gray-100 px-3 py-1 rounded-full">
                      {yogaClass.style}
                    </span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full">
                      {levelLabel(yogaClass.level)}
                    </span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full">
                      {yogaClass.duration} мин
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>
                      Осталось мест:{' '}
                      {yogaClass.maxParticipants - yogaClass.currentParticipants}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Map View */
          <div className="relative h-[calc(100vh-180px)]">
            {/* Simple Map Mockup */}
            <div className="absolute inset-0 bg-gray-200">
              <div className="w-full h-full relative">
                {filteredClasses.map((yogaClass, idx) => (
                  <div
                    key={yogaClass.id}
                    onClick={() => navigate(`/class/${yogaClass.id}`)}
                    className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${20 + (idx * 15)}%`,
                      top: `${30 + (idx * 10)}%`
                    }}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-indigo-600 border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-[10px] leading-tight px-0.5 text-center">
                        {formatKztCompact(yogaClass.price)}
                      </div>
                      {/* Popup on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                        <div className="bg-white rounded-lg shadow-xl p-3 w-48">
                          <p className="font-semibold text-sm">{yogaClass.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{yogaClass.location}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Map Background Pattern */}
                <div className="absolute inset-0 opacity-10 bg-gray-300"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 19px, #999 19px, #999 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, #999 19px, #999 20px)',
                    backgroundSize: '40px 40px'
                  }}
                />
              </div>
            </div>

            {/* Map Attribution */}
            <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow-lg text-xs text-gray-600">
              Карта · {pluralBookings(filteredClasses.length)}
            </div>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}