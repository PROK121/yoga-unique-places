import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AdminProvider } from './context/AdminContext';
import { AuthProvider } from './context/AuthContext';
import { BookingsProvider } from './context/BookingsContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { SupportProvider } from './context/SupportContext';
import { YogaClassesProvider } from './context/YogaClassesContext';
import { router } from './routes';

export default function App() {
  return (
    <YogaClassesProvider>
      <AuthProvider>
        <FavoritesProvider>
          <BookingsProvider>
            <SupportProvider>
              <NotificationsProvider>
                <AdminProvider>
                  <RouterProvider router={router} />
                  <Toaster position="top-center" richColors closeButton />
                </AdminProvider>
              </NotificationsProvider>
            </SupportProvider>
          </BookingsProvider>
        </FavoritesProvider>
      </AuthProvider>
    </YogaClassesProvider>
  );
}
