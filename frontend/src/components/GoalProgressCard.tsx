import { Trophy, Target, TrendingUp, CheckCircle2 } from 'lucide-react';
import { GoalProgress } from '../services/goal.service';
import type { Creator } from '../types';

interface GoalProgressCardProps {
  progress: GoalProgress;
  onViewDetails?: () => void;
  creatorDetails?: Creator; // Optional creator info (avatar + name) for creator-level goals
  isChatterView?: boolean;  // When true, copy explains bonus in chatter-friendly terms
}

export default function GoalProgressCard({ progress, onViewDetails, creatorDetails, isChatterView }: GoalProgressCardProps) {
  const { goal, current, target, progress: progressPercent, remaining, achieved } = progress;

  const getProgressColor = () => {
    if (achieved) return 'bg-green-500';
    if (progressPercent >= 75) return 'bg-blue-500';
    if (progressPercent >= 50) return 'bg-yellow-500';
    if (progressPercent >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getGoalTypeLabel = () => {
    switch (goal.type) {
      case 'SALES':
        return 'Sales';
      case 'COMMISSION':
        return 'Commission';
      case 'REVENUE':
        return 'Revenue';
      default:
        return goal.type;
    }
  };

  const getGoalPeriod = () => {
    if (goal.month === 0) {
      return `${goal.year} (Yearly)`;
    }
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${months[goal.month - 1]} ${goal.year}`;
  };

  const getGoalScope = () => {
    if (goal.user) {
      return `User goal for ${goal.user.name}`;
    }
    if (goal.creator) {
      return `Creator goal for ${goal.creator.name}`;
    }
    return 'Global goal';
  };

  const renderCreatorBadge = () => {
    if (!goal.creator) return null;
    const displayName = creatorDetails?.name || goal.creator.name;
    const initial = displayName.charAt(0).toUpperCase();
    const avatar = creatorDetails?.avatar;

    return (
      <div className="flex items-center gap-2 mt-1">
        {avatar ? (
          <img
            src={avatar}
            alt={displayName}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-semibold">
            {initial}
          </div>
        )}
        <span className="text-xs font-medium text-gray-700">Creator: {displayName}</span>
      </div>
    );
  };

  const renderBonusDescription = () => {
    if (!goal.bonusAmount || goal.bonusAmount <= 0) return null;

    // Human-friendly description of what unlocks the bonus
    const baseText = `$${goal.bonusAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    if (goal.creator) {
      const creatorName = creatorDetails?.name || goal.creator.name;
      const metricLabel =
        goal.type === 'SALES'
          ? 'sales'
          : goal.type === 'COMMISSION'
          ? 'commission'
          : 'revenue';

      // Chatter-facing copy
      return (
        <p className="text-xs text-gray-600">
          {isChatterView
            ? `${baseText} bonus will be unlocked for chatters if ${creatorName} reaches ${metricLabel} of $${goal.target.toLocaleString(
                'en-US',
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )} in this period.`
            : `Bonus: ${baseText} when ${creatorName} reaches ${metricLabel} of $${goal.target.toLocaleString(
                'en-US',
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}.`}
        </p>
      );
    }

    // Fallback for non-creator goals
    return (
      <p className="text-xs text-gray-600">
        Bonus: {baseText} will be unlocked when this goal is achieved.
      </p>
    );
  };

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">{getGoalTypeLabel()} Goal</h3>
            {achieved && (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            )}
          </div>
          <p className="text-sm text-gray-600 mb-1">{getGoalPeriod()}</p>
          <p className="text-xs text-gray-500">{getGoalScope()}</p>
          {renderCreatorBadge()}
        </div>
        {achieved && (
          <div className="p-2 bg-green-100 rounded-full">
            <Trophy className="w-6 h-6 text-green-600" />
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-bold text-gray-900">{progressPercent.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-300 rounded-full flex items-center justify-end pr-2`}
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          >
            {progressPercent > 10 && (
              <span className="text-xs font-bold text-white">
                {progressPercent.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-500 mb-1">Current</p>
          <p className="text-lg font-bold text-gray-900">
            ${current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Target</p>
          <p className="text-lg font-bold text-gray-900">
            ${target.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {goal.bonusAmount && goal.bonusAmount > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Bonus when goal is reached</p>
          <p className="text-sm font-semibold text-gray-900 mb-1">
            ${goal.bonusAmount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          {renderBonusDescription()}
        </div>
      )}

      {!achieved && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">
              Remaining: ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {achieved && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Goal Achieved!</span>
          </div>
        </div>
      )}

      {onViewDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onViewDetails}
            className="w-full btn btn-secondary text-sm"
          >
            View Details
          </button>
        </div>
      )}
    </div>
  );
}

