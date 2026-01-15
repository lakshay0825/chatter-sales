import { useState, useEffect, useCallback } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Lock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { dashboardService, ChatterDashboardData } from '../services/dashboard.service';
import { getCurrentMonthYear, getMonthName, formatItalianDate } from '../utils/date';
import { parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../utils/errorHandler';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<ChatterDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear().month);
  const [selectedYear, setSelectedYear] = useState(getCurrentMonthYear().year);

  const loadDashboard = useCallback(async () => {
    if (!user || !user.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await dashboardService.getChatterDashboard(
        user.id,
        selectedMonth,
        selectedYear
      );
      setDashboardData(data);
      console.log('Dashboard loaded for user:', user.name, 'Role:', user.role);
      console.log('Month/Year:', selectedMonth, selectedYear);
      console.log('Total Sales:', data.totalSales, 'Total Commissions:', data.totalCommissions);
      console.log('Sales chart data points:', data.salesChartData?.length || 0);
    } catch (error: any) {
      console.error('Dashboard error:', error);
      toast.error(getUserFriendlyError(error, { action: 'load', entity: 'dashboard data' }));
      setDashboardData(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedMonth, selectedYear]);

  useEffect(() => {
    if (user && user.id) {
      loadDashboard();
    } else {
      setIsLoading(false);
    }
  }, [user, loadDashboard]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Create chart data for all days of the month
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const salesDataMap = new Map(
    dashboardData?.salesChartData?.map((item) => {
      // Parse date string (YYYY-MM-DD) and get day of month
      const date = parseISO(item.date);
      return [date.getDate(), item.amount];
    }) || []
  );
  const commissionsDataMap = new Map(
    dashboardData?.commissionsChartData?.map((item) => {
      // Parse date string (YYYY-MM-DD) and get day of month
      const date = parseISO(item.date);
      return [date.getDate(), item.amount];
    }) || []
  );

  const salesChartData = Array.from({ length: daysInMonth }, (_, i) => ({
    date: i + 1,
    amount: salesDataMap.get(i + 1) || 0,
  }));

  const commissionsChartData = Array.from({ length: daysInMonth }, (_, i) => ({
    date: i + 1,
    amount: commissionsDataMap.get(i + 1) || 0,
  }));

  // Generate ticks to show ALL dates from 1 to end of month
  // Show every single day: 1, 2, 3, 4, 5, ... up to daysInMonth
  const dateTicks = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const totalSales = dashboardData?.totalSales || 0;
  const totalCommissions = dashboardData?.totalCommissions || 0;

  // Generate month options
  const currentYear = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            My Performance - {getMonthName(selectedMonth)} {selectedYear}
          </h1>
          <p className="text-sm text-gray-600 mt-1">Track your sales and commissions performance</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={`${selectedMonth}-${selectedYear}`}
            onChange={(e) => {
              const [month, year] = e.target.value.split('-');
              setSelectedMonth(Number(month));
              setSelectedYear(Number(year));
            }}
            className="input w-auto min-w-[180px]"
          >
            {years.flatMap((year) =>
              months.map((month) => (
                <option key={`${month}-${year}`} value={`${month}-${year}`}>
                  {getMonthName(month)} {year}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Sales Volume Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Daily Sales Volume</h2>
                <p className="text-sm text-gray-600 mt-1">Sales performance throughout the month</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0A8BCC" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0A8BCC" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                  type="number"
                  domain={[1, daysInMonth]}
                  ticks={dateTicks}
                  tickFormatter={(value) => String(value)}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                  labelFormatter={(value) => {
                    const date = new Date(selectedYear, selectedMonth - 1, value);
                    return formatItalianDate(date, 'MMMM d');
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Sales']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#0A8BCC"
                  strokeWidth={2.5}
                  fill="url(#salesGradient)"
                  dot={{ fill: '#0A8BCC', r: 3 }}
                  activeDot={{ r: 5, fill: '#0A8BCC' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Commissions Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Daily Commissions Generated</h2>
                <p className="text-sm text-gray-600 mt-1">Your commission earnings over time</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={commissionsChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="commissionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                  type="number"
                  domain={[1, daysInMonth]}
                  ticks={dateTicks}
                  tickFormatter={(value) => String(value)}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                  labelFormatter={(value) => {
                    const date = new Date(selectedYear, selectedMonth - 1, value);
                    return formatItalianDate(date, 'MMMM d');
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Commission']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#commissionsGradient)"
                  dot={{ fill: '#10b981', r: 3 }}
                  activeDot={{ r: 5, fill: '#10b981' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar Metrics */}
        <div className="space-y-6">
          {/* Total Sales */}
          <div className="card bg-gradient-to-br from-primary-50 to-primary-100/50 border-primary-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-primary-500 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Sales (Month to Date)</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              ${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500">All sales this month</p>
          </div>

          {/* Personal Commission */}
          <div className="card bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-green-500 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Your Commission (Personal)</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              ${totalCommissions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
              <Lock className="w-3 h-3" />
              <span>Only visible to you</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
