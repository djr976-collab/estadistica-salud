import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/components/AppProvider';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'HeridaSegura IA',
  description: 'Valoración y seguimiento de heridas para enfermería hospitalaria',
  manifest: '/manifest.webmanifest',
  applicationName: 'HeridaSegura IA',
  appleWebApp: { capable: true, title: 'HeridaSegura', statusBarStyle: 'default' },
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon-192.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#0f3d48' }, { media: '(prefers-color-scheme: dark)', color: '#061d23' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body>
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
