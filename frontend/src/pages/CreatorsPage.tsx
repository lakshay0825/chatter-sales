import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, MoreVertical, Upload } from 'lucide-react';
import { Creator, UserRole } from '../types';
import { creatorService, CreateCreatorData } from '../services/creator.service';
import { uploadService } from '../services/upload.service';
import { openConfirm } from '../components/ConfirmDialog';
import { formatItalianDate } from '../utils/date';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../store/authStore';
import { useLoadingStore } from '../store/loadingStore';

const createCreatorSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    compensationType: z.enum(['PERCENTAGE', 'SALARY']),
    revenueSharePercent: z.number().min(0).max(100).optional(),
    fixedSalaryCost: z.number().min(0).optional(),
  })
  .refine(
    (data) => {
      if (data.compensationType === 'PERCENTAGE') {
        return data.revenueSharePercent !== undefined && data.revenueSharePercent > 0;
      }
      if (data.compensationType === 'SALARY') {
        return data.fixedSalaryCost !== undefined && data.fixedSalaryCost > 0;
      }
      return true;
    },
    {
      message: 'Compensation value is required based on compensation type',
      path: ['revenueSharePercent'],
    }
  );

type CreateCreatorFormData = z.infer<typeof createCreatorSchema>;

export default function CreatorsPage() {
  const { user } = useAuthStore();
  const { startLoading, stopLoading } = useLoadingStore();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    watch,
  } = useForm<CreateCreatorFormData>({
    resolver: zodResolver(createCreatorSchema),
    defaultValues: {
      compensationType: 'PERCENTAGE',
    },
  });

  const compensationType = watch('compensationType');

  useEffect(() => {
    if (isAdmin) {
      loadCreators();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedCreator) {
      reset({
        name: selectedCreator.name,
        compensationType: selectedCreator.compensationType as 'PERCENTAGE' | 'SALARY',
        revenueSharePercent: selectedCreator.revenueSharePercent || undefined,
        fixedSalaryCost: selectedCreator.fixedSalaryCost || undefined,
      });
    }
  }, [selectedCreator, reset]);

  const loadCreators = async () => {
    if (!isAdmin) return;
    
    setIsLoading(true);
    try {
      const data = await creatorService.getCreators();
      setCreators(data);
    } catch (error: any) {
      toast.error('Failed to load creators');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CreateCreatorFormData) => {
    startLoading(selectedCreator ? 'Updating creator...' : 'Creating creator...');
    try {
      const creatorData: CreateCreatorData = {
        name: data.name,
        compensationType: data.compensationType,
        revenueSharePercent:
          data.compensationType === 'PERCENTAGE' ? data.revenueSharePercent : undefined,
        fixedSalaryCost: data.compensationType === 'SALARY' ? data.fixedSalaryCost : undefined,
      };

      if (selectedCreator) {
        await creatorService.updateCreator(selectedCreator.id, creatorData);
        toast.success('Creator updated successfully');
      } else {
        await creatorService.createCreator(creatorData);
        toast.success('Creator created successfully');
      }

      reset();
      setIsModalOpen(false);
      setSelectedCreator(null);
      loadCreators();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save creator');
    } finally {
      stopLoading();
    }
  };

  const handleDelete = async (creatorId: string) => {
    const confirmed = await openConfirm({
      title: 'Delete creator',
      message: 'Are you sure you want to delete this creator?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    startLoading('Deleting creator...');
    try {
      await creatorService.deleteCreator(creatorId);
      toast.success('Creator deleted successfully');
      loadCreators();
    } catch (error: any) {
      toast.error('Failed to delete creator');
    } finally {
      stopLoading();
    }
  };

  const handleFileSelect = (creatorId: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-creator-id', creatorId);
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const creatorId = fileInputRef.current?.getAttribute('data-creator-id');

    if (!file || !creatorId) return;

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

    setUploadingPhoto(creatorId);
    startLoading('Uploading identification photo...');
    try {
      await uploadService.uploadCreatorIdentificationPhoto(creatorId, file);
      toast.success('Identification photo uploaded successfully');
      loadCreators();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload identification photo');
    } finally {
      setUploadingPhoto(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      stopLoading();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Creators</h1>
          <p className="text-gray-600 mt-1">Manage OnlyFans creators</p>
        </div>
        <button
          onClick={() => {
            setSelectedCreator(null);
            setIsModalOpen(true);
            reset();
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Creator
        </button>
      </div>

      {/* Creators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          creators.map((creator) => (
            <div key={creator.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {creator.avatar ? (
                    <img
                      src={creator.avatar}
                      alt={creator.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium text-lg">
                      {creator.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{creator.name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        creator.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {creator.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Compensation:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {creator.compensationType === 'PERCENTAGE'
                      ? `${creator.revenueSharePercent}%`
                      : `$${creator.fixedSalaryCost?.toFixed(2)}/month`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Type:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {creator.compensationType}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Created:</span>
                  <span className="text-sm text-gray-900">
                    {formatItalianDate(creator.createdAt, 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleFileSelect(creator.id)}
                  disabled={uploadingPhoto === creator.id}
                  className="btn btn-secondary flex items-center justify-center gap-2 disabled:opacity-50"
                  title="Upload identification photo"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingPhoto === creator.id ? 'Uploading...' : 'Upload ID Photo'}
                </button>
                <button
                  onClick={() => {
                    setSelectedCreator(creator);
                    setIsModalOpen(true);
                  }}
                  className="flex-1 btn btn-secondary flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(creator.id)}
                  className="btn btn-danger flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Creator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedCreator ? 'Edit Creator' : 'Add Creator'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedCreator(null);
                  reset();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input type="text" {...register('name')} className="input" />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compensation Type
                </label>
                <select {...register('compensationType')} className="input">
                  <option value="PERCENTAGE">Percentage of Revenue</option>
                  <option value="SALARY">Fixed Salary</option>
                </select>
                {errors.compensationType && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.compensationType.message}
                  </p>
                )}
              </div>

              {compensationType === 'PERCENTAGE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Revenue Share Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('revenueSharePercent', { valueAsNumber: true })}
                    className="input"
                    placeholder="0-100"
                  />
                  {errors.revenueSharePercent && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.revenueSharePercent.message}
                    </p>
                  )}
                </div>
              )}

              {compensationType === 'SALARY' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fixed Salary Cost ($/month)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('fixedSalaryCost', { valueAsNumber: true })}
                    className="input"
                    placeholder="0.00"
                  />
                  {errors.fixedSalaryCost && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.fixedSalaryCost.message}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedCreator(null);
                    reset();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedCreator ? 'Update Creator' : 'Create Creator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}
