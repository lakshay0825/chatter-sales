import { useState, useEffect } from 'react';
import { Plus, Download, FileSpreadsheet, FileText, MoreVertical, User as UserIcon, Tag, Filter, ShoppingCart } from 'lucide-react';
import { Sale, SaleType, SaleStatus, Creator } from '../types';
import { saleService, GetSalesParams } from '../services/sale.service';
import { creatorService } from '../services/creator.service';
import { exportService } from '../services/export.service';
import { formatItalianDateTime } from '../utils/date';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../utils/errorHandler';
import SaleEntryModal from '../components/SaleEntryModal';
import EditSaleModal from '../components/EditSaleModal';
import DateRangePicker from '../components/DateRangePicker';

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [filters, setFilters] = useState<GetSalesParams>({
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    loadCreators();
  }, []);

  useEffect(() => {
    loadSales();
  }, [filters]);

  const loadCreators = async () => {
    try {
      const data = await creatorService.getCreators(true);
      setCreators(data);
      console.log('SalesPage: Creators loaded:', data.length, data);
    } catch (error: any) {
      console.error('SalesPage: Failed to load creators:', error);
      // Silently fail for filters - don't show toast
    }
  };

  const loadSales = async () => {
    setIsLoading(true);
    try {
      // Ensure page is always set
      const params = {
        ...filters,
        page: filters.page || 1,
        limit: filters.limit || 20,
      };
      const response = await saleService.getSales(params);
      setSales(response.data);
      setPagination(response.pagination);
      console.log('Sales loaded:', {
        count: response.data.length,
        total: response.pagination.total,
        page: response.pagination.page,
        filters: params,
      });
    } catch (error: any) {
      console.error('Failed to load sales:', error);
      toast.error(getUserFriendlyError(error, { action: 'load', entity: 'sales' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await saleService.exportSales(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-export-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Sales exported to CSV successfully');
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { 
        action: 'export', 
        entity: 'sales to CSV',
        defaultMessage: 'Failed to export sales. Please try again or contact support if the problem persists.'
      }));
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await exportService.exportSalesToExcel(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-export-${new Date().toISOString()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Sales exported to Excel successfully');
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { 
        action: 'export', 
        entity: 'sales to Excel',
        defaultMessage: 'Failed to export sales. Please try again or contact support if the problem persists.'
      }));
    }
  };

  const handleExportPDF = async () => {
    try {
      const blob = await exportService.exportSalesToPDF(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-export-${new Date().toISOString()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Sales exported to PDF successfully');
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { 
        action: 'export', 
        entity: 'sales to PDF',
        defaultMessage: 'Failed to export sales. Please try again or contact support if the problem persists.'
      }));
    }
  };

  const getSaleTypeColor = (type: SaleType) => {
    switch (type) {
      case SaleType.CAM:
        return 'bg-blue-100 text-blue-800';
      case SaleType.TIP:
        return 'bg-sky-100 text-sky-800';
      case SaleType.PPV:
        return 'bg-indigo-100 text-indigo-800';
      case SaleType.INITIAL:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: SaleStatus) => {
    return status === SaleStatus.ONLINE
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sales Report</h1>
          <p className="text-sm text-gray-600 mt-1">Detailed list of sales transactions</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Export Dropdown */}
          <div className="relative group">
            <button className="btn btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={handleExportCSV}
                className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-left"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-left"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-left"
              >
                <FileText className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Sale
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <DateRangePicker
              startDate={filters.startDate}
              endDate={filters.endDate}
              onChange={(startDate, endDate) => {
                setFilters({ ...filters, startDate, endDate, page: 1 });
              }}
              placeholder="Select date range"
            />
          </div>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              className="input pl-10 w-auto min-w-[180px] appearance-none"
              value={filters.creatorId || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  creatorId: e.target.value || undefined,
                  page: 1,
                })
              }
            >
              <option value="">All Creators</option>
              {creators.length === 0 ? (
                <option value="" disabled>Loading creators...</option>
              ) : (
                creators.map((creator) => (
                  <option key={creator.id} value={creator.id}>
                    {creator.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              className="input pl-10 w-auto min-w-[150px] appearance-none"
              value={filters.saleType || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  saleType: (e.target.value as SaleType) || undefined,
                  page: 1,
                })
              }
            >
              <option value="">All Types</option>
              {Object.values(SaleType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              className="input pl-10 w-auto min-w-[150px] appearance-none"
              value={filters.status || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: (e.target.value as SaleStatus) || undefined,
                  page: 1,
                })
              }
            >
              <option value="">All Status</option>
              <option value={SaleStatus.ONLINE}>ONLINE</option>
              <option value={SaleStatus.OFFLINE}>OFFLINE</option>
            </select>
          </div>
          <button
            onClick={() => {
              setFilters({ page: 1, limit: 20 });
            }}
            className="btn btn-secondary"
            disabled={
              !filters.startDate &&
              !filters.endDate &&
              !filters.creatorId &&
              !filters.saleType &&
              !filters.status
            }
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="card p-0 overflow-hidden overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No sales found</h3>
              <p className="text-gray-600 mb-6">
                {Object.keys(filters).length > 2
                  ? 'Try adjusting your filters to see more results.'
                  : 'Start by adding your first sale using the "Add Sale" button above.'}
              </p>
              {Object.keys(filters).length <= 2 && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Sale
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Chatter
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Sale Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Creator
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-primary-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatItalianDateTime(sale.saleDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {sale.user?.name && (
                            <>
                              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-xs">
                                {sale.user.name.charAt(0)}
                              </div>
                              <span className="text-sm text-gray-900">{sale.user.name}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getSaleTypeColor(
                            sale.saleType
                          )}`}
                        >
                          {sale.saleType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${sale.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {sale.creator?.name && (
                            <>
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium text-xs">
                                {sale.creator.name.charAt(0)}
                              </div>
                              <span className="text-sm text-gray-900">{sale.creator.name}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            sale.status
                          )}`}
                        >
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="relative">
                          <button
                            onClick={() => {
                              setSelectedSale(sale);
                              setIsEditModalOpen(true);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === pagination.totalPages ||
                      Math.abs(page - pagination.page) <= 1
                  )
                  .map((page, index, array) => (
                    <div key={page} className="flex items-center gap-1">
                      {index > 0 && array[index - 1] !== page - 1 && <span>...</span>}
                      <button
                        onClick={() => setFilters({ ...filters, page })}
                        className={`px-3 py-1 rounded ${
                          page === pagination.page
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  ))}
                <button
                  onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sale Entry Modal */}
      <SaleEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadSales}
      />

      {/* Edit Sale Modal */}
      <EditSaleModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSale(null);
        }}
        onSuccess={loadSales}
        sale={selectedSale}
      />
    </div>
  );
}
