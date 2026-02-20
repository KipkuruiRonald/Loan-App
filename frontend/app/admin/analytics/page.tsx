'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '@/components/AdminLayout';
import {   
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  FileText,
  Loader2,
  Calendar,
  PieChart,
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  total_users: number;
  active_loans: number;
  pending_approvals: number;
  default_rate: number;
  portfolio_value: number;
  disbursed_today: number;
}

interface LoanData {
  id: number;
  borrower_name: string;
  principal: number;
  current_outstanding: number;
  status: string;
  created_at: string;
}

interface UserData {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_verified: boolean;
  created_at: string;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AnalyticsData | null>(null);
  const [loans, setLoans] = useState<LoanData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch stats
      const statsRes = await fetch('http://localhost:8000/api/admin/stats', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch all loans
      const loansRes = await fetch('http://localhost:8000/api/admin/loans', { headers });
      if (loansRes.ok) {
        const loansData = await loansRes.json();
        setLoans(loansData);
      }

      // Fetch all users
      const usersRes = await fetch('http://localhost:8000/api/admin/users', { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleExport = () => {
    const analytics = calculateAnalytics();
    const data = {
      summary: {
        totalDisbursed: analytics.totalDisbursed,
        totalOutstanding: analytics.totalOutstanding,
        avgLoanSize: analytics.avgLoanSize,
        defaultRate: stats?.default_rate || 0,
      },
      loans: loans,
      users: users,
      statusDistribution: analytics.statusDistribution,
      topBorrowers: analytics.topBorrowers,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  // Calculate analytics from real data
  const calculateAnalytics = () => {
    const activeLoans = loans.filter(l => l.status === 'ACTIVE');
    const completedLoans = loans.filter(l => l.status === 'SETTLED');
    const defaultedLoans = loans.filter(l => l.status === 'DEFAULTED');
    const pendingLoans = loans.filter(l => l.status === 'PENDING');

    // Total disbursed
    const totalDisbursed = loans.reduce((sum, l) => sum + (l.principal || 0), 0);

    // Outstanding amount
    const totalOutstanding = loans.reduce((sum, l) => sum + (l.current_outstanding || 0), 0);

    // Average loan size
    const avgLoanSize = loans.length > 0 ? totalDisbursed / loans.length : 0;

    // Loan status distribution
    const statusDistribution = [
      { label: 'Active', value: activeLoans.length, color: '#6D7464' },
      { label: 'Completed', value: completedLoans.length, color: '#C4A995' },
      { label: 'Pending', value: pendingLoans.length, color: '#CABAA1' },
      { label: 'Defaulted', value: defaultedLoans.length, color: '#3E3D39' },
    ];

    // Daily disbursement trend for last 7 days
    // Generate last 7 days dates
    const today = new Date();
    const last7Days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      last7Days.push(date);
    }

    // Create a map of daily amounts
    const dailyData: { [key: string]: number } = {};
    
    // Initialize all days with 0
    last7Days.forEach(date => {
      const dayKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyData[dayKey] = 0;
    });
    
    // Sum up loans by day
    loans.forEach(loan => {
      if (loan.created_at) {
        const loanDate = new Date(loan.created_at);
        const dayKey = loanDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dailyData[dayKey] !== undefined) {
          dailyData[dayKey] = (dailyData[dayKey] || 0) + loan.principal;
        }
      }
    });

    // Convert to array format for chart
    const dailyTrend = Object.entries(dailyData)
      .map(([day, amount]) => ({ day, amount }));

    // Top borrowers
    const borrowerAmounts: { [key: string]: number } = {};
    loans.forEach(loan => {
      borrowerAmounts[loan.borrower_name] = (borrowerAmounts[loan.borrower_name] || 0) + loan.principal;
    });
    const topBorrowers = Object.entries(borrowerAmounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    // User analytics
    const verifiedUsers = users.filter(u => u.is_verified).length;
    const unverifiedUsers = users.length - verifiedUsers;

    return {
      totalDisbursed,
      totalOutstanding,
      avgLoanSize,
      statusDistribution,
      dailyTrend,
      topBorrowers,
      verifiedUsers,
      unverifiedUsers,
      totalUsers: users.length,
      totalLoans: loans.length,
    };
  };

  const analytics = !loading ? calculateAnalytics() : null;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#3E3D39' }} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#050505' }}>
              Analytics & Reports
            </h1>
            <p className="text-sm mt-1" style={{ color: '#3E3D39' }}>
              Insights from your borrower and loan data
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
              style={{ backgroundColor: '#D5BFA4', color: '#050505', border: '1px solid #B4A58B' }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
              style={{ backgroundColor: '#3E3D39', color: '#D4C8B5' }}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              title: 'Total Disbursed', 
              value: `KSh ${((analytics?.totalDisbursed || 0) / 1000000).toFixed(2)}M`,
              subtitle: 'All time',
              icon: DollarSign,
              color: '#3E3D39'
            },
            { 
              title: 'Outstanding', 
              value: `KSh ${((analytics?.totalOutstanding || 0) / 1000000).toFixed(2)}M`,
              subtitle: 'Active loans',
              icon: TrendingUp,
              color: '#3E3D39'
            },
            { 
              title: 'Avg Loan Size', 
              value: `KSh ${(analytics?.avgLoanSize || 0).toLocaleString()}`,
              subtitle: 'Per borrower',
              icon: FileText,
              color: '#3E3D39'
            },
            { 
              title: 'Default Rate', 
              value: `${stats?.default_rate || 0}%`,
              subtitle: 'Portfolio health',
              icon: TrendingDown,
              color: stats?.default_rate && stats.default_rate > 5 ? '#3E3D39' : '#6D7464'
            },
          ].map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="rounded-2xl p-6"
              style={{ backgroundColor: '#D5BFA4', border: '1px solid #B4A58B' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#6D7464' }}>
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold mt-1" style={{ color: '#050505' }}>
                    {metric.value}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#6D7464' }}>
                    {metric.subtitle}
                  </p>
                </div>
                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: '#C4A995' }}
                >
                  <metric.icon className="w-6 h-6" style={{ color: metric.color }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Loan Status Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="rounded-2xl p-6"
            style={{ backgroundColor: '#D5BFA4', border: '1px solid #B4A58B' }}
          >
            <div className="flex items-center gap-2 mb-6">
              <PieChart className="w-5 h-5" style={{ color: '#3E3D39' }} />
              <h2 className="text-lg font-bold" style={{ color: '#050505' }}>
                Loan Status Distribution
              </h2>
            </div>
            <div className="space-y-4">
              {analytics?.statusDistribution.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm" style={{ color: '#050505' }}>
                        {item.label}
                      </span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: '#050505' }}>
                      {item.value}
                    </span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#C4A995' }}>
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${(item.value / (analytics?.totalLoans || 1)) * 100}%`,
                        backgroundColor: item.color 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Daily Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="rounded-2xl p-6"
            style={{ backgroundColor: '#D5BFA4', border: '1px solid #B4A58B' }}
          >
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5" style={{ color: '#3E3D39' }} />
              <h2 className="text-lg font-bold" style={{ color: '#050505' }}>
                Daily Disbursement (Last 7 Days)
              </h2>
            </div>
            <div className="flex items-end gap-3 h-48">
              {analytics?.dailyTrend.map((item, index) => {
                const maxAmount = Math.max(...(analytics?.dailyTrend.map(m => m.amount) || [1]));
                const height = (item.amount / maxAmount) * 100;
                return (
                  <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full rounded-t-xl transition-all hover:opacity-80 cursor-pointer"
                      style={{ 
                        height: `${height}%`,
                        backgroundColor: '#3E3D39',
                        minHeight: '8px'
                      }}
                      title={`KSh ${item.amount.toLocaleString()}`}
                    />
                    <span className="text-xs" style={{ color: '#6D7464' }}>
                      {item.day}
                    </span>
                  </div>
                );
              })}
              {(!analytics?.dailyTrend || analytics.dailyTrend.length === 0) && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm" style={{ color: '#6D7464' }}>
                    No data available
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Borrowers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="rounded-2xl p-6"
            style={{ backgroundColor: '#D5BFA4', border: '1px solid #B4A58B' }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5" style={{ color: '#3E3D39' }} />
              <h2 className="text-lg font-bold" style={{ color: '#050505' }}>
                Top Borrowers
              </h2>
            </div>
            <div className="space-y-3">
              {analytics?.topBorrowers.map((borrower, index) => (
                <div 
                  key={borrower.name}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: '#C4A995' }}
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: '#CABAA1', color: '#050505' }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#050505' }}>
                      {borrower.name}
                    </p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: '#050505' }}>
                    KSh {borrower.amount.toLocaleString()}
                  </p>
                </div>
              ))}
              {(!analytics?.topBorrowers || analytics.topBorrowers.length === 0) && (
                <p className="text-center py-4" style={{ color: '#6D7464' }}>
                  No borrower data available
                </p>
              )}
            </div>
          </motion.div>

          {/* User Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="rounded-2xl p-6"
            style={{ backgroundColor: '#D5BFA4', border: '1px solid #B4A58B' }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5" style={{ color: '#3E3D39' }} />
              <h2 className="text-lg font-bold" style={{ color: '#050505' }}>
                User Statistics
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#C4A995' }}>
                <p className="text-3xl font-bold" style={{ color: '#050505' }}>
                  {analytics?.totalUsers || 0}
                </p>
                <p className="text-sm" style={{ color: '#6D7464' }}>
                  Total Users
                </p>
              </div>
              <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#C4A995' }}>
                <p className="text-3xl font-bold" style={{ color: '#6D7464' }}>
                  {analytics?.verifiedUsers || 0}
                </p>
                <p className="text-sm" style={{ color: '#6D7464' }}>
                  Verified
                </p>
              </div>
              <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#C4A995' }}>
                <p className="text-3xl font-bold" style={{ color: '#CABAA1' }}>
                  {analytics?.unverifiedUsers || 0}
                </p>
                <p className="text-sm" style={{ color: '#6D7464' }}>
                  Unverified
                </p>
              </div>
              <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#C4A995' }}>
                <p className="text-3xl font-bold" style={{ color: '#050505' }}>
                  {analytics?.totalLoans || 0}
                </p>
                <p className="text-sm" style={{ color: '#6D7464' }}>
                  Total Loans
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
