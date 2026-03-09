'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Wallet, 
  CreditCard, 
  Target, 
  FileText, 
  TrendingUp, 
  Clock,
  ArrowRight,
  DollarSign,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth, isAdmin } from '@/context/AuthContext';
import { loansApi } from '@/lib/api';
import GlassCard from '@/components/GlassCard';
import StatCard from '@/components/StatCard';

// Loan interface
interface Loan {
  id: number;
  loan_id: string;
  principal: number;
  interest_rate: number;
  term_days: number;
  status: string;
  created_at: string;
  disbursed_at?: string;
  due_date?: string;
  total_amount?: number;
  amount_paid?: number;
}

// Paginated response interface for API responses
interface PaginatedLoansResponse {
  items: Loan[];
  total: number;
  skip: number;
  limit: number;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect admins to admin dashboard
    if (isAuthenticated && user && isAdmin(user)) {
      router.replace('/admin');
      return;
    }
    
    const fetchLoans = async () => {
      try {
        setLoading(true);
        const response = await loansApi.getRecent(0, 5);
        
        // Handle both paginated response { items: [] } and direct array [] responses
        let loansArray: Loan[] = [];
        if (Array.isArray(response)) {
          // Direct array response
          loansArray = response;
        } else if (response && Array.isArray(response.items)) {
          // Paginated response with items array
          loansArray = response.items;
        } else if (response && typeof response === 'object') {
          // Try to find array property
          const possibleArrayKey = Object.keys(response).find(key => Array.isArray((response as any)[key]));
          if (possibleArrayKey) {
            loansArray = (response as any)[possibleArrayKey];
          }
        }
        
        setLoans(loansArray);
      } catch (err: any) {
        console.error('Error fetching loans:', err);
        setError('Failed to load loans');
        setLoans([]); // Ensure loans is always an array on error
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchLoans();
    }
  }, [isAuthenticated, user, router]);

  // ============================================================
  // TIER PROGRESS CALCULATIONS (from database)
  // ============================================================
  
  // Calculate progress to next tier based on perfect repayment streak
  const calculateProgress = () => {
    const currentTier = user?.credit_tier || 1;
    const streak = user?.perfect_repayment_streak || 0;
    
    // Define requirements for each tier
    const tierRequirements: Record<number, { next: number | null; required: number | null }> = {
      1: { next: 2, required: 3 }, // Bronze → Silver: 3 on-time repayments
      2: { next: 3, required: 6 }, // Silver → Gold: 6 on-time repayments
      3: { next: 4, required: 12 }, // Gold → Platinum: 12 on-time repayments
      4: { next: null, required: null } // Platinum is max tier
    };
    
    const requirements = tierRequirements[currentTier] || tierRequirements[1];
    
    // If at max tier, return 100%
    if (!requirements.next) return 100;
    
    // Calculate percentage (cap at 100%)
    const progress = Math.min(Math.round((streak / (requirements.required || 1)) * 100), 100);
    return progress;
  };

  // Get dynamic message based on progress
  const getProgressMessage = () => {
    const currentTier = user?.credit_tier || 1;
    const streak = user?.perfect_repayment_streak || 0;
    
    const nextTierNames: Record<number, string | null> = {
      1: 'Silver',
      2: 'Gold',
      3: 'Platinum',
      4: null
    };
    
    const tierRequirements: Record<number, number | null> = {
      1: 3,
      2: 6,
      3: 12,
      4: null
    };
    
    // If at max tier
    if (currentTier === 4) {
      return "You're at the highest tier! Great job!";
    }
    
    const required = tierRequirements[currentTier] || 3;
    const remaining = required - streak;
    const nextTier = nextTierNames[currentTier];
    
    if (remaining <= 0) {
      return `You've qualified for ${nextTier}! Waiting for admin review.`;
    }
    
    return `${remaining} more on-time ${remaining === 1 ? 'repayment' : 'repayments'} to reach ${nextTier}`;
  };

  // Calculate stats from loans - with defensive checks
  const activeLoans = Array.isArray(loans) ? loans.filter(l => l.status === 'ACTIVE' || l.status === 'CURRENT') : [];
  const pendingLoans = Array.isArray(loans) ? loans.filter(l => l.status === 'PENDING') : [];
  const completedLoans = Array.isArray(loans) ? loans.filter(l => l.status === 'COMPLETED' || l.status === 'PAID') : [];
  
  const totalBorrowed = Array.isArray(loans) ? loans.reduce((sum, l) => sum + (l.principal || 0), 0) : 0;
  const totalRepaid = Array.isArray(loans) ? loans.reduce((sum, l) => sum + (l.amount_paid || 0), 0) : 0;

  // Quick actions
  const quickActions = [
    { 
      name: 'Apply for Loan', 
      href: '/apply', 
      icon: CreditCard, 
      color: 'var(--accent-primary)',
      description: 'Get quick funding'
    },
    { 
      name: 'Repay Loan', 
      href: '/repay', 
      icon: Target, 
      color: 'var(--accent-secondary)',
      description: 'Make a payment'
    },
    { 
      name: 'My Loans', 
      href: '/myloans', 
      icon: Wallet, 
      color: 'var(--success)',
      description: 'View all loans'
    },
    { 
      name: 'Transactions', 
      href: '/transactions', 
      icon: FileText, 
      color: 'var(--warning)',
      description: 'Transaction history'
    },
  ];

  // Get tier info
  const tierInfo = {
    tier: user?.credit_tier || 1,
    creditScore: user?.credit_score ?? 0,
    currentLimit: user?.current_limit || 5000,
  };

  const tierNames = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  const tierName = tierNames[Math.min(tierInfo.tier - 1, tierNames.length - 1)];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'CURRENT':
        return 'var(--success)';
      case 'PENDING':
        return 'var(--warning)';
      case 'COMPLETED':
      case 'PAID':
        return 'var(--accent-primary)';
      case 'DEFAULTED':
      case 'OVERDUE':
        return 'var(--error)';
      default:
        return 'var(--text-secondary)';
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Welcome back, {user?.full_name?.split(' ')[0] || user?.username || 'there'}!
          </h1>
        </motion.div>
        <p style={{ color: 'var(--text-secondary)' }}>
          Here&apos;s an overview of your loan portfolio
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div variants={itemVariants}>
            <StatCard
              title="Credit Limit"
              value={formatCurrency(tierInfo.currentLimit)}
              icon={DollarSign}
              change="+0%"
              trend="up"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              title="Credit Score"
              value={tierInfo.creditScore === 0 ? '—' : tierInfo.creditScore.toString()}
              icon={TrendingUp}
              change="+0%"
              trend="up"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              title="Active Loans"
              value={activeLoans.length.toString()}
              icon={Wallet}
              change="+0"
              trend="up"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              title="Total Borrowed"
              value={formatCurrency(totalBorrowed)}
              icon={CreditCard}
              change="+0%"
              trend="up"
            />
          </motion.div>
        </div>

        {/* Tier Badge and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tier Badge with Progress from Database */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <GlassCard className="h-full p-6">
              <div className="flex items-center gap-3 mb-3">
                <Target className="h-8 w-8" style={{ color: 'var(--text-primary)' }} />
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Your Tier</p>
                  <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{tierName}</p>
                </div>
              </div>
              
              {/* Progress information from database */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Progress to next tier</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{calculateProgress()}%</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-card-alt)' }}>
                  <motion.div 
                    className="h-full rounded-full"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${calculateProgress()}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                  />
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {getProgressMessage()}
                </p>
              </div>
            </GlassCard>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <GlassCard>
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quickActions.map((action, index) => (
                  <Link key={action.name} href={action.href}>
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-4 rounded-xl text-center cursor-pointer transition-colors"
                      style={{ 
                        backgroundColor: 'var(--bg-card-alt)',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2"
                        style={{ backgroundColor: action.color }}
                      >
                        <action.icon className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {action.name}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {action.description}
                      </p>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Recent Loans */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Recent Loans
              </h2>
              <Link 
                href="/myloans" 
                className="flex items-center gap-1 text-sm font-medium"
                style={{ color: 'var(--accent-primary)' }}
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent-primary)' }}></div>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 py-4 text-red-500">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            ) : loans.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
                <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  No loans yet
                </p>
                <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Apply for your first loan to get started
                </p>
                <Link href="/apply">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-2 rounded-xl font-medium"
                    style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                  >
                    Apply Now
                  </motion.button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {loans.map((loan) => (
                  <Link key={loan.id} href={`/myloans?id=${loan.id}`}>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{ 
                        backgroundColor: 'var(--bg-card-alt)',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ 
                            backgroundColor: getStatusColor(loan.status),
                            opacity: 0.15 
                          }}
                        >
                          {loan.status === 'ACTIVE' || loan.status === 'CURRENT' ? (
                            <Clock className="w-5 h-5" style={{ color: getStatusColor(loan.status) }} />
                          ) : loan.status === 'COMPLETED' || loan.status === 'PAID' ? (
                            <CheckCircle className="w-5 h-5" style={{ color: getStatusColor(loan.status) }} />
                          ) : (
                            <AlertCircle className="w-5 h-5" style={{ color: getStatusColor(loan.status) }} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {formatCurrency(loan.principal)}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {loan.term_days} days @ {loan.interest_rate}% APR
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: getStatusColor(loan.status),
                            color: 'white'
                          }}
                        >
                          {loan.status}
                        </span>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {loan.due_date ? `Due ${formatDate(loan.due_date)}` : formatDate(loan.created_at)}
                        </p>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
