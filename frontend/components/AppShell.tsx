'use client';

import TopBar from './TopBar';
import Footer from './Footer';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Public paths where navigation should be hidden
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/contact', '/about', '/terms', '/privacy'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();
  
  // Check if current route is an admin page
  const isAdminPage = pathname?.startsWith('/admin');
  
  // Check if current path is public (should hide navigation)
  const isPublicPath = PUBLIC_PATHS.some(path => pathname?.startsWith(path));
  
  // Show navigation only on authenticated pages (not public paths)
  const showNavigation = !isAdminPage && !isPublicPath && !PUBLIC_PATHS.includes(pathname || '');
  
  return (
    <div className="min-h-screen flex flex-col">
      {showNavigation && <TopBar />}
      <main className="min-w-0 px-3 py-4 sm:p-4 md:p-6 lg:p-8 flex-1">{children}</main>
      {showNavigation && <Footer />}
    </div>
  );
}
