'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function ComparisonChart() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/statistics/comparison?period=month')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const merged: Record<string, any> = {};
          d.data.revenue.forEach((r: any) => {
            merged[r.period] = { ...merged[r.period], period: r.period.substring(5), revenue: r.value || 0 };
          });
          d.data.expenses.forEach((r: any) => {
            merged[r.period] = { ...merged[r.period], expenses: r.value || 0 };
          });
          setData(Object.values(merged).slice(-12));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="chart-container">
      <h3 className="text-sm font-semibold mb-4">Доходы vs Расходы</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(value: any) => [`${Number(value).toLocaleString()} ₽`]}
            contentStyle={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              fontSize: '13px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="revenue" name="Доход" fill="#34C759" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="Расход" fill="#FF3B30" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
