import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { goalService, CreateGoalData, UpdateGoalData, Goal } from '../services/goal.service';
import { userService } from '../services/user.service';
import { creatorService } from '../services/creator.service';
import { User, Creator } from '../types';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../utils/errorHandler';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goal?: Goal | null;
  initialMonth?: number;
  initialYear?: number;
}

export default function GoalModal({
  isOpen,
  onClose,
  onSuccess,
  goal,
  initialMonth,
  initialYear,
}: GoalModalProps) {
  const [formData, setFormData] = useState<CreateGoalData>({
    userId: '',
    creatorId: '',
    type: 'SALES',
    target: 0,
    year: initialYear || new Date().getFullYear(),
    month: initialMonth || new Date().getMonth() + 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCreators, setLoadingCreators] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (goal) {
        setFormData({
          userId: goal.userId || '',
          creatorId: goal.creatorId || '',
          type: goal.type,
          target: goal.target,
          year: goal.year,
          month: goal.month,
        });
      } else {
        setFormData({
          userId: '',
          creatorId: '',
          type: 'SALES',
          target: 0,
          year: initialYear || new Date().getFullYear(),
          month: initialMonth || new Date().getMonth() + 1,
        });
      }
      loadUsers();
      loadCreators();
    }
  }, [isOpen, goal, initialMonth, initialYear]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (error: any) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadCreators = async () => {
    setLoadingCreators(true);
    try {
      const data = await creatorService.getCreators();
      setCreators(data);
    } catch (error: any) {
      console.error('Failed to load creators:', error);
    } finally {
      setLoadingCreators(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.target <= 0) {
      toast.error('Target must be greater than 0');
      return;
    }

    if (!formData.userId && !formData.creatorId) {
      toast.error('Please select either a user or creator');
      return;
    }

    if (formData.userId && formData.creatorId) {
      toast.error('Please select either a user OR a creator, not both');
      return;
    }

    setIsLoading(true);
    try {
      if (goal) {
        const updateData: UpdateGoalData = {
          target: formData.target,
          month: formData.month,
        };
        await goalService.updateGoal(goal.id, updateData);
        toast.success('Goal updated successfully');
      } else {
        await goalService.createGoal(formData);
        toast.success('Goal created successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to save goal:', error);
      toast.error(getUserFriendlyError(error, { 
        action: goal ? 'update' : 'create', 
        entity: 'goal' 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-start sm:items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex-1 pr-2">
            {goal ? 'Edit Goal' : 'Create New Goal'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Goal Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Goal Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as 'SALES' | 'COMMISSION' | 'REVENUE' })
              }
              className="input"
              disabled={!!goal}
              required
            >
              <option value="SALES">Sales</option>
              <option value="COMMISSION">Commission</option>
              <option value="REVENUE">Revenue</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.type === 'SALES' && 'Total sales amount target'}
              {formData.type === 'COMMISSION' && 'Commission amount target'}
              {formData.type === 'REVENUE' && 'Revenue amount target'}
            </p>
          </div>

          {/* User or Creator */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User (Optional)</label>
              <select
                value={formData.userId}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    userId: e.target.value,
                    creatorId: e.target.value ? '' : formData.creatorId,
                  });
                }}
                className="input"
                disabled={!!goal || loadingUsers || !!formData.creatorId}
              >
                <option value="">Select user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Creator (Optional)</label>
              <select
                value={formData.creatorId}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    creatorId: e.target.value,
                    userId: e.target.value ? '' : formData.userId,
                  });
                }}
                className="input"
                disabled={!!goal || loadingCreators || !!formData.userId}
              >
                <option value="">Select creator...</option>
                {creators.map((creator) => (
                  <option key={creator.id} value={creator.id}>
                    {creator.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Select either a User OR a Creator. Leave both empty for global goals (if applicable).
            </p>
          </div>

          {/* Year and Month */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="input"
                min="2000"
                max="2100"
                required
                disabled={!!goal}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                className="input"
                required
              >
                <option value="0">Yearly Goal</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select 0 for yearly goals, or a specific month (1-12)
              </p>
            </div>
          </div>

          {/* Target */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Amount ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.target}
              onChange={(e) => setFormData({ ...formData, target: parseFloat(e.target.value) })}
              className="input"
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary w-full sm:w-auto"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={isLoading}>
              {isLoading ? 'Saving...' : goal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

