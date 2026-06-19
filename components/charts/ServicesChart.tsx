'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#007AFF', '#FF9500', '#34C759', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55', '#00C7BE', '#FFCC00', '#8E8E93'];

export function ServicesChart() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/statistics/services')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData(d.data.map((r: any) => ({
            name: r.service.trim(),
            value: r.revenue,
            count: r.count,
          })));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="chart-container">
      <h3 className="text-sm font-semibold mb-4">Популярные услуги</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any) => [`${Number(value).toLocaleString()} ₽`, 'Выручка']}
            contentStyle={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              fontSize: '13px',
            }}
          />
          <Legend
            formatter={(value: string) => value.length > 18 ? value.substring(0, 18) + '...' : value}
            wrapperStyle={{ fontSize: '11px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
