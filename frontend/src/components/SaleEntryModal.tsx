import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SaleType, Creator } from '../types';
import { saleService, CreateSaleData } from '../services/sale.service';
import { creatorService } from '../services/creator.service';
import toast from 'react-hot-toast';
import { getCurrentTimeString, getCurrentTimezoneAbbr } from '../utils/date';

const saleSchema = z.object({
  creatorId: z.string().min(1, 'Creator is required'),
  amount: z.number().positive('Amount must be positive'),
  saleType: z.nativeEnum(SaleType),
  note: z.string().optional(),
  saleDate: z.date().optional(),
});

type SaleFormData = z.infer<typeof saleSchema>;

interface SaleEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SaleEntryModal({ isOpen, onClose, onSuccess }: SaleEntryModalProps) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackdating, setIsBackdating] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [timezoneAbbr, setTimezoneAbbr] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      saleType: SaleType.CAM,
    },
  });

  const selectedCreatorId = watch('creatorId');
  const selectedCreator = creators.find((c) => c.id === selectedCreatorId);

  useEffect(() => {
    if (isOpen) {
      // Reset form to clean defaults every time we open the modal
      reset({
        creatorId: '',
        amount: undefined as unknown as number,
        saleType: SaleType.CAM,
        note: '',
        saleDate: undefined,
      });
      setIsBackdating(false);
      loadCreators();
      updateCurrentTime();
      const interval = setInterval(updateCurrentTime, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (isBackdating) {
      const now = new Date();
      setValue('saleDate', now);
    } else {
      setValue('saleDate', undefined);
    }
  }, [isBackdating, setValue]);

  const loadCreators = async () => {
    try {
      const data = await creatorService.getCreators(true);
      setCreators(data);
      console.log('Creators loaded:', data.length, data);
      if (data.length === 0) {
        toast.error('No active creators found');
      }
    } catch (error: any) {
      console.error('Failed to load creators:', error);
      toast.error(error.response?.data?.error || 'Failed to load creators');
    }
  };

  const updateCurrentTime = () => {
    setCurrentTime(getCurrentTimeString());
    setTimezoneAbbr(getCurrentTimezoneAbbr());
  };

  const onSubmit = async (data: SaleFormData) => {
    setIsLoading(true);
    try {
      const saleData: CreateSaleData = {
        creatorId: data.creatorId,
        amount: data.amount,
        saleType: data.saleType,
        note: data.note,
        saleDate: isBackdating ? data.saleDate : undefined,
      };

      await saleService.createSale(saleData);
      toast.success('Sale added successfully');
      reset();
      setIsBackdating(false);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create sale');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Enter Sale</h2>
            <p className="text-sm text-gray-600 mt-1">
              Insert a new sale for your current working shift
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Date/Time Display */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Today,</span>
              <span className="text-sm font-medium text-gray-700">{currentTime}</span>
              <span className="text-sm text-gray-600">- Italy ({timezoneAbbr})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsBackdating(!isBackdating)}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" />
              Backdate Sale
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Creator Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Creator</label>
            <div className="relative">
              <select
                {...register('creatorId')}
                className="input pl-10 appearance-none"
              >
                <option value="">Select a creator</option>
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
              {selectedCreator && (
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none flex items-center gap-2">
                  {selectedCreator.avatar ? (
                    <img
                      src={selectedCreator.avatar}
                      alt={selectedCreator.name}
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium text-xs">
                      {selectedCreator.name.charAt(0)}
                    </div>
                  )}
                </div>
              )}
            </div>
            {errors.creatorId && (
              <p className="mt-1 text-sm text-red-600">{errors.creatorId.message}</p>
            )}
          </div>

          {/* Sale Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sale Type</label>
            <select {...register('saleType')} className="input">
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
              placeholder="0.00"
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>

          {/* Backdate Date/Time */}
          {isBackdating && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sale Date & Time
              </label>
              <input
                type="datetime-local"
                {...register('saleDate', {
                  setValueAs: (value: string) => (value ? new Date(value) : undefined),
                })}
                className="input"
              />
              {errors.saleDate && (
                <p className="mt-1 text-sm text-red-600">{errors.saleDate.message}</p>
              )}
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note (Optional)
            </label>
            <textarea
              {...register('note')}
              className="input min-h-[100px] resize-none"
              placeholder="Type an optional note..."
            />
            {errors.note && (
              <p className="mt-1 text-sm text-red-600">{errors.note.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

