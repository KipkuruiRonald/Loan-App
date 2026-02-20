'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import AuthScreen from './AuthScreen';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/contact', '/about', '/terms', '/privacy', '/repay', '/transactions'];

export function AppGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#D4C8B5' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#3E3D39' }}></div>
      </div>
    );
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
