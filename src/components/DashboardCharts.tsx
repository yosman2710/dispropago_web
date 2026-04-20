'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface ChartProps {
  salesData: any[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export const SalesAreaChart = ({ salesData }: ChartProps) => {
  // Procesar datos para la gráfica de tiempo (agrupar por fecha)
  const groupedData = salesData.reduce((acc: any, sale: any) => {
    const date = new Date(sale.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    if (!acc[date]) {
      acc[date] = { date, total_usd: 0, total_bs: 0 };
    }
    acc[date].total_usd += Number(sale.total_usd);
    acc[date].total_bs += Number(sale.total_bs);
    return acc;
  }, {});

  const chartData = Object.values(groupedData).slice(-15); // Últimos 15 días con datos

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-400">No hay datos suficientes</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorUsd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
          itemStyle={{ color: '#fff' }}
        />
        <Area type="monotone" dataKey="total_usd" name="Ventas (USD)" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsd)" />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export const PaymentMethodChart = ({ salesData }: ChartProps) => {
  // Procesar datos para métodos de pago
  const metrics = salesData.reduce((acc: any, sale: any) => {
    acc.cash_usd += Number(sale.payment_cash_usd || 0);
    acc.cash_bs += Number(sale.payment_cash_bs || 0) / Number(sale.rate || 1); // Normalizado aproximado en USD
    acc.pos_bs += Number(sale.payment_pos_bs || 0) / Number(sale.rate || 1);
    acc.transfer_bs += Number(sale.payment_transfer_bs || 0) / Number(sale.rate || 1);
    return acc;
  }, { cash_usd: 0, cash_bs: 0, pos_bs: 0, transfer_bs: 0 });

  const pieData = [
    { name: 'Efectivo ($)', value: metrics.cash_usd },
    { name: 'Efectivo (Bs)', value: metrics.cash_bs },
    { name: 'Punto de Venta', value: metrics.pos_bs },
    { name: 'Transferencia', value: metrics.transfer_bs },
  ].filter(item => item.value > 0);

  if (pieData.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-400">Sin métodos registrados</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
          formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Monto ($ Eq)']}
        />
        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
};
