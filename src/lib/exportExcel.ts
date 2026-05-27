import * as ExcelJS from 'exceljs';

/**
 * FUNCIÓN 1: Exportar el Reporte General de Ventas y el Desglose por Ítem
 */
export const exportSalesToExcel = async (sales: any[]) => {
  const workbook = new ExcelJS.Workbook();

  // HOJA 1: Reporte de Ventas General
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
    { header: 'Descuento (%)', key: 'discount_percentage', width: 15 },
    { header: 'Cajero', key: 'cashier_name', width: 25 },
    { header: 'Estado', key: 'status', width: 12 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

  sales.forEach((sale) => {
    let formattedDate = '-';
    if (sale.created_at) {
      const d = new Date(sale.created_at);
      formattedDate = isNaN(d.getTime()) ? '-' : d.toLocaleString('es-ES');
    }

    const row = worksheet.addRow({
      created_at: formattedDate,
      customer_name: sale.customer_name || 'Consumidor Final',
      customer_cedula: sale.customer_cedula || '-',
      total_usd: sale.total_usd ? Number(sale.total_usd) : 0,
      total_bs: sale.total_bs ? Number(sale.total_bs) : 0,
      rate: sale.rate ? Number(sale.rate) : 0,
      payment_cash_usd: sale.payment_cash_usd ? Number(sale.payment_cash_usd) : 0,
      payment_cash_bs: sale.payment_cash_bs ? Number(sale.payment_cash_bs) : 0,
      payment_pos_bs: sale.payment_pos_bs ? Number(sale.payment_pos_bs) : 0,
      payment_transfer_bs: sale.payment_transfer_bs ? Number(sale.payment_transfer_bs) : 0,
      discount_percentage: sale.discount_percentage ? Number(sale.discount_percentage) : 0,
      cashier_name: sale.cashier_name || 'Desconocido',
      status: sale.status || 'Completado',
    });

    [4, 5, 6, 7, 8, 9, 10, 11].forEach(colIndex => {
      const cell = row.getCell(colIndex);
      if (colIndex === 11) {
        cell.numFmt = '0.00"%"';
      } else {
        cell.numFmt = '#,##0.00';
      }
      cell.alignment = { horizontal: 'right' };
    });
  });

  // HOJA 2: Detalles individuales de los Productos por Venta
  const detailsSheet = workbook.addWorksheet('Detalles de Productos');
  detailsSheet.columns = [
    { header: 'Fecha de Venta', key: 'created_at', width: 25 },
    { header: 'Nro. de Recibo', key: 'receipt_number', width: 20 },
    { header: 'Cliente', key: 'customer_name', width: 30 },
    { header: 'Producto', key: 'product_name', width: 35 },
    { header: 'Peso (Kg)', key: 'weight_kg', width: 15 },
    { header: 'Precio Ref (Bs/Kg)', key: 'price_unit_bs', width: 18 }, // Modificado encabezado aclaratorio
    { header: 'Total (Bs)', key: 'total_bs', width: 15 },
    { header: 'Cajero', key: 'cashier_name', width: 25 },
  ];

  detailsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  detailsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
  detailsSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

  sales.forEach((sale) => {
    if (sale.sale_items && Array.isArray(sale.sale_items)) {
      sale.sale_items.forEach((item: any) => {
        let formattedDate = '-';
        if (sale.created_at) {
          const d = new Date(sale.created_at);
          formattedDate = isNaN(d.getTime()) ? '-' : d.toLocaleString('es-ES');
        }

        const row = detailsSheet.addRow({
          created_at: formattedDate,
          receipt_number: sale.receipt_number || sale.purchase_number || '-',
          customer_name: sale.customer_name || 'Consumidor Final',
          product_name: item.product_name || 'Desconocido',
          weight_kg: item.weight_kg ? Number(item.weight_kg) : 0,
          price_unit_bs: item.price_usd ? Number(item.price_usd) : 0, // price_usd realmente guarda Bs
          total_bs: item.total_bs ? Number(item.total_bs) : 0,
          cashier_name: sale.cashier_name || 'Desconocido',
        });

        row.getCell(5).numFmt = '#,##0.000 "Kg"';
        row.getCell(6).numFmt = '#,##0.00';
        row.getCell(7).numFmt = '#,##0.00';
      });
    }
  });

  await triggerDownload(workbook, `Reporte_Ventas_${new Date().toISOString().split('T')[0]}`);
};

/**
 * FUNCIÓN 2: Exportar ÚNICAMENTE el Consolidado/Totales de productos de la jornada
 */
export const exportProductTotalsToExcel = async (consolidatedProducts: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Totales Consolidados');

  worksheet.columns = [
    { header: 'Producto / Artículo', key: 'product_name', width: 35 },
    { header: 'Peso Total Acumulado', key: 'total_weight_kg', width: 22 },
    { header: 'Total General (USD)', key: 'total_usd', width: 22 },
    { header: 'Total General (Bs)', key: 'total_bs', width: 22 },
    { header: 'Cantidad de Ventas', key: 'occurrences', width: 20 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 25;

  consolidatedProducts.forEach((prod) => {
    const row = worksheet.addRow({
      product_name: prod.product_name,
      total_weight_kg: Number(prod.total_weight_kg) || 0,
      total_usd: Number(prod.total_usd) || 0,
      total_bs: Number(prod.total_bs) || 0,
      occurrences: Number(prod.occurrences) || 0,
    });

    row.height = 20;

    row.getCell(2).numFmt = '#,##0.000 "Kg"';
    row.getCell(3).numFmt = '#,##0.00';
    row.getCell(4).numFmt = '#,##0.00';
    row.getCell(5).alignment = { horizontal: 'center' };
  });

  const totalRowIndex = consolidatedProducts.length + 2;
  const totalRow = worksheet.getRow(totalRowIndex);

  totalRow.getCell(1).value = 'TOTAL JORNADA';
  totalRow.getCell(1).font = { bold: true };

  totalRow.getCell(2).value = { formula: `SUM(B2:B${totalRowIndex - 1})` };
  totalRow.getCell(2).numFmt = '#,##0.000 "Kg"';

  totalRow.getCell(3).value = { formula: `SUM(C2:C${totalRowIndex - 1})` };
  totalRow.getCell(3).numFmt = '#,##0.00';

  totalRow.getCell(4).value = { formula: `SUM(D2:D${totalRowIndex - 1})` };
  totalRow.getCell(4).numFmt = '#,##0.00';

  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'double', color: { argb: 'FF000000' } },
    };
  });

  await triggerDownload(workbook, `Reporte_Totales_Productos_${new Date().toISOString().split('T')[0]}`);
};

const triggerDownload = async (workbook: ExcelJS.Workbook, fileName: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `${fileName}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
};