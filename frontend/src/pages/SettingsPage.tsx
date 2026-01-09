import { useEffect, useState } from 'react';
import { User as UserIcon, Lock, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';
import toast from 'react-hot-toast';
import { useLoadingStore } from '../store/loadingStore';
import type { User } from '../types';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>((user as User) || null);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const { startLoading, stopLoading } = useLoadingStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  // Always load full user profile (including name, isActive) from backend
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const fullUser = await authService.getCurrentUser();
        if (!isMounted) return;
        setProfileUser(fullUser);
        setNameInput(fullUser.name || '');
        // sync auth store so header/sidebar also have full user data
        useAuthStore.setState({ user: fullUser });
      } catch {
        // ignore; fallback to existing store user
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const onSubmitPassword = async (data: ChangePasswordFormData) => {
    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully');
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsUpdatingProfile(true);
    startLoading('Updating profile...');
    try {
      const updatedUser = await authService.updateProfileName(nameInput.trim());
      // Update auth store user so name/status refresh everywhere
      useAuthStore.setState({ user: updatedUser });
      setProfileUser(updatedUser);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
      stopLoading();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Profile
            </div>
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'password'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Change Password
            </div>
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
          <form className="space-y-6" onSubmit={handleUpdateProfile}>
            <div className="flex items-center gap-4">
              {profileUser?.avatar ? (
                <img
                  src={profileUser.avatar}
                  alt={profileUser.name}
                  className="w-20 h-20 rounded-full"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-2xl">
                  {profileUser?.name?.charAt(0) || '?'}
                </div>
              )}
              <div>
                <button type="button" className="btn btn-secondary" disabled>
                  Change Photo
                </button>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF. Max size 2MB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="input"
                  placeholder="Enter your name"
                />
                <p className="text-xs text-gray-500 mt-1">You can update your display name here.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={profileUser?.email || ''}
                    className="input pl-10"
                    disabled
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <input
                  type="text"
                  value={profileUser?.role?.replace('_', ' ') || ''}
                  className="input"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    profileUser?.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {profileUser?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isUpdatingProfile || !nameInput.trim()}
              >
                {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Change Password</h2>
          <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-6 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                {...register('currentPassword')}
                className="input"
                placeholder="Enter current password"
              />
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                {...register('newPassword')}
                className="input"
                placeholder="Enter new password"
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                {...register('confirmPassword')}
                className="input"
                placeholder="Confirm new password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

