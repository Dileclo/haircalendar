'use client';

import { useState, useCallback } from 'react';
import { showToast } from './Toast';
import { Autocomplete } from './Autocomplete';
import { Modal } from './Modal';
import { formatPhone } from '@/lib/phone';
import { apiCall } from '@/lib/apiHelpers';
import { searchLocalClients, searchLocalServices } from '@/lib/offlineData';

interface AppointmentFormProps {
  appointment?: any;
  onClose: () => void;
  onSaved: () => void;
}

export function AppointmentForm({ appointment, onClose, onSaved }: AppointmentFormProps) {
  const [customerId, setCustomerId] = useState(appointment?.customer_id || '');
  const [customerName, setCustomerName] = useState(appointment?.customer_name || '');
  const [phone, setPhone] = useState(appointment?.phone || '');
  const [service, setService] = useState(appointment?.service || '');
  const [price, setPrice] = useState(appointment?.price?.toString() || '');
  const [startTime, setStartTime] = useState(appointment?.start_time || '');
  const [endTime, setEndTime] = useState(appointment?.end_time || '');
  const [color, setColor] = useState(appointment?.color || '#007AFF');
  const [description, setDescription] = useState(appointment?.description || '');
  const [loading, setLoading] = useState(false);

  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const isEdit = !!appointment?.id;

  // Client search — API first, IndexedDB fallback when offline
  const fetchClients = useCallback(async (query: string): Promise<any[]> => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) return data.data;
    } catch {}
    // Offline fallback — search locally cached clients
    try {
      return await searchLocalClients(query);
    } catch {
      return [];
    }
  }, []);

  // Service search — API first, IndexedDB fallback when offline
  const fetchServices = useCallback(async (query: string): Promise<any[]> => {
    try {
      const res = await fetch('/api/statistics/services');
      const data = await res.json();
      if (data.success) {
        const all: any[] = data.data;
        if (!query.trim()) return all;
        const q = query.toLowerCase();
        return all.filter((s: any) => s.service.toLowerCase().includes(q));
      }
    } catch {}
    // Offline fallback — search locally cached services
    try {
      const all = await searchLocalServices(query);
      if (!query.trim()) return all;
      const q = query.toLowerCase();
      return all.filter((s: any) => s.service?.toLowerCase().includes(q));
    } catch {
      return [];
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const body = {
      customer_id: customerId ? parseInt(String(customerId)) : null,
      customer_name: customerName,
      phone,
      service,
      price: parseInt(price) || 0,
      start_time: startTime,
      end_time: endTime,
      color,
      description,
      status: appointment?.status || 'scheduled',
    };

    try {
      const url = isEdit ? `/api/appointments/${appointment.id}` : '/api/appointments';
      const method = isEdit ? 'PUT' : 'POST';

      const data = await apiCall(url, method, body);
      if (data.success) {
        showToast(
          (data as any)._offline
            ? 'Сохранено оффлайн — синхронизируется при подключении'
            : isEdit ? 'Запись обновлена' : 'Запись создана',
          'success'
        );
        onSaved();
      } else {
        showToast(data.error || 'Ошибка', 'error');
      }
    } catch (err) {
      showToast('Ошибка соединения', 'error');
    }

    setLoading(false);
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-2.5">
      {/* Client name with autocomplete + quick-add */}
      <Autocomplete
        value={customerName}
        onChange={v => { setCustomerName(v); setCustomerId(''); setPhone(''); }}
        onSelect={customer => {
          setCustomerName(customer.name);
          setPhone(customer.phone || '');
          setCustomerId(String(customer.id));
        }}
        fetchItems={fetchClients}
        renderItem={(c: any) => (
          <div>
            <div style={{ fontWeight: 600 }}>{c.name}</div>
            {c.phone && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                {c.phone} · {c.visit_count || 0} визитов · {c.total_spent?.toLocaleString()} ₽
              </div>
            )}
          </div>
        )}
        getItemKey={(c: any) => c.id}
        placeholder="Имя клиента"
        required
        rightAction={
          <button
            type="button"
            className="btn-primary flex-shrink-0"
            style={{
              width: 44,
              height: 44,
              padding: 0,
              fontSize: 22,
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '44px',
            }}
            onClick={e => { e.preventDefault(); setShowQuickAdd(true); }}
          >
            +
          </button>
        }
      />

      {/* Phone — auto-filled from client selection */}
      <input
        className="input-glass"
        type="tel"
        placeholder="+7 (XXX) XXX-XX-XX"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        onBlur={() => setPhone(formatPhone(phone))}
      />

      {/* Service with autocomplete */}
      <Autocomplete
        value={service}
        onChange={setService}
        onSelect={(svc: any) => { setService(svc.service); }}
        fetchItems={fetchServices}
        renderItem={(svc: any) => (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{svc.service}</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {svc.count} зап.
            </span>
          </div>
        )}
        getItemKey={(svc: any) => svc.service}
        placeholder="Услуга (например: Стрижка+окрашивание)"
        required
      />

      {/* Price */}
      <input
        className="input-glass"
        type="number"
        placeholder="Цена (₽)"
        value={price}
        onChange={e => setPrice(e.target.value)}
        required
      />

      {/* Start time */}
      <div>
        <label className="text-xs text-[var(--text-secondary)] block mb-0.5">Начало</label>
        <input
          className="input-glass"
          type="datetime-local"
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
          required
        />
      </div>

      {/* End time */}
      <div>
        <label className="text-xs text-[var(--text-secondary)] block mb-0.5">Конец</label>
        <input
          className="input-glass"
          type="datetime-local"
          value={endTime}
          onChange={e => setEndTime(e.target.value)}
        />
      </div>

      {/* Color + Customer ID (hidden but kept for edit) */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-[var(--text-secondary)] block mb-1">Цвет в календаре</label>
          <input
            className="input-glass"
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            style={{ height: 44, padding: '4px 8px' }}
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)] block mb-1">Клиент ID</label>
          <input
            className="input-glass"
            type="number"
            placeholder="ID"
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
            style={{ width: 100 }}
          />
        </div>
      </div>

      {/* Description */}
      <textarea
        className="input-glass"
        placeholder="Заметка"
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
      />

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-ghost flex-1" onClick={onClose}>Отмена</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Сохранение...' : isEdit ? 'Обновить' : 'Создать'}
        </button>
      </div>
    </form>

    {/* Quick-Add Client Modal — outside the main form to avoid nested <form> */}
    <Modal open={showQuickAdd} onClose={() => setShowQuickAdd(false)} title="Новый клиент" center>
      <QuickAddClientForm
        onClose={() => setShowQuickAdd(false)}
        onCreated={(c: any) => {
          setCustomerName(c.name);
          setPhone(c.phone || '');
          setCustomerId(String(c.id));
          setShowQuickAdd(false);
        }}
      />
    </Modal>
    </>
  );
}

/** Ultra-compact inline form for quick client creation (name + phone only) */
function QuickAddClientForm({ onClose, onCreated }: { onClose: () => void; onCreated: (c: any) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), status: 'post' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Клиент добавлен', 'success');
        onCreated(data.data);
      } else {
        showToast(data.error || 'Ошибка', 'error');
      }
    } catch {
      showToast('Ошибка соединения', 'error');
    }
    setSaving(false);
  };

  const doSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const data = await apiCall('/api/customers', 'POST', {
      name: name.trim(),
      phone: formatPhone(phone.trim()),
      status: 'post',
    });
    if (data.success) {
      showToast(
        (data as any)._offline ? 'Сохранено оффлайн' : 'Клиент добавлен',
        'success'
      );
      onCreated(data.data || { name: name.trim(), phone: formatPhone(phone.trim()), id: 0 });
    } else {
      showToast(data.error || 'Ошибка', 'error');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-2.5">
      <input
        className="input-glass"
        placeholder="Имя"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doSubmit(); } }}
      />
      <input
        className="input-glass"
        type="tel"
        placeholder="+7 (XXX) XXX-XX-XX"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        onBlur={() => setPhone(formatPhone(phone))}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doSubmit(); } }}
      />
      <div className="flex gap-2 pt-1">
        <button type="button" className="btn-ghost flex-1" onClick={onClose}>Отмена</button>
        <button type="button" className="btn-primary flex-1" disabled={saving} onClick={doSubmit}>
          {saving ? '...' : 'Добавить'}
        </button>
      </div>
    </div>
  );
}
