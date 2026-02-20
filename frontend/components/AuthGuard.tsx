'use client';

import { useAuth, isAdmin, getRedirectPath } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Simple hook to protect a page - just call useAuthGuard() at the start of any page component
export function useAuthGuard(options?: { requireAdmin?: boolean }) {
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      // Store intended destination
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      }
      router.replace('/login');
      return;
    }

    // Check admin requirement
    if (options?.requireAdmin && !isAdmin(user)) {
      router.replace(getRedirectPath(user));
      return;
    }
  }, [isAuthenticated, user, loading, router, options?.requireAdmin]);

  return { isAuthenticated, user, loading };
}

// Component wrapper for static pages
import { ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin }: AuthGuardProps) {
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      }
      router.replace('/login');
      return;
    }

    if (requireAdmin && !isAdmin(user)) {
      router.replace(getRedirectPath(user));
      return;
    }
  }, [isAuthenticated, user, loading, router, requireAdmin]);

  // Show nothing while loading - prevents flash of login form
  if (loading) {
    return null; // or a loading spinner
  }

  // Only render children if authenticated and (if required) is admin
  if (!isAuthenticated) return null;
  if (requireAdmin && !isAdmin(user)) return null;

  return <>{children}</>;
}
