import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import SalesPage from './pages/SalesPage';
import ShiftsPage from './pages/ShiftsPage';
import UsersPage from './pages/UsersPage';
import CreatorsPage from './pages/CreatorsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import GoalsPage from './pages/GoalsPage';
import GuidelinesPage from './pages/GuidelinesPage';
import ELearningPage from './pages/ELearningPage';
import SettingsPage from './pages/SettingsPage';
import ChatterDetailPage from './pages/ChatterDetailPage';

function App() {
  const { checkAuth, isAuthenticated, isLoading, user } = useAuthStore();
  const getDefaultPath = () => {
    if (!user) return '/dashboard';
    if (user.role === 'ADMIN') return '/admin';
    return `/chatter/${user.id}`;
  };


  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route
          path="/login"
          element={
            isLoading ? (
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : isAuthenticated ? (
              <Navigate to={getDefaultPath()} replace />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/register"
          element={
            isLoading ? (
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : isAuthenticated ? (
              <Navigate to={getDefaultPath()} replace />
            ) : (
              <RegisterPage />
            )
          }
        />
        <Route
          path="/forgot-password"
          element={
            isLoading ? (
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : isAuthenticated ? (
              <Navigate to={getDefaultPath()} replace />
            ) : (
              <ForgotPasswordPage />
            )
          }
        />
        <Route
          path="/reset-password"
          element={
            isLoading ? (
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <ResetPasswordPage />
            )
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to={getDefaultPath()} replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="shifts" element={<ShiftsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="guidelines" element={<GuidelinesPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="creators" element={<CreatorsPage />} />
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="chatter/:userId" element={<ChatterDetailPage />} />
          <Route path="e-learning" element={<ELearningPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        {/* Catch-all route - only redirect to dashboard if authenticated, otherwise to login */}
        <Route
          path="*"
          element={
            isLoading ? (
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

