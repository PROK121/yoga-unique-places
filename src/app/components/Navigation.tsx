import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Calendar, User } from 'lucide-react';

export function Navigation() {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Главная', path: '/' },
    { icon: Search, label: 'Поиск', path: '/discover' },
    { icon: Calendar, label: 'Брони', path: '/bookings' },
    { icon: User, label: 'Профиль', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-md mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-gray-500'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'fill-indigo-600' : ''}`} />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
