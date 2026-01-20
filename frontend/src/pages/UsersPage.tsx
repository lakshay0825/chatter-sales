import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Upload, X, Eye } from 'lucide-react';
import { User, UserRole } from '../types';
import { userService, CreateUserData } from '../services/user.service';
import { uploadService } from '../services/upload.service';
import { useAuthStore } from '../store/authStore';
import { openConfirm } from '../components/ConfirmDialog';
import { useLoadingStore } from '../store/loadingStore';
import { formatItalianDate } from '../utils/date';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../utils/errorHandler';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().min(1, 'Name is required'),
  role: z.nativeEnum(UserRole),
  commissionPercent: z.number().min(0).max(100).optional(),
  fixedSalary: z.number().min(0).optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export default function UsersPage() {
  const { user } = useAuthStore();
  const { startLoading, stopLoading } = useLoadingStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filterRole, setFilterRole] = useState<UserRole | ''>('');
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === UserRole.ADMIN;

  // Redirect if not admin
  useEffect(() => {
    if (user && !isAdmin) {
      toast.error('Access denied. Admin only.');
      window.location.href = '/dashboard';
    }
  }, [user, isAdmin]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: UserRole.CHATTER,
    },
  });

  useEffect(() => {
    loadUsers();
  }, [filterRole]);

  // Update form when selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      setValue('name', selectedUser.name);
      setValue('role', selectedUser.role);
      setValue('commissionPercent', selectedUser.commissionPercent || undefined);
      setValue('fixedSalary', selectedUser.fixedSalary || undefined);
      setValue('email', selectedUser.email); // Set email but it will be disabled
    } else {
      reset({
        email: '',
        name: '',
        role: UserRole.CHATTER,
        commissionPercent: undefined,
        fixedSalary: undefined,
      });
    }
  }, [selectedUser, setValue, reset]);

  const loadUsers = async () => {
    if (!isAdmin) return;
    
    setIsLoading(true);
    try {
      const params = filterRole ? { role: filterRole } : {};
      const data = await userService.getUsers(params);
      // Filter out inactive chatters (but keep inactive managers/admins visible)
      const filteredData = data.filter((u) => {
        if (u.role === UserRole.CHATTER && !u.isActive) {
          return false; // Hide inactive chatters
        }
        return true; // Show all others
      });
      setUsers(filteredData);
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { action: 'load', entity: 'users' }));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CreateUserFormData) => {
    startLoading(selectedUser ? 'Updating user...' : 'Creating user...');
    try {
      if (selectedUser) {
        // Update existing user
        const { userService: us } = await import('../services/user.service');
        await us.updateUser(selectedUser.id, {
          name: data.name,
          role: data.role,
          commissionPercent: data.commissionPercent,
          fixedSalary: data.fixedSalary,
        });
        toast.success('User updated successfully');
      } else {
        // Create new user - email is required
        if (!data.email) {
          toast.error('Email is required when creating a new user');
          return;
        }
        
        const userData: CreateUserData = {
          email: data.email,
          name: data.name,
          role: data.role,
          commissionPercent: data.commissionPercent,
          fixedSalary: data.fixedSalary,
        };

        await userService.createUser(userData);
        toast.success('User created and invitation email sent');
      }
      reset();
      setIsModalOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { 
        action: selectedUser ? 'update' : 'create', 
        entity: 'user' 
      }));
    } finally {
      stopLoading();
    }
  };

  const handleDelete = async (userId: string) => {
    const confirmed = await openConfirm({
      title: 'Delete user',
      message: 'Are you sure you want to delete this user?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    startLoading('Deleting user...');
    try {
      await userService.deleteUser(userId);
      toast.success('User deleted successfully');
      loadUsers();
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { 
        action: 'delete', 
        entity: 'user',
        defaultMessage: 'Cannot delete user. This user may have associated sales or shifts. Please remove or reassign them first, then try again.'
      }));
    } finally {
      stopLoading();
    }
  };

  const handleFileSelect = (userId: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-user-id', userId);
      fileInputRef.current.click();
    }
  };

  const handleAvatarSelect = (userId: string) => {
    if (avatarInputRef.current) {
      avatarInputRef.current.setAttribute('data-user-id', userId);
      avatarInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const userId = fileInputRef.current?.getAttribute('data-user-id');

    if (!file || !userId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingPhoto(userId);
    startLoading('Uploading identification photo...');
    try {
      await uploadService.uploadUserIdentificationPhoto(userId, file);
      toast.success('Identification photo uploaded successfully');
      loadUsers();
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { 
        action: 'upload', 
        entity: 'identification photo' 
      }));
    } finally {
      setUploadingPhoto(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      stopLoading();
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const userId = avatarInputRef.current?.getAttribute('data-user-id');

    if (!file || !userId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingAvatar(userId);
    startLoading('Uploading profile photo...');
    try {
      await uploadService.uploadUserAvatar(userId, file);
      toast.success('Profile photo uploaded successfully');
      loadUsers();
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { 
        action: 'upload', 
        entity: 'profile photo' 
      }));
    } finally {
      setUploadingAvatar(null);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
      stopLoading();
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-100 text-red-800';
      case UserRole.CHATTER_MANAGER:
        return 'bg-blue-100 text-blue-800';
      case UserRole.CHATTER:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {!isAdmin ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">This page is only accessible to administrators.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-1">Manage chatters, managers, and admins</p>
            </div>
            <button
              onClick={() => {
                setSelectedUser(null);
                setIsModalOpen(true);
                reset();
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Invite User
            </button>
          </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by Role:</label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as UserRole | '')}
            className="input w-auto"
          >
            <option value="">All Roles</option>
            <option value={UserRole.ADMIN}>Admin</option>
            <option value={UserRole.CHATTER_MANAGER}>Chatter Manager</option>
            <option value={UserRole.CHATTER}>Chatter</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium ${u.avatar ? 'hidden' : ''}`}
                        >
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-500">
                            Joined {formatItalianDate(u.createdAt, 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{u.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(
                          u.role
                        )}`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {u.commissionPercent !== null && u.commissionPercent !== undefined
                        ? `${u.commissionPercent}%`
                        : u.fixedSalary !== null && u.fixedSalary !== undefined
                        ? `$${u.fixedSalary.toFixed(2)}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          u.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAvatarSelect(u.id)}
                          disabled={uploadingAvatar === u.id}
                          className="text-purple-600 hover:text-purple-700 disabled:opacity-50"
                          title="Upload profile photo"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        {u.identificationPhoto && (
                          <button
                            onClick={() => setViewingPhoto({ url: u.identificationPhoto!, name: u.name })}
                            className="text-green-600 hover:text-green-700"
                            title="View identification photo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleFileSelect(u.id)}
                          disabled={uploadingPhoto === u.id}
                          className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                          title="Upload identification photo"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setIsModalOpen(true);
                          }}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-start sm:items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex-1 pr-2">
                {selectedUser ? 'Edit User' : 'Invite New User'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedUser(null);
                  reset();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email {selectedUser && <span className="text-xs text-gray-500 font-normal">(cannot be changed)</span>}
                </label>
                <input
                  type="email"
                  {...register('email', { 
                    required: !selectedUser ? 'Email is required' : false 
                  })}
                  className="input"
                  disabled={!!selectedUser}
                  defaultValue={selectedUser?.email || ''}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input type="text" {...register('name')} className="input" />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select {...register('role')} className="input">
                  <option value={UserRole.CHATTER}>Chatter</option>
                  <option value={UserRole.CHATTER_MANAGER}>Chatter Manager</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commission Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('commissionPercent', { valueAsNumber: true })}
                  className="input"
                  placeholder="0-100"
                />
                {errors.commissionPercent && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.commissionPercent.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fixed Salary ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('fixedSalary', { valueAsNumber: true })}
                  className="input"
                  placeholder="0.00"
                />
                {errors.fixedSalary && (
                  <p className="mt-1 text-sm text-red-600">{errors.fixedSalary.message}</p>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedUser(null);
                    reset();
                  }}
                  className="btn btn-secondary w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary w-full sm:w-auto">
                  {selectedUser ? 'Update User' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

      {/* Hidden file input for identification photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Hidden file input for avatar/profile photo upload */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarUpload}
      />

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Identification Photo - {viewingPhoto.name}
              </h3>
              <button
                onClick={() => setViewingPhoto(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-gray-50" style={{ minHeight: '400px' }}>
              <img
                src={viewingPhoto.url}
                alt="Identification photo"
                className="max-w-full max-h-[calc(90vh-120px)] object-contain rounded-lg shadow-lg"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
