'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  ExternalLink, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Filter, 
  Download, 
  Loader2,
  Search,
  X
} from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import { transactionsApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { useAuth, isAdmin } from '@/context/AuthContext';

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

interface Transaction {
  id: number;
  transaction_id: string;
  borrower_id: number;
  loan_id: number;
  amount: number;
  type: 'DISBURSEMENT' | 'REPAYMENT';
  remaining_balance?: number;
  status: string;
  initiated_at: string;
  confirmed_at?: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Redirect admins to admin dashboard
  useEffect(() => {
    if (isAuthenticated && user && isAdmin(user)) {
      router.replace('/admin');
    }
  }, [isAuthenticated, user, router]);

  // Fetch transactions from API
  const fetchTransactions = useCallback(async (query: string = '', status: string = 'all') => {
    try {
      setError(null);
      
      const response = await transactionsApi.search(
        query, 
        status !== 'all' ? status : undefined, 
        0, 
        100
      );
      
      if (response.items) {
        setTransactions(response.items);
      } else if (Array.isArray(response)) {
        setTransactions(response);
      } else {
        setTransactions([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
      setError(getErrorMessage(err, 'Failed to load transactions. Please try again.'));
      setTransactions([]);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Handle search with debounce
  useEffect(() => {
    setSearching(true);
    fetchTransactions(debouncedSearch, statusFilter);
  }, [debouncedSearch, statusFilter, fetchTransactions]);

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      alert('Export functionality ready - would export to PDF');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'PENDING':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'FAILED':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const shortenHash = (hash: string | undefined) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading transactions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <GlassCard>
          <div className="text-center py-12">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Error Loading Transactions
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchTransactions()}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-3 text-white font-medium"
            >
              Try Again
            </motion.button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-600">
            Transaction History
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Complete audit trail of your transactions
          </p>
        </div>
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
      </motion.div>

      {/* Search and Filter */}
      <GlassCard>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions by ID, amount, or loan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
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
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl bg-white/50 dark:bg-gray-700/50 px-4 py-3 text-gray-900 dark:text-white backdrop-blur-sm outline-none border border-gray-200 dark:border-gray-600"
            >
              <option value="all">All Transactions</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Results Count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {searchQuery ? (
          <span>Found {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;</span>
        ) : (
          <span>Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <GlassCard>
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No transactions found' : 'No transactions yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery 
                ? `No transactions matching "${searchQuery}". Try a different search term.`
                : "You haven't made any transactions yet"
              }
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {transactions.map((txn, index) => (
            <motion.div
              key={txn.transaction_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <GlassCard className="hover:shadow-xl transition-all duration-300">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left: Transaction Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {getStatusIcon(txn.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {txn.transaction_id}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(txn.status)}`}>
                          {txn.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          txn.type === 'DISBURSEMENT' 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {txn.type === 'DISBURSEMENT' ? 'Disbursement' : 'Repayment'}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <p>
                          <span className="font-medium">Loan ID:</span> {txn.loan_id}
                        </p>
                        <p>
                          <span className="font-medium">Date:</span> {formatDate(txn.initiated_at)}
                        </p>
                        {txn.confirmed_at && (
                          <p>
                            <span className="font-medium">Confirmed:</span> {formatDate(txn.confirmed_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Payment Info */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {txn.type === 'DISBURSEMENT' ? 'Amount Disbursed' : 'Payment Amount'}
                      </p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        KSh {txn.amount.toLocaleString()}
                      </p>
                    </div>
                    {txn.type === 'REPAYMENT' && txn.remaining_balance !== undefined && txn.remaining_balance !== null && (
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Remaining Balance</p>
                        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                          KSh {txn.remaining_balance.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
