import { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Target,
} from 'lucide-react';
import { analyticsService } from '../services/analytics.service';
import { getCurrentMonthYear, getMonthName } from '../utils/date';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear().month);
  const [selectedYear, setSelectedYear] = useState(getCurrentMonthYear().year);
  const [isLoading, setIsLoading] = useState(true);

  // Comparison data
  const [momComparison, setMomComparison] = useState<any>(null);
  const [yoyComparison, setYoyComparison] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [performanceIndicators, setPerformanceIndicators] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [selectedMonth, selectedYear, user]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const userId = user?.role === 'CHATTER' ? user.id : undefined;

      const [mom, yoy, trends, indicators, leaderboardData] = await Promise.all([
        analyticsService.getMonthOverMonthComparison(selectedMonth, selectedYear, userId),
        analyticsService.getYearOverYearComparison(selectedYear, userId),
        analyticsService.getTrendAnalysis(userId),
        analyticsService.getPerformanceIndicators(selectedMonth, selectedYear, userId),
        analyticsService.getLeaderboard(selectedMonth, selectedYear, 10),
      ]);

      setMomComparison(mom);
      setYoyComparison(yoy);
      setTrendData(trends);
      setPerformanceIndicators(indicators);
      setLeaderboard(leaderboardData);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics & Insights</h1>
          <p className="text-sm text-gray-600 mt-1">Performance comparisons, trends, and leaderboards</p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Performance Indicators */}
      {performanceIndicators && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-primary-500 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Total Sales</h3>
            <p className="text-2xl font-bold text-gray-900">
              ${performanceIndicators.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">{performanceIndicators.salesCount} transactions</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-green-500 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Avg Sale Amount</h3>
            <p className="text-2xl font-bold text-gray-900">
              ${performanceIndicators.avgSaleAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Per transaction</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-yellow-500 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Avg Daily Sales</h3>
            <p className="text-2xl font-bold text-gray-900">
              ${performanceIndicators.avgDailySales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Per day</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-blue-500 rounded-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Avg Sales/Day</h3>
            <p className="text-2xl font-bold text-gray-900">
              {performanceIndicators.avgSalesPerDay.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Transactions per day</p>
          </div>
        </div>
      )}

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Month-over-Month Comparison */}
        {momComparison && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Month-over-Month Comparison</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${momComparison.current.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getMonthName(momComparison.current.month)} {momComparison.current.year}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Previous Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${momComparison.previous.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getMonthName(momComparison.previous.month)} {momComparison.previous.year}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  {momComparison.change.percent >= 0 ? (
                    <ArrowUpRight className="w-5 h-5 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-600">Change</p>
                    <p
                      className={`text-xl font-bold ${
                        momComparison.change.percent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {momComparison.change.percent >= 0 ? '+' : ''}
                      {momComparison.change.percent.toFixed(1)}% (
                      {momComparison.change.amount >= 0 ? '+' : ''}
                      ${momComparison.change.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Year-over-Year Comparison */}
        {yoyComparison && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Year-over-Year Comparison</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current Year</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${yoyComparison.current.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">{yoyComparison.current.year}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Previous Year</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${yoyComparison.previous.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">{yoyComparison.previous.year}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  {yoyComparison.change.percent >= 0 ? (
                    <ArrowUpRight className="w-5 h-5 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-600">Change</p>
                    <p
                      className={`text-xl font-bold ${
                        yoyComparison.change.percent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {yoyComparison.change.percent >= 0 ? '+' : ''}
                      {yoyComparison.change.percent.toFixed(1)}% (
                      {yoyComparison.change.amount >= 0 ? '+' : ''}
                      ${yoyComparison.change.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trend Analysis Chart */}
      {trendData.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">12-Month Trend Analysis</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 500 }}
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
                formatter={(value: number) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Sales']}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#0A8BCC"
                strokeWidth={2.5}
                dot={{ fill: '#0A8BCC', r: 4 }}
                activeDot={{ r: 6, fill: '#0A8BCC' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Top Performers</h2>
            <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
          <div className="space-y-3">
            {leaderboard.map((entry) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-500 text-white font-bold">
                    {entry.rank}
                  </div>
                  {entry.avatar ? (
                    <img src={entry.avatar} alt={entry.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                      {entry.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{entry.name}</p>
                    <p className="text-sm text-gray-500">{entry.salesCount} sales</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    ${entry.salesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-500">
                    Commission: ${entry.commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

