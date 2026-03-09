'use client';

import './globals.css'
import '../okolea-theme.css'
import { Providers } from './providers'
import { MenuProvider } from './menu-context'
import CosmicBackground from '@/components/CosmicBackground'
import AppShell from '@/components/AppShell'
import { AuthProvider } from '@/context/AuthContext'
import { AppGate } from '@/components/AppGate'
import StatusBarSetup from '@/components/StatusBar'
import { MaintenanceProvider } from '@/context/MaintenanceContext'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const isMaintenancePage = pathname === '/maintenance';
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show loading while client-side hydration completes
  if (!isClient) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className="font-sans antialiased min-w-0"></body>
      </html>
    );
  }

  // If maintenance page, Render without navigation
  if (isMaintenancePage) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className="font-sans antialiased min-w-0">
          {children}
        </body>
      </html>
    );
  }

  // Normal layout with navigation for all other pages
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased min-w-0">
        <StatusBarSetup />
        <Providers>
          <MaintenanceProvider>
            <AuthProvider>
              <MenuProvider>
                <AppGate>
                  <CosmicBackground />
                  <AppShell>{children}</AppShell>
                </AppGate>
              </MenuProvider>
            </AuthProvider>
          </MaintenanceProvider>
        </Providers>
      </body>
    </html>
  );
}
