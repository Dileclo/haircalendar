'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ToastProvider, showToast } from '@/components/Toast';
import { MetricCard } from '@/components/MetricCard';
import { GlassCard } from '@/components/GlassCard';
import { BottomSheet } from '@/components/BottomSheet';
import { AppointmentForm } from '@/components/AppointmentForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { useTheme } from '@/components/ThemeProvider';

export default function Dashboard() {
  const { theme, toggle } = useTheme();
  const [overview, setOverview] = useState<any>(null);
  const [todayAppts, setTodayAppts] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAppt, setShowNewAppt] = useState(false);

  const fetchData = async () => {
    try {
      const [ov, td, up] = await Promise.all([
        fetch('/api/statistics/overview').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/appointments/today').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/appointments/upcoming').then(r => r.json()).catch(() => ({ success: false })),
      ]);

      if (ov.success) setOverview(ov.data);
      if (td.success) setTodayAppts(td.data?.appointments || []);
      if (up.success) setUpcoming(up.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <LoadingSpinner />;

  const today = new Date();

  return (
    <div className="page-enter px-4 pt-6 pb-6 max-w-lg mx-auto">
      <ToastProvider />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">HairCalendar</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {format(today, 'd MMMM yyyy, EEEE', { locale: ru })}
          </p>
        </div>
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <MetricCard
          label="Записей сегодня"
          value={overview?.today_count || 0}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        />
        <MetricCard
          label="Выручка сегодня"
          value={`${(overview?.today_revenue || 0).toLocaleString()} ₽`}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          accent="#34C759"
        />
        <MetricCard
          label="Выручка за месяц"
          value={`${(overview?.month_revenue || 0).toLocaleString()} ₽`}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF9500" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
          accent="#FF9500"
        />
        <MetricCard
          label="Всего клиентов"
          value={overview?.total_customers || 0}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AF52DE" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M1 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/></svg>}
          accent="#AF52DE"
        />
      </div>

      {/* Today's appointments */}
      <h2 className="text-base font-semibold mb-3">Сегодня</h2>
      {todayAppts.length === 0 ? (
        <GlassCard className="mb-6">
          <EmptyState icon="📅" title="Нет записей на сегодня" />
        </GlassCard>
      ) : (
        <div className="mb-6">
          {todayAppts.map(a => (
            <div key={a.id} className="list-row flex-col items-start gap-1" style={{ marginBottom: -1 }}>
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{a.customer_name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{a.service} · {a.price.toLocaleString()} ₽</div>
                </div>
                <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {a.start_time?.substring(11, 16)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming */}
      <h2 className="text-base font-semibold mb-3">Предстоящие</h2>
      {upcoming.length === 0 ? (
        <GlassCard>
          <EmptyState icon="📭" title="Нет предстоящих записей" />
        </GlassCard>
      ) : (
        <div className="mb-6">
          {upcoming.slice(0, 7).map(a => (
            <div key={a.id} className="list-row flex-col items-start gap-1" style={{ marginBottom: -1 }}>
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{a.customer_name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{a.service} · {a.price.toLocaleString()} ₽</div>
                </div>
                <div className="text-xs text-right" style={{ color: 'var(--text-secondary)' }}>
                  <div>{a.start_time?.substring(5, 10)}</div>
                  <div className="font-medium">{a.start_time?.substring(11, 16)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB - New Appointment */}
      <button className="fab" onClick={() => setShowNewAppt(true)}>+</button>

      <BottomSheet open={showNewAppt} onClose={() => setShowNewAppt(false)} title="Новая запись">
        <AppointmentForm
          onClose={() => setShowNewAppt(false)}
          onSaved={() => {
            setShowNewAppt(false);
            fetchData();
          }}
        />
      </BottomSheet>
    </div>
  );
}
