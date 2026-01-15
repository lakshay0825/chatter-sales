import { useState } from 'react';
import { X, Edit2, Save } from 'lucide-react';
import { monthlyFinancialService } from '../services/monthlyFinancial.service';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../utils/errorHandler';
import { getMonthName } from '../utils/date';

interface CreatorFinancialCardProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  compensationType: string;
  revenueSharePercent?: number;
  fixedSalaryCost?: number;
  grossRevenue: number;
  totalSalesAmount: number;
  creatorEarnings: number;
  marketingCosts: number;
  toolCosts: number;
  otherCosts: number;
  netRevenue: number;
  month: number;
  year: number;
  onUpdate: () => void;
}

export default function CreatorFinancialCard({
  creatorId,
  creatorName,
  creatorAvatar,
  compensationType,
  revenueSharePercent,
  fixedSalaryCost,
  grossRevenue: initialGrossRevenue,
  totalSalesAmount,
  creatorEarnings, // Already calculated from totalSalesAmount in backend
  marketingCosts: initialMarketingCosts,
  toolCosts: initialToolCosts,
  otherCosts: initialOtherCosts,
  netRevenue: initialNetRevenue,
  month,
  year,
  onUpdate,
}: CreatorFinancialCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [grossRevenue, setGrossRevenue] = useState(initialGrossRevenue);
  const [marketingCosts, setMarketingCosts] = useState(initialMarketingCosts);
  const [toolCosts, setToolCosts] = useState(initialToolCosts);
  const [otherCosts, setOtherCosts] = useState(initialOtherCosts);

  // Earnings are calculated from actual sales (totalSalesAmount), not from manually entered grossRevenue
  // The backend already calculates this correctly, so we use the provided creatorEarnings
  // Calculate derived values based on actual sales
  const netRevenue = initialNetRevenue; // Already calculated from totalSalesAmount - creatorEarnings
  const agencyProfit = netRevenue - marketingCosts - toolCosts - otherCosts;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await monthlyFinancialService.upsertMonthlyFinancial(creatorId, year, month, {
        grossRevenue,
        marketingCosts,
        toolCosts,
        otherCosts,
      });
      toast.success('Financial data updated successfully');
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { action: 'update', entity: 'financial data' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setGrossRevenue(initialGrossRevenue);
    setMarketingCosts(initialMarketingCosts);
    setToolCosts(initialToolCosts);
    setOtherCosts(initialOtherCosts);
    setIsEditing(false);
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {creatorAvatar ? (
            <img
              src={creatorAvatar}
              alt={creatorName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium">
              {creatorName.charAt(0)}
            </div>
          )}
          <h3 className="text-lg font-semibold text-gray-900">{creatorName}</h3>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={handleSave}
                className="p-2 text-primary-600 hover:text-primary-700 transition-colors"
                disabled={isLoading}
              >
                <Save className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Financial Breakdown */}
      <div className="space-y-4">
        {/* Total Sales (from all chatters) */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Sales (All Chatters)</span>
          <span className="text-sm font-medium text-gray-900">
            ${totalSalesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Earnings (calculated from actual sales) */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {compensationType === 'PERCENTAGE' 
              ? `Creator Earnings: ${revenueSharePercent}% of Sales` 
              : 'Creator Earnings: Fixed Salary'}
          </span>
          <span className="text-sm font-medium text-red-600">
            -${creatorEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Manual Gross Revenue (for reference) */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">Manual Gross Revenue (Reference)</span>
          {isEditing ? (
            <input
              type="number"
              value={grossRevenue}
              onChange={(e) => setGrossRevenue(parseFloat(e.target.value) || 0)}
              className="w-32 px-3 py-1 text-xs font-medium text-gray-600 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              step="0.01"
              min="0"
            />
          ) : (
            <span className="text-xs font-medium text-gray-500">
              ${grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>

        {/* Net Revenue */}
        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Net Revenue</span>
            <span className="text-sm font-medium text-gray-900">
              ${netRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Costs */}
        <div className="space-y-2 pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Marketing Costs</span>
            {isEditing ? (
              <input
                type="number"
                value={marketingCosts}
                onChange={(e) => setMarketingCosts(parseFloat(e.target.value) || 0)}
                className="w-32 px-3 py-1 text-sm font-medium text-red-600 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                step="0.01"
                min="0"
              />
            ) : (
              <span className="text-sm font-medium text-red-600">
                -${marketingCosts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Tool Costs</span>
            {isEditing ? (
              <input
                type="number"
                value={toolCosts}
                onChange={(e) => setToolCosts(parseFloat(e.target.value) || 0)}
                className="w-32 px-3 py-1 text-sm font-medium text-red-600 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                step="0.01"
                min="0"
              />
            ) : (
              <span className="text-sm font-medium text-red-600">
                -${toolCosts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Other Costs</span>
            {isEditing ? (
              <input
                type="number"
                value={otherCosts}
                onChange={(e) => setOtherCosts(parseFloat(e.target.value) || 0)}
                className="w-32 px-3 py-1 text-sm font-medium text-red-600 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                step="0.01"
                min="0"
              />
            ) : (
              <span className="text-sm font-medium text-red-600">
                -${otherCosts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>

        {/* Agency Profit */}
        <div className="pt-4 border-t-2 border-green-200 bg-green-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg mt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-900">Agency Profit</span>
            <span className="text-lg font-bold text-green-700">
              ${agencyProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

