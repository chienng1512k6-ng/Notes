import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mini Notes',
  description: 'Không gian ghi chú cá nhân, hoạt động cả khi offline.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Mini Notes', statusBarStyle: 'default' },
};

export const viewport: Viewport = { themeColor: '#efeee9', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" suppressHydrationWarning><body>{children}</body></html>;
}
