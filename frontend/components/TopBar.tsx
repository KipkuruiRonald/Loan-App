'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  User,
  Menu,
  X,
  LayoutDashboard,
  Wallet,
  CreditCard,
  FileText,
  Settings,
  Sparkles,
  Target,
  LogOut,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useMenu } from '@/app/menu-context';
import { useAuth, isAdmin, getRedirectPath } from '@/context/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import TierProgressBar from '@/components/TierProgressBar';
import { searchApi } from '@/lib/api';

const userNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Apply for Loan', href: '/apply', icon: CreditCard },
  { name: 'My Loans', href: '/myloans', icon: Wallet },
  { name: 'Repay', href: '/repay', icon: Target },
  { name: 'Transactions', href: '/transactions', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'User Management', href: '/admin/users', icon: User },
  { name: 'Loan Management', href: '/admin/loans', icon: Wallet },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
    const { isOpen, toggle, close } = useMenu();
  const { isAuthenticated, user, logout } = useAuth();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ loans: any[]; users: any[]; transactions: any[] }>({
    loans: [],
    users: [],
    transactions: []
  });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!value.trim()) {
      setSearchResults({ loans: [], users: [], transactions: [] });
      setShowSearchResults(false);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchApi.global(value, undefined, 0, 5);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Navigate to search result
  const navigateToResult = (type: string, id: number) => {
    setShowSearchResults(false);
    setSearchQuery('');
    
    if (type === 'loan') {
      router.push(`/myloans?id=${id}`);
    } else if (type === 'user' && isAdmin(user)) {
      router.push(`/admin/users?id=${id}`);
    } else if (type === 'transaction') {
      router.push(`/transactions?id=${id}`);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
    close();
  };

  const navigation = isAdmin(user) ? adminNavigation : userNavigation;
  const isUserAdmin = isAdmin(user);

  return (
    <header className="sticky top-0 z-40 w-full min-w-0">
      <div
        className="mx-1 rounded-xl border border-[var(--border-light)] shadow-xl sm:mx-2 sm:rounded-2xl md:mx-4 lg:mx-6"
        style={{ backgroundColor: 'var(--bg-navbar)' }}
      >
        {/* Main header row */}
        <div className="flex min-h-12 min-w-0 flex-shrink-0 items-center justify-between gap-1 px-1.5 sm:gap-2 sm:px-2 md:gap-3 md:px-3 lg:h-16 lg:px-5">
          {/* Logo */}
          <Link href={isAuthenticated && user ? getRedirectPath(user) : '/'} className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
            <Image
              src="/logo.png"
              alt="Okolea"
              width={40}
              height={40}
              className="rounded-lg"
              priority
            />
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold sm:text-lg" style={{ color: 'var(--text-primary)' }}>Okolea</h1>
              <p className="hidden text-[10px] leading-tight sm:block" style={{ color: 'var(--text-secondary)' }}>Quick Loans</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0 lg:flex">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-all"
                    style={{
                      color: isActive ? 'white' : 'var(--text-primary)',
                      backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </motion.span>
                </Link>
              );
            })}
          </nav>

          {/* Right: search + actions */}
          <div className="flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1.5">
            {/* Search with results dropdown */}
            <div className="hidden relative items-center gap-2 rounded-xl px-3 py-2 sm:flex" ref={searchRef} style={{ backgroundColor: 'var(--bg-card-alt)' }}>
              <Search className="h-4 w-4" style={{ color: 'var(--text-primary)' }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                className="w-24 bg-transparent text-sm outline-none lg:w-40"
                style={{ color: 'var(--text-primary)' }}
              />
              {searching && <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--text-primary)' }} />}
              
              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showSearchResults && (searchResults.loans.length > 0 || searchResults.users.length > 0 || searchResults.transactions.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-80 rounded-xl border shadow-lg overflow-hidden z-50"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
                  >
                    {/* Loans */}
                    {searchResults.loans.length > 0 && (
                      <div className="p-2">
                        <p className="text-xs font-medium px-2 py-1" style={{ color: 'var(--text-secondary)' }}>LOANS</p>
                        {searchResults.loans.map((loan: any) => (
                          <button
                            key={loan.id}
                            onClick={() => navigateToResult('loan', loan.id)}
                            className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-tan/50"
                          >
                            <div className="text-left">
                              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>KSh {loan.principal?.toLocaleString()}</p>
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{loan.loan_id}</p>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: loan.status === 'ACTIVE' ? 'var(--success)' : 'var(--warning)', color: 'white' }}>
                              {loan.status}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Users (admin only) */}
                    {searchResults.users.length > 0 && isUserAdmin && (
                      <div className="p-2 border-t" style={{ borderColor: 'var(--border-light)' }}>
                        <p className="text-xs font-medium px-2 py-1" style={{ color: 'var(--text-secondary)' }}>USERS</p>
                        {searchResults.users.map((user: any) => (
                          <button
                            key={user.id}
                            onClick={() => navigateToResult('user', user.id)}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-tan/50"
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-primary)' }}>
                              <User className="h-4 w-4 text-white" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.full_name || user.username}</p>
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Transactions */}
                    {searchResults.transactions.length > 0 && (
                      <div className="p-2 border-t" style={{ borderColor: 'var(--border-light)' }}>
                        <p className="text-xs font-medium px-2 py-1" style={{ color: 'var(--text-secondary)' }}>TRANSACTIONS</p>
                        {searchResults.transactions.map((trans: any) => (
                          <button
                            key={trans.id}
                            onClick={() => navigateToResult('transaction', trans.id)}
                            className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-tan/50"
                          >
                            <div className="text-left">
                              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>KSh {trans.amount?.toLocaleString()}</p>
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{trans.transaction_id}</p>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>
                              {trans.status}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* No results */}
                    {searchResults.loans.length === 0 && searchResults.users.length === 0 && searchResults.transactions.length === 0 && (
                      <div className="p-4 text-center">
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No results found</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tier Progress Bar - desktop (commented out - moved to dashboard) */}
            {/* {isAuthenticated && (
              <TierProgressBar user={user} loading={false} />
            )} */}

            <motion.button
              type="button"
              onClick={toggle}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-md sm:h-10 sm:w-10 sm:min-h-[40px] sm:min-w-[40px] sm:rounded-xl lg:hidden"
              style={{ color: 'var(--text-primary)' }}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </motion.button>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-7 w-7 min-h-[28px] min-w-[28px] items-center justify-center rounded-md sm:h-8 sm:w-8 sm:min-h-[32px] sm:min-w-[32px] sm:rounded-lg"
              style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-card-alt)' }}
            >
              <NotificationBell />
            </motion.div>

            {/* User Menu */}
            {isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex h-8 min-h-[32px] items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium shadow-lg sm:h-10 sm:min-h-[40px] sm:gap-1.5 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm"
                  style={{ backgroundColor: 'var(--button-primary)', color: 'var(--button-text)' }}
                >
                  <User className="h-3.5 w-3.5 shrink-0 sm:h-5 sm:w-5" />
                  <span className="hidden xs:block sm:hidden">Acc</span>
                  <span className="hidden sm:block max-w-[80px] truncate">{user.full_name || user.username}</span>
                  <ChevronDown className="h-3 w-3 hidden sm:block" />
                </motion.button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 rounded-xl border shadow-lg overflow-hidden"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
                    >
                      {/* User Info */}
                      <div className="p-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {user.full_name || user.username}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {user.email}
                        </p>
                        {isUserAdmin && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Admin
                          </span>
                        )}
                      </div>

                      {/* Menu Items */}
                      <div className="p-1">
                        <Link
                          href="/settings"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex h-8 min-h-[32px] items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium shadow-lg sm:h-10 sm:min-h-[40px] sm:gap-1.5 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm"
                    style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '2px solid var(--border-light)' }}
                  >
                    <User className="h-3.5 w-3.5 shrink-0 sm:h-5 sm:w-5" />
                    <span className="hidden xs:block sm:hidden">In</span>
                    <span className="hidden sm:block">Sign In</span>
                  </motion.span>
                </Link>
                <Link href="/register">
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex h-8 min-h-[32px] items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium shadow-lg sm:h-10 sm:min-h-[40px] sm:gap-1.5 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm"
                    style={{ backgroundColor: 'var(--button-primary)', color: 'var(--button-text)' }}
                  >
                    <span className="hidden xs:block sm:hidden">Up</span>
                    <span className="hidden sm:block">Register</span>
                  </motion.span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t lg:hidden"
              style={{ borderColor: 'var(--border-light)' }}
            >
              <nav className="space-y-1 p-3 sm:p-4">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link key={item.name} href={item.href} onClick={close}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        className="flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3"
                        style={{
                          color: 'var(--text-primary)',
                          backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                        }}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.name}</span>
                      </motion.div>
                    </Link>
                  );
                })}
                
                {/* Mobile User Section */}
                {isAuthenticated && user ? (
                  <>
                    <div className="mt-3 flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--bg-card-alt)' }}>
                      <User className="h-5 w-5" style={{ color: 'var(--text-primary)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {user.full_name || user.username}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleLogout();
                        close();
                      }}
                      className="w-full mt-2 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="h-5 w-5" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Link href="/login" onClick={close}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium"
                        style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '2px solid var(--border-light)' }}
                      >
                        <User className="h-5 w-5" />
                        Sign In
                      </motion.div>
                    </Link>
                    <Link href="/register" onClick={close}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium"
                        style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                      >
                        Register
                      </motion.div>
                    </Link>
                  </div>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
