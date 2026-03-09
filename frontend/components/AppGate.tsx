'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import AuthScreen from './AuthScreen';
import LoadingLogo from './LoadingLogo';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/contact', '/about', '/terms', '/privacy', '/repay', '/transactions', '/maintenance'];

export function AppGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return <LoadingLogo />;
  }

  // Allow access to public paths even when not logged in
  if (PUBLIC_PATHS.some(path => pathname?.startsWith(path))) {
    return <>{children}</>;
  }

  // Block everything else if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Authenticated - show the app
  return <>{children}</>;
}
