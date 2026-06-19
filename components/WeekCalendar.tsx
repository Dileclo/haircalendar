'use client';

import { useState, useRef, useCallback } from 'react';
import { format, addDays, subDays, addWeeks, subWeeks, startOfWeek, isSameDay, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Appointment {
  id: number;
  customer_name: string;
  service: string;
  price: number;
  start_time: string;
  end_time: string;
  color: string;
  status?: string;
  customer_id: number | null;
  phone?: string;
  description?: string;
}

interface CalendarViewProps {
  appointments: Appointment[];
  onSelectAppointment: (appt: Appointment) => void;
  onSelectSlot: (date: Date, hour: number) => void;
  weekStart: Date;
  onWeekChange: (date: Date) => void;
}

type ViewMode = 'day' | '3day' | 'week' | 'list';

// Half-hour slots from 08:00 to 22:00: 8.0, 8.5, 9.0, ..., 22.0
const SLOTS = Array.from({ length: 29 }, (_, i) => 8 + i * 0.5);
const DAY_ROW_H = 36;   // row height for day view (half-hour)
const MULTI_ROW_H = 28; // row height for 3-day / week views

const COLORS: Record<string, string> = {
  '#A5F': '#AF52DE', '#F5A': '#FF2D55', '#5AF': '#5856D6',
  '#FA5': '#FF9500', '#5FA': '#34C759', '#AF5': '#FFCC00',
  '': '#007AFF',
};

function getApptColor(c: string): string { return COLORS[c] || c || '#007AFF'; }

/** Extract decimal hours from datetime string, avoiding Date timezone ambiguity.
 *  Handles: "2026-06-19T14:30", "2026-06-19 14:30", "14:30", etc. */
function toDecimalHours(s: string): number {
  const m = s.match(/(\d{2}):(\d{2})/);
  if (!m) return 8;
  return parseInt(m[1]) + parseInt(m[2]) / 60;
}

export function WeekCalendar(props: CalendarViewProps) {
  const { appointments, onSelectAppointment, onSelectSlot, weekStart, onWeekChange } = props;
  const [view, setView] = useState<ViewMode>('day');
  const [dayDate, setDayDate] = useState(new Date());
  const touchRef = useRef<{ startX: number; startY: number } | null>(null);

  const goToday = () => {
    setDayDate(new Date());
    onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Group appointments by date for list/agenda view
  const apptsByDate = useCallback(() => {
    const map: Record<string, Appointment[]> = {};
    const now = new Date();
    appointments
      .filter(a => {
        try {
          const d = new Date(a.start_time.replace(' ', 'T'));
          if (view === 'list') return d >= subDays(now, 1); // from yesterday onward
          return true;
        } catch { return false; }
      })
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .forEach(a => {
        try {
          const dateKey = a.start_time.substring(0, 10);
          if (!map[dateKey]) map[dateKey] = [];
          map[dateKey].push(a);
        } catch {}
      });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [appointments, view]);

  // Check if an appointment occupies a given half-hour slot (decimal hour)
  const apptOccupiesSlot = (a: Appointment, day: Date, slot: number): boolean => {
    try {
      const start = new Date(a.start_time.replace(' ', 'T'));
      if (!isSameDay(start, day)) return false;
      const startDec = start.getHours() + start.getMinutes() / 60;
      const endDec = a.end_time
        ? toDecimalHours(a.end_time)
        : startDec + 1; // default 1-hour duration
      return startDec <= slot && slot < endDec;
    } catch { return false; }
  };

  // Get appointments that occupy a specific half-hour slot
  const getAppts = (day: Date, slot?: number) => {
    return appointments.filter(a => {
      try {
        const start = new Date(a.start_time.replace(' ', 'T'));
        if (!isSameDay(start, day)) return false;
        if (slot !== undefined) return apptOccupiesSlot(a, day, slot);
        return true;
      } catch { return false; }
    });
  };

  // Check if a specific half-hour slot on a day has any appointment
  const isSlotOccupied = (day: Date, slot: number): boolean => {
    return appointments.some(a => {
      try {
        if (a.status === 'cancelled') return false;
        return apptOccupiesSlot(a, day, slot);
      } catch { return false; }
    });
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    const dy = e.changedTouches[0].clientY - touchRef.current.startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (view === 'day') setDayDate(d => dx > 0 ? subDays(d, 1) : addDays(d, 1));
      else if (view === '3day') setDayDate(d => dx > 0 ? subDays(d, 3) : addDays(d, 3));
      else if (view === 'week') onWeekChange(dx > 0 ? subWeeks(weekStart, 1) : addWeeks(weekStart, 1));
    }
    touchRef.current = null;
  };

  // ====== DAY VIEW ======
  const renderDayView = () => {
    const now = new Date();
    const showNow = isToday(dayDate);
    const nowDec = now.getHours() + now.getMinutes() / 60;

    const dayAppts = appointments.filter(a => {
      try {
        if (a.status === 'cancelled') return false;
        return isSameDay(new Date(a.start_time.replace(' ', 'T')), dayDate);
      } catch { return false; }
    });

    const getCardStyle = (a: Appointment) => {
      try {
        const startDec = toDecimalHours(a.start_time);
        const endDec = a.end_time ? toDecimalHours(a.end_time) : startDec + 1;
        // ×2 because each hour has two half-hour slots
        const top = (startDec - 8) * 2 * DAY_ROW_H;
        const height = Math.max((endDec - startDec) * 2 * DAY_ROW_H, DAY_ROW_H * 0.6);
        return { top: `${top}px`, height: `${height}px` };
      } catch {
        return { top: '0px', height: `${DAY_ROW_H}px` };
      }
    };

    const gridHeight = SLOTS.length * DAY_ROW_H;

    return (
      <div className="glass overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
        <div
          className={`text-center py-3 border-b cursor-pointer ${isToday(dayDate) ? 'bg-[var(--accent)] text-white' : ''}`}
          style={{ borderColor: 'var(--separator)' }}
          onClick={() => onSelectSlot(dayDate, 12)}
        >
          <div className="text-xs font-medium opacity-70">{format(dayDate, 'EEEE', { locale: ru })}</div>
          <div className="text-2xl font-bold">{format(dayDate, 'd MMMM', { locale: ru })}</div>
          <div className="text-xs mt-1 opacity-70">{dayAppts.length} записей · {dayAppts.reduce((s, a) => s + a.price, 0).toLocaleString()} ₽</div>
        </div>

        <div className="overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(100vh - 360px)', position: 'relative' }}>
          <div style={{ position: 'relative', minHeight: gridHeight }}>
            {SLOTS.map(slot => {
              const hour = Math.floor(slot);
              const min = slot % 1 === 0 ? 0 : 30;
              const isPast = showNow && slot < nowDec;
              const occupied = isSlotOccupied(dayDate, slot);
              const showLabel = min === 0;
              return (
                <div key={slot} className="flex" style={{ borderBottom: min === 0 ? '1px solid var(--separator)' : '1px solid rgba(60,60,67,0.06)', height: DAY_ROW_H }}>
                  <div className="w-14 flex-shrink-0 text-right pr-2" style={{ paddingTop: min === 0 ? 1 : 0 }}>
                    {showLabel ? (
                      <span className="text-xs font-medium" style={{ color: isPast ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
                        {`${String(hour).padStart(2, '0')}:00`}
                      </span>
                    ) : (
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>30</span>
                    )}
                  </div>
                  <div
                    className={`flex-1 ${occupied ? '' : 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'}`}
                    onClick={() => {
                      if (occupied) return;
                      const d = new Date(dayDate);
                      d.setHours(hour, min, 0, 0);
                      onSelectSlot(d, Math.floor(slot));
                    }}
                  >
                    {showNow && Math.abs(slot - nowDec) < 0.5 && (
                      <div className="absolute left-14 right-0 z-10 flex items-center" style={{ top: `${((nowDec - 8) * DAY_ROW_H) % DAY_ROW_H}px` }}>
                        <div className="w-2 h-2 rounded-full bg-[var(--accent-red)] -ml-1" />
                        <div className="flex-1 h-px bg-[var(--accent-red)]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {dayAppts.map(appt => {
              const color = getApptColor(appt.color);
              const cs = getCardStyle(appt);
              return (
                <div
                  key={appt.id}
                  className="absolute rounded-lg p-2 cursor-pointer active:scale-[0.98] transition-transform overflow-hidden"
                  style={{
                    left: 56, right: 4, top: cs.top, height: cs.height,
                    backgroundColor: `${color}18`, borderLeft: `4px solid ${color}`, zIndex: 5,
                  }}
                  onClick={e => { e.stopPropagation(); onSelectAppointment(appt); }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm truncate">{appt.customer_name}</div>
                    <div className="text-xs font-bold ml-2 flex-shrink-0" style={{ color }}>{appt.price.toLocaleString()} ₽</div>
                  </div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {appt.start_time?.substring(11, 16)}{appt.end_time ? ` – ${appt.end_time.substring(11, 16)}` : ''} · {appt.service}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ====== 3-DAY VIEW ======
  const render3DayView = () => {
    const days = [dayDate, addDays(dayDate, 1), addDays(dayDate, 2)];
    const gridHeight = SLOTS.length * MULTI_ROW_H;

    return (
      <div className="glass overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
        <div className="grid" style={{ gridTemplateColumns: '40px repeat(3, 1fr)', borderBottom: '1px solid var(--separator)' }}>
          <div />
          {days.map((day, i) => (
            <div key={i} className={`text-center py-2 ${isToday(day) ? 'bg-[var(--accent)] text-white' : ''}`}
                 onClick={() => { setDayDate(day); setView('day'); }}>
              <div className="text-[10px] font-medium opacity-70">{format(day, 'EEEEE', { locale: ru })}</div>
              <div className="text-sm font-bold">{format(day, 'd')}</div>
              <div className="text-[9px] opacity-70">{getAppts(day).length} зап.</div>
            </div>
          ))}
        </div>
        <div className="overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(100vh - 360px)', position: 'relative' }}>
          <div style={{ position: 'relative', minHeight: gridHeight }}>
            {SLOTS.map(slot => {
              const hour = Math.floor(slot);
              const showLabel = slot % 1 === 0;
              return (
                <div key={slot} className="grid" style={{ gridTemplateColumns: '40px repeat(3, 1fr)', borderBottom: showLabel ? '1px solid var(--separator)' : '1px solid rgba(60,60,67,0.06)', height: MULTI_ROW_H }}>
                  <div className="text-[10px] text-[var(--text-secondary)] text-right pr-1.5" style={{ paddingTop: showLabel ? 0 : 0 }}>
                    {showLabel ? `${hour}` : ''}
                  </div>
                  {days.map((day, di) => (
                    <div
                      key={di}
                      className={isSlotOccupied(day, slot) ? '' : 'cursor-pointer hover:bg-black/[0.02]'}
                      style={{ borderLeft: di > 0 ? '1px solid var(--separator)' : 'none' }}
                      onClick={() => {
                        if (isSlotOccupied(day, slot)) return;
                        const d = new Date(day); d.setHours(hour, slot % 1 === 0 ? 0 : 30); onSelectSlot(d, Math.floor(slot));
                      }}
                    />
                  ))}
                </div>
              );
            })}

            {days.map((day, di) => {
              const dayAppts = appointments.filter(a => {
                try { return a.status !== 'cancelled' && isSameDay(new Date(a.start_time.replace(' ', 'T')), day); } catch { return false; }
              });
              const colWidth = `calc((100% - 40px) / 3)`;
              return dayAppts.map(appt => {
                const color = getApptColor(appt.color);
                const startDec = toDecimalHours(appt.start_time);
                const endDec = appt.end_time ? toDecimalHours(appt.end_time) : startDec + 1;
                const topPx = (startDec - 8) * 2 * MULTI_ROW_H;
                const hPx = Math.max((endDec - startDec) * 2 * MULTI_ROW_H, MULTI_ROW_H * 0.5);
                return (
                  <div key={appt.id}
                    className="absolute rounded px-1 py-0.5 text-[9px] leading-tight truncate cursor-pointer overflow-hidden"
                    style={{ left: `calc(40px + ${di} * ${colWidth})`, width: `calc(${colWidth} - 2px)`, top: `${topPx}px`, height: `${hPx}px`, backgroundColor: `${color}22`, borderLeft: `2px solid ${color}`, zIndex: 5 }}
                    onClick={e => { e.stopPropagation(); onSelectAppointment(appt); }}>
                    <span className="font-semibold">{appt.customer_name.split(' ')[0]}</span>{' '}<span className="opacity-70">{appt.price}₽</span>
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>
    );
  };

  // ====== WEEK VIEW ======
  const renderWeekView = () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const gridHeight = SLOTS.length * MULTI_ROW_H;

    return (
      <div className="glass overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
        <div className="grid" style={{ gridTemplateColumns: '40px repeat(7, 1fr)', borderBottom: '1px solid var(--separator)' }}>
          <div />
          {days.map((day, i) => (
            <div key={i}
              className={`text-center py-1.5 cursor-pointer ${isToday(day) ? 'bg-[var(--accent)] text-white rounded-t-md' : ''}`}
              onClick={() => { setDayDate(day); setView('day'); }}>
              <div className="text-[9px] font-medium opacity-70">{format(day, 'EEEEE', { locale: ru })}</div>
              <div className="text-xs font-bold">{format(day, 'd')}</div>
            </div>
          ))}
        </div>
        <div className="overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(100vh - 360px)', position: 'relative' }}>
          <div style={{ position: 'relative', minHeight: gridHeight }}>
            {SLOTS.map(slot => {
              const hour = Math.floor(slot);
              const showLabel = slot % 1 === 0;
              return (
                <div key={slot} className="grid" style={{ gridTemplateColumns: '40px repeat(7, 1fr)', borderBottom: showLabel ? '1px solid var(--separator)' : '1px solid rgba(60,60,67,0.06)', height: MULTI_ROW_H }}>
                  <div className="text-[9px] text-[var(--text-secondary)] text-right pr-1.5">{showLabel ? `${hour}` : ''}</div>
                  {days.map((day, di) => (
                    <div key={di}
                      className={isSlotOccupied(day, slot) ? '' : 'cursor-pointer'}
                      style={{ borderLeft: di > 0 ? '1px solid var(--separator)' : 'none' }}
                      onClick={() => {
                        if (isSlotOccupied(day, slot)) return;
                        const d = new Date(day); d.setHours(hour, slot % 1 === 0 ? 0 : 30); onSelectSlot(d, Math.floor(slot));
                      }} />
                  ))}
                </div>
              );
            })}

            {days.map((day, di) => {
              const dayAppts = appointments.filter(a => {
                try { return a.status !== 'cancelled' && isSameDay(new Date(a.start_time.replace(' ', 'T')), day); } catch { return false; }
              });
              const colWidth = `calc((100% - 40px) / 7)`;
              return dayAppts.map(appt => {
                const color = getApptColor(appt.color);
                const startDec = toDecimalHours(appt.start_time);
                const endDec = appt.end_time ? toDecimalHours(appt.end_time) : startDec + 1;
                const topPx = (startDec - 8) * 2 * MULTI_ROW_H;
                const hPx = Math.max((endDec - startDec) * 2 * MULTI_ROW_H, MULTI_ROW_H * 0.5);
                return (
                  <div key={appt.id}
                    className="absolute rounded-sm px-0.5 text-[8px] leading-tight cursor-pointer truncate overflow-hidden"
                    style={{ left: `calc(40px + ${di} * ${colWidth})`, width: `calc(${colWidth} - 1px)`, top: `${topPx}px`, height: `${hPx}px`, backgroundColor: `${color}33`, borderLeft: `2px solid ${color}`, zIndex: 5 }}
                    onClick={e => { e.stopPropagation(); onSelectAppointment(appt); }}>
                    {appt.customer_name.split(' ')[0]}
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>
    );
  };

  // ====== LIST / AGENDA VIEW ======
  const renderListView = () => {
    const grouped = apptsByDate();
    if (grouped.length === 0) {
      return (
        <div className="glass p-8 text-center" style={{ borderRadius: 'var(--radius)' }}>
          <div className="text-4xl mb-3">📭</div>
          <div className="font-medium">Нет записей</div>
          <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Добавьте новую запись</div>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {grouped.map(([dateKey, appts]) => {
          const d = new Date(dateKey + 'T00:00:00');
          const dayTotal = appts.reduce((s, a) => s + a.price, 0);
          return (
            <div key={dateKey} className="glass overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
              <div
                className={`px-4 py-2 flex items-center justify-between ${isToday(d) ? 'bg-[var(--accent)] text-white' : ''}`}
                style={{ borderBottom: '1px solid var(--separator)' }}
              >
                <div>
                  <div className="text-xs font-medium opacity-70">{format(d, 'EEEE', { locale: ru })}</div>
                  <div className="font-bold">{format(d, 'd MMMM', { locale: ru })}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{dayTotal.toLocaleString()} ₽</div>
                  <div className="text-xs opacity-70">{appts.length} зап.</div>
                </div>
              </div>
              {appts.map(appt => {
                const color = getApptColor(appt.color);
                return (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-black/[0.03]"
                    style={{ borderBottom: '1px solid var(--separator)' }}
                    onClick={() => onSelectAppointment(appt)}
                  >
                    <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{appt.customer_name}</div>
                      <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                        {appt.start_time?.substring(11, 16)}{appt.end_time ? ` – ${appt.end_time.substring(11, 16)}` : ''} · {appt.service}
                      </div>
                    </div>
                    <div className="text-sm font-bold flex-shrink-0" style={{ color }}>{appt.price.toLocaleString()} ₽</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // ====== MAIN RENDER ======
  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* View Switcher */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex bg-black/5 dark:bg-white/5 rounded-xl p-0.5 flex-1">
          {([
            { key: 'day', label: 'День' },
            { key: '3day', label: '3 дня' },
            { key: 'week', label: 'Неделя' },
            { key: 'list', label: 'Список' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${view === key ? 'bg-[var(--accent)] text-white shadow-sm' : ''}`}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => {
            if (view === 'day') setDayDate(d => subDays(d, 1));
            else if (view === '3day') setDayDate(d => subDays(d, 3));
            else if (view === 'week') onWeekChange(subWeeks(weekStart, 1));
            else onWeekChange(subWeeks(weekStart, 1));
          }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg glass-sm font-bold"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          ‹
        </button>

        <button onClick={goToday} className="text-sm font-semibold px-4 py-1.5 rounded-lg" style={{ background: 'var(--bg-card)' }}>
          {view === 'list' ? 'Сегодня' : format(view === 'week' ? weekStart : dayDate, 'd MMMM yyyy', { locale: ru })}
        </button>

        <button
          onClick={() => {
            if (view === 'day') setDayDate(d => addDays(d, 1));
            else if (view === '3day') setDayDate(d => addDays(d, 3));
            else if (view === 'week') onWeekChange(addWeeks(weekStart, 1));
            else onWeekChange(addWeeks(weekStart, 1));
          }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg glass-sm font-bold"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          ›
        </button>
      </div>

      {/* Calendar content */}
      {view === 'day' && renderDayView()}
      {view === '3day' && render3DayView()}
      {view === 'week' && renderWeekView()}
      {view === 'list' && renderListView()}
    </div>
  );
}
