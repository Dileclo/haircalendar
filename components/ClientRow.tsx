'use client';

import Link from 'next/link';

interface ClientRowProps {
  id: number;
  name: string;
  phone: string;
  visits: number;
  totalSpent: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getColor(name: string): string {
  const colors = ['#007AFF', '#FF9500', '#34C759', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55', '#00C7BE'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function ClientRow({ id, name, phone, visits, totalSpent }: ClientRowProps) {
  const initials = getInitials(name);
  const color = getColor(name);

  return (
    <Link href={`/clients/${id}`} className="list-row no-underline" style={{ color: 'inherit' }}>
      <div className="avatar" style={{ backgroundColor: color }}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{name}</div>
        <div className="text-xs text-[var(--text-secondary)]">{phone}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-semibold">{totalSpent.toLocaleString()} ₽</div>
        <div className="text-xs text-[var(--text-secondary)]">{visits} визитов</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </Link>
  );
}
