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
  RefreshCw,
  DollarSign
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
  const [dollarRate, setDollarRate] = useState<number>(500.00);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('settings')
        .select('*');

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        // Descuento por efectivo
        const discountRow = data.find(item => item.key === 'cash_usd_discount');
        if (discountRow) {
          const value = typeof discountRow.value === 'string' ? JSON.parse(discountRow.value) : discountRow.value;
          setConfig({
            enabled: value.enabled ?? false,
            percentage: value.percentage ?? 5
          });
        } else {
          await initializeDefaultSettings('cash_usd_discount', { enabled: false, percentage: 5 });
        }

        // Tasa del dólar
        const rateRow = data.find(item => item.key === 'dollar_rate');
        if (rateRow) {
          const value = typeof rateRow.value === 'string' ? JSON.parse(rateRow.value) : rateRow.value;
          setDollarRate(value.rate ?? 47.50);
        } else {
          await initializeDefaultSettings('dollar_rate', { rate: 47.50 });
        }
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(
        err.message || 'No se pudo cargar la configuración de descuento o la tasa del dólar.'
      );
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultSettings = async (key: string, defaultValue: any) => {
    try {
      const { error: insertError } = await supabase
        .from('settings')
        .insert([{ key, value: defaultValue }]);

      if (insertError) throw insertError;

      if (key === 'cash_usd_discount') {
        setConfig(defaultValue);
      } else if (key === 'dollar_rate') {
        setDollarRate(defaultValue.rate);
      }
    } catch (err: any) {
      throw new Error(`No se pudo inicializar la tabla de configuraciones para ${key}. Asegúrese de haber creado la tabla "settings" en Supabase.`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.percentage < 0 || config.percentage > 100) {
      alert('El porcentaje de descuento debe estar entre 0 y 100.');
      return;
    }
    if (dollarRate <= 0) {
      alert('La tasa de cambio del dólar debe ser mayor a 0.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Guardar descuento
      const { error: discountError } = await supabase
        .from('settings')
        .upsert({
          key: 'cash_usd_discount',
          value: {
            enabled: config.enabled,
            percentage: Number(config.percentage)
          },
          updated_at: new Date().toISOString()
        });

      if (discountError) throw discountError;

      // Guardar tasa
      const { error: rateError } = await supabase
        .from('settings')
        .upsert({
          key: 'dollar_rate',
          value: {
            rate: Number(dollarRate)
          },
          updated_at: new Date().toISOString()
        });

      if (rateError) throw rateError;

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
      <header className="dashboard-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Configuración</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Ajustes globales y tasas del sistema.
          </p>
        </div>

        {!loading && !error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {success && (
              <div className={styles.successMessage}>
                <CheckCircle size={16} />
                <span>Guardado</span>
              </div>
            )}

            <button
              type="submit"
              form="settings-form"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Guardando...' : 'Guardar Ajustes'}
            </button>
          </div>
        )}
      </header>

      <div className={styles.container}>
        {loading ? (
          <div className="glass-panel skeleton" style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw className={styles.spinner} size={28} />
              <p style={{ marginTop: '1rem', fontSize: '0.95rem' }}>Cargando parámetros globales...</p>
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
          <form id="settings-form" onSubmit={handleSave} className={styles.formContainer}>
            <div className={styles.grid}>
              {/* TARJETA 1: TASA DEL DÓLAR */}
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className={styles.iconWrapperBlue}>
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tasa de Cambio</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Valor del dólar del día para conversión a Bs.</p>
                  </div>
                </div>

                <div className={styles.inputCard}>
                  <span className={styles.inputPrefix}>Bs</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dollarRate}
                    onChange={e => setDollarRate(Number(e.target.value))}
                    className={styles.largeInput}
                    placeholder="47.50"
                  />
                </div>
              </div>

              {/* TARJETA 2: DESCUENTO EN EFECTIVO */}
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className={styles.iconWrapperGreen}>
                      <Percent size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Descuento Efectivo</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Aplica descuento al pagar solo en $ cash.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.toggleButton}
                    onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                  >
                    {config.enabled ? (
                      <ToggleRight size={38} color="var(--accent)" />
                    ) : (
                      <ToggleLeft size={38} color="var(--text-secondary)" />
                    )}
                  </button>
                </div>

                <div className={`${styles.inputCard} ${!config.enabled ? styles.disabled : ''}`}>
                  <span className={styles.inputPrefix}>%</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    disabled={!config.enabled}
                    value={config.percentage}
                    onChange={e => setConfig(prev => ({ ...prev, percentage: Number(e.target.value) }))}
                    className={styles.largeInput}
                    placeholder="5.0"
                  />
                </div>
              </div>
            </div>

            {/* BANNER INFORMATIVO COMPACTO */}
            <div className={styles.infoBox}>
              <HelpCircle size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p>
                El descuento por efectivo se calcula automáticamente cuando el cajero registra el pago utilizando únicamente dólares en efectivo.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
