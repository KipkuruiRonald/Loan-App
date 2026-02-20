'use client';

import { AuthGuard } from '@/components/AuthGuard';
import AdminLayoutComponent from '@/components/AdminLayout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAdmin>
      <AdminLayoutComponent>
        {children}
      </AdminLayoutComponent>
    </AuthGuard>
  );
}
