import * as ExcelJS from 'exceljs';

export const exportSalesToExcel = async (sales: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte de Ventas');

  worksheet.columns = [
    { header: 'Fecha', key: 'created_at', width: 25 },
    { header: 'Cliente', key: 'customer_name', width: 30 },
    { header: 'Cédula/RIF', key: 'customer_cedula', width: 15 },
    { header: 'Total USD', key: 'total_usd', width: 15 },
    { header: 'Total Bs', key: 'total_bs', width: 15 },
    { header: 'Tasa Cambio', key: 'rate', width: 15 },
    { header: 'Pagado Efectivo USD', key: 'payment_cash_usd', width: 20 },
    { header: 'Pagado Efectivo Bs', key: 'payment_cash_bs', width: 20 },
    { header: 'Pagado POS Bs', key: 'payment_pos_bs', width: 18 },
    { header: 'Pagado Transf. Bs', key: 'payment_transfer_bs', width: 20 },
    { header: 'Cajero', key: 'cashier_name', width: 25 },
    { header: 'Estado', key: 'status', width: 12 },
  ];

  // Estilo de encabezado
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }, // Azul intenso
  };

  sales.forEach((sale) => {
    worksheet.addRow({
      ...sale,
      created_at: new Date(sale.created_at).toLocaleString(),
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `Reporte_Dispropago_${new Date().toISOString().split('T')[0]}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
};
