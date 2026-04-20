'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { exportSalesToExcel } from '@/lib/exportExcel';
import { FileSpreadsheet, Search } from 'lucide-react';
import styles from './page.module.css';

export default function ReportesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReport = async () => {
    try {
      setLoading(true);
      
      let query = supabase.from('sales').select('*').order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching report:", error);
        alert(`Error al buscar datos: ${error.message}`);
        throw error;
      }

      setSales(data || []);
    } catch (error) {
      console.error('Error in fetchReport:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Al cargar la pantalla por defecto busca todo (o últimos 30 días, etc.)
    fetchReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSalesToExcel(sales);
    } catch (error) {
      console.error('Error exporting data: ', error);
      alert('Hubo un error al generar el documento Excel.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={`fade-in ${styles.container}`}>
      <header className="dashboard-header">
        <div>
          <h1>Reportes Avanzados</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Genera reportes de ventas filtrados por fechas.</p>
        </div>
      </header>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className={styles.filters}>
          <div className={styles.inputGroup}>
            <label>Fecha de Inicio</label>
            <input 
              type="date" 
              className={styles.inputField} 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Fecha Fin</label>
            <input 
              type="date" 
              className={styles.inputField} 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button onClick={fetchReport} className="btn-primary" disabled={loading} style={{ padding: '0.75rem 1.5rem', height: 'max-content' }}>
            <Search size={18} />
            {loading ? 'Buscando...' : 'Filtrar'}
          </button>

          <div style={{ flex: 1 }}></div>

          <button onClick={handleExport} disabled={exporting || sales.length === 0} className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <FileSpreadsheet size={18} />
            {exporting ? 'Generando Excel...' : 'Exportar a Excel'}
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Cargando transacciones...
          </div>
        ) : sales.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No se encontraron transacciones en este rango de fechas.
            <br/><br/>
            (Recuerda: Si esto siempre aparece vacío, asegúrate de haber insertado las credenciales en .env.local, reiniciado el servidor, y activado la Policy SELECT en Supabase tal como se indico anteriormente).
          </div>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Recibo</th>
                <th>Cliente</th>
                <th>Total USD</th>
                <th>Total Bs</th>
                <th>Método de Pago</th>
                <th>Cajero</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{new Date(sale.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{sale.receipt_number || sale.purchase_number || '-'}</td>
                  <td>{sale.customer_name} <br/> <small style={{color: 'var(--text-secondary)'}}>{sale.customer_cedula}</small></td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>${Number(sale.total_usd).toFixed(2)}</td>
                  <td>Bs {Number(sale.total_bs).toFixed(2)}</td>
                  <td>
                     {Number(sale.payment_cash_usd) > 0 && <span style={{display: 'block'}}>Efc $: {sale.payment_cash_usd}</span>}
                     {Number(sale.payment_cash_bs) > 0 && <span style={{display: 'block'}}>Efc Bs: {sale.payment_cash_bs}</span>}
                     {Number(sale.payment_pos_bs) > 0 && <span style={{display: 'block'}}>Punto: {sale.payment_pos_bs}</span>}
                     {Number(sale.payment_transfer_bs) > 0 && <span style={{display: 'block'}}>Transf: {sale.payment_transfer_bs}</span>}
                  </td>
                  <td>{sale.cashier_name || 'Desconocido'}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '20px', fontSize: '0.8rem',
                      background: sale.status === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: sale.status === 'success' ? '#10b981' : '#f59e0b'
                     }}>
                      {sale.status || 'Completado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
