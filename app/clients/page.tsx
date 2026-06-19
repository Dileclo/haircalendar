'use client';

import { useState, useEffect, useCallback } from 'react';
import { ToastProvider } from '@/components/Toast';
import { ClientRow } from '@/components/ClientRow';
import { SearchInput } from '@/components/SearchInput';
import { GlassCard } from '@/components/GlassCard';
import { BottomSheet } from '@/components/BottomSheet';
import { ClientForm } from '@/components/ClientForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const url = search ? `/api/customers?q=${encodeURIComponent(search)}` : '/api/customers';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setClients(data.data);
    } catch {}
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  return (
    <div className="page-enter px-4 pt-6 pb-6 max-w-lg mx-auto">
      <ToastProvider />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Клиенты</h1>
        <button className="btn-primary text-sm py-2 px-4" onClick={() => setShowForm(true)}>
          + Новый
        </button>
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Поиск по имени или телефону..." />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : clients.length === 0 ? (
        <GlassCard>
          <EmptyState icon="👥" title="Клиенты не найдены" description={search ? 'Попробуйте другой поиск' : 'Добавьте первого клиента'} />
        </GlassCard>
      ) : (
        <div>
          {clients.map(client => (
            <ClientRow
              key={client.id}
              id={client.id}
              name={client.name}
              phone={client.phone}
              visits={client.visit_count || 0}
              totalSpent={client.total_spent || 0}
            />
          ))}
        </div>
      )}

      <BottomSheet open={showForm} onClose={() => setShowForm(false)} title="Новый клиент">
        <ClientForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            fetchClients();
          }}
        />
      </BottomSheet>
    </div>
  );
}
