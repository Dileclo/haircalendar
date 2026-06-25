'use client';

import { useState, useEffect, useCallback } from 'react';
import { startOfWeek, format } from 'date-fns';
import { ToastProvider, showToast } from '@/components/Toast';
import { apiCall } from '@/lib/apiHelpers';
import { getOfflineAppointments, removeOfflineAppointment, saveOfflineAppointment } from '@/lib/offlineData';
import { WeekCalendar } from '@/components/WeekCalendar';
import { BottomSheet } from '@/components/BottomSheet';
import { Modal } from '@/components/Modal';
import { AppointmentForm } from '@/components/AppointmentForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [offlineAppts, setOfflineAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editAppt, setEditAppt] = useState<any>(null);
  const [newSlotDate, setNewSlotDate] = useState<Date | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      const start = format(new Date(weekStart.getTime() - 14 * 86400000), "yyyy-MM-dd");
      const end = format(new Date(weekStart.getTime() + 28 * 86400000), "yyyy-MM-dd");
      const res = await fetch(`/api/appointments?start=${start}&end=${end}`);
      const data = await res.json();
      if (data.success) setAppointments(data.data);
    } catch {}
    setLoading(false);
  }, [weekStart]);

  const fetchOfflineAppointments = useCallback(async () => {
    try {
      const offline = await getOfflineAppointments();
      setOfflineAppts(offline);
    } catch {}
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Refresh offline appointments when the form opens/closes
  const refreshAll = useCallback(() => {
    fetchAppointments();
    fetchOfflineAppointments();
  }, [fetchAppointments, fetchOfflineAppointments]);

  // Refresh when offline mutations are synced (back online)
  useEffect(() => {
    const handler = () => { fetchAppointments(); fetchOfflineAppointments(); };
    window.addEventListener('offline-sync-complete', handler);
    return () => window.removeEventListener('offline-sync-complete', handler);
  }, [fetchAppointments, fetchOfflineAppointments]);

  // Merge server + offline appointments
  const allAppointments = [...appointments, ...offlineAppts.map(a => ({
    ...a,
    id: a._offlineId || a.id,
    _offline: true,
  }))];

  const handleDelete = async () => {
    if (!selectedAppt) return;

    // Offline appointment — just remove locally
    if (selectedAppt._offline && selectedAppt._offlineId) {
      await removeOfflineAppointment(selectedAppt._offlineId);
      showToast('Запись удалена', 'success');
      setSelectedAppt(null);
      setShowConfirm(false);
      refreshAll();
      return;
    }

    const data = await apiCall(`/api/appointments/${selectedAppt.id}`, 'DELETE');
    if (data.success) {
      showToast(
        (data as any)._offline ? 'Удаление сохранено оффлайн' : 'Запись удалена',
        'success'
      );
      setSelectedAppt(null);
      setShowConfirm(false);
      refreshAll();
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-enter px-3 pt-4 pb-6 max-w-lg mx-auto">
      <ToastProvider />
      <h1 className="text-xl font-bold mb-3 px-1">Календарь</h1>
      <WeekCalendar
        appointments={allAppointments}
        onSelectAppointment={setSelectedAppt}
        onSelectSlot={(date) => {
          setNewSlotDate(date);
          setEditAppt(null);
          setShowForm(true);
        }}
        weekStart={weekStart}
        onWeekChange={setWeekStart}
      />

      {/* Appointment Detail Sheet */}
      <BottomSheet open={!!selectedAppt} onClose={() => setSelectedAppt(null)} title="Запись">
        {selectedAppt && (
          <div className="space-y-3">
            {/* Offline badge */}
            {selectedAppt._offline && (
              <div style={{
                background: '#FF9500',
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                textAlign: 'center',
              }}>
                ⏳ Ожидает синхронизации
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                   style={{ backgroundColor: selectedAppt.color || '#007AFF' }}>
                {selectedAppt.customer_name?.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <div className="font-semibold">{selectedAppt.customer_name}</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedAppt.phone || 'Нет телефона'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Услуга</div>
                <div className="font-medium text-sm">{selectedAppt.service}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Цена</div>
                <div className="font-bold">{selectedAppt.price.toLocaleString()} ₽</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Начало</div>
                <div className="text-sm">{selectedAppt.start_time}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Конец</div>
                <div className="text-sm">{selectedAppt.end_time || '—'}</div>
              </div>
            </div>
            {selectedAppt.description && (
              <div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Заметка</div>
                <div className="text-sm">{selectedAppt.description}</div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                className="btn-primary flex-1"
                onClick={() => {
                  setEditAppt(selectedAppt);
                  setSelectedAppt(null);
                  setTimeout(() => setShowForm(true), 300);
                }}
              >
                Изменить
              </button>
              <button
                className="btn-ghost flex-1"
                style={{ color: 'var(--accent-red)' }}
                onClick={() => setShowConfirm(true)}
              >
                Удалить
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* New/Edit Appointment Form */}
      <BottomSheet
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editAppt ? 'Изменить запись' : 'Новая запись'}
      >
        <AppointmentForm
          key={editAppt?.id || editAppt?._offlineId || (newSlotDate ? 'slot-' + newSlotDate.toISOString() : 'new')}
          appointment={editAppt || (newSlotDate ? {
            start_time: format(newSlotDate, "yyyy-MM-dd'T'HH:mm"),
            customer_name: '',
            service: '',
            price: '',
            color: '#007AFF',
            status: 'scheduled',
          } : undefined)}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            setEditAppt(null);
            refreshAll();
          }}
        />
      </BottomSheet>

      {/* Confirm Delete */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Удалить запись?">
        <p className="text-sm text-center mb-4" style={{ color: 'var(--text-secondary)' }}>
          Это действие нельзя отменить
        </p>
        <div className="flex gap-3">
          <button className="btn-ghost flex-1" onClick={() => setShowConfirm(false)}>Отмена</button>
          <button className="btn-danger flex-1" onClick={handleDelete}>Удалить</button>
        </div>
      </Modal>
    </div>
  );
}
