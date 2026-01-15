import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sale, SaleType, Creator, UserRole } from '../types';
import { saleService, UpdateSaleData } from '../services/sale.service';
import { creatorService } from '../services/creator.service';
import { useAuthStore } from '../store/authStore';
import { canEditSale, canReassignSales } from '../utils/permissions';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../utils/errorHandler';

const updateSaleSchema = z.object({
  creatorId: z.string().min(1, 'Creator is required'),
  amount: z.number().positive('Amount must be positive'),
  saleType: z.nativeEnum(SaleType),
  note: z.string().optional(),
  saleDate: z.date().optional(),
  userId: z.string().optional(),
});

type UpdateSaleFormData = z.infer<typeof updateSaleSchema>;

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sale: Sale | null;
}

export default function EditSaleModal({
  isOpen,
  onClose,
  onSuccess,
  sale,
}: EditSaleModalProps) {
  const { user } = useAuthStore();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [canEdit, setCanEdit] = useState(true);

  const canReassign = canReassignSales(user);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateSaleFormData>({
    resolver: zodResolver(updateSaleSchema),
  });

  useEffect(() => {
    if (isOpen && sale) {
      loadCreators();
      if (canReassign) {
        loadUsers();
      }
      checkEditPermission();
      reset({
        creatorId: sale.creatorId,
        amount: sale.amount,
        saleType: sale.saleType,
        note: sale.note || '',
        saleDate: new Date(sale.saleDate),
        userId: sale.userId,
      });
    }
  }, [isOpen, sale, canReassign]);

  const loadCreators = async () => {
    try {
      const data = await creatorService.getCreators(true);
      setCreators(data);
      console.log('EditSaleModal: Creators loaded:', data.length, data);
      if (data.length === 0) {
        toast.error('No active creators found');
      }
    } catch (error: any) {
      console.error('EditSaleModal: Failed to load creators:', error);
      toast.error(getUserFriendlyError(error, { action: 'load', entity: 'creators' }));
    }
  };

  const loadUsers = async () => {
    try {
      const { userService } = await import('../services/user.service');
      const data = await userService.getUsers({ role: UserRole.CHATTER });
      setUsers(data);
    } catch (error) {
      // Silently fail
    }
  };

  const checkEditPermission = () => {
    if (!sale || !user) {
      setCanEdit(false);
      return;
    }

    const hasPermission = canEditSale(user, sale.userId, sale.saleDate);
    
    if (!hasPermission) {
      if (sale.userId !== user.id) {
        toast.error('You can only edit your own sales');
      } else {
        toast.error('Sales can only be edited within 24 hours');
      }
    }
    
    setCanEdit(hasPermission);
  };

  const onSubmit = async (data: UpdateSaleFormData) => {
    if (!sale || !canEdit) return;

    setIsLoading(true);
    try {
      const updateData: UpdateSaleData = {
        creatorId: data.creatorId,
        amount: data.amount,
        saleType: data.saleType,
        note: data.note,
        saleDate: data.saleDate,
        userId: canReassign ? data.userId : undefined,
      };

      await saleService.updateSale(sale.id, updateData);
      toast.success('Sale updated successfully');
      reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { action: 'update', entity: 'sale' }));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !sale) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex-1 pr-2">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Sale</h2>
            {!canEdit && (
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                This sale cannot be edited (24-hour limit or insufficient permissions)
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Creator Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Creator</label>
            <select {...register('creatorId')} className="input" disabled={!canEdit}>
              {creators.length === 0 ? (
                <option value="" disabled>Loading creators...</option>
              ) : (
                creators.map((creator) => (
                  <option key={creator.id} value={creator.id}>
                    {creator.name}
                  </option>
                ))
              )}
            </select>
            {errors.creatorId && (
              <p className="mt-1 text-sm text-red-600">{errors.creatorId.message}</p>
            )}
          </div>

          {/* Sale Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sale Type</label>
            <select {...register('saleType')} className="input" disabled={!canEdit}>
              <option value={SaleType.CAM}>CAM</option>
              <option value={SaleType.TIP}>TIP</option>
              <option value={SaleType.PPV}>PPV</option>
              <option value={SaleType.INITIAL}>INITIAL</option>
              <option value={SaleType.CUSTOM}>CUSTOM</option>
            </select>
            {errors.saleType && (
              <p className="mt-1 text-sm text-red-600">{errors.saleType.message}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              className="input"
              disabled={!canEdit}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>

          {/* Reassign User (Managers/Admins only) */}
          {canReassign && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reassign to Chatter
              </label>
              <select {...register('userId')} className="input">
                <option value={sale.userId}>Keep current assignment</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sale Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sale Date & Time
            </label>
            <input
              type="datetime-local"
              {...register('saleDate', { valueAsDate: true })}
              className="input"
              disabled={!canEdit}
            />
            {errors.saleDate && (
              <p className="mt-1 text-sm text-red-600">{errors.saleDate.message}</p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Note (Optional)</label>
            <textarea
              {...register('note')}
              className="input min-h-[100px] resize-none"
              placeholder="Type an optional note..."
              disabled={!canEdit}
            />
            {errors.note && (
              <p className="mt-1 text-sm text-red-600">{errors.note.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary w-full sm:w-auto"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary w-full sm:w-auto"
              disabled={isLoading || !canEdit}
            >
              {isLoading ? 'Updating...' : 'Update Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

