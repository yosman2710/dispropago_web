'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { exportSalesToExcel } from '@/lib/exportExcel';
import { 
  Calendar, 
  Plus, 
  Clock, 
  FileText, 
  ArrowLeft, 
  FileSpreadsheet, 
  Search,
  ChevronRight,
  Info
} from 'lucide-react';
import styles from './page.module.css';

interface Jornada {
  id: string;
  name: string;
  description: string | null;
  start_at: string;
  end_at: string;
  created_at: string;
}

export default function JornadasPage() {
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJornada, setSelectedJornada] = useState<Jornada | null>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: ''
  });

  const fetchJornadas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jornadas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jornadas:', error);
        return;
      }

      setJornadas(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesForJornada = async (jornada: Jornada) => {
    try {
      setLoadingSales(true);
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', jornada.start_at)
        .lte('created_at', jornada.end_at)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching sales:', error);
        return;
      }

      setSales(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => {
    fetchJornadas();
  }, []);

  useEffect(() => {
    if (selectedJornada) {
      fetchSalesForJornada(selectedJornada);
    } else {
      setSales([]);
    }
  }, [selectedJornada]);

  const handleCreateJornada = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Definir el inicio y fin del día en hora local y convertir a ISO
      const start_at = new Date(`${formData.date}T00:00:00`).toISOString();
      const end_at = new Date(`${formData.date}T23:59:59`).toISOString();

      const { error } = await supabase
        .from('jornadas')
        .insert([{
          name: formData.name,
          description: formData.description || null,
          start_at,
          end_at
        }]);

      if (error) {
        alert('Error al crear la jornada: ' + error.message);
        return;
      }

      setIsModalOpen(false);
      setFormData({
        name: '',
        description: '',
        date: ''
      });
      fetchJornadas();
    } catch (err) {
      console.error('Error creating jornada:', err);
    }
  };

  const handleExport = async () => {
    if (!sales.length) return;
    setExporting(true);
    try {
      await exportSalesToExcel(sales);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Hubo un error al generar el documento Excel.');
    } finally {
      setExporting(false);
    }
  };

  if (selectedJornada) {
    return (
      <div className={`fade-in ${styles.container}`}>
        <button onClick={() => setSelectedJornada(null)} className={styles.backButton}>
          <ArrowLeft size={18} />
          Volver a Jornadas
        </button>

        <header className={styles.detailHeader}>
          <div>
            <h1>{selectedJornada.name}</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              {selectedJornada.description || 'Sin descripción'}
            </p>
            <div className={styles.jornadaMeta} style={{ marginTop: '1rem' }}>
              <div className={styles.metaItem}>
                <Calendar size={16} />
                <span>Fecha: {new Date(selectedJornada.start_at).toLocaleDateString('es-ES', { dateStyle: 'long' })}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleExport} 
            disabled={exporting || sales.length === 0} 
            className="btn-primary" 
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            <FileSpreadsheet size={18} />
            {exporting ? 'Generando Excel...' : 'Exportar Ventas'}
          </button>
        </header>

        <div className="glass-panel" style={{ padding: '0' }}>
          <div className={styles.tableContainer}>
            {loadingSales ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Cargando ventas del periodo...
              </div>
            ) : sales.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No se registraron ventas en esta jornada.
              </div>
            ) : (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Total USD</th>
                    <th>Total Bs</th>
                    <th>Cajero</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{new Date(sale.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>
                        {sale.customer_name} <br/> 
                        <small style={{color: 'var(--text-secondary)'}}>{sale.customer_cedula}</small>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>${Number(sale.total_usd).toFixed(2)}</td>
                      <td>Bs {Number(sale.total_bs).toFixed(2)}</td>
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
      </div>
    );
  }

  return (
    <>
      <div className={`fade-in ${styles.container}`}>
        <header className={styles.header}>
        <div>
          <h1>Jornadas</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Gestiona eventos y consulta ventas por lapsos de tiempo específicos.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={18} />
          Nueva Jornada
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          Cargando jornadas...
        </div>
      ) : jornadas.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
          <Calendar size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
          <h3>No hay jornadas creadas</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Crea una nueva jornada para empezar a trackear ventas por periodos.</p>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ marginTop: '1.5rem' }}>
            <Plus size={18} />
            Crear mi primera jornada
          </button>
        </div>
      ) : (
        <div className={styles.jornadaGrid}>
          {jornadas.map((jornada) => (
            <div key={jornada.id} className={styles.jornadaCard} onClick={() => setSelectedJornada(jornada)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3>{jornada.name}</h3>
                <ChevronRight size={20} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <p>{jornada.description || 'Sin descripción'}</p>
              <div className={styles.jornadaMeta}>
                <div className={styles.metaItem}>
                  <Calendar size={14} />
                  <span>Fecha: {new Date(jornada.start_at).toLocaleDateString('es-ES', { dateStyle: 'medium' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Crear Nueva Jornada</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Define el nombre y el lapso de tiempo para este evento.
            </p>

            <form className={styles.form} onSubmit={handleCreateJornada}>
              <div className={styles.inputGroup}>
                <label>Nombre de la Jornada</label>
                <input 
                  type="text" 
                  required 
                  className={styles.inputField} 
                  placeholder="Ej. Jornada de Inventario Mayo"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Descripción (Opcional)</label>
                <textarea 
                  className={styles.inputField} 
                  placeholder="Detalles adicionales..."
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Fecha de la Jornada</label>
                <input 
                  type="date" 
                  required 
                  className={styles.inputField}
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Crear Jornada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
