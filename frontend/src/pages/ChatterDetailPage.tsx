import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, DollarSign, TrendingUp, CreditCard, Trash2, Pencil } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { dashboardService, ChatterDetailData } from '../services/dashboard.service';
import { paymentService, PaymentMethod, CreatePaymentData, UpdatePaymentData } from '../services/payment.service';
import { useAuthStore } from '../store/authStore';
import { formatItalianDate } from '../utils/date';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../utils/errorHandler';
import { openConfirm } from '../components/ConfirmDialog';
// We use month/year selection only to keep all chatter dashboards on full calendar months

type ChatterPayment = ChatterDetailData['payments'][number];

export default function ChatterDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [detailData, setDetailData] = useState<ChatterDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<ChatterPayment | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  // Helper to format a Date as local calendar date (YYYY-MM-DD) without timezone shift
  const toLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState<string | undefined>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return toLocalDateString(start);
  });
  const [endDate, setEndDate] = useState<string | undefined>(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return toLocalDateString(end);
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (!userId) {
      toast.error('Invalid chatter ID');
      navigate('/admin');
      return;
    }

    // Only admins can view other chatters' details
    if (!isAdmin && userId !== currentUser?.id) {
      toast.error('Access denied. You can only view your own details.');
      navigate('/dashboard');
      return;
    }

    loadDetailData();
  }, [userId, startDate, endDate]);

  const loadDetailData = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const data = await dashboardService.getChatterDetail(
        userId,
        startDate,
        endDate
      );
      setDetailData(data);
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { action: 'load', entity: 'chatter details' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePayment = async (paymentData: CreatePaymentData) => {
    try {
      await paymentService.createPayment(paymentData);
      toast.success('Payment registered successfully');
      setIsPaymentModalOpen(false);
      loadDetailData();
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { action: 'create', entity: 'payment' }));
    }
  };

  const handleUpdatePayment = async (paymentId: string, data: UpdatePaymentData) => {
    try {
      await paymentService.updatePayment(paymentId, data);
      toast.success('Payment updated successfully');
      setIsPaymentModalOpen(false);
      setEditingPayment(null);
      loadDetailData();
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { action: 'update', entity: 'payment' }));
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const confirmed = await openConfirm({
      title: 'Delete Payment',
      message: 'Are you sure you want to delete this payment? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    setDeletingPaymentId(paymentId);
    try {
      await paymentService.deletePayment(paymentId);
      toast.success('Payment deleted successfully');
      loadDetailData();
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { action: 'delete', entity: 'payment' }));
    } finally {
      setDeletingPaymentId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!detailData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No data available for this chatter.</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = detailData.dailyBreakdown.map((day) => ({
    date: formatItalianDate(new Date(day.date)),
    sales: day.sales,
    commission: day.commission,
  }));

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case PaymentMethod.CRYPTO:
        return 'Crypto';
      case PaymentMethod.WIRE_TRANSFER:
        return 'Wire Transfer';
      case PaymentMethod.PAYPAL:
        return 'PayPal';
      case PaymentMethod.OTHER:
        return 'Other';
      default:
        return method;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {detailData.user.avatar ? (
              <img
                src={detailData.user.avatar}
                alt={detailData.user.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-lg">
                {detailData.user.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{detailData.user.name}</h1>
              <p className="text-sm text-gray-600">{detailData.user.email}</p>
            </div>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingPayment(null);
              setIsPaymentModalOpen(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Register Payment
          </button>
        )}
      </div>

      {/* Period Selector – always full months */}
      <div className="card">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Month:</label>
          <select
            value={`${selectedMonth}-${selectedYear}`}
            onChange={(e) => {
              const [month, year] = e.target.value.split('-').map(Number);
              setSelectedMonth(month);
              setSelectedYear(year);
              const start = new Date(year, month - 1, 1);
              const end = new Date(year, month, 0);
              setStartDate(toLocalDateString(start));
              setEndDate(toLocalDateString(end));
            }}
            className="input w-auto"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={`${month}-${selectedYear}`}>
                {new Date(selectedYear, month - 1, 1).toLocaleString('default', { month: 'long' })}{' '}
                {selectedYear}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500 rounded-xl shadow-sm">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Sales</h3>
          <p className="text-3xl font-bold text-gray-900">
            ${detailData.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500 rounded-xl shadow-sm">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Retribution</h3>
          <p className="text-3xl font-bold text-gray-900">
            ${(detailData.totalRetribution ?? detailData.totalCommission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">Sales commission + Total BASE + Fixed salary</p>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500 rounded-xl shadow-sm">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            {isAdmin ? 'Total Payments' : 'Payments Received'}
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            ${detailData.totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className={`card ${detailData.amountOwed > 0 ? 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200' : 'bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 ${detailData.amountOwed > 0 ? 'bg-red-500' : 'bg-gray-500'} rounded-xl shadow-sm`}>
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Amount Owed</h3>
          <p className={`text-3xl font-bold ${detailData.amountOwed > 0 ? 'text-red-900' : 'text-gray-900'}`}>
            ${detailData.amountOwed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

      </div>

      {/* Earnings Graph */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Daily Sales & Commission</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} name="Sales ($)" />
              <Line type="monotone" dataKey="commission" stroke="#10b981" strokeWidth={2} name="Commission ($)" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No data available for the selected date range.
          </div>
        )}
      </div>

      {/* Daily Breakdown Table */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Daily Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales ($)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BASE ($)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission % ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {detailData.dailyBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No data available for the selected date range.
                  </td>
                </tr>
              ) : (
                <>
                  {detailData.dailyBreakdown.map((day) => (
                    <tr key={day.date} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatItalianDate(new Date(day.date))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${day.sales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${day.baseEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        ${day.commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  {(() => {
                    const totalCount = detailData.dailyBreakdown.reduce((sum, d) => sum + d.count, 0);
                    const totalSales = detailData.dailyBreakdown.reduce((sum, d) => sum + d.sales, 0);
                    const totalBase = detailData.dailyBreakdown.reduce((sum, d) => sum + d.baseEarnings, 0);
                    const totalCommission = detailData.dailyBreakdown.reduce((sum, d) => sum + d.commission, 0);
                    return (
                      <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">TOTALS</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{totalCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${totalBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-700">
                          ${totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })()}
                  {/* Average sales per day row: sum of daily sales / number of days worked (days with at least one sale) */}
                  {(() => {
                    const workedDays = detailData.dailyBreakdown.filter(
                      (d) => d.sales > 0 || d.count > 0 || d.baseEarnings > 0
                    );
                    const daysWorked = workedDays.length;
                    const totalSalesInPeriod = workedDays.reduce((sum, d) => sum + d.sales, 0);
                    const avgSalesPerDay = daysWorked > 0 ? totalSalesInPeriod / daysWorked : 0;
                    return (
                      <tr className="bg-primary-50 font-semibold border-t-2 border-gray-200">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Avg. sales/day (days worked)</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">—</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-700">
                          ${avgSalesPerDay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">—</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">—</td>
                      </tr>
                    );
                  })()}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {isAdmin ? 'Payment History' : 'Payments Received'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {detailData.payments.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-6 py-8 text-center text-gray-500">
                    No payments recorded for the selected date range.
                  </td>
                </tr>
              ) : (
                detailData.payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatItalianDate(new Date(payment.paymentDate))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPaymentMethodLabel(payment.paymentMethod)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{payment.note || '-'}</td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setEditingPayment(payment);
                              setIsPaymentModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit payment"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            disabled={deletingPaymentId === payment.id}
                            className="text-red-400 hover:text-red-600 disabled:opacity-50"
                            title="Delete payment"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && isAdmin && (
        <PaymentModal
          userId={userId!}
          editingPayment={editingPayment}
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setEditingPayment(null);
          }}
          onSuccess={handleCreatePayment}
          onUpdate={handleUpdatePayment}
        />
      )}
    </div>
  );
}

// Payment Modal Component
interface PaymentModalProps {
  userId: string;
  editingPayment: ChatterPayment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: CreatePaymentData) => Promise<void>;
  onUpdate: (id: string, data: UpdatePaymentData) => Promise<void>;
}

function PaymentModal({ userId, editingPayment, isOpen, onClose, onSuccess, onUpdate }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.WIRE_TRANSFER);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill form when editing
  useEffect(() => {
    if (isOpen && editingPayment) {
      setAmount(String(editingPayment.amount));
      // paymentDate is an ISO string from backend; strip time if present
      setPaymentDate(editingPayment.paymentDate.split('T')[0]);
      setPaymentMethod(editingPayment.paymentMethod as PaymentMethod);
      setNote(editingPayment.note ?? '');
    } else if (isOpen && !editingPayment) {
      // Reset for create mode
      setAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod(PaymentMethod.WIRE_TRANSFER);
      setNote('');
    }
  }, [isOpen, editingPayment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        amount: parseFloat(amount),
        paymentDate,
        paymentMethod,
        note: note || undefined,
      };

      if (editingPayment) {
        await onUpdate(editingPayment.id, payload);
      } else {
        await onSuccess({
          userId,
          ...payload,
        });
      }
      // Reset form
      setAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod(PaymentMethod.WIRE_TRANSFER);
      setNote('');
    } catch (error) {
      // Error already handled in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEdit = !!editingPayment;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {isEdit ? 'Edit Payment' : 'Register Payment'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="input"
                required
              >
                <option value={PaymentMethod.CRYPTO}>Crypto</option>
                <option value={PaymentMethod.WIRE_TRANSFER}>Wire Transfer</option>
                <option value={PaymentMethod.PAYPAL}>PayPal</option>
                <option value={PaymentMethod.OTHER}>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Note (Optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="input"
                rows={3}
                placeholder="Add any notes about this payment..."
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? isEdit
                    ? 'Updating...'
                    : 'Registering...'
                  : isEdit
                    ? 'Update Payment'
                    : 'Register Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
