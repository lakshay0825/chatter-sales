import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  
  // Check if there's a token in localStorage - if yes, we're still checking auth
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('token') !== null;
  
  // If we have a token but are still loading, show loading spinner
  // This prevents the flash of login page when user is already authenticated
  if (isLoading || (hasToken && !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Only redirect to login if we're sure the user is not authenticated
  // (no token AND auth check completed)
  if (!isAuthenticated && !hasToken) {
    // Preserve the current location so we can redirect back after login
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}

