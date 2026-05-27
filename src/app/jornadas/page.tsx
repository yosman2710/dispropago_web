'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
// CORRECCIÓN: Se importan ambas funciones para separar las responsabilidades de los botones
import { exportSalesToExcel, exportProductTotalsToExcel } from '@/lib/exportExcel';
import {
  Calendar,
  Plus,
  ArrowLeft,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  Package,
  Scale
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
  const [exportingProducts, setExportingProducts] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

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
        .select('*, sale_items(*)')
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
      // LLAMADA ORIGINAL: Transacciones individuales (Mantiene Hoja 1 y Hoja 2 desglosada)
      await exportSalesToExcel(sales);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Hubo un error al generar el documento Excel.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportProductTotals = async () => {
    if (!sales.length) return;
    setExportingProducts(true);

    try {
      const productMap: {
        [key: string]: {
          product_name: string;
          total_weight_kg: number;
          total_bs: number;
          total_usd: number;
          occurrences: number;
        }
      } = {};

      sales.forEach(sale => {
        const currentRate = Number(sale.rate) || 1; // Tasa de la venta para conversión inversa

        if (sale.sale_items && Array.isArray(sale.sale_items)) {
          sale.sale_items.forEach((item: any) => {
            const name = item.product_name || 'Producto Desconocido';
            const weight = Number(item.weight_kg) || 0;

            // CORRECCIÓN DE LÓGICA: item.price_usd contiene el precio en Bolívares
            const priceBsPerKg = Number(item.price_usd) || 0;
            const itemTotalBs = priceBsPerKg * weight;

            // Conversión inversa a dólares usando la tasa registrada en la venta
            const itemTotalUsd = currentRate > 0 ? (itemTotalBs / currentRate) : 0;

            if (!productMap[name]) {
              productMap[name] = {
                product_name: name,
                total_weight_kg: 0,
                total_bs: 0,
                total_usd: 0,
                occurrences: 0
              };
            }

            productMap[name].total_weight_kg += weight;
            productMap[name].total_bs += itemTotalBs;
            productMap[name].total_usd += itemTotalUsd;
            productMap[name].occurrences += 1;
          });
        }
      });

      const consolidatedProducts = Object.values(productMap);

      if (consolidatedProducts.length === 0) {
        alert('No se encontraron productos en las ventas registradas de esta jornada.');
        setExportingProducts(false);
        return;
      }

      await exportProductTotalsToExcel(consolidatedProducts);

    } catch (error) {
      console.error('Error exporting product totals:', error);
      alert('Hubo un error al consolidar el peso y precios de los productos.');
    } finally {
      setExportingProducts(false);
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

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* NUEVO BOTÓN CON LOGICA SEPARADA */}
            <button
              onClick={handleExportProductTotals}
              disabled={exportingProducts || sales.length === 0}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              <Scale size={18} />
              {exportingProducts ? 'Consolidando...' : 'Exportar Totales Productos'}
            </button>

            {/* BOTÓN ORIGINAL */}
            <button
              onClick={handleExport}
              disabled={exporting || sales.length === 0}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              <FileSpreadsheet size={18} />
              {exporting ? 'Generando Excel...' : 'Exportar Ventas'}
            </button>
          </div>
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
                    <th style={{ width: '40px' }}></th>
                    <th>Fecha</th>
                    <th>Recibo</th>
                    <th>Cliente</th>
                    <th>Total USD</th>
                    <th>Total Bs</th>
                    <th>Cajero</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <React.Fragment key={sale.id}>
                      <tr
                        onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                        style={{ cursor: 'pointer' }}
                        className={styles.saleRow}
                      >
                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          {expandedSaleId === sale.id
                            ? <ChevronDown size={16} />
                            : <ChevronRight size={16} />}
                        </td>
                        <td>{new Date(sale.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{sale.receipt_number || sale.purchase_number || '-'}</td>
                        <td>
                          {sale.customer_name} <br />
                          <small style={{ color: 'var(--text-secondary)' }}>{sale.customer_cedula}</small>
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

                      {/* Fila expandida: detalle de productos */}
                      {expandedSaleId === sale.id && (
                        <tr key={`${sale.id}-items`} className={styles.expandedRow}>
                          <td colSpan={8} style={{ padding: '0' }}>
                            <div className={styles.itemsPanel}>
                              <div className={styles.itemsPanelHeader}>
                                <Package size={14} />
                                <span>Productos de esta venta ({sale.sale_items?.length || 0} ítem{(sale.sale_items?.length || 0) !== 1 ? 's' : ''})</span>
                              </div>
                              {sale.sale_items && sale.sale_items.length > 0 ? (
                                <table className={styles.itemsTable}>
                                  <thead>
                                    <tr>
                                      <th>Producto</th>
                                      <th>Peso (Kg)</th>
                                      <th>Precio (Bs)</th>
                                      <th>Total (Bs)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sale.sale_items.map((item: any) => (
                                      <tr key={item.id}>
                                        <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                                        <td>{Number(item.weight_kg).toFixed(3)} Kg</td>
                                        <td style={{ color: 'var(--primary)' }}>Bs {Number(item.price_usd).toFixed(2)}</td>
                                        <td>Bs {Number(item.total_bs).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '0.5rem 0' }}>Sin ítems registrados.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Descripción (Opcional)</label>
                <textarea
                  className={styles.inputField}
                  placeholder="Detalles adicionales..."
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Fecha de la Jornada</label>
                <input
                  type="date"
                  required
                  className={styles.inputField}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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