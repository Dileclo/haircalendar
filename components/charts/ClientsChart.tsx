'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function ClientsChart() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/statistics/clients')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData(d.data.slice(0, 10).map((r: any) => ({
            name: r.name.length > 12 ? r.name.substring(0, 12) + '...' : r.name,
            revenue: r.total_spent,
            visits: r.visits,
          })).reverse());
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="chart-container">
      <h3 className="text-sm font-semibold mb-4">Топ-10 клиентов</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-primary)' }} width={100} />
          <Tooltip
            formatter={(value: any) => [`${Number(value).toLocaleString()} ₽`, 'Потрачено']}
            contentStyle={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              fontSize: '13px',
            }}
          />
          <Bar dataKey="revenue" fill="#34C759" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
