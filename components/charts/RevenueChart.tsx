'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function formatRub(value: number): string {
  return `${(value / 1000).toFixed(0)}k ₽`;
}

export function RevenueChart() {
  const [data, setData] = useState<any[]>([]);
  const [period, setPeriod] = useState<'month' | 'year'>('month');

  useEffect(() => {
    fetch(`/api/statistics/revenue?period=${period}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData(d.data.map((r: any) => ({
            ...r,
            name: period === 'year' ? r.period : r.period.substring(5),
          })));
        }
      })
      .catch(() => {});
  }, [period]);

  const total = data.reduce((s: number, d: any) => s + (d.revenue || 0), 0);

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Выручка</h3>
          <p className="text-xs text-[var(--text-secondary)]">Всего: {total.toLocaleString()} ₽</p>
        </div>
        <div className="flex gap-1 bg-black/5 dark:bg-white/5 rounded-lg p-0.5">
          {(['month', 'year'] as const).map(p => (
            <button
              key={p}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                period === p ? 'bg-[var(--accent)] text-white' : ''
              }`}
              onClick={() => setPeriod(p)}
            >
              {p === 'month' ? 'Мес' : 'Год'}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#007AFF" stopOpacity={0.3}/>
              <stop offset="100%" stopColor="#007AFF" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={formatRub} />
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
          <Area type="monotone" dataKey="revenue" stroke="#007AFF" strokeWidth={2.5} fill="url(#revenueGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
