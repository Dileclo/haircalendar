'use client';

import { useState } from 'react';
import { showToast } from './Toast';
import { apiCall } from '@/lib/apiHelpers';

interface ExpenseFormProps {
  expense?: any;
  onClose: () => void;
  onSaved: () => void;
}

export function ExpenseForm({ expense, onClose, onSaved }: ExpenseFormProps) {
  const [name, setName] = useState(expense?.name || '');
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0]);
  const [receipt, setReceipt] = useState(expense?.receipt || '');
  const [loading, setLoading] = useState(false);

  const isEdit = !!expense?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const url = isEdit ? `/api/expenses/${expense.id}` : '/api/expenses';
    const method = isEdit ? 'PUT' : 'POST';

    const data = await apiCall(url, method, { name, amount: parseInt(amount) || 0, date, receipt });
    if (data.success) {
      showToast(
        (data as any)._offline ? 'Сохранено оффлайн' : isEdit ? 'Расход обновлён' : 'Расход добавлен',
        'success'
      );
      onSaved();
    } else {
      showToast(data.error || 'Ошибка', 'error');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        className="input-glass"
        placeholder="Название расхода"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />
      <input
        className="input-glass"
        type="number"
        placeholder="Сумма (₽)"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        required
      />
      <input
        className="input-glass"
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        required
      />
      <input
        className="input-glass"
        placeholder="Номер чека"
        value={receipt}
        onChange={e => setReceipt(e.target.value)}
      />
      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-ghost flex-1" onClick={onClose}>Отмена</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? '...' : isEdit ? 'Обновить' : 'Добавить'}
        </button>
      </div>
    </form>
  );
}
