import { useState, useEffect } from 'react';
import { TrendingUp, Coins, Zap, BarChart3 } from 'lucide-react';
import { dashboardService, AdminDashboardData } from '../services/dashboard.service';
import { creatorService } from '../services/creator.service';
import { getCurrentMonthYear, getMonthName } from '../utils/date';
import { useAuthStore } from '../store/authStore';
import { Creator } from '../types';
import CreatorFinancialCard from '../components/CreatorFinancialCard';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../utils/errorHandler';

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear().month);
  const [selectedYear, setSelectedYear] = useState(getCurrentMonthYear().year);
  const [viewMode, setViewMode] = useState<'monthly' | 'cumulative'>('monthly');

  const isAdmin = user?.role === 'ADMIN';

  // Redirect if not admin
  useEffect(() => {
    if (user && !isAdmin) {
      toast.error('Access denied. Admin only.');
      window.location.href = '/dashboard';
    }
  }, [user, isAdmin]);

  useEffect(() => {
    loadDashboard();
    loadCreators();
  }, [selectedMonth, selectedYear, viewMode]);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const data = await dashboardService.getAdminDashboard(
        selectedMonth,
        selectedYear,
        viewMode === 'cumulative'
      );
      setDashboardData(data);
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { action: 'load', entity: 'admin dashboard' }));
    } finally {
      setIsLoading(false);
    }
  };

  const loadCreators = async () => {
    try {
      const data = await creatorService.getCreators(true);
      setCreators(data);
    } catch (error: any) {
      // Silently fail - avatars are optional
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Use empty data if dashboardData is null
  const safeDashboardData = dashboardData || {
    month: selectedMonth,
    year: selectedYear,
    chatterRevenue: [],
    totalCommissions: 0,
    creatorFinancials: [],
  };

  // Calculate totals
  const totalRevenue = safeDashboardData.chatterRevenue.reduce((sum, item) => sum + item.revenue, 0);
  const totalCommissions = safeDashboardData.totalCommissions;
  const totalAgencyEarnings = safeDashboardData.creatorFinancials.reduce(
    (sum, item) => sum + item.netRevenue,
    0
  );
  
  const hasNoData = safeDashboardData.chatterRevenue.length === 0 && safeDashboardData.creatorFinancials.length === 0;

  // Generate month options
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Recap Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode('cumulative')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'cumulative'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cumulative
            </button>
          </div>
          <select
            value={`${selectedMonth}-${selectedYear}`}
            onChange={(e) => {
              const [month, year] = e.target.value.split('-').map(Number);
              setSelectedMonth(month);
              setSelectedYear(year);
            }}
            className="input w-auto"
          >
            {months.map((month) => (
              <option key={month} value={`${month}-${selectedYear}`}>
                {getMonthName(month)} {selectedYear}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100/50 border-primary-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-500 rounded-xl shadow-sm">
              <Coins className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500">All sales revenue</p>
        </div>

        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500 rounded-xl shadow-sm">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Commissions</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            ${totalCommissions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500">Paid to chatters</p>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500 rounded-xl shadow-sm">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Agency Earnings</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            ${totalAgencyEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500">Net profit</p>
        </div>
      </div>

      {/* Revenue Per Chatter */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Revenue Per Chatter</h2>
          <select
            value={`${selectedMonth}-${selectedYear}`}
            onChange={(e) => {
              const [month, year] = e.target.value.split('-').map(Number);
              setSelectedMonth(month);
              setSelectedYear(year);
            }}
            className="input w-auto"
          >
            {months.map((month) => (
              <option key={month} value={`${month}-${selectedYear}`}>
                {getMonthName(month)} {selectedYear}
              </option>
            ))}
          </select>
        </div>
        {hasNoData && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              No revenue data available for {getMonthName(selectedMonth)} {selectedYear}. Sales data will appear here once chatters start logging sales.
            </p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Chatter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Commissions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {safeDashboardData.chatterRevenue.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No chatter revenue data available
                  </td>
                </tr>
              ) : (
                safeDashboardData.chatterRevenue.map((item) => (
                <tr key={item.chatterId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-xs">
                        {item.chatterName.charAt(0)}
                      </div>
                      <span className="text-sm text-gray-900">{item.chatterName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${item.commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {safeDashboardData.chatterRevenue.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            Showing 1-{safeDashboardData.chatterRevenue.length} of {safeDashboardData.chatterRevenue.length} chatters
          </div>
        )}
      </div>

      {/* Creator Financial Breakdown */}
      {safeDashboardData.creatorFinancials.length === 0 ? (
        <div className="card">
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Creator Financial Data</h3>
            <p className="text-gray-600">
              Creator financial breakdowns will appear here once monthly financial data is entered for {getMonthName(selectedMonth)} {selectedYear}.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {safeDashboardData.creatorFinancials.map((creatorFinancial) => {
            const creator = creators.find((c) => c.id === creatorFinancial.creatorId);
            return (
              <CreatorFinancialCard
                key={creatorFinancial.creatorId}
                creatorId={creatorFinancial.creatorId}
                creatorName={creatorFinancial.creatorName}
                creatorAvatar={creator?.avatar}
                compensationType={creatorFinancial.compensationType}
                revenueSharePercent={creatorFinancial.revenueSharePercent}
                fixedSalaryCost={creatorFinancial.fixedSalaryCost}
                grossRevenue={creatorFinancial.grossRevenue}
                totalSalesAmount={creatorFinancial.totalSalesAmount}
                creatorEarnings={creatorFinancial.creatorEarnings}
                marketingCosts={creatorFinancial.marketingCosts}
                toolCosts={creatorFinancial.toolCosts}
                otherCosts={creatorFinancial.otherCosts}
                netRevenue={creatorFinancial.netRevenue}
                month={selectedMonth}
                year={selectedYear}
                onUpdate={loadDashboard}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
