import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Calendar, Users, UserCog, BarChart3, BookOpen, Settings, X, TrendingUp, Target, FileText } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMIN;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/sales', label: 'Sales Report', icon: ShoppingCart },
    { path: '/shifts', label: 'Shifts', icon: Calendar },
    { path: '/analytics', label: 'Analytics', icon: TrendingUp },
    { path: '/goals', label: 'Goals', icon: Target },
    { path: '/guidelines', label: 'Guidelines', icon: FileText },
    { path: '/e-learning', label: 'E-Learning', icon: BookOpen },
    ...(isAdmin
      ? [
          { path: '/users', label: 'Users', icon: Users },
          { path: '/creators', label: 'Creators', icon: UserCog },
        ]
      : []),
    ...(isAdmin ? [{ path: '/admin', label: 'Admin Recap', icon: BarChart3 }] : []),
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 overflow-y-auto h-[calc(100vh-4rem)]">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-500 text-white font-medium shadow-sm'
                          : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] sticky top-16">
        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-500 text-white font-medium shadow-sm'
                          : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}

