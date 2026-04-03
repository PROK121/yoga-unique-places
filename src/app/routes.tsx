import { createBrowserRouter } from 'react-router-dom';
import Home from './screens/Home';
import Discovery from './screens/Discovery';
import ClassDetail from './screens/ClassDetail';
import Booking from './screens/Booking';
import Bookings from './screens/Bookings';
import Profile from './screens/Profile';
import PhoneAuth from './screens/PhoneAuth';
import Admin from './screens/Admin';
import SupportChat from './screens/SupportChat';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Home,
  },
  {
    path: '/discover',
    Component: Discovery,
  },
  {
    path: '/class/:id',
    Component: ClassDetail,
  },
  {
    path: '/booking/:id',
    Component: Booking,
  },
  {
    path: '/bookings',
    Component: Bookings,
  },
  {
    path: '/profile',
    Component: Profile,
  },
  {
    path: '/auth',
    Component: PhoneAuth,
  },
  {
    path: '/admin',
    Component: Admin,
  },
  {
    path: '/support',
    Component: SupportChat,
  },
]);
