import { useState, useEffect } from 'react';
import { Plus, Target, Filter, Trash2, Edit2 } from 'lucide-react';
import { goalService, Goal, GoalProgress } from '../services/goal.service';
import { useAuthStore } from '../store/authStore';
import { isAdmin } from '../utils/permissions';
import { openConfirm } from '../components/ConfirmDialog';
import toast from 'react-hot-toast';
import GoalModal from '../components/GoalModal';
import GoalProgressCard from '../components/GoalProgressCard';

export default function GoalsPage() {
  const { user } = useAuthStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalProgresses, setGoalProgresses] = useState<Map<string, GoalProgress>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    loadGoals();
  }, [selectedYear, selectedMonth, selectedType, user]);

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      const filters: any = {
        year: selectedYear,
      };
      if (selectedMonth !== null) {
        filters.month = selectedMonth;
      }
      if (selectedType) {
        filters.type = selectedType;
      }
      if (!isAdmin(user)) {
        filters.userId = user?.id;
      }

      const goalsData = await goalService.getGoals(filters);
      setGoals(goalsData);

      // Load progress for each goal
      const progressMap = new Map<string, GoalProgress>();
      for (const goal of goalsData) {
        try {
          const progress = await goalService.getGoalProgress(goal.id);
          progressMap.set(goal.id, progress);
        } catch (error: any) {
          console.error(`Failed to load progress for goal ${goal.id}:`, error);
        }
      }
      setGoalProgresses(progressMap);
    } catch (error: any) {
      console.error('Failed to load goals:', error);
      toast.error('Failed to load goals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGoal = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleDeleteGoal = async (goalId: string) => {
    const confirmed = await openConfirm({
      title: 'Delete goal',
      message: 'Are you sure you want to delete this goal?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await goalService.deleteGoal(goalId);
      toast.success('Goal deleted successfully');
      loadGoals();
    } catch (error: any) {
      console.error('Failed to delete goal:', error);
      toast.error(error.response?.data?.error || 'Failed to delete goal');
    }
  };

  const handleModalSuccess = () => {
    loadGoals();
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Goals & Targets</h1>
          <p className="text-sm text-gray-600 mt-1">Set and track your performance goals</p>
        </div>
        {isAdmin(user) && (
          <button
            onClick={handleCreateGoal}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Goal
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="input"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={selectedMonth === null ? '' : selectedMonth}
              onChange={(e) =>
                setSelectedMonth(e.target.value === '' ? null : parseInt(e.target.value))
              }
              className="input"
            >
              <option value="">All Months</option>
              <option value="0">Yearly Goals</option>
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input"
            >
              <option value="">All Types</option>
              <option value="SALES">Sales</option>
              <option value="COMMISSION">Commission</option>
              <option value="REVENUE">Revenue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="card text-center py-12">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Goals Found</h3>
          <p className="text-gray-600 mb-6">
            {isAdmin(user)
              ? 'Create your first goal to start tracking performance targets.'
              : 'No goals have been set for you yet.'}
          </p>
          {isAdmin(user) && (
            <button onClick={handleCreateGoal} className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Goal
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const progress = goalProgresses.get(goal.id);
            return (
              <div key={goal.id} className="relative">
                {progress ? (
                  <GoalProgressCard progress={progress} />
                ) : (
                  <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="w-5 h-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {goal.type === 'SALES' ? 'Sales' : goal.type === 'COMMISSION' ? 'Commission' : 'Revenue'} Goal
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Target: ${goal.target.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {goal.month === 0
                        ? `${goal.year} (Yearly)`
                        : `${new Date(goal.year, goal.month - 1).toLocaleString('default', { month: 'long' })} ${goal.year}`}
                    </p>
                  </div>
                )}

                {isAdmin(user) && (
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                      onClick={() => handleEditGoal(goal)}
                      className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-primary-600 hover:bg-primary-50"
                      title="Edit Goal"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-red-600 hover:bg-red-50"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Modal */}
      <GoalModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        goal={editingGoal}
        initialMonth={selectedMonth || undefined}
        initialYear={selectedYear}
      />
    </div>
  );
}

