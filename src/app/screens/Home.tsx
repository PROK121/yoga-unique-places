import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Heart } from 'lucide-react';
import type { YogaClass } from '../data/classes';
import { Navigation } from '../components/Navigation';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useYogaClasses } from '../context/YogaClassesContext';
import { levelLabel } from '../lib/i18n';
import { formatKzt } from '../lib/format';

const SWIPE_THRESHOLD_PX = 72;
const RUBBER = 0.28;

export default function Home() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const { classes: yogaClasses } = useYogaClasses();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);
  const draggingRef = useRef(false);
  const [slideH, setSlideH] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800,
  );

  useEffect(() => {
    const onResize = () => setSlideH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (yogaClasses.length === 0) return;
    setCurrentIndex((i) => Math.min(i, Math.max(0, yogaClasses.length - 1)));
  }, [yogaClasses.length]);

  const clampDrag = useCallback(
    (index: number, delta: number) => {
      let d = delta;
      if (index === 0 && d > 0) d *= RUBBER;
      if (yogaClasses.length > 0 && index === yogaClasses.length - 1 && d < 0) d *= RUBBER;
      return d;
    },
    [yogaClasses.length],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    draggingRef.current = true;
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    const y = e.touches[0].clientY;
    const raw = y - touchStartY.current;
    setDragOffset(clampDrag(currentIndex, raw));
  };

  const onTouchEnd = () => {
    draggingRef.current = false;
    setIsDragging(false);
    const d = dragOffset;
    let next = currentIndex;
    if (
      yogaClasses.length > 0 &&
      d < -SWIPE_THRESHOLD_PX &&
      currentIndex < yogaClasses.length - 1
    ) {
      next = currentIndex + 1;
    } else if (d > SWIPE_THRESHOLD_PX && currentIndex > 0) {
      next = currentIndex - 1;
    }
    setCurrentIndex(next);
    setDragOffset(0);
  };

  const translateY = -(currentIndex * slideH) + dragOffset;

  if (yogaClasses.length === 0) {
    return (
      <div className="h-[100dvh] w-full bg-gray-900 flex flex-col items-center justify-center text-white px-6 pb-24">
        <p className="text-center text-lg text-white/80">Скоро здесь появятся занятия</p>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-black overflow-hidden touch-none">
      <div
        className="flex flex-col will-change-transform"
        style={{
          height: `${yogaClasses.length * slideH}px`,
          transform: `translate3d(0, ${translateY}px, 0)`,
          transition: isDragging
            ? 'none'
            : 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {yogaClasses.map((yogaClass, idx) => (
          <HomeSlide
            key={yogaClass.id}
            yogaClass={yogaClass}
            slideH={slideH}
            ready={ready}
            user={user}
            navigate={navigate}
            isActive={idx === currentIndex}
            favorites={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        ))}
      </div>

      {/* Индикаторы справа — привязаны к экрану */}
      <div className="pointer-events-none fixed right-4 top-1/2 z-20 -translate-y-1/2 flex flex-col gap-2">
        {yogaClasses.map((_, idx) => (
          <div
            key={idx}
            className={`w-1 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'bg-white h-12' : 'h-8 bg-white/30'
            }`}
          />
        ))}
      </div>

      <Navigation />
    </div>
  );
}

type SlideProps = {
  yogaClass: YogaClass;
  slideH: number;
  ready: boolean;
  user: { phoneE164: string } | null;
  navigate: ReturnType<typeof useNavigate>;
  isActive: boolean;
  favorites: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
};

function HomeSlide({
  yogaClass,
  slideH,
  ready,
  user,
  navigate,
  isActive,
  favorites,
  onToggleFavorite,
}: SlideProps) {
  return (
    <div
      className="relative w-full shrink-0 overflow-hidden bg-black"
      style={{ height: slideH }}
    >
      <div className="absolute inset-0">
        <img
          src={yogaClass.image}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
      </div>

      <div className="relative flex h-full flex-col justify-between p-6 text-white">
        <div className="flex items-center justify-between pt-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <span className="text-sm font-semibold">YU</span>
            </div>
            <span className="truncate text-sm font-medium">Yoga Unique</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {ready && !user && (
              <Link
                to="/auth"
                className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur-sm hover:bg-white/30"
              >
                Войти
              </Link>
            )}
            <button
              type="button"
              onClick={() => onToggleFavorite(yogaClass.id)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform active:scale-90"
            >
              <Heart
                className={`h-5 w-5 ${
                  favorites.has(yogaClass.id) ? 'fill-red-500 text-red-500' : 'text-white'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="space-y-4 pb-20">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold leading-tight">{yogaClass.title}</h1>
            <div className="flex items-center gap-2 text-white/90">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="text-sm">{yogaClass.location}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{yogaClass.rating}</span>
            </div>
            <div className="rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
              <span className="font-semibold">{formatKzt(yogaClass.price)}</span>
            </div>
            <div className="rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
              <span className="text-sm">{yogaClass.duration} мин</span>
            </div>
            <div className="rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
              <span className="text-sm">{levelLabel(yogaClass.level)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {yogaClass.highlights.slice(0, 3).map((highlight, idx) => (
              <span
                key={idx}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur-sm"
              >
                ✨ {highlight}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => isActive && navigate(`/class/${yogaClass.id}`)}
            className="w-full rounded-2xl bg-indigo-600 py-4 text-lg font-semibold text-white transition-all hover:bg-indigo-700 active:scale-[0.98]"
          >
            Подробнее
          </button>
        </div>
      </div>
    </div>
  );
}
