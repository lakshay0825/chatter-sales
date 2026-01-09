import { useState } from 'react';
import { LogOut, Settings, Menu, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
    setUserMenuOpen(false);
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-700';
      case 'CHATTER_MANAGER':
        return 'bg-blue-100 text-blue-700';
      case 'CHATTER':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo and Menu button */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            {!logoError ? (
              <Link to="/dashboard" className="flex items-center">
                <img 
                  src="/logo.png" 
                  alt="Creator Advisor" 
                  className="h-8 sm:h-10 w-auto"
                  onError={() => setLogoError(true)}
                />
              </Link>
            ) : (
              <Link to="/dashboard" className="flex items-center">
                <h1 className="text-xl sm:text-2xl font-bold text-primary-600">Creator Advisor</h1>
              </Link>
            )}
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Settings link - hidden on mobile */}
            <Link
              to="/settings"
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </Link>

            {/* User dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900">{user?.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(user?.role)}`}>
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
              </button>

              {/* Dropdown menu */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    <div className="px-4 py-3 border-b border-gray-200 sm:hidden">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className={`text-xs mt-1 inline-block px-2 py-1 rounded-full ${getRoleBadgeColor(user?.role)}`}>
                        {user?.role?.replace('_', ' ')}
                      </p>
                    </div>
                    <Link
                      to="/settings"
                      className="sm:hidden flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-5 h-5" />
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

