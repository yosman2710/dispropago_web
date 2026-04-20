'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { exportSalesToExcel } from '@/lib/exportExcel';
import { SalesAreaChart, PaymentMethodChart } from '@/components/DashboardCharts';
import { Download, DollarSign, CreditCard, TrendingUp, Users } from 'lucide-react';

export default function Dashboard() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

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

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSalesToExcel(sales);
    } catch (error) {
      console.error('Error exporting data: ', error);
      alert('Hubo un error al exportar el archivo Excel.');
    } finally {
      setExporting(false);
    }
  };

  // Cálculos de KPI
  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.created_at.startsWith(today));
  
  const totalUsdToday = todaySales.reduce((acc, curr) => acc + Number(curr.total_usd), 0);
  const totalBsToday = todaySales.reduce((acc, curr) => acc + Number(curr.total_bs), 0);
  const totalTransactions = todaySales.length;

  return (
    <div className="fade-in">
      <header className="dashboard-header">
        <div>
          <h1>Panel de Estadísticas</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Visualiza y gestiona las transacciones de Dispropago.</p>
        </div>

        <button 
          onClick={handleExport} 
          disabled={exporting || sales.length === 0} 
          className="btn-primary"
        >
          <Download size={20} />
          {exporting ? 'Generando Excel...' : 'Exportar Excel'}
        </button>
      </header>

      {loading ? (
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-panel stat-card skeleton" style={{ height: '140px' }}></div>
          ))}
        </div>
      ) : (
        <section className="stats-grid">
          <div className="glass-panel stat-card">
            <div className="stat-header">
              <span>Ventas USD (Hoy)</span>
              <DollarSign className="stat-icon" size={38} />
            </div>
            <div className="stat-value">${totalUsdToday.toFixed(2)}</div>
          </div>
          
          <div className="glass-panel stat-card">
            <div className="stat-header">
              <span>Ventas Bs (Hoy)</span>
              <DollarSign className="stat-icon" size={38} style={{ color: 'var(--accent)', background: 'rgba(16, 185, 129, 0.1)' }} />
            </div>
            <div className="stat-value">Bs {totalBsToday.toFixed(2)}</div>
          </div>

          <div className="glass-panel stat-card">
            <div className="stat-header">
              <span>Transacciones (Hoy)</span>
              <TrendingUp className="stat-icon" size={38} style={{ color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)' }} />
            </div>
            <div className="stat-value">{totalTransactions}</div>
          </div>

          <div className="glass-panel stat-card">
            <div className="stat-header">
              <span>Total Histórico</span>
              <Users className="stat-icon" size={38} style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' }} />
            </div>
            <div className="stat-value">{sales.length} ops</div>
          </div>
        </section>
      )}

      {!loading && (
        <section className="charts-grid fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="glass-panel chart-card">
            <h3>📈 Historial de Ventas (USD)</h3>
            <div className="chart-wrapper">
              <SalesAreaChart salesData={sales} />
            </div>
          </div>

          <div className="glass-panel chart-card">
            <h3>💳 Desglose de Pagos</h3>
            <div className="chart-wrapper">
              <PaymentMethodChart salesData={sales} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
