const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface ExportSalesParams {
  startDate?: string;
  endDate?: string;
  creatorId?: string;
  saleType?: string;
  status?: string;
  userId?: string;
}

export interface ExportCommissionsParams {
  month?: number;
  year?: number;
}

export interface ExportShiftsParams {
  startDate?: string;
  endDate?: string;
}

export const exportService = {
  /**
   * Export sales to Excel
   */
  async exportSalesToExcel(params: ExportSalesParams = {}): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.creatorId) queryParams.append('creatorId', params.creatorId);
    if (params.saleType) queryParams.append('saleType', params.saleType);
    if (params.status) queryParams.append('status', params.status);
    if (params.userId) queryParams.append('userId', params.userId);

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/export/sales/excel?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export sales to Excel');
    }

    return await response.blob();
  },

  /**
   * Export sales to PDF
   */
  async exportSalesToPDF(params: ExportSalesParams = {}): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.creatorId) queryParams.append('creatorId', params.creatorId);
    if (params.saleType) queryParams.append('saleType', params.saleType);
    if (params.status) queryParams.append('status', params.status);
    if (params.userId) queryParams.append('userId', params.userId);

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/export/sales/pdf?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export sales to PDF');
    }

    return await response.blob();
  },

  /**
   * Export commissions to Excel
   */
  async exportCommissionsToExcel(params: ExportCommissionsParams = {}): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (params.month) queryParams.append('month', params.month.toString());
    if (params.year) queryParams.append('year', params.year.toString());

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/export/commissions/excel?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export commissions to Excel');
    }

    return await response.blob();
  },

  /**
   * Export shifts to Excel
   */
  async exportShiftsToExcel(params: ExportShiftsParams = {}): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/export/shifts/excel?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export shifts to Excel');
    }

    return await response.blob();
  },
};

