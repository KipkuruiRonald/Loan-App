'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  FileText,
  CheckCircle, 
  Clock, 
  XCircle, 
  Download, 
  Loader2,
  Search,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  Filter,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import { transactionsApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { useAuth, isAdmin } from '@/context/AuthContext';
import { exportTransactionsToPDF } from '@/lib/pdfExport';

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
  phone_number?: string;
}

// Filter state interface
interface FilterState {
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  phone: string;
  search: string;
}

// Mask phone number for privacy
const maskPhoneNumber = (phone: string | undefined) => {
  if (!phone) return 'N/A';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    return `+254 ${cleaned.slice(1,3)}** ****${cleaned.slice(-2)}`;
  }
  if (cleaned.startsWith('254')) {
    return `+254 ${cleaned.slice(3,5)}** ****${cleaned.slice(-2)}`;
  }
  return phone;
};

// Get date group label
const getDateGroup = (dateString: string) => {
  if (!dateString) return 'Older';
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const dateStr = date.toDateString();
  if (dateStr === today.toDateString()) return 'Today';
  if (dateStr === yesterday.toDateString()) return 'Yesterday';
  
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (date >= weekAgo) return 'This Week';
  
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  if (date >= monthAgo) return 'This Month';
  
  return 'Older';
};

// Format date for display
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function TransactionsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    type: 'all',
    status: 'all',
    phone: '',
    search: ''
  });
  
  const debouncedSearch = useDebounce(filters.search, 400);
  const debouncedPhone = useDebounce(filters.phone, 400);

  useEffect(() => {
    if (isAuthenticated && user && isAdmin(user)) {
      router.replace('/admin');
    }
  }, [isAuthenticated, user, router]);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await transactionsApi.search(
        debouncedSearch || '', 
        filters.status !== 'all' ? filters.status : undefined, 
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
      setError(getErrorMessage(err, 'Failed to load transactions.'));
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.status]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Apply filters client-side (date, type, phone)
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    
    // Filter by type
    if (filters.type !== 'all') {
      result = result.filter(t => 
        filters.type === 'disbursement' ? t.type === 'DISBURSEMENT' : t.type === 'REPAYMENT'
      );
    }
    
    // Filter by phone
    if (debouncedPhone) {
      const phoneLower = debouncedPhone.toLowerCase();
      result = result.filter(t => 
        t.phone_number?.toLowerCase().includes(phoneLower)
      );
    }
    
    // Filter by date range
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      result = result.filter(t => new Date(t.initiated_at) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59);
      result = result.filter(t => new Date(t.initiated_at) <= end);
    }
    
    return result;
  }, [transactions, filters.type, debouncedPhone, filters.startDate, filters.endDate]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(txn => {
      const group = getDateGroup(txn.initiated_at);
      if (!groups[group]) groups[group] = [];
      groups[group].push(txn);
    });
    return groups;
  }, [filteredTransactions]);

  // Calculate summary
  const summary = useMemo(() => {
    const totalDisbursed = filteredTransactions
      .filter(t => t.type === 'DISBURSEMENT' && t.status === 'CONFIRMED')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalRepaid = filteredTransactions
      .filter(t => t.type === 'REPAYMENT' && t.status === 'CONFIRMED')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      totalDisbursed,
      totalRepaid,
      netBalance: totalDisbursed - totalRepaid,
      count: filteredTransactions.length
    };
  }, [filteredTransactions]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      type: 'all',
      status: 'all',
      phone: '',
      search: ''
    });
  };

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportTransactionsToPDF(filteredTransactions);
    } catch (err) {
      console.error('Error exporting:', err);
      alert('Failed to export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-[var(--bg-card-alt)] rounded w-48 mb-6"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-[var(--bg-card-alt)] rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-[var(--bg-card-alt)] rounded-xl"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div 
          className="rounded-xl border p-8 text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
        >
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" style={{ color: '#ef4444' }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Error Loading Transactions
          </h3>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button
            onClick={fetchTransactions}
            className="px-6 py-3 rounded-xl font-medium text-white"
            style={{ backgroundColor: 'var(--button-primary)' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Transactions
          </h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            View and manage your transaction history
          </p>
        </div>
        
        {/* Export Button */}
        <div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--button-primary)', 
              color: 'var(--button-text)' 
            }}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          className="p-4 rounded-xl border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Disbursed</p>
          <p className="text-xl font-bold" style={{ color: '#8B5CF6' }}>
            KSh {summary.totalDisbursed.toLocaleString()}
          </p>
        </div>
        <div 
          className="p-4 rounded-xl border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Repaid</p>
          <p className="text-xl font-bold" style={{ color: '#F97316' }}>
            KSh {summary.totalRepaid.toLocaleString()}
          </p>
        </div>
        <div 
          className="p-4 rounded-xl border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Net Balance</p>
          <p className="text-xl font-bold" style={{ color: summary.netBalance >= 0 ? '#22C55E' : '#EF4444' }}>
            KSh {summary.netBalance.toLocaleString()}
          </p>
        </div>
        <div 
          className="p-4 rounded-xl border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Transactions</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {summary.count}
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div 
        className="p-4 rounded-xl border"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Date Range - Start */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ 
                backgroundColor: 'var(--bg-card-alt)',
                borderColor: 'var(--border-light)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          
          {/* Date Range - End */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ 
                backgroundColor: 'var(--bg-card-alt)',
                borderColor: 'var(--border-light)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          
          {/* Type Dropdown */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ 
                backgroundColor: 'var(--bg-card-alt)',
                borderColor: 'var(--border-light)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Types</option>
              <option value="disbursement">Disbursements</option>
              <option value="repayment">Repayments</option>
            </select>
          </div>
          
          {/* Status Dropdown */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ 
                backgroundColor: 'var(--bg-card-alt)',
                borderColor: 'var(--border-light)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Status</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          
          {/* Phone Search */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Phone</label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Search phone..."
                value={filters.phone}
                onChange={(e) => setFilters({...filters, phone: e.target.value})}
                className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
                style={{ 
                  backgroundColor: 'var(--bg-card-alt)',
                  borderColor: 'var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>
          
          {/* Transaction ID Search */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Transaction ID</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Search ID..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
                style={{ 
                  backgroundColor: 'var(--bg-card-alt)',
                  borderColor: 'var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Clear Filters */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition hover:bg-[var(--bg-card-alt)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="h-4 w-4" />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Transaction Groups */}
      {filteredTransactions.length === 0 ? (
        <div 
          className="p-12 rounded-xl border text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
        >
          <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No transactions found
          </h3>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            Try adjusting your filters to see more results
          </p>
          <button
            onClick={clearFilters}
            className="px-6 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: 'var(--button-primary)' }}
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTransactions).map(([group, txns]) => (
            <div key={group}>
              {/* Group Header */}
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {group}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-card-alt)', color: 'var(--text-secondary)' }}>
                  {txns.length}
                </span>
              </div>
              
              {/* Transaction Cards */}
              <div className="space-y-2">
                {txns.map((txn, index) => (
                  <motion.div
                    key={txn.transaction_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.02 }}
                  >
                    <div 
                      className="p-4 rounded-xl border hover:shadow-md transition"
                      style={{ 
                        backgroundColor: 'var(--bg-card)', 
                        borderColor: 'var(--border-light)' 
                      }}
                    >
                      <div className="flex items-start justify-between">
                        {/* Left: Type & Details */}
                        <div className="flex items-start gap-3">
                          <div 
                            className="p-2 rounded-full"
                            style={{ 
                              backgroundColor: txn.type === 'DISBURSEMENT' ? '#dcfce7' : '#ffedd5' 
                            }}
                          >
                            {txn.type === 'DISBURSEMENT' ? (
                              <ArrowDownCircle className="h-5 w-5" style={{ color: '#22c55e' }} />
                            ) : (
                              <ArrowUpCircle className="h-5 w-5" style={{ color: '#f97316' }} />
                            )}
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <span 
                                className="font-semibold"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {txn.type === 'DISBURSEMENT' ? 'Disbursement' : 'Repayment'}
                              </span>
                              <span 
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ 
                                  backgroundColor: txn.status === 'CONFIRMED' ? '#dcfce7' : txn.status === 'PENDING' ? '#fef9c3' : '#fee2e2',
                                  color: txn.status === 'CONFIRMED' ? '#16a34a' : txn.status === 'PENDING' ? '#ca8a04' : '#dc2626'
                                }}
                              >
                                {txn.status === 'CONFIRMED' ? 'Confirmed' : txn.status === 'PENDING' ? 'Pending' : 'Failed'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                              <Smartphone className="h-3 w-3" />
                              <span>{maskPhoneNumber(txn.phone_number)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              <span>{formatDate(txn.initiated_at)}</span>
                              <span>•</span>
                              <span className="font-mono">{txn.transaction_id}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right: Amount */}
                        <div className="text-right">
                          <p 
                            className="text-xl font-bold"
                            style={{ 
                              color: txn.type === 'DISBURSEMENT' ? '#22c55e' : '#f97316'
                            }}
                          >
                            {txn.type === 'DISBURSEMENT' ? '+' : '-'}KSh {txn.amount.toLocaleString()}
                          </p>
                          {txn.type === 'REPAYMENT' && (txn as any).remaining_balance !== undefined && (
                            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                              Balance: KSh {(txn as any).remaining_balance.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
