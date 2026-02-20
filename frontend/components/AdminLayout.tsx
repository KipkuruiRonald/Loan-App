'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Clock, 
  BarChart3, 
  Settings,
  Shield,
  ClipboardList,
  LogOut,
  Sparkles,
  Search,
  Sun,
  Moon,
  Menu,
  X,
  User,
  Layers
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { useAuth, isAdmin } from '@/context/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_dark_mode');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('admin_dark_mode', String(newMode));
    document.documentElement.classList.toggle('dark', newMode);
  };

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!loading && (!isAuthenticated || !isAdmin(user))) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, user, loading, router]);

  // Show loading while checking auth
  if (loading || !isAuthenticated || !isAdmin(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#D4C8B5' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#3E3D39' }}></div>
      </div>
    );
  }

  const menuItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/loans', label: 'Loans', icon: FileText },
    { href: '/admin/approvals', label: 'Approvals', icon: Clock },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/crb', label: 'CRB', icon: Shield },
    { href: '/admin/audit', label: 'Audit', icon: ClipboardList },
    { href: '/admin/tiers', label: 'Tiers', icon: Layers },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: darkMode ? '#1a1a1a' : '#D4C8B5' }}>
      {/* Top Navigation Bar */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 lg:px-6"
        style={{ 
          backgroundColor: darkMode ? '#2d2d2d' : '#3E3D39', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}
      >
        {/* Logo */}
        <Link href="/admin" className="flex items-center gap-2">
          <Sparkles className="w-6 h-6" style={{ color: '#D4C8B5' }} />
          <span className="text-xl font-bold" style={{ color: '#D4C8B5' }}>Okoleo Admin</span>
        </Link>

        {/* Desktop Navigation - Horizontal */}
        <nav className="hidden lg:flex items-center gap-0">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const isHovered = hoveredItem === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setHoveredItem(item.href)}
                onMouseLeave={() => setHoveredItem(null)}
                className="flex items-center gap-1 px-2 py-2 rounded-md transition-all duration-200"
                style={{
                  backgroundColor: isActive ? '#D4C8B5' : isHovered ? 'rgba(212, 200, 181, 0.2)' : 'transparent',
                  color: isActive ? (darkMode ? '#1a1a1a' : '#3E3D39') : '#D4C8B5',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side - Search, Theme Toggle, Notifications, Logout */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div 
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: 'rgba(212, 200, 181, 0.2)' }}
          >
            <Search className="w-4 h-4" style={{ color: '#D4C8B5' }} />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-sm w-24"
              style={{ color: '#D4C8B5' }}
            />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
            style={{ backgroundColor: 'rgba(212, 200, 181, 0.2)', color: '#D4C8B5' }}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <div className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
            style={{ backgroundColor: 'rgba(212, 200, 181, 0.2)' }}
          >
            <NotificationBell />
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: 'rgba(212, 200, 181, 0.2)' }}
            >
              <User className="w-5 h-5" style={{ color: '#D4C8B5' }} />
              <span className="hidden sm:inline text-sm font-medium" style={{ color: '#D4C8B5' }}>
                {user?.full_name || user?.username || 'Admin'}
              </span>
            </button>
            
            {/* Profile Dropdown */}
            {profileMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1"
                style={{ backgroundColor: darkMode ? '#2d2d2d' : '#3E3D39' }}
              >
                <div className="px-4 py-2 border-b" style={{ borderColor: 'rgba(212, 200, 181, 0.2)' }}>
                  <p className="text-sm font-medium" style={{ color: '#D4C8B5' }}>
                    {user?.full_name || 'Admin'}
                  </p>
                  <p className="text-xs" style={{ color: '#A09A8E' }}>
                    {user?.email || ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-red-600"
                  style={{ color: '#D4C8B5' }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation - Collapsible with hamburger */}
      <div className="fixed top-16 left-0 right-0 z-40 lg:hidden">
        {/* Hamburger button */}
        <div 
          className="flex items-center justify-between px-3 py-2"
          style={{ 
            backgroundColor: darkMode ? '#2d2d2d' : '#3E3D39', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
            style={{ backgroundColor: '#D4C8B5', color: darkMode ? '#1a1a1a' : '#3E3D39' }}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <>
                <Menu className="w-5 h-5" />
                <span className="text-sm font-medium">Menu</span>
              </>
            )}
          </button>
          
          {/* Quick icons when collapsed */}
          {!mobileMenuOpen && (
            <div className="flex items-center gap-2">
              {menuItems.slice(0, 2).map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200"
                    style={{
                      backgroundColor: isActive ? '#D4C8B5' : 'transparent',
                      color: isActive ? (darkMode ? '#1a1a1a' : '#3E3D39') : '#D4C8B5',
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Collapsible menu content */}
        {mobileMenuOpen && (
          <div 
            className="flex flex-wrap gap-1 px-3 py-2"
            style={{ 
              backgroundColor: darkMode ? '#2d2d2d' : '#3E3D39', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor: isActive ? '#D4C8B5' : 'transparent',
                    color: isActive ? (darkMode ? '#1a1a1a' : '#3E3D39') : '#D4C8B5',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content */}
      <main 
        className="flex-1 w-full p-4 lg:p-8 pt-24 lg:pt-24"
      >
        {children}
      </main>
    </div>
  );
}
