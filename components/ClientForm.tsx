'use client';

import { useState } from 'react';
import { showToast } from './Toast';
import { formatPhone } from '@/lib/phone';
import { apiCall } from '@/lib/apiHelpers';

interface ClientFormProps {
  client?: any;
  onClose: () => void;
  onSaved: (customer?: any) => void;
}

export function ClientForm({ client, onClose, onSaved }: ClientFormProps) {
  const [name, setName] = useState(client?.name || '');
  const [phone, setPhone] = useState(client?.phone || '');
  const [status, setStatus] = useState(client?.status || 'post');
  const [loading, setLoading] = useState(false);

  const isEdit = !!client?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const url = isEdit ? `/api/customers/${client.id}` : '/api/customers';
    const method = isEdit ? 'PUT' : 'POST';

    const data = await apiCall(url, method, { name, phone, status });
    if (data.success) {
      showToast(
        (data as any)._offline ? 'Сохранено оффлайн' : isEdit ? 'Клиент обновлён' : 'Клиент создан',
        'success'
      );
      onSaved(data.data);
    } else {
      showToast(data.error || 'Ошибка', 'error');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        className="input-glass"
        placeholder="Имя"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />
      <input
        className="input-glass"
        type="tel"
        placeholder="+7 (XXX) XXX-XX-XX"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        onBlur={() => setPhone(formatPhone(phone))}
      />
      <select
        className="input-glass"
        value={status}
        onChange={e => setStatus(e.target.value)}
      >
        <option value="post">Постоянный</option>
        <option value="new">Новый</option>
        <option value="inactive">Неактивный</option>
      </select>
      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-ghost flex-1" onClick={onClose}>Отмена</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? '...' : isEdit ? 'Обновить' : 'Создать'}
        </button>
      </div>
    </form>
  );
}
