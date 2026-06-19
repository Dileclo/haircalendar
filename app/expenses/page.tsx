'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ToastProvider, showToast } from '@/components/Toast';
import { apiCall } from '@/lib/apiHelpers';
import { GlassCard } from '@/components/GlassCard';
import { BottomSheet } from '@/components/BottomSheet';
import { Modal } from '@/components/Modal';
import { ExpenseForm } from '@/components/ExpenseForm';
import { SaleForm } from '@/components/SaleForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

export default function ExpensesPage() {
  const [tab, setTab] = useState<'expenses' | 'sales'>('expenses');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [expRes, saleRes] = await Promise.all([
        fetch('/api/expenses').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/sales').then(r => r.json()).catch(() => ({ success: false })),
      ]);
      if (expRes.success) setExpenses(expRes.data);
      if (saleRes.success) setSales(saleRes.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const url = tab === 'expenses' ? `/api/expenses/${deleteId}` : `/api/sales/${deleteId}`;
    const data = await apiCall(url, 'DELETE');
    if (data.success) {
      showToast('Удалено', 'success');
      setShowConfirm(false);
      setShowForm(false);
      setDeleteId(null);
      fetchData();
    }
  };

  // Group by month
  const groupByMonth = (items: any[], dateKey: string) => {
    const groups: Record<string, any[]> = {};
    items.forEach(item => {
      const month = item[dateKey]?.substring(0, 7) || '???';
      if (!groups[month]) groups[month] = [];
      groups[month].push(item);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const grouped = tab === 'expenses'
    ? groupByMonth(expenses, 'date')
    : groupByMonth(sales, 'date');

  const currentItems = tab === 'expenses' ? expenses : sales;
  const total = currentItems.reduce((s: number, i: any) => s + (i.amount || 0), 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-enter px-4 pt-6 pb-6 max-w-lg mx-auto">
      <ToastProvider />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{tab === 'expenses' ? 'Расходы' : 'Продажи'}</h1>
        <button className="btn-primary text-sm py-2 px-4" onClick={() => { setEditingItem(null); setShowForm(true); }}>
          + Добавить
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-black/5 dark:bg-white/5 rounded-xl p-1 mb-4">
        {(['expenses', 'sales'] as const).map(t => (
          <button
            key={t}
            className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${
              tab === t ? 'bg-[var(--accent)] text-white shadow-sm' : ''
            }`}
            onClick={() => setTab(t)}
          >
            {t === 'expenses' ? 'Расходы' : 'Продажи'}
          </button>
        ))}
      </div>

      {/* Total */}
      <GlassCard className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium">Всего за период</span>
        <span className="text-lg font-bold" style={{ color: tab === 'expenses' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
          {total.toLocaleString()} ₽
        </span>
      </GlassCard>

      {/* List grouped by month */}
      {grouped.length === 0 ? (
        <GlassCard>
          <EmptyState icon={tab === 'expenses' ? '💰' : '🛍️'} title="Пока пусто" description="Добавьте первую запись" />
        </GlassCard>
      ) : (
        grouped.map(([month, items]) => (
          <div key={month} className="mb-4">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-2 px-1 uppercase">
              {format(new Date(month + '-01'), 'LLLL yyyy', { locale: ru })}
            </h3>
            {items.map((item: any) => (
              <div
                key={item.id}
                className="list-row flex-col items-start gap-0.5 cursor-pointer"
                style={{ marginBottom: -1 }}
                onClick={() => { setEditingItem(item); setShowForm(true); }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="font-medium text-sm truncate flex-1">{item.name || item.product}</div>
                  <div className="text-sm font-semibold ml-2" style={{ color: tab === 'expenses' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                    {tab === 'expenses' ? '−' : ''}{item.amount.toLocaleString()} ₽
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <span>{item.date}</span>
                  {item.receipt && <span>Чек: {item.receipt}</span>}
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {/* Backup section */}
      <div className="mt-8 mb-4">
        <h2 className="text-sm font-semibold mb-3 px-1">Резервная копия</h2>
        <div className="flex gap-3">
          <a
            href="/api/backup/download"
            className="btn-primary flex-1 text-center no-underline text-sm"
            style={{ display: 'block', padding: '10px 0' }}
          >
            📥 Скачать базу
          </a>
          <label className="btn-ghost flex-1 text-center text-sm cursor-pointer" style={{ padding: '10px 0', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
            📤 Загрузить базу
            <input
              type="file"
              accept=".db"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const form = new FormData();
                form.append('db', file);
                const res = await fetch('/api/backup/restore', { method: 'POST', body: form });
                const data = await res.json();
                showToast(data.success ? 'База восстановлена!' : (data.error || 'Ошибка'), data.success ? 'success' : 'error');
                if (data.success) fetchData();
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => { setEditingItem(null); setShowForm(true); }}>+</button>

      {/* Form BottomSheet */}
      <BottomSheet
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingItem ? (tab === 'expenses' ? 'Изменить расход' : 'Изменить продажу') : (tab === 'expenses' ? 'Новый расход' : 'Новая продажа')}
      >
        {tab === 'expenses' ? (
          <ExpenseForm
            key={editingItem?.id || 'new'}
            expense={editingItem}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); fetchData(); }}
          />
        ) : (
          <SaleForm
            key={editingItem?.id || 'new'}
            sale={editingItem}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); fetchData(); }}
          />
        )}
        {editingItem && (
          <button
            className="btn-ghost w-full mt-3"
            style={{ color: 'var(--accent-red)' }}
            onClick={() => {
              setDeleteId(editingItem.id);
              setShowConfirm(true);
            }}
          >
            Удалить
          </button>
        )}
      </BottomSheet>

      {/* Confirm Delete */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Удалить?">
        <p className="text-sm text-center mb-4 text-[var(--text-secondary)]">Это действие нельзя отменить</p>
        <div className="flex gap-3">
          <button className="btn-ghost flex-1" onClick={() => setShowConfirm(false)}>Отмена</button>
          <button className="btn-danger flex-1" onClick={handleDelete}>Удалить</button>
        </div>
      </Modal>
    </div>
  );
}
