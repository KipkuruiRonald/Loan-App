'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, isAdmin, getRedirectPath } from '@/context/AuthContext';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
];

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to initialize
    if (loading) return;

    const isPublicPath = PUBLIC_PATHS.some(path => 
      pathname === path || pathname.startsWith(path + '/')
    );

    // If public path, allow access (AppGate handles blocking)
    if (isPublicPath) {
      // If already authenticated and trying to access login, redirect to dashboard
      if (isAuthenticated && pathname === '/login') {
        const redirectPath = getRedirectPath(user);
        router.replace(redirectPath);
        return;
      }
      return;
    }

    // Check admin access
    if (requireAdmin && !isAdmin(user)) {
      // Non-admin trying to access admin page - redirect to user dashboard based on role
      router.replace(getRedirectPath(user));
      return;
    }

    // Authenticated and authorized - allow access (AppGate handles blocking)
  }, [isAuthenticated, user, loading, pathname, router, requireAdmin]);

  // Show nothing while loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#D4C8B5' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#3E3D39' }}></div>
      </div>
    );
  }

  // Let AppGate handle the blocking - just return children if we get here
  return <>{children}</>;
}

// Hook for checking route access programmatically
export function useRouteGuard() {
  const { isAuthenticated, user, loading } = useAuth();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  const checkAccess = (path: string): { allowed: boolean; redirect?: string } => {
    if (loading) return { allowed: true }; // Let it load

    const isPublicPath = PUBLIC_PATHS.some(p => 
      path === p || path.startsWith(p + '/')
    );

    if (isPublicPath) {
      // If authenticated and going to login, redirect to dashboard
      if (isAuthenticated && path === '/login') {
        return { allowed: false, redirect: getRedirectPath(user) };
      }
      return { allowed: true };
    }

    // Check admin routes
    if (path.startsWith('/admin')) {
      if (!isAdmin(user)) {
        return { allowed: false, redirect: getRedirectPath(user) };
      }
    }

    return { allowed: true };
  };

  return { checkAccess, isAuthenticated, user, loading };
}
