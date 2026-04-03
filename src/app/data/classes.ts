export interface YogaClass {
  id: string;
  title: string;
  location: string;
  price: number;
  rating: number;
  image: string;
  instructor: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  style: string;
  description: string;
  highlights: string[];
  whatToBring: string[];
  coordinates: { lat: number; lng: number };
  availableSlots: string[];
  maxParticipants: number;
  currentParticipants: number;
}

/** Базовый набор; в приложении может быть переопределён из localStorage (админ) */
export const DEFAULT_YOGA_CLASSES: YogaClass[] = [
  {
    id: '1',
    title: 'Йога на рассвете в горах',
    location: 'Вершина, Швейцарские Альпы',
    price: 4500,
    rating: 4.9,
    image:
      'https://images.unsplash.com/photo-1606237184375-c30ab1c89575?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b2dhJTIwbW91bnRhaW4lMjBzdW5yaXNlJTIwb3V0ZG9vcnxlbnwxfHx8fDE3NzQ5MzY2MzV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    instructor: 'Сара Маунтинс',
    level: 'intermediate',
    duration: 90,
    style: 'Виньяса-флоу',
    description:
      'Начните день с незабываемой практики на рассвете на высоте 2000 м. Соединитесь с природой в динамичном виньяса-флоу.',
    highlights: [
      'Панорама гор на 360°',
      'Чистый альпийский воздух',
      'Травяной чай после занятия',
      'Малая группа (до 8 человек)',
      'Пледы предоставляются',
    ],
    whatToBring: [
      'Тёплые слои одежды',
      'Бутылка воды',
      'Солнцезащитный крем',
      'Камера (по желанию)',
    ],
    coordinates: { lat: 46.5197, lng: 6.6323 },
    availableSlots: ['06:00', '06:30', '07:00'],
    maxParticipants: 8,
    currentParticipants: 5,
  },
  {
    id: '2',
    title: 'Закат на крыше',
    location: 'Лофт в центре, Нью-Йорк',
    price: 3500,
    rating: 4.8,
    image:
      'https://images.unsplash.com/photo-1665982694128-06e4fb4b447b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b2dhJTIwcm9vZnRvcCUyMGNpdHklMjBzdW5zZXR8ZW58MXx8fHwxNzc0OTM2NjM2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    instructor: 'Майя Урбан',
    level: 'beginner',
    duration: 60,
    style: 'Хатха',
    description:
      'Расслабьтесь после работы: мягкая хатха на крыше с видом на небоскрёбы Нью-Йорка.',
    highlights: [
      'Вид на город',
      'Живая акустика',
      'Время на закате',
      'Премиум-коврики включены',
      'Комбуча после практики',
    ],
    whatToBring: ['Удобная одежда', 'Открытое сердце', 'Можно с друзьями'],
    coordinates: { lat: 40.758, lng: -73.9855 },
    availableSlots: ['18:00', '18:30', '19:00', '19:30'],
    maxParticipants: 20,
    currentParticipants: 12,
  },
  {
    id: '3',
    title: 'Медитация и флоу в лесу',
    location: 'Роща секвой, Калифорния',
    price: 4000,
    rating: 5.0,
    image:
      'https://images.unsplash.com/photo-1694534281717-2f2a12bd2c8a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b2dhJTIwZm9yZXN0JTIwbmF0dXJlJTIwcGVhY2VmdWx8ZW58MXx8fHwxNzc0OTM2NjM2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    instructor: 'Луна Форест',
    level: 'beginner',
    duration: 75,
    style: 'Инь-йога',
    description:
      'Замедлитесь среди древних секвой. Идеально для медитации и глубокого расслабления.',
    highlights: [
      'Древний лес',
      'Звуковое исцеление',
      'Прогулка «лесные купания»',
      'Пение птиц',
      'Органические снеки',
    ],
    whatToBring: ['Слои на погоду', 'Репеллент', 'Дневник (по желанию)'],
    coordinates: { lat: 37.7749, lng: -122.4194 },
    availableSlots: ['09:00', '10:00', '15:00'],
    maxParticipants: 12,
    currentParticipants: 8,
  },
  {
    id: '4',
    title: 'Медленный флоу у озера',
    location: 'Озеро Кристал, Колорадо',
    price: 3800,
    rating: 4.9,
    image:
      'https://images.unsplash.com/photo-1722094250550-4993fa28a51b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b2dhJTIwbGFrZSUyMHdhdGVyJTIwc2VyZW5lfGVufDF8fHx8MTc3NDkzNjYzN3ww&ixlib=rb-4.1.0&q=80&w=1080',
    instructor: 'Ривер Блю',
    level: 'beginner',
    duration: 60,
    style: 'Slow flow',
    description:
      'Мягкий флоу у воды для любого уровня. Энергия спокойного озера поддержит вашу практику.',
    highlights: [
      'Отражение озера',
      'Горы на фоне',
      'По желанию — SUP-йога',
      'Пикник после класса',
      'Наблюдение за дикой природой',
    ],
    whatToBring: ['Купальник (по желанию)', 'Полотенце', 'Акваобувь'],
    coordinates: { lat: 39.7392, lng: -104.9903 },
    availableSlots: ['08:00', '09:00', '17:00'],
    maxParticipants: 15,
    currentParticipants: 7,
  },
  {
    id: '5',
    title: 'Силовая виньяса на пляже',
    location: 'Пляж Санрайз, Бали',
    price: 3000,
    rating: 4.7,
    image:
      'https://images.unsplash.com/photo-1611852794579-57e09deec14b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b2dhJTIwYmVhY2glMjBvY2VhbiUyMHdhdmVzfGVufDF8fHx8MTc3NDkzNjYzN3ww&ixlib=rb-4.1.0&q=80&w=1080',
    instructor: 'Оушен Соул',
    level: 'advanced',
    duration: 90,
    style: 'Пауэр-виньяса',
    description:
      'Динамичная практика на пляже под шум волн. Развиваем силу и гибкость.',
    highlights: [
      'Звук океана',
      'Рассветное время',
      'Продвинутые связки',
      'Свежая кокосовая вода',
      'Атмосфера пляжа',
    ],
    whatToBring: ['Пляжное полотенце', 'Солнцезащитный крем', 'Шляпа', 'Хорошее настроение'],
    coordinates: { lat: -8.65, lng: 115.2167 },
    availableSlots: ['06:00', '07:00'],
    maxParticipants: 25,
    currentParticipants: 18,
  },
  {
    id: '6',
    title: 'Йога при свечах в арт-студии',
    location: 'Галерея, Берлин',
    price: 4200,
    rating: 4.8,
    image:
      'https://images.unsplash.com/photo-1535056889777-5821f7c5b4ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b2dhJTIwc3R1ZGlvJTIwbWluaW1hbCUyMGFydHxlbnwxfHx8fDE3NzQ5MzY2Mzd8MA&ixlib=rb-4.1.0&q=80&w=1080',
    instructor: 'Арт Дзен',
    level: 'intermediate',
    duration: 75,
    style: 'Восстановительная',
    description:
      'Вечерняя практика в современной галерее: искусство, мягкий свет свечей и глубокое расслабление.',
    highlights: [
      'Пространство галереи',
      'Свечи и полумрак',
      'Живая виолончель',
      'Вино и сыр после',
      'Экскурсия по выставке',
    ],
    whatToBring: ['Тёплые носки', 'Открытость', 'Любопытство'],
    coordinates: { lat: 52.52, lng: 13.405 },
    availableSlots: ['19:00', '20:00'],
    maxParticipants: 16,
    currentParticipants: 10,
  },
];
