import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Okolea - Quick Loans',
  description: 'Fast, Transparent Loans for Kenya',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Okolea',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-152x152.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}
