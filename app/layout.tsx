import type { Metadata, Viewport } from 'next';
import "./globals.css";
import { TabBar } from '@/components/TabBar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { NetworkStatus } from '@/components/NetworkStatus';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { PushSubscribe } from '@/components/PushSubscribe';

export const metadata: Metadata = {
  title: 'HairCalendar — Парикмахерская',
  description: 'Управление записями, клиентами и финансами',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HairCalendar',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#F2F2F7',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon-180.png" />
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <ServiceWorkerRegistration />
          <NetworkStatus />
          <PushSubscribe />
          <main className="flex-1 pb-20 overflow-x-hidden">
            {children}
          </main>
          <TabBar />
        </ThemeProvider>
      </body>
    </html>
  );
}
