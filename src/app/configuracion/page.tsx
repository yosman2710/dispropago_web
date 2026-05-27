'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Settings, 
  Percent, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle,
  ToggleLeft, 
  ToggleRight,
  Database,
  RefreshCw
} from 'lucide-react';
import styles from './page.module.css';

interface DiscountConfig {
  enabled: boolean;
  percentage: number;
}

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Settings state
  const [config, setConfig] = useState<DiscountConfig>({
    enabled: false,
    percentage: 5
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'cash_usd_discount')
        .single();

      if (fetchError) {
        // Si la tabla no existe o la fila no existe
        if (fetchError.code === 'PGRST116') {
          // Fila no encontrada, intentamos insertarla
          await initializeDefaultSettings();
        } else {
          throw fetchError;
        }
      } else if (data) {
        // En Supabase, el campo value se guarda como jsonb
        const value = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setConfig({
          enabled: value.enabled ?? false,
          percentage: value.percentage ?? 5
        });
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(
        err.message || 'No se pudo cargar la configuración de descuento.'
      );
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultSettings = async () => {
    try {
      const defaultValue = { enabled: false, percentage: 5 };
      const { error: insertError } = await supabase
        .from('settings')
        .insert([{ key: 'cash_usd_discount', value: defaultValue }]);

      if (insertError) throw insertError;
      
      setConfig(defaultValue);
    } catch (err: any) {
      throw new Error('No se pudo inicializar la tabla de configuraciones. Asegúrese de haber creado la tabla "settings" en Supabase.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.percentage < 0 || config.percentage > 100) {
      alert('El porcentaje de descuento debe estar entre 0 y 100.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { error: updateError } = await supabase
        .from('settings')
        .upsert({
          key: 'cash_usd_discount',
          value: {
            enabled: config.enabled,
            percentage: Number(config.percentage)
          },
          updated_at: new Date().toISOString()
        });

      if (updateError) throw updateError;
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Ocurrió un error al guardar los ajustes.');
    } finally {
      setSaving(false);
    }
  };

  const sqlCreateQuery = `CREATE TABLE public.settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow write settings" ON public.settings FOR ALL USING (true);`;

  return (
    <div className="fade-in">
      <header className="dashboard-header">
        <div>
          <h1>Configuración General</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Gestiona los parámetros globales de la aplicación y políticas de ventas de Dispropago.
          </p>
        </div>
      </header>

      <div className={styles.container}>
        {loading ? (
          <div className="glass-panel skeleton" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw className={styles.spinner} size={28} />
              <p style={{ marginTop: '1rem' }}>Cargando parámetros globales...</p>
            </div>
          </div>
        ) : error ? (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div className={styles.errorHeader}>
              <AlertTriangle color="var(--danger)" size={24} />
              <h3>Error de Conexión o Configuración</h3>
            </div>
            <p className={styles.errorText}>
              No se pudo interactuar con la tabla <code>settings</code> en Supabase. 
              Si es la primera vez que inicia esta característica, es probable que deba crear la tabla en su panel de administración.
            </p>
            
            <div className={styles.sqlInstructions}>
              <div className={styles.sqlHeader}>
                <Database size={16} />
                <span>Instrucciones SQL (Ejecutar en Supabase SQL Editor):</span>
              </div>
              <pre className={styles.sqlCode}>
                {sqlCreateQuery}
              </pre>
            </div>
            
            <button onClick={fetchSettings} className="btn-primary" style={{ marginTop: '1.5rem' }}>
              <RefreshCw size={16} />
              <span>Reintentar Cargar</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="glass-panel" style={{ padding: '2rem' }}>
            <div className={styles.sectionHeader}>
              <Settings size={22} className={styles.iconPrimary} />
              <h2>Descuento por Efectivo en Dólares ($ USD Cash)</h2>
            </div>
            
            <p className={styles.sectionDescription}>
              Esta opción permite aplicar de manera automática un porcentaje de descuento cuando los clientes realizan compras 
              abonando **únicamente** con billetes de Dólares en Efectivo. No se aplicará el descuento si se combina con bolívares en efectivo, punto de venta, transferencias u otros métodos.
            </p>

            <div className={styles.formContent}>
              {/* Toggle de Activación */}
              <div className={styles.settingRow}>
                <div className={styles.settingLabelGroup}>
                  <span className={styles.settingTitle}>Activar descuento</span>
                  <span className={styles.settingSubtitle}>Habilita o deshabilita la promoción en todas las tabletas de los cajeros.</span>
                </div>
                
                <button 
                  type="button"
                  className={`${styles.toggleButton} ${config.enabled ? styles.toggleActive : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                >
                  {config.enabled ? (
                    <ToggleRight size={44} color="var(--accent)" />
                  ) : (
                    <ToggleLeft size={44} color="var(--text-secondary)" />
                  )}
                </button>
              </div>

              {/* Input Porcentaje */}
              <div className={`${styles.settingRow} ${!config.enabled ? styles.rowDisabled : ''}`}>
                <div className={styles.settingLabelGroup}>
                  <span className={styles.settingTitle}>Porcentaje de Descuento</span>
                  <span className={styles.settingSubtitle}>Defina el porcentaje de reducción sobre el total de la orden.</span>
                </div>

                <div className={styles.inputWrapper}>
                  <Percent size={18} className={styles.inputIcon} />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    disabled={!config.enabled}
                    value={config.percentage}
                    onChange={e => setConfig(prev => ({ ...prev, percentage: Number(e.target.value) }))}
                    className={styles.percentInput}
                    placeholder="5.0"
                  />
                </div>
              </div>
            </div>

            {/* Panel Informativo */}
            <div className={styles.infoBox}>
              <HelpCircle size={20} color="var(--primary)" />
              <div>
                <h4>¿Cómo funciona en la tableta del Cajero?</h4>
                <p>
                  Cuando el descuento esté **Habilitado**, la pantalla de pago de la aplicación detectará de forma automática 
                  si los campos de <em>Efectivo Bs</em>, <em>Punto de Venta</em> y <em>Transferencia</em> están en cero. 
                  En ese instante, si el cajero introduce dinero únicamente en la sección <em>Efectivo $</em> (Dólares), 
                  se le cobrará al cliente el total de la orden con el {config.percentage}% de descuento ya deducido.
                </p>
              </div>
            </div>

            {/* Botón Guardar / Success */}
            <div className={styles.formActions}>
              {success && (
                <div className={styles.successMessage}>
                  <CheckCircle size={18} />
                  <span>Configuración guardada y sincronizada correctamente.</span>
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={saving} 
                className="btn-primary"
                style={{ marginLeft: 'auto' }}
              >
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
