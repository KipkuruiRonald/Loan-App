'use client';

import { useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import AdminLayoutComponent from '@/components/AdminLayout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Force light theme for admin pages on mount
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    localStorage.setItem('theme', 'light');
    localStorage.setItem('admin_dark_mode', 'false');
  }, []);

  return (
    <AuthGuard requireAdmin>
      <AdminLayoutComponent>
        {children}
      </AdminLayoutComponent>
    </AuthGuard>
  );
}
