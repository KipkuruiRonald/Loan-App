'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '@/components/AdminLayout';
import {   
  Search, 
  Filter, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  MoreVertical,
  Shield,
  Send,
  Download,
  RefreshCw,
  X
} from 'lucide-react';
import { adminApi } from '@/lib/api';

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

interface UserData {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  credit_tier: number;
  credit_score: number;
  current_limit: number;
  created_at: string;
  loan_count: number;
  total_borrowed: number;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        setFilteredUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users
  useEffect(() => {
    let filtered = users;

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      if (filterStatus === 'verified') {
        filtered = filtered.filter(user => user.is_verified);
      } else if (filterStatus === 'unverified') {
        filtered = filtered.filter(user => !user.is_verified);
      } else if (filterStatus === 'active') {
        filtered = filtered.filter(user => user.is_active);
      } else if (filterStatus === 'inactive') {
        filtered = filtered.filter(user => !user.is_active);
      }
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone?.includes(searchQuery)
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, filterRole, filterStatus, users]);

  // Handle verify user
  const handleVerify = async (userId: number) => {
    setProcessing(userId);
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`http://localhost:8000/api/admin/users/${userId}/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified: true } : u));
    } catch (err) {
      console.error('Failed to verify:', err);
    } finally {
      setProcessing(null);
    }
  };

  // Handle send message
  const handleSendMessage = async (userId: number) => {
    setProcessing(userId);
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`http://localhost:8000/api/admin/users/${userId}/message`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      alert('Message sent successfully!');
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message');
    } finally {
      setProcessing(null);
    }
  };

  // Handle export
  const handleExport = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Role', 'Verified', 'Active', 'Created'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(u => [
        u.id,
        `"${u.full_name}"`,
        u.email,
        u.phone || '',
        u.role,
        u.is_verified,
        u.is_active,
        u.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return '#3E3D39';
      case 'BORROWER': return '#C4A995';
      case 'LENDER': return '#6D7464';
      default: return '#6D7464';
    }
  };

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
              User Management
            </h1>
            <p className="text-sm mt-1" style={{ color: '#3E3D39' }}>
              Manage all registered users
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

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: 'Total Users', value: users.length, color: '#3E3D39' },
            { label: 'Verified', value: users.filter(u => u.is_verified).length, color: '#6D7464' },
            { label: 'Unverified', value: users.filter(u => !u.is_verified).length, color: '#CABAA1' },
            { label: 'Active', value: users.filter(u => u.is_active).length, color: '#3E3D39' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="rounded-xl p-4"
              style={{ backgroundColor: '#D5BFA4', border: '1px solid #B4A58B' }}
            >
              <p className="text-sm" style={{ color: '#6D7464' }}>{stat.label}</p>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div 
            className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ backgroundColor: '#D5BFA4', border: '1px solid #B4A58B' }}
          >
            <Search className="w-5 h-5" style={{ color: '#6D7464' }} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: '#050505' }}
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#D5BFA4', color: '#050505', border: '1px solid #B4A58B' }}
          >
            <option value="all">All Roles</option>
            <option value="BORROWER">Borrowers</option>
            <option value="LENDER">Lenders</option>
            <option value="ADMIN">Admins</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#D5BFA4', color: '#050505', border: '1px solid #B4A58B' }}
          >
            <option value="all">All Status</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Users Table */}
        <div 
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#D5BFA4', border: '1px solid #B4A58B' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#C4A995' }}>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>User</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>Contact</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>Role</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>Status</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>Joined</th>
                  <th className="text-right p-4 text-sm font-medium" style={{ color: '#050505' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center" style={{ color: '#6D7464' }}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-t"
                      style={{ borderColor: '#B4A58B' }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: getRoleBadgeColor(user.role) }}
                          >
                            <User className="w-5 h-5" style={{ color: '#D4C8B5' }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: '#050505' }}>
                              {user.full_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" style={{ color: '#6D7464' }} />
                            <a 
                              href={`mailto:${user.email}`}
                              className="text-sm hover:underline"
                              style={{ color: '#050505' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {user.email}
                            </a>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" style={{ color: '#6D7464' }} />
                              <a 
                                href={`tel:${user.phone}`}
                                className="text-sm hover:underline"
                                style={{ color: '#3E3D39' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {user.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span 
                          className="px-2 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: getRoleBadgeColor(user.role), color: '#D4C8B5' }}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {user.is_verified ? (
                            <CheckCircle className="w-4 h-4" style={{ color: '#6D7464' }} />
                          ) : (
                            <XCircle className="w-4 h-4" style={{ color: '#CABAA1' }} />
                          )}
                          <span className="text-sm" style={{ color: '#050505' }}>
                            {user.is_verified ? 'Verified' : 'Unverified'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm" style={{ color: '#6D7464' }}>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSendMessage(user.id)}
                            disabled={processing === user.id}
                            className="p-2 rounded-lg transition-colors hover:opacity-80"
                            style={{ backgroundColor: '#CABAA1', color: '#050505' }}
                            title="Send Message"
                          >
                            {processing === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                          {!user.is_verified && (
                            <button
                              onClick={() => handleVerify(user.id)}
                              disabled={processing === user.id}
                              className="p-2 rounded-lg transition-colors hover:opacity-80"
                              style={{ backgroundColor: '#6D7464', color: '#D4C8B5' }}
                              title="Verify User"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-2 rounded-lg transition-colors hover:opacity-80"
                            style={{ backgroundColor: '#CABAA1', color: '#050505' }}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Detail Modal */}
        <AnimatePresence>
          {selectedUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setSelectedUser(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl overflow-hidden"
                style={{ backgroundColor: '#D5BFA4' }}
              >
                <div className="p-6" style={{ borderBottom: '1px solid #B4A58B' }}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold" style={{ color: '#050505' }}>
                      User Details
                    </h2>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: '#C4A995' }}
                    >
                      <XCircle className="w-5 h-5" style={{ color: '#6D7464' }} />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: getRoleBadgeColor(selectedUser.role) }}
                    >
                      <User className="w-8 h-8" style={{ color: '#D4C8B5' }} />
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: '#050505' }}>
                        {selectedUser.full_name}
                      </p>
                      <span 
                        className="px-2 py-1 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: getRoleBadgeColor(selectedUser.role), color: '#D4C8B5' }}
                      >
                        {selectedUser.role}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <p className="text-xs" style={{ color: '#6D7464' }}>Email</p>
                      <p className="text-sm font-medium" style={{ color: '#050505' }}>{selectedUser.email}</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <p className="text-xs" style={{ color: '#6D7464' }}>Phone</p>
                      <p className="text-sm font-medium" style={{ color: '#050505' }}>{selectedUser.phone || 'Not provided'}</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <p className="text-xs" style={{ color: '#6D7464' }}>Member Since</p>
                      <p className="text-sm font-medium" style={{ color: '#050505' }}>
                        {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 p-3 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                        <p className="text-xs" style={{ color: '#6D7464' }}>Verification</p>
                        <p className="text-sm font-medium" style={{ color: selectedUser.is_verified ? '#6D7464' : '#CABAA1' }}>
                          {selectedUser.is_verified ? 'Verified' : 'Unverified'}
                        </p>
                      </div>
                      <div className="flex-1 p-3 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                        <p className="text-xs" style={{ color: '#6D7464' }}>Status</p>
                        <p className="text-sm font-medium" style={{ color: '#050505' }}>
                          {selectedUser.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 flex gap-3">
                  <button
                    onClick={() => handleSendMessage(selectedUser.id)}
                    className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#C4A995', color: '#050505' }}
                  >
                    Send Message
                  </button>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#3E3D39', color: '#D4C8B5' }}
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
