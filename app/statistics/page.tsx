'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { ServicesChart } from '@/components/charts/ServicesChart';
import { ClientsChart } from '@/components/charts/ClientsChart';
import { ComparisonChart } from '@/components/charts/ComparisonChart';
import { BottomSheet } from '@/components/BottomSheet';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function StatisticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [sheet, setSheet] = useState<{ title: string; filter: string; accent: string } | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  useEffect(() => {
    fetch('/api/statistics/overview')
      .then(r => r.json())
      .then(d => { if (d.success) setOverview(d.data); });
  }, []);

  useEffect(() => {
    if (!sheet) return;
    setLoadingClients(true);
    fetch(`/api/customers?filter=${sheet.filter}`)
      .then(r => r.json())
      .then(d => { if (d.success) setClients(d.data); })
      .catch(() => {})
      .finally(() => setLoadingClients(false));
  }, [sheet]);

  return (
    <div className="page-enter px-4 pt-6 pb-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Статистика</h1>

      <div className="grid grid-cols-2 gap-2.5 mb-6">
        <MetricCard label="Записей сегодня" value={overview?.today_count || 0}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />
        <MetricCard label="Выручка сегодня" value={`${(overview?.today_revenue || 0).toLocaleString()} ₽`}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} accent="#34C759" />

        <MetricCard label="Записей за месяц" value={overview?.month_appointments || 0}
          subtitle={overview?.last_month_appointments ? `${overview.month_appointments - overview.last_month_appointments >= 0 ? '+' : ''}${overview.month_appointments - overview.last_month_appointments} к прошлому` : ''}
          subtitleColor={overview?.month_appointments >= overview?.last_month_appointments ? '#34C759' : '#FF3B30'}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5856D6" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>} accent="#5856D6" />

        <MetricCard label="Выручка за месяц" value={`${(overview?.month_revenue || 0).toLocaleString()} ₽`}
          subtitle={overview?.last_month_revenue ? `${overview.month_revenue - overview.last_month_revenue >= 0 ? '+' : ''}${(overview.month_revenue - overview.last_month_revenue).toLocaleString()} ₽ к прошлому` : ''}
          subtitleColor={overview?.month_revenue >= overview?.last_month_revenue ? '#34C759' : '#FF3B30'}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF9500" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>} accent="#FF9500" />

        <MetricCard label="Прибыль за месяц" value={`${(overview?.month_profit || 0).toLocaleString()} ₽`}
          subtitle={overview?.last_month_profit !== undefined ? `${overview.month_profit - overview.last_month_profit >= 0 ? '+' : ''}${(overview.month_profit - overview.last_month_profit).toLocaleString()} ₽ к прошлому` : ''}
          subtitleColor={(overview?.month_profit || 0) >= (overview?.last_month_profit || 0) ? '#34C759' : '#FF3B30'}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={overview?.month_profit >= 0 ? '#34C759' : '#FF3B30'} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>} accent={overview?.month_profit >= 0 ? '#34C759' : '#FF3B30'} />

        <MetricCard label="Средний чек" value={`${(overview?.avg_check || 0).toLocaleString()} ₽`}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} />

        <MetricCard label="Новых клиентов" value={overview?.new_clients || 0}
          onClick={() => setSheet({ title: 'Новые клиенты в этом месяце', filter: 'new', accent: '#AF52DE' })}
          subtitle={overview?.last_month_new_clients ? `${overview.new_clients - overview.last_month_new_clients >= 0 ? '+' : ''}${overview.new_clients - overview.last_month_new_clients} к прошлому` : ''}
          subtitleColor={(overview?.new_clients || 0) >= (overview?.last_month_new_clients || 0) ? '#34C759' : '#FF3B30'}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AF52DE" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M1 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/><circle cx="18" cy="8" r="2"/><line x1="18" y1="3" x2="18" y2="13"/></svg>} accent="#AF52DE" />

        <MetricCard label="Постоянные" value={overview?.active_customers || 0}
          onClick={() => setSheet({ title: 'Постоянные клиенты', filter: 'active', accent: '#34C759' })}
          subtitle="за 3 месяца" subtitleColor="var(--text-secondary)"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M1 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/></svg>} accent="#34C759" />

        <MetricCard label="Спящие 3+ мес." value={overview?.dormant_customers || 0}
          onClick={() => setSheet({ title: 'Спящие клиенты', filter: 'dormant', accent: '#FF9500' })}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF9500" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} accent="#FF9500" />

        <MetricCard label="День пик" value={overview?.busiest_day || '—'}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF2D55" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>} accent="#FF2D55" />

        <MetricCard label="Всего записей" value={overview?.total_appointments || 0}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} accent="#8E8E93" />

        <MetricCard label="Уник. клиентов / мес." value={overview?.month_unique_clients || 0}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00C7BE" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M1 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/></svg>} accent="#00C7BE" />

        <MetricCard label="Среднее визитов" value={overview?.avg_visits || 0}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5856D6" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} accent="#5856D6" />

        <MetricCard label="Возвращаемость" value={`${overview?.returning_clients || 0} чел.`}
          subtitle={overview?.total_customers ? `${Math.round(overview.returning_clients / overview.total_customers * 100)}% от всех` : ''}
          subtitleColor="var(--text-secondary)"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>} accent="#34C759" />
      </div>

      <div className="space-y-4">
        <RevenueChart />
        <ComparisonChart />
        <ServicesChart />
        <ClientsChart />
      </div>

      {/* Client list sheet */}
      <BottomSheet open={!!sheet} onClose={() => setSheet(null)} title={sheet?.title || ''}>
        {loadingClients ? <LoadingSpinner /> : clients.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">Никого нет</div>
        ) : (
          clients.map(c => (
            <div key={c.id} className="list-row" onClick={() => {
              window.location.href = `/clients/${c.id}`;
            }}>
              <div className="avatar" style={{ backgroundColor: sheet?.accent || '#007AFF' }}>
                {c.name.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{c.name}</div>
                <div className="text-xs text-[var(--text-secondary)]">{c.phone || '—'}</div>
              </div>
              <div className="text-right text-xs text-[var(--text-secondary)]">
                {c.visit_count} виз. · {c.total_spent?.toLocaleString()} ₽
              </div>
            </div>
          ))
        )}
      </BottomSheet>
    </div>
  );
}
