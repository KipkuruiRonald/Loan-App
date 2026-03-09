'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Wallet, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  DollarSign,
  CreditCard,
  ArrowRight,
  RefreshCw,
  Download,
  Filter,
  Loader2,
  Search,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import { loansApi } from '@/lib/api';
import { getErrorMessage, maskPhoneNumber } from '@/lib/utils';
import { useAuth, isAdmin } from '@/context/AuthContext';
import { useLoanParameters } from '@/hooks/useLoanParameters';
import { exportLoansToPDF } from '@/lib/pdfExport';

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface Loan {
  id: number;
  loan_id: string;
  originator_id: number;
  principal: number;
  interest_rate: number;
  term_days: number;
  total_due: number;
  outstanding_balance?: number;
  current_outstanding?: number;
  phone_number?: string;
  due_date: string;
  payment_date?: string;
  late_days: number;
  late_penalty_amount?: number;
  status: 'PENDING' | 'ACTIVE' | 'SETTLED' | 'REJECTED' | 'DEFAULTED';
  risk_score?: number;
  risk_grade?: string;
  created_at: string;
}

interface LoanSummary {
  active_loans: number;
  total_outstanding: number;
  total_repaid: number;
  next_payment: number;
  next_due_date: string;
  perfect_repayment_streak: number;
}

export default function MyLoansPage() {
  const router = useRouter();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { default_interest_rate, penalty_rate, term_days, perfect_repayment_bonus, loading: paramsLoading } = useLoanParameters();
  // Redirect admins to admin dashboard
  useEffect(() => {
    if (isAuthenticated && user && isAdmin(user)) {
      router.replace('/admin');
    }
  }, [isAuthenticated, user, router]);

  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
  const searchParams = useSearchParams();
  
  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch loans from API
  const fetchLoans = useCallback(async (query: string = '', status: string = 'all') => {
    try {
      setError(null);
      
      // Call the new /api/loans/my-loans endpoint using loansApi
      const data = await loansApi.getMyLoans();
      
      // Filter by status if needed
      let filteredLoans = data;
      if (status && status !== 'all') {
        filteredLoans = data.filter((loan: Loan) => loan.status === status);
      }
      
      // Filter by search query if needed
      if (query) {
        const lowerQuery = query.toLowerCase();
        filteredLoans = filteredLoans.filter((loan: Loan) => 
          loan.loan_id?.toLowerCase().includes(lowerQuery) ||
          loan.principal?.toString().includes(lowerQuery)
        );
      }
      
      setLoans(filteredLoans);
      
      // Calculate summary
      const activeLoans = filteredLoans.filter((l: Loan) => l.status === 'ACTIVE');
      const settledLoans = filteredLoans.filter((l: Loan) => l.status === 'SETTLED');
      
      const totalOutstanding = activeLoans.reduce((sum: number, l: Loan) => sum + (l.outstanding_balance ?? l.current_outstanding ?? l.total_due), 0);
      const totalRepaid = settledLoans.reduce((sum: number, l: Loan) => sum + l.total_due, 0);
      
      // Find next due date - use outstanding_balance for next payment
      const nextLoan = activeLoans.sort((a: Loan, b: Loan) => 
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      )[0];
      
      setSummary({
        active_loans: activeLoans.length,
        total_outstanding: totalOutstanding,
        total_repaid: totalRepaid,
        next_payment: nextLoan ? (nextLoan.outstanding_balance ?? nextLoan.current_outstanding ?? nextLoan.total_due) : 0,
        next_due_date: nextLoan?.due_date || '',
        perfect_repayment_streak: user?.perfect_repayment_streak || 0,
      });
    } catch (err: any) {
      console.error('Failed to fetch loans:', err);
      setError(getErrorMessage(err, 'Failed to load loans. Please try again.'));
      setLoans([]);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLoans();
    
    // Set up polling for active loans to update outstanding balances
    const interval = setInterval(() => {
      fetchLoans(debouncedSearch, statusFilter);
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [fetchLoans, debouncedSearch, statusFilter]);

  // Handle search with debounce
  useEffect(() => {
    setSearching(true);
    fetchLoans(debouncedSearch, statusFilter);
  }, [debouncedSearch, statusFilter, fetchLoans]);

  // Refresh when page becomes visible (e.g., user returns from payment)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLoans(debouncedSearch, statusFilter);
        refreshUser(); // Also refresh user data to get updated streak
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchLoans, debouncedSearch, statusFilter, refreshUser]);

  // Handle payment success - refresh when returning from repay page
  useEffect(() => {
    if (searchParams.get('paymentSuccess') === 'true') {
      fetchLoans(debouncedSearch, statusFilter);
      refreshUser(); // Refresh user data to get updated streak
      router.replace('/myloans');
    }
  }, [searchParams, router, fetchLoans, debouncedSearch, statusFilter, refreshUser]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLoans(searchQuery, statusFilter);
    setIsRefreshing(false);
  };

  // Handle export
  const handleExport = async () => {
    if (isExporting) return; // Prevent double clicks
    
    setIsExporting(true);
    try {
      // Use existing loans data from state instead of fetching again
      if (!loans || loans.length === 0) {
        alert('No loans to export');
        return;
      }
      
      // Calculate using the same logic as the main page
      const activeLoans = loans.filter(l => l.status === 'ACTIVE');
      const settledLoans = loans.filter(l => l.status === 'SETTLED');
      const pendingLoans = loans.filter(l => l.status === 'PENDING');
      
      // Calculate total outstanding using outstanding_balance
      const totalOutstanding = activeLoans.reduce((sum, l) => 
        sum + (l.outstanding_balance ?? l.current_outstanding ?? l.total_due), 0
      );
      
      // Calculate total repaid from settled loans
      const totalRepaid = settledLoans.reduce((sum, l) => sum + l.total_due, 0);
      
      // Find next due date
      const nextLoan = activeLoans.length > 0
        ? activeLoans.sort((a, b) => 
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          )[0]
        : null;
      
      const summary = {
        total_loans: loans.length,
        active_loans: activeLoans.length,
        pending_loans: pendingLoans.length,
        settled_loans: settledLoans.length,
        total_outstanding: totalOutstanding,
        total_repaid: totalRepaid,
        total_paid: totalRepaid, // For backward compatibility
        next_payment: nextLoan ? (nextLoan.outstanding_balance ?? nextLoan.current_outstanding ?? nextLoan.total_due) : 0,
        next_due_date: nextLoan?.due_date || '',
        generated_at: new Date().toISOString(),
      };
      
      console.log('📊 Exporting with summary:', summary);
      
      // Export to PDF with enhanced summary
      exportLoansToPDF(loans, summary);
    } catch (err) {
      console.error('Error exporting:', err);
      alert('Failed to export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  const formatCurrency = (amount: number) => {
    return `KSh ${(amount || 0).toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200';
      case 'SETTLED':
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 border-gray-200';
      case 'DEFAULTED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200';
      case 'REJECTED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200';
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Clock className="h-4 w-4 text-green-600" />;
      case 'SETTLED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'DEFAULTED':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'REJECTED':
        return <X className="h-4 w-4 text-red-600" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading your loans...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && loans.length === 0) {
    return (
      <div className="space-y-6">
        <GlassCard>
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Error Loading Loans
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-3 text-white font-medium"
            >
              Try Again
            </motion.button>
          </div>
        </GlassCard>
      </div>
    );
  }

  const filteredLoans = loans;

  // Calculate pagination
  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredLoans.length);
  const paginatedLoans = filteredLoans.slice(startIndex, endIndex);

  // Handle page reset when filters change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-9">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="text-center sm:text-left">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            My Loans
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Track and manage your active loans
          </p>
        </div>
        <div className="flex gap-3 justify-center sm:justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefresh}
            disabled={isRefreshing || searching}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="h-full">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg sm:p-3">
                <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Active Loans</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {summary?.active_loans || 0}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="h-full">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg sm:p-3">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Outstanding</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {formatCurrency(summary?.total_outstanding || 0)}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="h-full">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg sm:p-3">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Repaid</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {formatCurrency(summary?.total_repaid || 0)}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="h-full">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg sm:p-3">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Next Due</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {(summary?.active_loans ?? 0) > 0 ? formatCurrency(summary?.next_payment || 0) : '-'}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Next Payment Alert */}
      {summary?.next_due_date && (summary?.active_loans ?? 0) > 0 && (
        <GlassCard>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Next Payment Due
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {formatCurrency(summary.next_payment)} on {new Date(summary.next_due_date).toLocaleDateString('en-KE')}
                </p>
              </div>
            </div>
            <Link href="/repay">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-medium shadow-lg shadow-emerald-500/50"
              >
                <CreditCard className="h-5 w-5" />
                Repay Now
              </motion.button>
            </Link>
          </div>
        </GlassCard>
      )}

      {/* Search and Filter */}
      <GlassCard>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search loans..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-10 py-2 sm:py-3 rounded-xl bg-white/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
            {searching && (
              <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="rounded-xl bg-white/50 dark:bg-gray-700/50 px-4 py-3 text-gray-900 dark:text-white backdrop-blur-sm outline-none border border-gray-200 dark:border-gray-600"
            >
              <option value="all">All Loans</option>
              <option value="ACTIVE">Active</option>
              <option value="SETTLED">Settled</option>
              <option value="PENDING">Pending</option>
              <option value="DEFAULTED">Defaulted</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Results Count with Pagination Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {searchQuery ? (
            <span>Found {filteredLoans.length} loan{filteredLoans.length !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;</span>
          ) : (
            <span>Showing {startIndex + 1}-{endIndex} of {filteredLoans.length} loan{filteredLoans.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        
        {/* Items per page selector */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">Per page:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="rounded-lg bg-white/50 dark:bg-gray-700/50 px-2 py-1 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ITEMS_PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loans List */}
      {paginatedLoans.length === 0 ? (
        <GlassCard>
          <div className="text-center py-12">
            <Wallet className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No loans found' : 'No loans yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery 
                ? `No loans matching "${searchQuery}". Try a different search term.`
                : "You haven't taken any loans yet"
              }
            </p>
            {!searchQuery && (
              <Link href="/apply">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-3 text-white font-medium shadow-lg shadow-emerald-500/50"
                >
                  Apply for a Loan
                </motion.button>
              </Link>
            )}
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {paginatedLoans.map((loan, index) => {
            const dueDate = new Date(loan.due_date);
            const today = new Date();
            const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            return (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <GlassCard className="hover:shadow-xl transition-all duration-300">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Loan Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {loan.loan_id}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(loan.status)}`}>
                          {getStatusIcon(loan.status)}
                          {loan.status}
                        </span>
                      </div>

                      {/* Pending status message */}
                      {loan.status === 'PENDING' && (
                        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            ⏳ Your application is under review. You will be notified once it is approved or if we need additional information.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Principal</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(loan.principal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Interest</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {default_interest_rate ? `${default_interest_rate}%` : `${loan.interest_rate}%`}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Due</p>
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(loan.total_due)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Outstanding</p>
                          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            {formatCurrency(loan.outstanding_balance ?? loan.current_outstanding ?? loan.total_due)}
                          </p>
                        </div>
                      </div>

                      {/* Phone number for active loans */}
                      {loan.status === 'ACTIVE' && loan.phone_number && (
                        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                            📱 Registered phone: {maskPhoneNumber(loan.phone_number)} (use for repayment)
                          </p>
                        </div>
                      )}

                      {/* Late penalty information */}
                      {loan.status === 'ACTIVE' && loan.late_days > 0 && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Late by {loan.late_days} days. Penalty: {formatCurrency(loan.late_penalty_amount || (loan.principal * (penalty_rate / 100) * loan.late_days))}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right: Dates & Action */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-4 lg:items-end">
                      <div className="flex gap-6 sm:gap-8 lg:gap-0 lg:flex-col lg:space-y-2">
                        <div className="text-right lg:text-left">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
                          <p className={`font-medium ${daysRemaining <= 3 && loan.status === 'ACTIVE' ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}>
                            {dueDate.toLocaleDateString('en-KE')}
                          </p>
                        </div>
                        {loan.status === 'ACTIVE' && daysRemaining > 0 && (
                          <div className="text-right lg:text-left">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Days Remaining</p>
                            <p className={`font-bold ${daysRemaining <= 3 ? 'text-orange-600' : 'text-emerald-600'}`}>
                              {daysRemaining} days
                            </p>
                          </div>
                        )}
                      </div>

                      {loan.status === 'ACTIVE' && (
                        <Link href={`/repay?loanId=${loan.loan_id}`}>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-medium shadow-lg shadow-emerald-500/50"
                          >
                            <CreditCard className="h-5 w-5" />
                            Repay
                            <ArrowRight className="h-4 w-4" />
                          </motion.button>
                        </Link>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <GlassCard>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Previous Button */}
            <motion.button
              whileHover={{ scale: currentPage > 1 ? 1.02 : 1 }}
              whileTap={{ scale: currentPage > 1 ? 0.98 : 1 }}
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </motion.button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, and pages around current
                const shouldShow = 
                  page === 1 || 
                  page === totalPages || 
                  (page >= currentPage - 1 && page <= currentPage + 1);
                
                const isEllipsisBefore = page === currentPage - 2 && page > 1;
                const isEllipsisAfter = page === currentPage + 2 && page < totalPages;

                if (!shouldShow && !isEllipsisBefore && !isEllipsisAfter) {
                  return null;
                }

                if (isEllipsisBefore || isEllipsisAfter) {
                  return (
                    <span key={page} className="px-2 py-2 text-gray-500">
                      ...
                    </span>
                  );
                }

                return (
                  <motion.button
                    key={page}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[40px] h-10 rounded-lg font-medium transition-all ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {page}
                  </motion.button>
                );
              })}
            </div>

            {/* Next Button */}
            <motion.button
              whileHover={{ scale: currentPage < totalPages ? 1.02 : 1 }}
              whileTap={{ scale: currentPage < totalPages ? 0.98 : 1 }}
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </motion.button>
          </div>
        </GlassCard>
      )}

      {/* Payment Streak */}
      {summary && summary.perfect_repayment_streak > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Perfect Repayment Streak
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {summary.perfect_repayment_streak} on-time payment{summary.perfect_repayment_streak !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Keep it up!</p>
              <p className="text-lg font-bold text-emerald-600">
                +{(perfect_repayment_bonus || 40) * summary.perfect_repayment_streak} credit points
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
