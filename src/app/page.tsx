'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { exportSalesToExcel } from '@/lib/exportExcel';
import { SalesAreaChart, PaymentMethodChart } from '@/components/DashboardCharts';
import { Download, DollarSign, CreditCard, TrendingUp, Users } from 'lucide-react';

export default function Dashboard() {
  const [sales, setSales] = useState<any[]>([]);
  const [latestJornada, setLatestJornada] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: jornadaData } = await supabase
        .from('jornadas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (jornadaData) {
        setLatestJornada(jornadaData);
      }

      const { data: salesData, error } = await supabase
        .from('sales')
        .select('*, sale_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(salesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
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
  let currentSales = [];
  
  if (latestJornada) {
    currentSales = sales.filter(s => 
      s.created_at >= latestJornada.start_at && s.created_at <= latestJornada.end_at
    );
  } else {
    const today = new Date().toISOString().split('T')[0];
    currentSales = sales.filter(s => s.created_at.startsWith(today));
  }
  
  const totalUsdCurrent = currentSales.reduce((acc, curr) => acc + Number(curr.total_usd), 0);
  const totalBsCurrent = currentSales.reduce((acc, curr) => acc + Number(curr.total_bs), 0);
  const totalTransactions = currentSales.length;

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
              <span>Ventas USD {latestJornada ? '(Última Jornada)' : '(Hoy)'}</span>
              <DollarSign className="stat-icon" size={38} />
            </div>
            <div className="stat-value">${totalUsdCurrent.toFixed(2)}</div>
          </div>
          
          <div className="glass-panel stat-card">
            <div className="stat-header">
              <span>Ventas Bs {latestJornada ? '(Última Jornada)' : '(Hoy)'}</span>
              <DollarSign className="stat-icon" size={38} style={{ color: 'var(--accent)', background: 'rgba(16, 185, 129, 0.1)' }} />
            </div>
            <div className="stat-value">Bs {totalBsCurrent.toFixed(2)}</div>
          </div>

          <div className="glass-panel stat-card">
            <div className="stat-header">
              <span>Transacciones {latestJornada ? '(Última Jornada)' : '(Hoy)'}</span>
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
