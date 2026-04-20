'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Wallet, DollarSign, TrendingUp } from 'lucide-react';
import styles from './page.module.css';

export default function CajerosPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCaja, setActiveCaja] = useState<string>('Caja 1');

  // Nombres de cajas a listar en las pestañas
  const cajas = ['Caja 1', 'Caja 2', 'Caja 3', 'Caja 4', 'Caja 5', 'Caja 6'];

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching report:", error);
        return;
      }

      setSales(data || []);
    } catch (error) {
      console.error('Error in fetchSales:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => s.cashier_name === activeCaja);
  }, [sales, activeCaja]);

  const totalUsd = filteredSales.reduce((acc, curr) => acc + Number(curr.total_usd || 0), 0);
  const totalBs = filteredSales.reduce((acc, curr) => acc + Number(curr.total_bs || 0), 0);

  return (
    <div className={`fade-in ${styles.container}`}>
      <header className="dashboard-header">
        <div>
          <h1>Monitor de Cajeros</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Observa el rendimiento y transacciones de cada caja de forma individual.</p>
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.cajasGrid}>
        {cajas.map(caja => (
          <button 
            key={caja} 
            className={`${styles.cajaBtn} ${activeCaja === caja ? styles.active : ''}`}
            onClick={() => setActiveCaja(caja)}
          >
            <Wallet size={18} />
            {caja}
          </button>
        ))}
      </div>

      {!loading && (
        <section className={styles.statsGrid}>
          <div className={`fade-in ${styles.statCard}`}>
            <div className={styles.statHeader}>
              <span>Total USD ({activeCaja})</span>
              <DollarSign size={24} color="var(--primary)" />
            </div>
            <div className={styles.statValue}>${totalUsd.toFixed(2)}</div>
          </div>
          
          <div className={`fade-in ${styles.statCard}`} style={{ animationDelay: '0.1s' }}>
            <div className={styles.statHeader}>
              <span>Total Bs ({activeCaja})</span>
              <DollarSign size={24} color="var(--accent)" />
            </div>
            <div className={styles.statValue}>Bs {totalBs.toFixed(2)}</div>
          </div>

          <div className={`fade-in ${styles.statCard}`} style={{ animationDelay: '0.2s' }}>
            <div className={styles.statHeader}>
              <span>Operaciones Realizadas</span>
              <TrendingUp size={24} color="var(--warning)" />
            </div>
            <div className={styles.statValue}>{filteredSales.length}</div>
          </div>
        </section>
      )}

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Cargando datos de cajeros...
          </div>
        ) : filteredSales.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No se encontraron transacciones para {activeCaja}.
          </div>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Recibo</th>
                <th>Cliente</th>
                <th>Cobrado USD</th>
                <th>Cobrado Bs</th>
                <th>Detalles de Pago</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id}>
                  <td>{new Date(sale.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{sale.receipt_number || sale.purchase_number || '-'}</td>
                  <td>{sale.customer_name}</td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>${Number(sale.total_usd).toFixed(2)}</td>
                  <td>Bs {Number(sale.total_bs).toFixed(2)}</td>
                  <td>
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                       {Number(sale.payment_cash_usd) > 0 ? `Efectivo $: ${sale.payment_cash_usd} ` : ''}
                       {Number(sale.payment_cash_bs) > 0 ? `| Efectivo Bs: ${sale.payment_cash_bs} ` : ''}
                       {Number(sale.payment_pos_bs) > 0 ? `| Punto Bs: ${sale.payment_pos_bs} ` : ''}
                       {Number(sale.payment_transfer_bs) > 0 ? `| Transf Bs: ${sale.payment_transfer_bs}` : ''}
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
