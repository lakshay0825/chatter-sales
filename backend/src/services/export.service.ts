import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { GetSalesQuery } from '../validations/sale.schema';
import { getSales } from './sale.service';
import { UserRole } from '@prisma/client';

/**
 * Export sales to Excel format
 */
export async function exportSalesToExcel(
  query: GetSalesQuery,
  userRole: UserRole,
  userId: string
): Promise<Buffer> {
  const sales = await getSales({ ...query, limit: 10000 }, userRole, userId);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  // Add headers
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Time', key: 'time', width: 10 },
    { header: 'Chatter', key: 'chatter', width: 20 },
    { header: 'Creator', key: 'creator', width: 20 },
    { header: 'Sale Type', key: 'saleType', width: 15 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Note', key: 'note', width: 30 },
  ];

  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0A8BCC' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data
  sales.data.forEach((sale: any) => {
    const date = new Date(sale.saleDate);
    worksheet.addRow({
      date: date.toISOString().split('T')[0],
      time: date.toTimeString().split(' ')[0],
      chatter: sale.user.name,
      creator: sale.creator.name,
      saleType: sale.saleType,
      amount: sale.amount,
      status: sale.status,
      note: sale.note || '',
    });
  });

  // Format amount column as currency
  worksheet.getColumn('amount').numFmt = '€#,##0.00';

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Export sales to PDF format
 */
export async function exportSalesToPDF(
  query: GetSalesQuery,
  userRole: UserRole,
  userId: string
): Promise<Buffer> {
  const sales = await getSales({ ...query, limit: 10000 }, userRole, userId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('Sales Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Table header
    const tableTop = doc.y;
    const rowHeight = 20;
    const colWidths = [80, 60, 100, 100, 80, 70, 60, 150];
    const headers = ['Date', 'Time', 'Chatter', 'Creator', 'Type', 'Amount', 'Status', 'Note'];

    doc.fontSize(10).font('Helvetica-Bold');
    let x = 50;
    headers.forEach((header, i) => {
      doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });

    // Table rows
    doc.font('Helvetica');
    let y = tableTop + rowHeight;
    sales.data.forEach((sale: any) => {
      if (y > 750) {
        // New page if needed
        doc.addPage();
        y = 50;
      }

      const date = new Date(sale.saleDate);
      const rowData = [
        date.toISOString().split('T')[0],
        date.toTimeString().split(' ')[0],
        sale.user.name,
        sale.creator.name,
        sale.saleType,
        `€${sale.amount.toFixed(2)}`,
        sale.status,
        sale.note || '',
      ];

      x = 50;
      rowData.forEach((cell, i) => {
        doc.fontSize(8).text(cell, x, y, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
      });

      y += rowHeight;
    });

    doc.end();
  });
}

/**
 * Export commissions to Excel
 */
export async function exportCommissionsToExcel(
  month: number,
  year: number
): Promise<Buffer> {
  const { getAdminDashboard } = await import('./dashboard.service');
  const dashboardData = await getAdminDashboard(month, year, false);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Commissions Report');

  worksheet.columns = [
    { header: 'Chatter', key: 'chatter', width: 25 },
    { header: 'Month', key: 'month', width: 15 },
    { header: 'Revenue', key: 'revenue', width: 15 },
    { header: 'Commission', key: 'commission', width: 15 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0A8BCC' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  dashboardData.chatterRevenue.forEach((item) => {
    worksheet.addRow({
      chatter: item.chatterName,
      month: `${month}/${year}`,
      revenue: item.revenue,
      commission: item.commission,
    });
  });

  worksheet.getColumn('revenue').numFmt = '€#,##0.00';
  worksheet.getColumn('commission').numFmt = '€#,##0.00';

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Export shifts to Excel
 */
export async function exportShiftsToExcel(
  startDate: Date,
  endDate: Date
): Promise<Buffer> {
  const { getShifts } = await import('./shift.service');
  const shifts = await getShifts({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  } as any);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Shifts Report');

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Chatter', key: 'chatter', width: 25 },
    { header: 'Start Time', key: 'startTime', width: 15 },
    { header: 'End Time', key: 'endTime', width: 15 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0A8BCC' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  shifts.forEach((shift) => {
    worksheet.addRow({
      date: shift.date.toISOString().split('T')[0],
      chatter: shift.user.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

