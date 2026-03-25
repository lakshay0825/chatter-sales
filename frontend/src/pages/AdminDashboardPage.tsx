import { useState, useEffect } from 'react';
import { TrendingUp, Coins, Zap, BarChart3, Plus, Trash2 } from 'lucide-react';
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
  const [globalFixedCostsDraft, setGlobalFixedCostsDraft] = useState<Array<{ name: string; amount: number }>>([]);
  const [isSavingGlobalFixedCosts, setIsSavingGlobalFixedCosts] = useState(false);

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

  useEffect(() => {
    const list = dashboardData?.globalFixedCosts ?? [];
    setGlobalFixedCostsDraft(list.map((c) => ({ name: c.name, amount: c.amount })));
  }, [dashboardData, viewMode]);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      // Monthly = selected month.
      // YTD = cumulative from January up to the CURRENT calendar month for the selected year.
      const month =
        viewMode === 'cumulative' ? getCurrentMonthYear().month : selectedMonth;
      const data = await dashboardService.getAdminDashboard(
        month,
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
    totalFixedSalaries: 0,
    totalBonuses: 0,
    totalOwedToChatters: 0,
    globalFixedCosts: [],
    totalGlobalFixedCosts: 0,
    totalFixedCosts: 0,
    creatorFinancials: [],
  };

  // Calculate totals
  const totalRevenue = safeDashboardData.chatterRevenue.reduce((sum, item) => sum + item.revenue, 0);
  const totalCommissions = safeDashboardData.totalCommissions;
  const totalFixedSalaries = safeDashboardData.totalFixedSalaries || 0;
  const totalOwedToChatters = safeDashboardData.totalOwedToChatters || 0;
  const totalGlobalFixedCosts = safeDashboardData.totalGlobalFixedCosts || 0;
  const totalBonuses =
    safeDashboardData.totalBonuses ??
    safeDashboardData.chatterRevenue.reduce((sum, item) => sum + (item.bonus ?? 0), 0);
  const totalFixedCosts = totalFixedSalaries + totalBonuses + totalGlobalFixedCosts;
  // Agency profit: creator-level agency profit (backend) minus TOTAL FIXED COSTS
  // (chatters fixed salaries + chatters bonuses + global fixed costs).
  const totalAgencyProfit =
    safeDashboardData.creatorFinancials.reduce(
      (sum, item) => sum + (item.agencyProfit ?? item.netRevenue),
      0
    ) -
    totalFixedCosts;
  
  const hasNoData = safeDashboardData.chatterRevenue.length === 0 && safeDashboardData.creatorFinancials.length === 0;

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i);

  const isGlobalFixedCostsEditable = viewMode === 'monthly';

  const handleAddGlobalFixedCostRow = () => {
    setGlobalFixedCostsDraft((prev) => [...prev, { name: '', amount: 0 }]);
  };

  const handleUpdateGlobalFixedCostRow = (index: number, field: 'name' | 'amount', value: string | number) => {
    setGlobalFixedCostsDraft((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveGlobalFixedCostRow = (index: number) => {
    setGlobalFixedCostsDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveGlobalFixedCosts = async () => {
    setIsSavingGlobalFixedCosts(true);
    try {
      const sanitized = globalFixedCostsDraft
        .map((c) => ({ name: (c.name || '').trim(), amount: Number(c.amount) || 0 }))
        .filter((c) => c.name.length > 0 && c.amount > 0);

      await dashboardService.upsertGlobalFixedCosts(selectedMonth, selectedYear, sanitized);
      toast.success('Custom fixed costs saved');
      await loadDashboard();
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { action: 'update', entity: 'global fixed costs' }));
    } finally {
      setIsSavingGlobalFixedCosts(false);
    }
  };

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
              YTD
            </button>
          </div>
          {/* Month selector only for Monthly view; YTD uses Jan..current month automatically */}
          {viewMode === 'monthly' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="input w-auto"
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {getMonthName(month)}
                </option>
              ))}
            </select>
          )}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="input w-auto"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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

        <div className="card bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-500 rounded-xl shadow-sm">
              <Coins className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Fixed Costs</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            ${totalFixedCosts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500">Fixed salaries + bonuses + custom</p>
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

        <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-500 rounded-xl shadow-sm">
              <Coins className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Amount Owed to Chatters</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            ${totalOwedToChatters.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500">Commissions minus payments for the selected period</p>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500 rounded-xl shadow-sm">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Agency Profit</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            ${totalAgencyProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  Commissions (%)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Bonus
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fixed Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total BASE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Retribution
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {safeDashboardData.chatterRevenue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No chatter revenue data available
                  </td>
                </tr>
              ) : (
                safeDashboardData.chatterRevenue.map((item) => (
                <tr key={item.chatterId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {item.avatar ? (
                        <img
                          src={item.avatar}
                          alt={item.chatterName}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-xs ${item.avatar ? 'hidden' : ''}`}
                      >
                        {item.chatterName.charAt(0)}
                      </div>
                      <a
                        href={`/chatter/${item.chatterId}`}
                        className="text-sm text-gray-900 hover:text-primary-600 hover:underline cursor-pointer"
                      >
                        {item.chatterName}
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${item.commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${(item.bonus ?? 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${item.fixedSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${(item.totalBase ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">
                    ${(item.totalRetribution ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {safeDashboardData.chatterRevenue.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 flex flex-col gap-1">
            <div>
              Showing 1-{safeDashboardData.chatterRevenue.length} of {safeDashboardData.chatterRevenue.length} chatters
            </div>
            <div className="text-xs">
              <span className="font-semibold">Average per chatter</span> — Revenue:{' '}
              ${(
                totalRevenue / safeDashboardData.chatterRevenue.length
              ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              , Commissions:{' '}
              ${(
                totalCommissions / safeDashboardData.chatterRevenue.length
              ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              , Bonus:{' '}
              ${(
                totalBonuses / safeDashboardData.chatterRevenue.length
              ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              , Fixed Salary:{' '}
              ${(
                totalFixedSalaries / safeDashboardData.chatterRevenue.length
              ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              , Total Retribution:{' '}
              ${(
                safeDashboardData.chatterRevenue.reduce((s, i) => s + (i.totalRetribution ?? 0), 0) /
                safeDashboardData.chatterRevenue.length
              ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <strong>Total Retribution</strong> = Total BASE + Fixed Salary + Sales commission + Bonuses (matches each chatter’s Dashboard).
            </p>
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
                chatterCommissions={creatorFinancial.chatterCommissions}
                marketingCosts={creatorFinancial.marketingCosts}
                toolCosts={creatorFinancial.toolCosts}
                customCosts={creatorFinancial.customCosts}
                paymentProcessorCostPercent={creatorFinancial.paymentProcessorCostPercent}
                paymentProcessorCost={creatorFinancial.paymentProcessorCost}
                netRevenue={creatorFinancial.netRevenue}
                agencyProfit={creatorFinancial.agencyProfit}
                month={selectedMonth}
                year={selectedYear}
                onUpdate={loadDashboard}
              />
            );
          })}
        </div>
      )}

      {/* Calculation Notes */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">How We Calculate These Numbers</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
          <li>
            <span className="font-semibold">Revenue</span> is the sum of all variable sales (Amount) for the creator in the selected period.
            BASE amounts are excluded here because they are paid as extra commissions to chatters, not to creators.
          </li>
          <li>
            <span className="font-semibold">OnlyFans Commission</span> is always calculated as Revenue * 20%.
            Some creators have a 5% cashback, which is added back to the agency and is not shared with the creator.
          </li>
          <li>
            <span className="font-semibold">Creator Earnings (percentage)</span> are calculated as
            Revenue * 0.8 * Creator% (i.e. after the 20% OnlyFans fee, without including cashback).
          </li>
          <li>
            <span className="font-semibold">Creator Earnings (salary)</span> are the fixed salary assigned to that creator
            for the selected period.
          </li>
          <li>
            <span className="font-semibold">Net Revenue</span> is Revenue * 0.8 - Creator Earnings + Cashback (if present),
            before agency costs and chatter commissions.
          </li>
          <li>
            <span className="font-semibold">Chatter Commissions</span> include percentage commissions on variable sales
            (amount) plus BASE earnings paid 1:1 to chatters; fixed salaries are tracked separately in the total commissions box.
          </li>
          <li>
            <span className="font-semibold">Agency Profit</span> is the sum of creator-level Agency Profit
            (Net Revenue minus chatters commissions, marketing costs, Infloww costs, and custom costs only),
            minus <span className="font-semibold">TOTAL FIXED COSTS</span>.
          </li>
          <li>
            <span className="font-semibold">TOTAL FIXED COSTS</span> =
            chatters fixed salaries + chatters bonuses + global custom fixed costs
            (hosting/tools not tied to a specific creator).
          </li>
          <li>
            <span className="font-semibold">BASE Earnings</span> are additional earnings paid 1:1 to chatters
            (if a chatter adds $10 in BASE, their earnings increase by exactly $10, not $10 * commission%).
          </li>
          <li>
            <span className="font-semibold">Cashback</span> is a 5% rebate from OnlyFans that some creators provide
            to the agency. This cashback is NOT shared with the creator and is added to Net Revenue as additional
            margin for the agency only. The creator's percentage is always calculated on Revenue * 0.8 (after OnlyFans
            20% fee), regardless of whether cashback exists.
          </li>
        </ul>
      </div>

      {/* Custom Fixed Costs (global, not tied to any creator) */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Custom Fixed Costs</h2>
          <div className="text-xs text-gray-500">{viewMode === 'monthly' ? 'Hosting/tools not tied to a creator' : 'Switch to Monthly to edit'}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">
                  {viewMode === 'monthly' ? 'Action' : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {globalFixedCostsDraft.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-6 text-center text-gray-500">
                    No custom fixed costs set
                  </td>
                </tr>
              ) : (
                globalFixedCostsDraft.map((cost, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {isGlobalFixedCostsEditable ? (
                        <input
                          type="text"
                          value={cost.name}
                          onChange={(e) => handleUpdateGlobalFixedCostRow(index, 'name', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="e.g. Hosting"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900">{cost.name || '—'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isGlobalFixedCostsEditable ? (
                        <input
                          type="number"
                          value={cost.amount}
                          onChange={(e) => handleUpdateGlobalFixedCostRow(index, 'amount', parseFloat(e.target.value) || 0)}
                          step="0.01"
                          min="0"
                          className="w-32 px-2 py-1 text-sm font-medium text-red-600 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900">
                          ${cost.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isGlobalFixedCostsEditable ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveGlobalFixedCostRow(index)}
                          className="p-1 text-red-400 hover:text-red-600 transition-colors"
                          title="Delete row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {viewMode === 'monthly' && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleAddGlobalFixedCostRow}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
              disabled={isSavingGlobalFixedCosts}
            >
              <Plus className="w-4 h-4" />
              Add cost row
            </button>

            <button
              type="button"
              onClick={handleSaveGlobalFixedCosts}
              className="btn btn-primary text-sm"
              disabled={isSavingGlobalFixedCosts}
            >
              {isSavingGlobalFixedCosts ? 'Saving...' : 'Save fixed costs'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
