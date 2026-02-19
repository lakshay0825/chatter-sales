import { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  Trophy,
  Target,
  DollarSign,
} from 'lucide-react';
import { analyticsService, DailyRevenueBreakdown, WeeklyRevenueBreakdown, MonthlyRevenueBreakdown, DateRangeRevenueBreakdown, MonthlySalesHeatmap } from '../services/analytics.service';
import { getCurrentMonthYear, getMonthName } from '../utils/date';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../utils/errorHandler';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DateRangePicker from '../components/DateRangePicker';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

type ViewType = 'DAY' | 'WEEK' | 'MONTH' | 'YTD';

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const [viewType, setViewType] = useState<ViewType>('MONTH');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear().month);
  const [selectedYear, setSelectedYear] = useState(getCurrentMonthYear().year);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [ytdStartDate, setYtdStartDate] = useState<string | undefined>(undefined);
  const [ytdEndDate, setYtdEndDate] = useState<string | undefined>(undefined);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [trendData, setTrendData] = useState<any[]>([]);
  const [performanceIndicators, setPerformanceIndicators] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [dailyBreakdown, setDailyBreakdown] = useState<DailyRevenueBreakdown | null>(null);
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<WeeklyRevenueBreakdown | null>(null);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<MonthlyRevenueBreakdown | null>(null);
  const [dateRangeBreakdown, setDateRangeBreakdown] = useState<DateRangeRevenueBreakdown | null>(null);
  const [monthlySalesHeatmap, setMonthlySalesHeatmap] = useState<MonthlySalesHeatmap | null>(null);

  useEffect(() => {
    loadAvailableYears();
  }, [user]);

  useEffect(() => {
    loadAnalytics();
  }, [selectedMonth, selectedYear, selectedDate, viewType, ytdStartDate, ytdEndDate, user]);

  const loadAvailableYears = async () => {
    try {
      const userId = user?.role === 'CHATTER' ? user.id : undefined;
      const years = await analyticsService.getAvailableYears(userId);
      setAvailableYears(years);
      // Set default year to latest available or current
      if (years.length > 0 && !years.includes(selectedYear)) {
        setSelectedYear(years[years.length - 1]);
      }
    } catch (error: any) {
      console.error('Failed to load available years:', error);
      // Fallback to current year
      const currentYear = new Date().getFullYear();
      setAvailableYears([currentYear]);
    }
  };

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const userId = user?.role === 'CHATTER' ? user.id : undefined;

      // Calculate date range based on viewType
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (viewType === 'DAY') {
        const date = new Date(selectedDate);
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(date);
        const isToday =
          date.getDate() === new Date().getDate() &&
          date.getMonth() === new Date().getMonth() &&
          date.getFullYear() === new Date().getFullYear();
        // For today, show stats up to current time only (not full day)
        if (!isToday) {
          endDate.setHours(23, 59, 59, 999);
        }
        // else endDate stays at 00:00:00 so we use it; we'll set endDate to now below for API calls
        if (isToday) {
          endDate.setTime(Date.now());
        }
      } else if (viewType === 'WEEK') {
        const date = new Date(selectedDate);
        startDate = startOfWeek(date, { weekStartsOn: 1 }); // Monday
        startDate.setHours(0, 0, 0, 0);
        endDate = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
        endDate.setHours(23, 59, 59, 999);
      } else if (viewType === 'MONTH') {
        const monthDate = new Date(selectedYear, selectedMonth - 1, 1);
        startDate = startOfMonth(monthDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = endOfMonth(monthDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (viewType === 'YTD') {
        if (ytdStartDate && ytdEndDate) {
          startDate = new Date(ytdStartDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(ytdEndDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // Default to full year
          const yearDate = new Date(selectedYear, 0, 1);
          startDate = startOfYear(yearDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = endOfYear(yearDate);
          endDate.setHours(23, 59, 59, 999);
        }
      }

      // Ensure dates are always defined
      if (!startDate || !endDate) {
        console.error('Dates are undefined for viewType:', viewType);
        // Fallback to current month
        const now = new Date();
        startDate = startOfMonth(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = endOfMonth(now);
        endDate.setHours(23, 59, 59, 999);
      }

      const promises: Promise<any>[] = [
        // Trend analysis with date range
        analyticsService.getTrendAnalysis(userId, startDate, endDate, viewType),
        // Performance indicators with date range
        analyticsService.getPerformanceIndicators(
          viewType === 'MONTH' ? selectedMonth : undefined,
          viewType === 'MONTH' || viewType === 'YTD' ? selectedYear : undefined,
          userId,
          startDate,
          endDate,
          viewType
        ),
        // Leaderboard with date range
        analyticsService.getLeaderboard(
          viewType === 'MONTH' ? selectedMonth : undefined,
          viewType === 'MONTH' || viewType === 'YTD' ? selectedYear : undefined,
          10,
          startDate,
          endDate
        ),
      ];

      // Load view-specific data (use same startDate/endDate for day view so leaderboard and breakdown match)
      if (viewType === 'DAY') {
        promises.push(
          analyticsService.getDailyRevenueBreakdown(
            new Date(selectedDate),
            userId,
            startDate,
            endDate
          )
        );
      } else if (viewType === 'WEEK') {
        // Use the same computed startDate (Monday) for weekly breakdown so it matches all other weekly stats
        promises.push(analyticsService.getWeeklyRevenueBreakdown(startDate, userId));
      } else if (viewType === 'MONTH') {
        promises.push(analyticsService.getMonthlyRevenueBreakdown(selectedMonth, selectedYear, userId));
        promises.push(analyticsService.getMonthlySalesHeatmap(selectedMonth, selectedYear, userId));
      } else if (viewType === 'YTD') {
        // For YTD, use custom date range if provided, otherwise use full year
        if (ytdStartDate && ytdEndDate) {
          promises.push(
            analyticsService.getDateRangeRevenueBreakdown(
              new Date(ytdStartDate),
              new Date(ytdEndDate),
              userId
            )
          );
        } else {
          // Default to full year breakdown
          const yearStart = new Date(selectedYear, 0, 1);
          const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
          promises.push(
            analyticsService.getDateRangeRevenueBreakdown(
              yearStart,
              yearEnd,
              userId
            )
          );
        }
      }

      const results = await Promise.all(promises);
      let resultIndex = 0;

      setTrendData(results[resultIndex++]);
      setPerformanceIndicators(results[resultIndex++]);
      setLeaderboard(results[resultIndex++]);

      if (viewType === 'DAY') {
        const dailyData = results[resultIndex++];
        setDailyBreakdown(dailyData);
        setWeeklyBreakdown(null);
        setMonthlyBreakdown(null);
        setDateRangeBreakdown(null);
        setMonthlySalesHeatmap(null);
      } else if (viewType === 'WEEK') {
        const weeklyData = results[resultIndex++];
        setWeeklyBreakdown(weeklyData);
        setDailyBreakdown(null);
        setMonthlyBreakdown(null);
        setDateRangeBreakdown(null);
        setMonthlySalesHeatmap(null);
      } else if (viewType === 'MONTH') {
        const monthlyData = results[resultIndex++];
        const heatmapData = results[resultIndex++];
        setMonthlyBreakdown(monthlyData);
        setMonthlySalesHeatmap(heatmapData as MonthlySalesHeatmap);
        setDailyBreakdown(null);
        setWeeklyBreakdown(null);
        setDateRangeBreakdown(null);
      } else if (viewType === 'YTD') {
        const rangeData = results[resultIndex++];
        setDateRangeBreakdown(rangeData);
        setDailyBreakdown(null);
        setWeeklyBreakdown(null);
        setMonthlyBreakdown(null);
        setMonthlySalesHeatmap(null);
      }
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      toast.error(getUserFriendlyError(error, { action: 'load', entity: 'analytics data' }));
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
  // Use available years, or fallback to current year if not loaded yet
  const years = availableYears.length > 0 ? availableYears : [new Date().getFullYear()];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics & Insights</h1>
          <p className="text-sm text-gray-600 mt-1">Performance comparisons, trends, and leaderboards</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">

          {/* Date/Time Selector based on view type */}
          {viewType === 'DAY' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input w-full sm:w-auto sm:min-w-[160px]"
            />
          )}
          {viewType === 'WEEK' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input w-full sm:w-auto sm:min-w-[160px]"
            />
          )}
          {viewType === 'MONTH' && (
            <select
              value={`${selectedMonth}-${selectedYear}`}
              onChange={(e) => {
                const [month, year] = e.target.value.split('-');
                setSelectedMonth(Number(month));
                setSelectedYear(Number(year));
              }}
              className="input w-full sm:w-auto sm:min-w-[180px]"
            >
              {years.flatMap((year) =>
                months.map((month) => (
                  <option key={`${month}-${year}`} value={`${month}-${year}`}>
                    {getMonthName(month)} {year}
                  </option>
                ))
              )}
            </select>
          )}
          {viewType === 'YTD' && (
            <div className="w-full sm:w-auto sm:min-w-[280px]">
              <DateRangePicker
                startDate={ytdStartDate}
                endDate={ytdEndDate}
                onChange={(start, end) => {
                  setYtdStartDate(start);
                  setYtdEndDate(end);
                }}
                placeholder="Select date range for YTD"
              />
            </div>
          )}
          
          {/* View Type Selector */}
          <select
            value={viewType}
            onChange={(e) => setViewType(e.target.value as ViewType)}
            className="input w-full sm:w-auto sm:min-w-[120px]"
          >
            <option value="DAY">Day</option>
            <option value="WEEK">Week</option>
            <option value="MONTH">Month</option>
            <option value="YTD">YTD</option>
          </select>

          
        </div>
      </div>

      {/* Revenue Breakdown Section */}
      {(dailyBreakdown || weeklyBreakdown || monthlyBreakdown || dateRangeBreakdown) && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {viewType === 'DAY' ? 'Daily' : viewType === 'WEEK' ? 'Weekly' : viewType === 'MONTH' ? 'Monthly' : 'Revenue'} Revenue Breakdown
            </h2>
          </div>
          {dailyBreakdown && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(dailyBreakdown.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Sales (excl. BASE)</p>
                  <p className="text-2xl font-bold text-primary-600">
                    ${dailyBreakdown.totalRevenue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              {dailyBreakdown.creatorBreakdown.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">By Creator</h3>
                  <div className="space-y-2">
                    {dailyBreakdown.creatorBreakdown.map((creator, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium text-gray-900">{creator.name}</span>
                        <span className="text-lg font-semibold text-gray-900">
                          ${creator.revenue.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {weeklyBreakdown && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Week</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(weeklyBreakdown.weekStart).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    -{' '}
                    {new Date(weeklyBreakdown.weekEnd).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Sales (excl. BASE)</p>
                  <p className="text-2xl font-bold text-primary-600">
                    ${weeklyBreakdown.totalRevenue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              {weeklyBreakdown.creatorBreakdown.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">By Creator</h3>
                  <div className="space-y-2">
                    {weeklyBreakdown.creatorBreakdown.map((creator, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium text-gray-900">{creator.name}</span>
                        <span className="text-lg font-semibold text-gray-900">
                          ${creator.revenue.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {monthlyBreakdown && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Month</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {getMonthName(monthlyBreakdown.month)} {monthlyBreakdown.year}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Sales (excl. BASE)</p>
                  <p className="text-2xl font-bold text-primary-600">
                    ${monthlyBreakdown.totalRevenue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              {monthlyBreakdown.creatorBreakdown.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">By Creator</h3>
                  <div className="space-y-2">
                    {monthlyBreakdown.creatorBreakdown.map((creator, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium text-gray-900">{creator.name}</span>
                        <span className="text-lg font-semibold text-gray-900">
                          ${creator.revenue.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {dateRangeBreakdown && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Date Range</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(dateRangeBreakdown.startDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    -{' '}
                    {new Date(dateRangeBreakdown.endDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Sales (excl. BASE)</p>
                  <p className="text-2xl font-bold text-primary-600">
                    ${dateRangeBreakdown.totalRevenue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              {dateRangeBreakdown.creatorBreakdown.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">By Creator</h3>
                  <div className="space-y-2">
                    {dateRangeBreakdown.creatorBreakdown.map((creator, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium text-gray-900">{creator.name}</span>
                        <span className="text-lg font-semibold text-gray-900">
                          ${creator.revenue.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Monthly View: Sales heatmap by day of week and time of day (more red = more sales) */}
      {viewType === 'MONTH' && monthlySalesHeatmap && (() => {
        const HEATMAP_COLORS = ['#a3abe0', '#8b9ef3', '#6d82e9', '#adadcd', '#c2b0a8', '#e2b370', '#edb45f'];
        const max = monthlySalesHeatmap.maxAmount || 1;
        const getHeatmapColor = (intensity: number) => {
          if (intensity <= 0) return 'rgb(247, 247, 247)';
          const t = Math.min(1, intensity);
          const idx = Math.min(HEATMAP_COLORS.length - 1, Math.floor(t * HEATMAP_COLORS.length));
          return HEATMAP_COLORS[idx];
        };
        return (
          <div className="card">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Sales heatmap — {getMonthName(monthlySalesHeatmap.month)} {monthlySalesHeatmap.year}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Low</span>
                <div
                  className="h-4 rounded w-32 flex-shrink-0"
                  style={{
                    background: `linear-gradient(to right, ${HEATMAP_COLORS.join(', ')})`,
                  }}
                />
                <span className="text-xs text-gray-500">High (more red = more sales)</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Total sales ($) by day of week and time of day (UTC). Hover for exact amount.
            </p>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: 420 }}>
                <thead>
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-600 w-28 py-2 pl-1 pr-2" />
                    {monthlySalesHeatmap.dayLabels.map((label) => (
                      <th
                        key={label}
                        className="text-center text-xs font-semibold text-gray-600 py-2 px-1"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlySalesHeatmap.timeSlotLabels.map((timeLabel, slotIndex) => (
                    <tr key={slotIndex}>
                      <td className="text-xs font-medium text-gray-600 py-1.5 pl-1 pr-2 align-middle w-28">
                        {timeLabel}
                      </td>
                      {monthlySalesHeatmap.dayLabels.map((_, dayIndex) => {
                        const cell = monthlySalesHeatmap.cells.find(
                          (c) => c.timeSlot === slotIndex && c.dayOfWeek === dayIndex
                        );
                        const amount = cell?.totalAmount ?? 0;
                        const intensity = max > 0 ? amount / max : 0;
                        const bg = getHeatmapColor(intensity);
                        const textContrast = intensity > 0.6 ? 'white' : 'rgb(31, 41, 55)';
                        return (
                          <td
                            key={dayIndex}
                            className="py-1 px-0.5 align-middle transition-transform hover:scale-105"
                            style={{
                              backgroundColor: bg,
                              color: textContrast,
                              minWidth: 44,
                              height: 36,
                              fontSize: '0.75rem',
                              fontWeight: amount > 0 ? 600 : 400,
                            }}
                            title={`${monthlySalesHeatmap.dayLabels[dayIndex]} ${timeLabel}: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          >
                            {amount > 0 ? `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

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
            <p className="text-xs text-gray-500 mt-1">
              {performanceIndicators.salesCount} transactions (Amount only, BASE excluded)
            </p>
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
            <h3 className="text-sm font-medium text-gray-600 mb-1">
              {viewType === 'DAY' ? 'Avg Hourly Sales' : 'Avg Daily Sales'}
            </h3>
            <p className="text-2xl font-bold text-gray-900">
              ${performanceIndicators.avgDailySales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {viewType === 'DAY' ? 'Per hour' : 'Per day'}
            </p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-blue-500 rounded-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">
              {viewType === 'DAY' ? 'Sales/Hour' : 'Sales/Day'}
            </h3>
            <p className="text-2xl font-bold text-gray-900">
              {performanceIndicators.avgSalesPerDay.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {viewType === 'DAY' ? 'Transactions per hour' : 'Transactions per day'}
            </p>
          </div>
        </div>
      )}

      {/* Trend Analysis Chart */}
      {trendData.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {viewType === 'DAY' ? 'Daily Trend Analysis' :
             viewType === 'WEEK' ? 'Weekly Trend Analysis' :
             viewType === 'MONTH' ? 'Monthly Trend Analysis' :
             viewType === 'YTD' ? 'Year-to-Date Trend Analysis' :
             '12-Month Trend Analysis'}
          </h2>
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

      {/* Leaderboard — same period as selected view (Day / Week / Month / YTD) */}
      {leaderboard.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Top Performers</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {viewType === 'DAY' && selectedDate &&
                  `For ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`}
                {viewType === 'WEEK' && selectedDate &&
                  `For week of ${startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek(new Date(selectedDate), { weekStartsOn: 1 }).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                {viewType === 'MONTH' && `For ${getMonthName(selectedMonth)} ${selectedYear}`}
                {viewType === 'YTD' && (ytdStartDate && ytdEndDate
                  ? `For ${new Date(ytdStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${new Date(ytdEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : `For ${selectedYear} (YTD)`)}
              </p>
            </div>
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

