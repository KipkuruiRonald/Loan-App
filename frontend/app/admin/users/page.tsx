'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/context/AuthContext';
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
  X,
  Pencil,
  Trash2,
  Save,
  AlertTriangle
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
  kyc_status?: string;
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterKyc, setFilterKyc] = useState<string>('all');
  // View Details modal state (eye button)
  const [viewUser, setViewUser] = useState<UserData | null>(null);
  // KYC Review modal state (shield button)
  const [kycUser, setKycUser] = useState<UserData | null>(null);
  // Derived states
  const showViewModal = viewUser !== null;
  const showKycModal = kycUser !== null;
  // Alias for backward compatibility - kycUser takes precedence when both are set
  const selectedUser = kycUser || viewUser;
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<number | null>(null);

  // Edit user state
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: '',
    is_active: true
  });

  // Delete confirmation state
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteWarnings, setDeleteWarnings] = useState<any>(null);
  const [checkingDelete, setCheckingDelete] = useState(false);

  // Message modal state
  const [messageModalUser, setMessageModalUser] = useState<UserData | null>(null);
  const [messageText, setMessageText] = useState('');

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

    // Filter by KYC status
    if (filterKyc !== 'all') {
      filtered = filtered.filter(user => user.kyc_status === filterKyc);
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
  }, [searchQuery, filterRole, filterStatus, filterKyc, users]);

  // Handle send message
  const handleSendMessage = async (userId: number) => {
    if (!messageText.trim()) {
      alert('Please enter a message');
      return;
    }
    setProcessing(userId);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/admin/users/${userId}/message`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: messageText })
      });
      
      if (res.ok) {
        alert('Message sent successfully!');
        setMessageText('');
        setMessageModalUser(null);
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to send message');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message');
    } finally {
      setProcessing(null);
    }
  };

  // Handle KYC verify
  const handleKycVerify = async (userId: number) => {
    setProcessing(userId);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/admin/kyc/verify/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, kyc_status: 'VERIFIED' } : u));
        setKycUser(null);
        alert('KYC verified successfully!');
      }
    } catch (err) {
      console.error('Failed to verify KYC:', err);
      alert('Failed to verify KYC');
    } finally {
      setProcessing(null);
    }
  };

  // Handle KYC reject
  const handleKycReject = async () => {
    if (!kycUser || !rejectReason.trim()) return;
    setProcessing(kycUser.id);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/admin/kyc/reject/${kycUser.id}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === kycUser.id ? { ...u, kyc_status: 'REJECTED' } : u));
        setShowRejectModal(false);
        setKycUser(null);
        setRejectReason('');
        alert('KYC rejected!');
      }
    } catch (err) {
      console.error('Failed to reject KYC:', err);
      alert('Failed to reject KYC');
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

  // Handle edit user - open modal with user data
  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setEditFormData({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      is_active: user.is_active
    });
  };

  // Handle edit form input change
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingUser) return;
    
    setProcessing(editingUser.id);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updatedUser } : u));
        setEditingUser(null);
        alert('User updated successfully!');
      } else {
        const error = await res.json();
        alert(`Failed to update user: ${error.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to update user:', err);
      alert('Failed to update user');
    } finally {
      setProcessing(null);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    
    setProcessing(deletingUser.id);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
        setShowDeleteConfirm(false);
        setDeletingUser(null);
        alert('User deleted successfully!');
      } else {
        const error = await res.json();
        alert(`Failed to delete user: ${error.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Failed to delete user');
    } finally {
      setProcessing(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return '#3E3D39';
      case 'BORROWER': return '#C4A995';
      default: return '#6D7464';
    }
  };

  const getKycBadgeColor = (kycStatus?: string) => {
    switch (kycStatus) {
      case 'VERIFIED': return '#22C55E';
      case 'SUBMITTED': return '#EAB308';
      case 'REJECTED': return '#EF4444';
      case 'PENDING': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getKycLabel = (kycStatus?: string) => {
    switch (kycStatus) {
      case 'VERIFIED': return 'Verified';
      case 'SUBMITTED': return 'Pending Review';  // Distinct from Status
      case 'REJECTED': return 'Rejected';
      case 'PENDING': return 'Not Started';
      default: return 'Not Started';
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
          <select
            value={filterKyc}
            onChange={(e) => setFilterKyc(e.target.value)}
            className="px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#D5BFA4', color: '#050505', border: '1px solid #B4A58B' }}
          >
            <option value="all">All KYC</option>
            <option value="SUBMITTED">Pending Review</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="PENDING">Not Started</option>
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
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>KYC</th>
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
                        <span 
                          className="px-2 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: getKycBadgeColor(user.kyc_status), color: '#FFFFFF' }}
                        >
                          {getKycLabel(user.kyc_status)}
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
                            {user.is_active ? (user.is_verified ? 'Email Verified' : 'Email Unverified') : 'Inactive'}
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
                          {/* Send Message Button - Hidden for current admin */}
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => {
                                setMessageText('');
                                setMessageModalUser(user);
                              }}
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
                          )}
                          <button
                            onClick={() => setViewUser(user)}
                            className="p-2 rounded-lg transition-colors hover:opacity-80"
                            style={{ backgroundColor: '#CABAA1', color: '#050505' }}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Edit User Button - Hidden for current admin */}
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleEditUser(user)}
                              disabled={processing === user.id}
                              className="p-2 rounded-lg transition-colors hover:opacity-80"
                              style={{ backgroundColor: '#6D7464', color: '#D4C8B5' }}
                              title="Edit User"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {/* Delete User Button - Hidden for current admin */}
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={async () => {
                                setCheckingDelete(true);
                                try {
                                  const token = localStorage.getItem('access_token');
                                  const res = await fetch(`http://localhost:8000/api/admin/users/${user.id}/delete-check`, {
                                    headers: { 'Authorization': `Bearer ${token}` },
                                  });
                                  const data = await res.json();
                                  setDeleteWarnings(data);
                                  setDeletingUser(user);
                                  setShowDeleteConfirm(true);
                                } catch (err) {
                                  console.error('Failed to check:', err);
                                  setDeletingUser(user);
                                  setShowDeleteConfirm(true);
                                } finally {
                                  setCheckingDelete(false);
                                }
                              }}
                              disabled={processing === user.id || checkingDelete}
                              className="p-2 rounded-lg transition-colors hover:opacity-80"
                              style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
                              title="Delete User"
                            >
                              {checkingDelete ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {user.kyc_status === 'SUBMITTED' && user.id !== currentUser?.id && (
                            <button
                              onClick={() => setKycUser(user)}
                              disabled={processing === user.id}
                              className="p-2 rounded-lg transition-colors hover:opacity-80"
                              style={{ backgroundColor: '#EAB308', color: '#050505' }}
                              title="Review KYC"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
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
          {viewUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setViewUser(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl rounded-2xl overflow-hidden"
                style={{ backgroundColor: '#D5BFA4' }}
              >
                <div className="p-6" style={{ borderBottom: '1px solid #B4A58B' }}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold" style={{ color: '#050505' }}>
                      User Details
                    </h2>
                    <button
                      onClick={() => setViewUser(null)}
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: '#C4A995' }}
                    >
                      <XCircle className="w-5 h-5" style={{ color: '#6D7464' }} />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* User Header with Avatar */}
                  <div className="flex items-center gap-6 p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                    <div 
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: getRoleBadgeColor(viewUser.role) }}
                    >
                      <User className="w-10 h-10" style={{ color: '#D4C8B5' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-xl font-bold" style={{ color: '#050505' }}>
                          {viewUser.full_name}
                        </p>
                        <span 
                          className="px-3 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: getRoleBadgeColor(viewUser.role), color: '#D4C8B5' }}
                        >
                          {viewUser.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm" style={{ color: '#6D7464' }}>
                        <span>ID: {viewUser.id}</span>
                        <span>•</span>
                        <span>Member since: {viewUser.created_at ? new Date(viewUser.created_at).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4" style={{ color: '#3E3D39' }} />
                        <span className="text-xs font-medium" style={{ color: '#6D7464' }}>Email</span>
                      </div>
                      <p className="text-sm font-medium break-all" style={{ color: '#050505' }}>{viewUser.email}</p>
                      <p className="text-xs mt-1" style={{ color: viewUser.is_verified ? '#22C55E' : '#EF4444' }}>
                        {viewUser.is_verified ? '✓ Verified' : '✗ Not Verified'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="w-4 h-4" style={{ color: '#3E3D39' }} />
                        <span className="text-xs font-medium" style={{ color: '#6D7464' }}>Phone</span>
                      </div>
                      <p className="text-sm font-medium" style={{ color: '#050505' }}>
                        {viewUser.phone || 'Not provided'}
                      </p>
                      <p className="text-xs mt-1" style={{ color: viewUser.phone ? '#22C55E' : '#6D7464' }}>
                        {viewUser.phone ? 'Registered' : 'No phone number'}
                      </p>
                    </div>
                  </div>

                  {/* Account Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4" style={{ color: '#3E3D39' }} />
                        <span className="text-xs font-medium" style={{ color: '#6D7464' }}>Account Status</span>
                      </div>
                      <p className="text-sm font-medium" style={{ color: viewUser.is_active ? '#22C55E' : '#EF4444' }}>
                        {viewUser.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4" style={{ color: '#3E3D39' }} />
                        <span className="text-xs font-medium" style={{ color: '#6D7464' }}>KYC Status</span>
                      </div>
                      <span 
                        className="px-2 py-1 rounded-lg text-xs font-medium inline-block"
                        style={{ backgroundColor: getKycBadgeColor(viewUser.kyc_status), color: '#FFFFFF' }}
                      >
                        {getKycLabel(viewUser.kyc_status)}
                      </span>
                    </div>
                  </div>

                  {/* Credit Information */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <p className="text-xs" style={{ color: '#6D7464' }}>Credit Tier</p>
                      <p className="text-lg font-bold" style={{ color: '#050505' }}>{viewUser.credit_tier}</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <p className="text-xs" style={{ color: '#6D7464' }}>Credit Score</p>
                      <p className="text-lg font-bold" style={{ color: '#050505' }}>{viewUser.credit_score}</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <p className="text-xs" style={{ color: '#6D7464' }}>Current Limit</p>
                      <p className="text-lg font-bold" style={{ color: '#050505' }}>KSh {viewUser.current_limit?.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Loan Statistics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <p className="text-xs" style={{ color: '#6D7464' }}>Total Loans</p>
                      <p className="text-xl font-bold" style={{ color: '#050505' }}>{viewUser.loan_count || 0}</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <p className="text-xs" style={{ color: '#6D7464' }}>Total Borrowed</p>
                      <p className="text-xl font-bold" style={{ color: '#050505' }}>KSh {(viewUser.total_borrowed || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 flex gap-3">
                  {/* Only show Send Message button if not current admin */}
                  {viewUser.id !== currentUser?.id && (
                    <button
                      onClick={() => {
                        setMessageModalUser(viewUser);
                        setViewUser(null);
                      }}
                      className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80 flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#C4A995', color: '#050505' }}
                    >
                      <Send className="w-5 h-5" />
                      Send Message
                    </button>
                  )}
                  <button
                    onClick={() => setViewUser(null)}
                    className={`${viewUser.id !== currentUser?.id ? 'flex-1' : 'w-full'} py-3 rounded-xl font-medium transition-colors hover:opacity-80`}
                    style={{ backgroundColor: '#3E3D39', color: '#D4C8B5' }}
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Send Message Modal */}
        <AnimatePresence>
          {messageModalUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setMessageModalUser(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
                style={{ backgroundColor: '#D5BFA4' }}
              >
                <div className="p-6" style={{ borderBottom: '1px solid #B4A58B' }}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold" style={{ color: '#050505' }}>
                      Send SMS Message
                    </h2>
                    <button
                      onClick={() => setMessageModalUser(null)}
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: '#C4A995' }}
                    >
                      <XCircle className="w-5 h-5" style={{ color: '#6D7464' }} />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div 
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: '#C4A995' }}
                  >
                    <p className="text-sm" style={{ color: '#6D7464' }}>To:</p>
                    <p className="font-medium" style={{ color: '#050505' }}>
                      {messageModalUser.full_name}
                    </p>
                    <p className="text-sm" style={{ color: '#6D7464' }}>
                      {messageModalUser.phone || 'No phone number'}
                    </p>
                  </div>

                  <div>
                    <label 
                      className="block text-sm font-medium mb-2" 
                      style={{ color: '#050505' }}
                    >
                      Message
                    </label>
                    <textarea
                      value={messageText}
                      onChange={(e) => {
                        const text = e.target.value;
                        if (text.length <= 160) {
                          setMessageText(text);
                        }
                      }}
                      placeholder="Enter your message (max 160 characters)..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl outline-none resize-none"
                      style={{ 
                        backgroundColor: '#C4A995',
                        color: '#050505',
                        border: messageText.length >= 160 ? '1px solid #EF4444' : '1px solid #B4A58B'
                      }}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p 
                        className="text-xs" 
                        style={{ color: messageText.length >= 150 ? '#EF4444' : '#6D7464' }}
                      >
                        {messageText.length}/160 characters
                      </p>
                      {messageText.length >= 160 && (
                        <p className="text-xs font-medium" style={{ color: '#EF4444' }}>
                          Maximum length reached
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 flex gap-3">
                  <button
                    onClick={() => handleSendMessage(messageModalUser.id)}
                    disabled={processing === messageModalUser.id || !messageText.trim() || messageText.length > 160}
                    className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: '#3E3D39', color: '#D4C8B5' }}
                  >
                    {processing === messageModalUser.id ? 'Sending...' : 'Send SMS'}
                  </button>
                  <button
                    onClick={() => setMessageModalUser(null)}
                    className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#C4A995', color: '#050505' }}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KYC Review Modal */}
        <AnimatePresence>
          {showKycModal && kycUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setKycUser(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-2xl shadow-xl overflow-hidden"
                style={{ backgroundColor: '#D5BFA4' }}
              >
                <div className="p-6" style={{ borderBottom: '1px solid #B4A58B' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: '#050505' }}>
                        KYC Review
                      </h2>
                      <p className="text-sm mt-1" style={{ color: '#6D7464' }}>
                        Review user details before verification
                      </p>
                    </div>
                    <button
                      onClick={() => setKycUser(null)}
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: '#C4A995' }}
                    >
                      <X className="w-5 h-5" style={{ color: '#6D7464' }} />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#CABAA1' }}
                      >
                        <User className="w-6 h-6" style={{ color: '#050505' }} />
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: '#050505' }}>
                          {kycUser.full_name}
                        </p>
                        <p className="text-sm" style={{ color: '#6D7464' }}>
                          {kycUser.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <p className="text-xs" style={{ color: '#6D7464' }}>Phone</p>
                      <p className="text-sm font-medium" style={{ color: '#050505' }}>{kycUser.phone || 'Not provided'}</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <p className="text-xs" style={{ color: '#6D7464' }}>KYC Status</p>
                      <p className="text-sm font-medium" style={{ color: '#EAB308' }}>{kycUser.kyc_status}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 flex gap-3">
                  <button
                    onClick={() => handleKycVerify(kycUser.id)}
                    disabled={processing === kycUser.id}
                    className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#22C55E', color: '#FFFFFF' }}
                  >
                    {processing === kycUser.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                    Verify
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                  <button
                    onClick={() => setKycUser(null)}
                    className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#3E3D39', color: '#D4C8B5' }}
                  >
                    Cancel
                  </button>
                </div>

                {/* Admin Info Footer */}
                <div className="px-6 pb-6 pt-4 border-t" style={{ borderColor: '#B4A58B' }}>
                  <p className="text-xs text-center" style={{ color: '#6D7464' }}>
                    Reviewing as {currentUser?.full_name || 'Admin'} ({currentUser?.phone || 'N/A'})
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rejection Reason Modal */}
        <AnimatePresence>
          {showRejectModal && kycUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setShowRejectModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
                style={{ backgroundColor: '#D5BFA4' }}
              >
                <div className="p-6" style={{ borderBottom: '1px solid #B4A58B' }}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold" style={{ color: '#050505' }}>
                      Reject KYC Verification
                    </h2>
                    <button
                      onClick={() => setShowRejectModal(false)}
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: '#C4A995' }}
                    >
                      <X className="w-5 h-5" style={{ color: '#6D7464' }} />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-sm" style={{ color: '#6D7464' }}>
                    Please provide a reason for rejecting {kycUser.full_name}&apos;s KYC verification. This will be shown to the user.
                  </p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={4}
                    placeholder="Enter rejection reason..."
                    className="w-full rounded-xl px-4 py-3 text-nearblack outline-none border"
                    style={{ backgroundColor: '#C4A995', borderColor: '#B4A58B' }}
                  />
                </div>

                <div className="p-6 pt-0 flex gap-3">
                  <button
                    onClick={handleKycReject}
                    disabled={!rejectReason.trim() || processing === kycUser.id}
                    className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
                  >
                    {processing === kycUser.id ? 'Rejecting...' : 'Submit Rejection'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#3E3D39', color: '#D4C8B5' }}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit User Modal */}
        <AnimatePresence>
          {editingUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setEditingUser(null)}
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
                      Edit User
                    </h2>
                    <button
                      onClick={() => setEditingUser(null)}
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: '#C4A995' }}
                    >
                      <X className="w-5 h-5" style={{ color: '#6D7464' }} />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm mb-1" style={{ color: '#6D7464' }}>Full Name</label>
                    <input
                      type="text"
                      name="full_name"
                      value={editFormData.full_name}
                      onChange={handleEditInputChange}
                      className="w-full px-4 py-3 rounded-xl border outline-none"
                      style={{ backgroundColor: '#C4A995', borderColor: '#B4A58B', color: '#050505' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1" style={{ color: '#6D7464' }}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditInputChange}
                      className="w-full px-4 py-3 rounded-xl border outline-none"
                      style={{ backgroundColor: '#C4A995', borderColor: '#B4A58B', color: '#050505' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1" style={{ color: '#6D7464' }}>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editFormData.phone}
                      onChange={handleEditInputChange}
                      className="w-full px-4 py-3 rounded-xl border outline-none"
                      style={{ backgroundColor: '#C4A995', borderColor: '#B4A58B', color: '#050505' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1" style={{ color: '#6D7464' }}>Role</label>
                    <select
                      name="role"
                      value={editFormData.role}
                      onChange={handleEditInputChange}
                      className="w-full px-4 py-3 rounded-xl border outline-none"
                      style={{ backgroundColor: '#C4A995', borderColor: '#B4A58B', color: '#050505' }}
                    >
                      <option value="BORROWER">Borrower</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_active"
                      id="is_active"
                      checked={editFormData.is_active}
                      onChange={handleEditInputChange}
                      className="w-4 h-4"
                    />
                    <label htmlFor="is_active" className="text-sm" style={{ color: '#6D7464' }}>
                      Active Account
                    </label>
                  </div>
                </div>

                <div className="p-6 pt-0 flex gap-3">
                  <button
                    onClick={handleSaveEdit}
                    disabled={processing === editingUser.id}
                    className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#6D7464', color: '#D4C8B5' }}
                  >
                    {processing === editingUser.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#C4A995', color: '#050505' }}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && deletingUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeletingUser(null);
                setDeleteWarnings(null);
              }}
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
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-red-100">
                      <AlertTriangle className="w-6 h-6" style={{ color: '#EF4444' }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: '#050505' }}>
                        Delete User
                      </h2>
                      <p className="text-sm" style={{ color: '#6D7464' }}>
                        This action cannot be undone
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning messages from delete check */}
                {deleteWarnings && deleteWarnings.warnings && deleteWarnings.warnings.length > 0 && (
                  <div className="p-6 pb-0">
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#FEE2E2', border: '1px solid #EF4444' }}>
                      <ul className="space-y-1">
                        {deleteWarnings.warnings.map((warning: string, index: number) => (
                          <li key={index} className="text-sm" style={{ color: '#991B1B' }}>
                            ⚠️ {warning}
                          </li>
                        ))}
                      </ul>
                      {!deleteWarnings.can_delete && (
                        <p className="text-sm mt-2 font-bold" style={{ color: '#DC2626' }}>
                          Cannot delete - resolve issues first
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-6">
                  <p className="mb-2" style={{ color: '#050505' }}>
                    Are you sure you want to delete <strong>{deletingUser.full_name}</strong>?
                  </p>
                  <p className="text-sm" style={{ color: '#6D7464' }}>
                    Email: {deletingUser.email}<br />
                    Phone: {deletingUser.phone || 'N/A'}<br />
                    Role: {deletingUser.role}
                  </p>
                </div>

                <div className="p-6 pt-0 flex gap-3">
                  <button
                    onClick={handleDeleteUser}
                    disabled={processing === deletingUser.id || (deleteWarnings && !deleteWarnings.can_delete)}
                    className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80 flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
                  >
                    {processing === deletingUser.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletingUser(null);
                      setDeleteWarnings(null);
                    }}
                    className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#3E3D39', color: '#D4C8B5' }}
                  >
                    Cancel
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
