'use client';

import { useState } from 'react';
import { showToast } from './Toast';
import { apiCall } from '@/lib/apiHelpers';

interface SaleFormProps {
  sale?: any;
  onClose: () => void;
  onSaved: () => void;
}

export function SaleForm({ sale, onClose, onSaved }: SaleFormProps) {
  const [product, setProduct] = useState(sale?.product || '');
  const [amount, setAmount] = useState(sale?.amount?.toString() || '');
  const [date, setDate] = useState(sale?.date || new Date().toISOString().split('T')[0]);
  const [receipt, setReceipt] = useState(sale?.receipt || '');
  const [loading, setLoading] = useState(false);

  const isEdit = !!sale?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const url = isEdit ? `/api/sales/${sale.id}` : '/api/sales';
    const method = isEdit ? 'PUT' : 'POST';

    const data = await apiCall(url, method, { product, amount: parseInt(amount) || 0, date, receipt });
    if (data.success) {
      showToast(
        (data as any)._offline ? 'Сохранено оффлайн' : isEdit ? 'Продажа обновлена' : 'Продажа добавлена',
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
        placeholder="Название товара"
        value={product}
        onChange={e => setProduct(e.target.value)}
        required
      />
      <input
        className="input-glass"
        type="number"
        placeholder="Цена (₽)"
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
