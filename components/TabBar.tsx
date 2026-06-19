'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  {
    path: '/',
    label: 'Главная',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#007AFF' : '#8E8E93'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5"/>
        <rect x="14" y="3" width="7" height="5" rx="1.5"/>
        <rect x="14" y="12" width="7" height="9" rx="1.5"/>
        <rect x="3" y="16" width="7" height="5" rx="1.5"/>
      </svg>
    ),
  },
  {
    path: '/calendar',
    label: 'Календарь',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#007AFF' : '#8E8E93'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <rect x="7" y="13" width="3" height="3" rx="0.5"/>
        <rect x="14" y="13" width="3" height="3" rx="0.5"/>
      </svg>
    ),
  },
  {
    path: '/clients',
    label: 'Клиенты',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#007AFF' : '#8E8E93'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4"/>
        <path d="M1 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/>
        <circle cx="17" cy="9" r="3"/>
        <path d="M23 21v-1.5a3 3 0 0 0-2-2.83"/>
      </svg>
    ),
  },
  {
    path: '/expenses',
    label: 'Расходы',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#007AFF' : '#8E8E93'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
  {
    path: '/statistics',
    label: 'Статистика',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#007AFF' : '#8E8E93'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="20" x2="4" y2="12"/>
        <line x1="9" y1="20" x2="9" y2="4"/>
        <line x1="15" y1="20" x2="15" y2="14"/>
        <line x1="20" y1="20" x2="20" y2="8"/>
      </svg>
    ),
  },
];

export function TabBar() {
  const pathname = usePathname();

  // Hide tab bar on sub-pages like /clients/[id]
  const hideTabs = pathname.match(/^\/clients\/\d+$/);

  if (hideTabs) return null;

  return (
    <nav className="glass-tab fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom,0px)] pt-1">
      {tabs.map(tab => {
        const active = tab.path === '/'
          ? pathname === '/'
          : pathname.startsWith(tab.path);
        return (
          <Link key={tab.path} href={tab.path} className={`tab-item ${active ? 'active' : ''}`}>
            {tab.icon(active)}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
