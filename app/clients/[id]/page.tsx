'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ToastProvider, showToast } from '@/components/Toast';
import { apiCall } from '@/lib/apiHelpers';
import { GlassCard } from '@/components/GlassCard';
import { BottomSheet } from '@/components/BottomSheet';
import { Modal } from '@/components/Modal';
import { ClientForm } from '@/components/ClientForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function getColor(name: string): string {
  const colors = ['#007AFF', '#FF9500', '#34C759', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55', '#00C7BE'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/customers/${id}`);
      const data = await res.json();
      if (data.success) setClient(data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchClient(); }, [id]);

  const handleDelete = async () => {
    await apiCall(`/api/customers/${id}`, 'DELETE');
    showToast('Клиент удалён', 'success');
    router.push('/clients');
  };

  if (loading) return <LoadingSpinner />;
  if (!client) return <EmptyState icon="🔍" title="Клиент не найден" />;

  const initials = getInitials(client.name);
  const color = getColor(client.name);
  const avgCheck = client.visit_count > 0 ? Math.round(client.total_spent / client.visit_count) : 0;

  return (
    <div className="page-enter px-4 pt-6 pb-6 max-w-lg mx-auto">
      <ToastProvider />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: color }}>
          {initials}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate">{client.name}</h1>
          <p className="text-sm text-[var(--text-secondary)]">{client.phone || 'Нет телефона'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <GlassCard className="text-center">
          <div className="text-2xl font-bold">{client.visit_count || 0}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">визитов</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-2xl font-bold">{(client.total_spent || 0).toLocaleString()}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">потрачено ₽</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-2xl font-bold">{avgCheck.toLocaleString()}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">средний чек ₽</div>
        </GlassCard>
      </div>

      {/* Last visit */}
      {client.last_visit && (
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Последний визит: {format(new Date(client.last_visit), 'd MMMM yyyy', { locale: ru })}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <button className="btn-primary flex-1" onClick={() => setShowEdit(true)}>Изменить</button>
        <button className="btn-ghost flex-1" onClick={() => setShowConfirm(true)} style={{ color: 'var(--accent-red)' }}>
          Удалить
        </button>
      </div>

      {/* History */}
      <h2 className="text-base font-semibold mb-3">История записей</h2>
      {client.history?.length === 0 ? (
        <GlassCard>
          <EmptyState icon="📋" title="Нет записей" />
        </GlassCard>
      ) : (
        <div>
          {client.history?.map((a: any) => (
            <div key={a.id} className="list-row flex-col items-start gap-1" style={{ marginBottom: -1 }}>
              <div className="flex items-center justify-between w-full">
                <div>
                  <div className="font-medium text-sm">{a.service}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{a.start_time}</div>
                </div>
                <div className="text-sm font-semibold">{a.price.toLocaleString()} ₽</div>
              </div>
              {a.description && (
                <div className="text-xs text-[var(--text-secondary)]">{a.description}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <BottomSheet open={showEdit} onClose={() => setShowEdit(false)} title="Изменить клиента">
        <ClientForm
          key={client?.id || 'edit'}
          client={client}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            fetchClient();
          }}
        />
      </BottomSheet>

      {/* Delete Confirm */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Удалить клиента?">
        <p className="text-sm text-center mb-4 text-[var(--text-secondary)]">
          Это действие нельзя отменить. История записей сохранится.
        </p>
        <div className="flex gap-3">
          <button className="btn-ghost flex-1" onClick={() => setShowConfirm(false)}>Отмена</button>
          <button className="btn-danger flex-1" onClick={handleDelete}>Удалить</button>
        </div>
      </Modal>
    </div>
  );
}
