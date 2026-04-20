'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, Scale, DollarSign, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import styles from './page.module.css';

export default function ProductosPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      // Extraemos toda la data de sale_items. Usamos un límite alto por seguridad si es mucha data
      const { data, error } = await supabase
        .from('sale_items')
        .select('*');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching sale_items:', error);
    } finally {
      setLoading(false);
    }
  };

  // 1. Agregar la data por Producto
  const aggregatedData = items.reduce((acc: any, curr: any) => {
    const name = curr.product_name || 'Desconocido';
    if (!acc[name]) {
      acc[name] = { 
        name, 
        totalWeight: 0, 
        totalBs: 0, 
        totalUsd: 0, 
        timesSold: 0 
      };
    }
    acc[name].totalWeight += Number(curr.weight_kg || 0);
    acc[name].totalBs += Number(curr.total_bs || 0);
    // Asumimos un price_usd * weight_kg aproximado, o price_usd directo si total_usd no existe
    acc[name].totalUsd += (Number(curr.price_usd || 0) * Number(curr.weight_kg || 1)); 
    acc[name].timesSold += 1;
    return acc;
  }, {});

  // Array ordenado por volumen de ventas (Bs o USD)
  const productList = Object.values(aggregatedData).sort((a: any, b: any) => b.totalWeight - a.totalWeight);
  
  // Extraer top métricas
  const totalWeightAll = productList.reduce((acc: number, curr: any) => acc + curr.totalWeight, 0);
  const bestSeller = productList.length > 0 ? (productList[0] as any).name : 'N/A';
  
  // Data para la gráfica de barras (Top 10 más vendidos por peso)
  const chartData = productList.slice(0, 10);
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

  return (
    <div className={`fade-in ${styles.container}`}>
      <header className="dashboard-header">
        <div>
          <h1>Estadísticas de Productos</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Análisis de rendimiento por rubro, volumen y ventas.</p>
        </div>
      </header>

      {!loading && (
        <section className={styles.statsGrid}>
          <div className={`fade-in ${styles.statCard}`}>
            <div className={styles.statHeader}>
              <span>Producto Estrella (KG)</span>
              <TrendingUp size={24} color="var(--accent)" />
            </div>
            <div className={styles.statValue} style={{ fontSize: '1.2rem', marginTop: '1rem' }}>{bestSeller}</div>
          </div>
          
          <div className={`fade-in ${styles.statCard}`} style={{ animationDelay: '0.1s' }}>
            <div className={styles.statHeader}>
              <span>Volumen Total Despachado</span>
              <Scale size={24} color="var(--primary)" />
            </div>
            <div className={styles.statValue}>{totalWeightAll.toFixed(3)} Kg</div>
          </div>

          <div className={`fade-in ${styles.statCard}`} style={{ animationDelay: '0.2s' }}>
            <div className={styles.statHeader}>
              <span>Rubros Distintos</span>
              <Package size={24} color="var(--warning)" />
            </div>
            <div className={styles.statValue}>{productList.length}</div>
          </div>
        </section>
      )}

      {!loading && chartData.length > 0 && (
        <div className={`fade-in ${styles.chartCard}`} style={{ animationDelay: '0.3s' }}>
           <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Top 10 Productos más Vendidos (por KG)</h3>
           <div style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false}/>
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={120} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: any) => [`${Number(value).toFixed(3)} Kg`, 'Volumen']}
                />
                <Bar dataKey="totalWeight" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Procesando métricas de productos...
          </div>
        ) : productList.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No hay productos registrados en el historial de ventas.
            <br/><br/>
            (Asegúrate de haber corrido la política SELECT en la tabla sale_items de Supabase si aplica).
          </div>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Operaciones</th>
                <th>Volumen Total (Kg)</th>
                <th>Generado (Estimado USD)</th>
                <th>Generado Bs</th>
              </tr>
            </thead>
            <tbody>
              {productList.map((prod: any) => (
                <tr key={prod.name}>
                  <td style={{ fontWeight: 500 }}>{prod.name}</td>
                  <td>{prod.timesSold} veces</td>
                  <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{prod.totalWeight.toFixed(3)} Kg</td>
                  <td style={{ color: 'var(--accent)' }}>${prod.totalUsd.toFixed(2)}</td>
                  <td>Bs {prod.totalBs.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
