import type { Metadata, Viewport } from 'next'
import '../okoleo-theme.css'
import { ThemeProvider } from './providers'
import { MenuProvider } from './menu-context'
import CosmicBackground from '@/components/CosmicBackground'
import AppShell from '@/components/AppShell'
import { AuthProvider } from '@/context/AuthContext'
import { AppGate } from '@/components/AppGate'

export const metadata: Metadata = {
  title: 'Okoleo - Quick Loans',
  description: 'Fast, Transparent Loans for Kenya',
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased min-w-0">
        <ThemeProvider>
          <AuthProvider>
            <MenuProvider>
              <AppGate>
                <CosmicBackground />
                <AppShell>{children}</AppShell>
              </AppGate>
            </MenuProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
