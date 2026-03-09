'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '@/components/AdminLayout';
import {   
  Search, 
  Filter, 
  Clock, 
  User, 
  FileText,
  Loader2,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  DollarSign,
  Shield,
  Settings,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Activity,
  Users,
  Building
} from 'lucide-react';

interface AuditLog {
  id: number;
  loan_id: number | null;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  details?: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const logsPerPage = 15;

  // Fetch audit logs from API
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch('http://localhost:8000/api/admin/audit-logs?limit=200', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          
          if (data.items && Array.isArray(data.items)) {
            setLogs(data.items);
            setFilteredLogs(data.items);
          } else if (Array.isArray(data)) {
            setLogs(data);
            setFilteredLogs(data);
          } else if (data && typeof data === 'object') {
            setLogs([data]);
            setFilteredLogs([data]);
          } else {
            setLogs([]);
            setFilteredLogs([]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
        setLogs([]);
        setFilteredLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  // Get unique actions and entities for filters
  const uniqueActions = useMemo(() => [...new Set(logs.map(log => log.action))], [logs]);
  const uniqueEntities = useMemo(() => [...new Set(logs.map(log => log.entity_type).filter(Boolean))], [logs]);

  // Filter logs
  useEffect(() => {
    let filtered = logs;

    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action === filterAction);
    }

    if (filterEntity !== 'all') {
      filtered = filtered.filter(log => log.entity_type === filterEntity);
    }

    if (quickFilter) {
      filtered = filtered.filter(log => log.action.includes(quickFilter));
    }

    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.old_value?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log.new_value?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [searchQuery, filterAction, filterEntity, quickFilter, logs]);

  // Paginate
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  // Export to CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const headers = ['ID', 'Timestamp', 'Action', 'Entity Type', 'Entity ID', 'User ID', 'Details', 'IP Address'];
      const csvContent = [
        headers.join(','),
        ...filteredLogs.map(log => [
          log.id,
          log.created_at,
          log.action,
          log.entity_type,
          log.entity_id ?? '',
          log.user_id ?? '',
          `"${(log.old_value || log.new_value || log.details || '').replace(/"/g, '""')}"`,
          log.ip_address ?? ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export:', err);
    } finally {
      setExporting(false);
    }
  };

  // Get action category color
  const getActionCategory = (action: string) => {
    if (action.includes('APPROVE') || action.includes('VERIFY') || action.includes('LOAN_APPROVED')) {
      return { color: '#22C55E', bg: '#DCFCE7', label: 'Approved', icon: CheckCircle };
    }
    if (action.includes('REJECT') || action.includes('DEFAULT') || action.includes('LOAN_REJECTED')) {
      return { color: '#EF4444', bg: '#FEE2E2', label: 'Rejected', icon: XCircle };
    }
    if (action.includes('CREATE') || action.includes('LOAN_CREATED') || action.includes('REGISTER')) {
      return { color: '#3B82F6', bg: '#DBEAFE', label: 'Created', icon: Plus };
    }
    if (action.includes('UPDATE') || action.includes('MODIFY') || action.includes('EDIT')) {
      return { color: '#F59E0B', bg: '#FEF3C7', label: 'Updated', icon: RefreshCw };
    }
    if (action.includes('LOGIN') || action.includes('LOGOUT')) {
      return { color: '#8B5CF6', bg: '#EDE9FE', label: 'Auth', icon: Shield };
    }
    if (action.includes('PAYMENT') || action.includes('REPAYMENT') || action.includes('DISBURSE')) {
      return { color: '#06B6D4', bg: '#CFFAFE', label: 'Payment', icon: DollarSign };
    }
    return { color: '#6B7280', bg: '#F3F4F6', label: 'Other', icon: Activity };
  };

  // Get entity icon
  const getEntityIcon = (entityType: string) => {
    if (!entityType) return FileText;
    const type = entityType.toLowerCase();
    if (type.includes('loan')) return FileText;
    if (type.includes('user')) return Users;
    if (type.includes('transaction')) return DollarSign;
    if (type.includes('setting')) return Settings;
    if (type.includes('kyc') || type.includes('verification')) return Shield;
    return FileText;
  };

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Parse details for cleaner display
  const parseDetails = (log: AuditLog) => {
    if (log.old_value && log.new_value) {
      return { type: 'change', from: log.old_value, to: log.new_value };
    }
    if (log.new_value) {
      return { type: 'set', value: log.new_value };
    }
    if (log.details) {
      return { type: 'text', value: log.details };
    }
    return null;
  };

  // Stats calculations
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = logs.filter(l => new Date(l.created_at) >= today);
    
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);
    const weekLogs = logs.filter(l => new Date(l.created_at) >= thisWeek);
    
    const uniqueUsers = new Set(logs.filter(l => l.user_id).map(l => l.user_id)).size;
    
    const actionCounts: Record<string, number> = {};
    logs.forEach(l => {
      actionCounts[l.action] = (actionCounts[l.action] || 0) + 1;
    });
    const topAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      total: logs.length,
      today: todayLogs.length,
      week: weekLogs.length,
      uniqueUsers,
      topAction: topAction ? topAction[0].replace(/_/g, ' ') : 'N/A'
    };
  }, [logs]);

  // Quick filter chips
  const quickFilters = [
    { id: 'APPROVE', label: 'Approvals' },
    { id: 'REJECT', label: 'Rejections' },
    { id: 'CREATE', label: 'Creations' },
    { id: 'UPDATE', label: 'Updates' },
    { id: 'PAYMENT', label: 'Payments' },
  ];

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#050505' }}>
              Audit Logs
            </h1>
            <p className="text-sm mt-1" style={{ color: '#3E3D39' }}>
              Track all system activities and changes
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: '#3E3D39', color: '#D4C8B5' }}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export CSV
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Events', value: stats.total, icon: Activity, color: '#3E3D39' },
            { label: 'Today', value: stats.today, icon: Calendar, color: '#6D7464' },
            { label: 'Unique Users', value: stats.uniqueUsers, icon: Users, color: '#3E3D39' },
            { label: 'Top Action', value: stats.topAction, icon: AlertTriangle, color: '#CABAA1' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="rounded-xl p-4"
              style={{ backgroundColor: '#D5BFA4', border: '1px solid #B4A58B' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: '#6D7464' }}>{stat.label}</p>
                  <p className="text-lg font-bold truncate" style={{ color: '#050505' }}>{stat.value}</p>
                </div>
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#C4A995' }}>
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 flex-wrap">
          {quickFilters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setQuickFilter(quickFilter === filter.id ? null : filter.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                quickFilter === filter.id ? 'ring-2 ring-offset-1' : ''
              }`}
              style={{
                backgroundColor: quickFilter === filter.id ? '#3E3D39' : '#D5BFA4',
                color: quickFilter === filter.id ? '#D4C8B5' : '#050505',
              }}
            >
              {filter.label}
            </button>
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
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: '#050505' }}
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#D5BFA4', color: '#050505', border: '1px solid #B4A58B', minWidth: '150px' }}
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="px-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#D5BFA4', color: '#050505', border: '1px solid #B4A58B', minWidth: '150px' }}
          >
            <option value="all">All Entities</option>
            {uniqueEntities.map(entity => (
              <option key={entity} value={entity}>{entity}</option>
            ))}
          </select>
        </div>

        {/* Logs Table */}
        <div 
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#D5BFA4', border: '1px solid #B4A58B' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#C4A995' }}>
                  <th className="text-left p-3 text-sm font-medium w-32" style={{ color: '#050505' }}>Time</th>
                  <th className="text-left p-3 text-sm font-medium w-28" style={{ color: '#050505' }}>Action</th>
                  <th className="text-left p-3 text-sm font-medium w-28" style={{ color: '#050505' }}>Entity</th>
                  <th className="text-left p-3 text-sm font-medium" style={{ color: '#050505' }}>Details</th>
                  <th className="text-left p-3 text-sm font-medium w-24" style={{ color: '#050505' }}>User</th>
                  <th className="text-center p-3 text-sm font-medium w-12" style={{ color: '#050505' }}></th>
                </tr>
              </thead>
              <tbody>
                {currentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center" style={{ color: '#6D7464' }}>
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log, index) => {
                    const category = getActionCategory(log.action);
                    const EntityIcon = getEntityIcon(log.entity_type);
                    const details = parseDetails(log);
                    const isExpanded = expandedRow === log.id;

                    return (
                      <>
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className={`border-t cursor-pointer transition-colors ${
                            index % 2 === 0 ? '' : 'bg-black/5'
                          }`}
                          style={{ borderColor: '#B4A58B' }}
                          onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6D7464' }} />
                              <div>
                                <p className="text-sm" style={{ color: '#050505' }}>
                                  {formatTimeAgo(log.created_at)}
                                </p>
                                <p className="text-xs" style={{ color: '#6D7464' }}>
                                  {new Date(log.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                              style={{ backgroundColor: category.bg, color: category.color }}
                            >
                              <category.icon className="w-3 h-3" />
                              {category.label}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <EntityIcon className="w-4 h-4" style={{ color: '#6D7464' }} />
                              <span className="text-sm" style={{ color: '#050505' }}>
                                {log.entity_type || 'System'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            {details ? (
                              details.type === 'change' ? (
                                <div className="text-sm">
                                  <span style={{ color: '#EF4444' }}>{String(details.from)?.substring(0, 20)}</span>
                                  <span style={{ color: '#6D7464' }}> → </span>
                                  <span style={{ color: '#22C55E' }}>{String(details.to)?.substring(0, 20)}</span>
                                </div>
                              ) : (
                                <p className="text-sm truncate max-w-xs" style={{ color: '#3E3D39' }} title={String(details.value)}>
                                  {String(details.value)?.substring(0, 40)}
                                </p>
                              )
                            ) : (
                              <p className="text-sm" style={{ color: '#6D7464' }}>-</p>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: log.user_id ? '#CABAA1' : '#6B7280' }}
                              >
                                <User className="w-3 h-3" style={{ color: '#FFF' }} />
                              </div>
                              <span className="text-sm truncate max-w-20" style={{ color: '#050505' }}>
                                {log.user_id ? `User #${log.user_id}` : 'System'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 mx-auto" style={{ color: '#6D7464' }} />
                            ) : (
                              <ChevronDown className="w-4 h-4 mx-auto" style={{ color: '#6D7464' }} />
                            )}
                          </td>
                        </motion.tr>
                        
                        {/* Expanded Row Details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              <td colSpan={6} className="p-4 bg-black/10">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-xs font-medium mb-1" style={{ color: '#6D7464' }}>Change Details</p>
                                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#C4A995' }}>
                                      <pre className="text-xs whitespace-pre-wrap" style={{ color: '#050505' }}>
                                        {details?.type === 'change' 
                                          ? `From: ${details.from}\nTo: ${details.to}`
                                          : details?.value || 'No details'
                                        }
                                      </pre>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium mb-1" style={{ color: '#6D7464' }}>Metadata</p>
                                    <div className="p-3 rounded-lg space-y-1" style={{ backgroundColor: '#C4A995' }}>
                                      <p className="text-xs" style={{ color: '#050505' }}><strong>ID:</strong> {log.id}</p>
                                      <p className="text-xs" style={{ color: '#050505' }}><strong>Entity ID:</strong> {log.entity_id || 'N/A'}</p>
                                      <p className="text-xs" style={{ color: '#050505' }}><strong>Loan ID:</strong> {log.loan_id || 'N/A'}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium mb-1" style={{ color: '#6D7464' }}>Location</p>
                                    <div className="p-3 rounded-lg space-y-1" style={{ backgroundColor: '#C4A995' }}>
                                      <p className="text-xs" style={{ color: '#050505' }}><strong>IP:</strong> {log.ip_address || 'N/A'}</p>
                                      <p className="text-xs truncate" style={{ color: '#050505' }} title={log.user_agent || 'N/A'}>
                                        <strong>Agent:</strong> {log.user_agent ? 'Known' : 'N/A'}
                                      </p>
                                      <p className="text-xs" style={{ color: '#050505' }}><strong>Full Date:</strong> {new Date(log.created_at).toLocaleString()}</p>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div 
              className="flex items-center justify-between p-4"
              style={{ borderTop: '1px solid #B4A58B' }}
            >
              <p className="text-sm" style={{ color: '#6D7464' }}>
                Showing {indexOfFirstLog + 1}-{Math.min(indexOfLastLog, filteredLogs.length)} of {filteredLogs.length}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: '#C4A995', color: '#050505' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 rounded-lg text-xs font-medium"
                      style={{ 
                        backgroundColor: currentPage === pageNum ? '#3E3D39' : '#C4A995',
                        color: currentPage === pageNum ? '#D4C8B5' : '#050505'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: '#C4A995', color: '#050505' }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
