import { useState, useEffect } from 'react';
import { Plus, Target, Filter, Trash2, Edit2, Gift } from 'lucide-react';
import { goalService, Goal, GoalProgress } from '../services/goal.service';
import { useAuthStore } from '../store/authStore';
import { isAdmin } from '../utils/permissions';
import { openConfirm } from '../components/ConfirmDialog';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../utils/errorHandler';
import GoalModal from '../components/GoalModal';
import GoalProgressCard from '../components/GoalProgressCard';
import { creatorService } from '../services/creator.service';
import type { Creator } from '../types';

export default function GoalsPage() {
  const { user } = useAuthStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalProgresses, setGoalProgresses] = useState<Map<string, GoalProgress>>(new Map());
  const [creators, setCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    loadGoals();
  }, [selectedYear, selectedMonth, selectedType, user]);

  useEffect(() => {
    // Load creators so we can show avatar + name on creator-level goals
    const loadCreators = async () => {
      try {
        const data = await creatorService.getCreators(true);
        setCreators(data);
      } catch {
        // If this fails, we still show creator name from goal object
      }
    };
    loadCreators();
  }, []);

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
      // Chatters/chatter managers: backend returns their personal goals + all creator-level goals (no userId filter)

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
      toast.error(getUserFriendlyError(error, { action: 'delete', entity: 'goal' }));
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
              <option value="0">Full year (yearly)</option>
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
            const creatorDetails =
              goal.creatorId ? creators.find((c) => c.id === goal.creatorId) : undefined;
            return (
              <div key={goal.id} className="relative">
                {progress ? (
                  <GoalProgressCard
                    progress={progress}
                    creatorDetails={creatorDetails}
                    isChatterView={!isAdmin(user)}
                    canEdit={isAdmin(user)}
                  />
                ) : (
                  <div className="card">
                    {/* Top row: Creator (photo + name) + Prize (gift + amount) */}
                    <div className="flex flex-wrap items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                      {(goal.creatorId || goal.creator) && (
                        <div className="flex items-center gap-2">
                          {creatorDetails?.avatar ? (
                            <img
                              src={creatorDetails.avatar}
                              alt={creatorDetails.name}
                              className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-semibold ring-2 ring-white shadow-sm">
                              {(creatorDetails?.name || goal.creator?.name || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Creator</p>
                            <p className="text-sm font-semibold text-gray-900">{creatorDetails?.name || goal.creator?.name || 'Unknown'}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Prize when reached</p>
                          <p className="text-sm font-bold text-amber-700">
                            {goal.bonusAmount != null && goal.bonusAmount > 0
                              ? `$${goal.bonusAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : 'No bonus set'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {goal.type === 'SALES' ? 'Sales' : goal.type === 'COMMISSION' ? 'Commission' : 'Revenue'} Goal
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
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

      {/* How bonuses work */}
      <div className="card bg-amber-50/50 border-amber-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">How bonuses work</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
          <li>
            <strong>Who gets the bonus:</strong> The prize on a goal is a <strong>$ bonus for chatters</strong> when the creator’s revenue (or sales) target is reached. The creator (e.g. BIANCA) is the account whose revenue we track; chatters earn the bonus when that target is hit.
          </li>
          <li>
            <strong>How chatters know they got a bonus:</strong> On this Goals page, when a goal shows <strong>“Goal Achieved!”</strong> and a prize amount, that bonus is earned. The card will say <strong>“You earned a bonus!”</strong> and that the amount will appear in Payments once paid.
          </li>
          <li>
            <strong>Where to check the bonus once it’s paid:</strong> Chatters see it in <strong>Dashboard (Chatter Detail) → Payment History</strong>. Admins pay the bonus by going to each chatter’s Chatter Detail and using <strong>Register Payment</strong>; that payment then appears in that chatter’s Payment History.
          </li>
        </ul>
      </div>

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

