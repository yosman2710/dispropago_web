'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Package, 
  Scale, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  X,
  Sparkles,
  UploadCloud
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import styles from './page.module.css';

export default function ProductosPage() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'catalogo' | 'estadisticas'>('catalogo');

  // Stats State (Original tab)
  const [items, setItems] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Products CRUD State (New tab)
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: '',
    price_usd: '',
    category: 'Carnes',
    image_url: '',
    in_sale: true
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      setUploadingImage(true);
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // Subir archivo a Supabase Storage en el bucket 'product-images'
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setForm(prev => ({ ...prev, image_url: publicUrlData.publicUrl }));
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchProducts();
  }, []);

  // --- STATS SYSTEM (ORIGINAL LOGIC) ---
  const fetchItems = async () => {
    try {
      setLoadingStats(true);
      const { data, error } = await supabase
        .from('sale_items')
        .select('*, sales(rate)');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching sale_items:', error);
    } finally {
      setLoadingStats(false);
    }
  };

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

    const weight = Number(curr.weight_kg || 0);
    const priceBs = Number(curr.price_usd || 0); // price_usd realmente guarda Bs
    const itemTotalBs = Number(curr.total_bs || (priceBs * weight));

    // Obtener la tasa de la venta asociada para la conversión
    const rateVal = curr.sales
      ? (Array.isArray(curr.sales)
          ? Number(curr.sales[0]?.rate)
          : Number(curr.sales.rate))
      : 1;
    const currentRate = rateVal || 1;
    const itemTotalUsd = currentRate > 0 ? (itemTotalBs / currentRate) : 0;

    acc[name].totalWeight += weight;
    acc[name].totalBs += itemTotalBs;
    acc[name].totalUsd += itemTotalUsd;
    acc[name].timesSold += 1;
    return acc;
  }, {});

  const productList = Object.values(aggregatedData).sort((a: any, b: any) => b.totalWeight - a.totalWeight);
  const totalWeightAll = productList.reduce((acc: number, curr: any) => acc + curr.totalWeight, 0);
  const bestSeller = productList.length > 0 ? (productList[0] as any).name : 'N/A';
  const chartData = productList.slice(0, 10);
  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

  // --- PRODUCTS CRUD SYSTEM (NEW LOGIC) ---
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      setFetchError(null);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setFetchError(error.message || 'Error al conectar con Supabase.');
    } finally {
      setLoadingProducts(false);
    }
  };

  const toggleInSale = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ in_sale: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      // Actualizar localmente para rendimiento inmediato
      setProducts(prev => 
        prev.map(p => p.id === id ? { ...p, in_sale: !currentStatus } : p)
      );
    } catch (error: any) {
      alert('Error al actualizar disponibilidad: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de eliminar este producto? Se ocultará del catálogo.')) {
      try {
        const { error } = await supabase
          .from('products')
          .update({ is_active: false })
          .eq('id', id);

        if (error) throw error;
        setProducts(prev => prev.filter(p => p.id !== id));
      } catch (error: any) {
        alert('Error al eliminar producto: ' + error.message);
      }
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm({
      name: '',
      price_usd: '',
      category: 'Carnes',
      image_url: '',
      in_sale: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      price_usd: product.price_usd.toString(),
      category: product.category || 'Carnes',
      image_url: product.image_url || '',
      in_sale: product.in_sale ?? true
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price_usd) {
      alert('Por favor llene los campos requeridos.');
      return;
    }

    const payload = {
      name: form.name,
      price_usd: parseFloat(form.price_usd),
      category: form.category,
      image_url: form.image_url || null,
      in_sale: form.in_sale,
      is_active: true
    };

    try {
      if (editingProduct) {
        // Update
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('products')
          .insert([payload]);

        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error: any) {
      alert('Error al guardar producto: ' + error.message);
    }
  };

  // Filtrado de productos en tiempo real
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'Todos' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Obtener categorías únicas para el dropdown de filtros
  const uniqueCategories = ['Todos', ...Array.from(new Set(products.map(p => p.category || 'Carnes')))];

  return (
    <div className={`fade-in ${styles.container}`}>
      {/* Dynamic Header */}
      <header className="dashboard-header">
        <div>
          <h1>Gestión de Productos</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {activeTab === 'catalogo' 
              ? 'Administre los productos disponibles para la jornada en las tabletas de los cajeros.'
              : 'Análisis de rendimiento por rubro, volumen y ventas.'}
          </p>
        </div>
      </header>

      {/* Tabs System Container */}
      <div className={styles.tabContainer}>
        <button 
          onClick={() => setActiveTab('catalogo')}
          className={`${styles.tabButton} ${activeTab === 'catalogo' ? styles.tabButtonActive : ''}`}
        >
          Catálogo & Jornada
        </button>
        <button 
          onClick={() => setActiveTab('estadisticas')}
          className={`${styles.tabButton} ${activeTab === 'estadisticas' ? styles.tabButtonActive : ''}`}
        >
          Rendimiento & Métricas
        </button>
      </div>

      {/* TAB 1: PRODUCT CATALOG & SHIFT MANAGEMENT (CRUD) */}
      {activeTab === 'catalogo' && (
        <div className="fade-in">
          {fetchError && (
            <div className={styles.errorBanner}>
              <div className={styles.errorBannerTitle}>
                <XCircle size={18} />
                <span>Error al Conectar con la Base de Datos (Supabase)</span>
              </div>
              <p className={styles.errorBannerMessage}>
                Detalle del error: <strong>{fetchError}</strong>
              </p>
              <p className={styles.errorBannerMessage}>
                Esto suele ocurrir si la tabla <strong>'products'</strong> aún no ha sido creada. Por favor, copie y ejecute el script SQL provisto en el panel SQL Editor de su dashboard de Supabase para solucionarlo.
              </p>
              <div className={styles.sqlHint}>
                {`CREATE TABLE public.products ( ... ); -- Ejecute el script 'supabase_products_schema.sql' en su panel de Supabase`}
              </div>
            </div>
          )}
          {/* Actions Bar */}
          <div className={styles.catalogHeaderRow}>
            <div className={styles.filtersGroup}>
              <div className={styles.searchBox}>
                <Search size={18} color="var(--text-secondary)" />
                <input 
                  type="text" 
                  className={styles.searchInput}
                  placeholder="Buscar productos por nombre..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                className={styles.selectFilter}
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <button className={styles.addButton} onClick={openCreateModal}>
              <Plus size={18} />
              <span>Nuevo Producto</span>
            </button>
          </div>

          {/* Catalog Data Table */}
          <div className={styles.tableContainer}>
            {loadingProducts ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Cargando catálogo de productos...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No se encontraron productos en el catálogo. ¡Crea uno nuevo!
              </div>
            ) : (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio (USD)</th>
                    <th style={{ textAlign: 'center' }}>¿En Venta Hoy? (Tablet)</th>
                    <th style={{ textAlign: 'right' }}>Operaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((prod: any) => (
                    <tr key={prod.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{prod.name}</td>
                      <td>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          background: 'rgba(255,255,255,0.05)', 
                          borderRadius: '6px',
                          fontSize: '0.85rem'
                        }}>
                          {prod.category}
                        </span>
                      </td>
                      <td style={{ color: 'var(--accent)', fontWeight: 600 }}>
                        ${Number(prod.price_usd).toFixed(2)}
                      </td>
                      <td style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span className={`${styles.badge} ${prod.in_sale ? styles.badgeInSale : styles.badgeOffSale}`}>
                            {prod.in_sale ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {prod.in_sale ? 'Habilitado' : 'Desactivado'}
                          </span>
                          <label className={styles.switchContainer}>
                            <div className={styles.switch}>
                              <input 
                                type="checkbox" 
                                checked={prod.in_sale ?? true} 
                                onChange={() => toggleInSale(prod.id, prod.in_sale ?? true)}
                              />
                              <span className={styles.slider}></span>
                            </div>
                          </label>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button 
                            className={`${styles.actionIconBtn} ${styles.actionIconEdit}`}
                            title="Editar Producto"
                            onClick={() => openEditModal(prod)}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className={`${styles.actionIconBtn} ${styles.actionIconDelete}`}
                            title="Eliminar Producto"
                            onClick={() => handleDelete(prod.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ORIGINAL SALES STATISTICS & CHARTS */}
      {activeTab === 'estadisticas' && (
        <div className="fade-in">
          {loadingStats ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Procesando estadísticas e histórico de ventas...
            </div>
          ) : (
            <>
              {/* Stats Cards Section */}
              <section className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span>Producto Estrella (KG)</span>
                    <TrendingUp size={24} color="var(--accent)" />
                  </div>
                  <div className={styles.statValue} style={{ fontSize: '1.2rem', marginTop: '1rem' }}>{bestSeller}</div>
                </div>
                
                <div className={styles.statCard} style={{ animationDelay: '0.1s' }}>
                  <div className={styles.statHeader}>
                    <span>Volumen Total Despachado</span>
                    <Scale size={24} color="var(--primary)" />
                  </div>
                  <div className={styles.statValue}>{totalWeightAll.toFixed(3)} Kg</div>
                </div>

                <div className={styles.statCard} style={{ animationDelay: '0.2s' }}>
                  <div className={styles.statHeader}>
                    <span>Rubros Distintos</span>
                    <Package size={24} color="var(--warning)" />
                  </div>
                  <div className={styles.statValue}>{productList.length}</div>
                </div>
              </section>

              {/* Bar Chart Section */}
              {chartData.length > 0 && (
                <div className={styles.chartCard} style={{ marginTop: '2rem', animationDelay: '0.3s' }}>
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
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Sales Table Section */}
              <div className={styles.tableContainer} style={{ marginTop: '2rem' }}>
                {productList.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No hay productos registrados en el historial de ventas.
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
            </>
          )}
        </div>
      )}

      {/* --- ADD / EDIT PRODUCT MODAL --- */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>NOMBRE DEL PRODUCTO *</label>
                <input 
                  type="text" 
                  className={styles.formInput}
                  placeholder="Ej. Pulpa Negra de Res" 
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>PRECIO EN DÓLARES (USD) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  className={styles.formInput}
                  placeholder="Ej. 10.99" 
                  required
                  value={form.price_usd}
                  onChange={e => setForm({ ...form, price_usd: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>CATEGORÍA</label>
                <select 
                  className={styles.selectFilter} 
                  style={{ width: '100%', height: '45px' }}
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option value="Carnes">Carnes</option>
                  <option value="Aves">Aves</option>
                  <option value="Charcutería">Charcutería</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>IMAGEN DEL PRODUCTO (JPG/PNG)</label>
                {form.image_url ? (
                  <div className={styles.imagePreviewContainer}>
                    <img 
                      src={form.image_url} 
                      alt="Preview" 
                      className={styles.imagePreview}
                    />
                    <button 
                      type="button" 
                      className={styles.removeImageBtn}
                      onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
                    >
                      <Trash2 size={16} />
                      <span>Quitar</span>
                    </button>
                  </div>
                ) : (
                  <label className={styles.fileUploadLabel}>
                    {uploadingImage ? (
                      <div className={styles.fileUploadPlaceholder}>
                        <span className={styles.spinner}></span>
                        <span>Subiendo imagen...</span>
                      </div>
                    ) : (
                      <div className={styles.fileUploadPlaceholder}>
                        <UploadCloud size={24} color="var(--primary)" />
                        <span>Haga clic para seleccionar o arrastrar imagen</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Formatos: JPG, PNG</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className={styles.fileInputHidden}
                      onChange={handleFileChange}
                      disabled={uploadingImage}
                    />
                  </label>
                )}
              </div>

              <div className={styles.formRow}>
                <span className={styles.formLabel}>¿DISPONIBLE EN VENTA HOY?</span>
                <label className={styles.switchContainer}>
                  <div className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={form.in_sale} 
                      onChange={e => setForm({ ...form, in_sale: e.target.checked })}
                    />
                    <span className={styles.slider}></span>
                  </div>
                </label>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submitButton}>
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
