'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  XCircle
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
}

interface AuditLogResponse {
  items: AuditLog[];
  total: number;
  skip: number;
  limit: number;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const logsPerPage = 20;

  // Fetch audit logs from API
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch('http://localhost:8000/api/admin/audit-logs?limit=100', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          
          // Check if data has items array (paginated response)
          if (data.items && Array.isArray(data.items)) {
            setLogs(data.items);
            setFilteredLogs(data.items);
          } 
          // Check if data is directly an array
          else if (Array.isArray(data)) {
            setLogs(data);
            setFilteredLogs(data);
          }
          // If it's a single object, wrap it in array
          else if (data && typeof data === 'object') {
            setLogs([data]);
            setFilteredLogs([data]);
          }
          // Fallback to empty array
          else {
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

  // Get unique actions for filter
  const uniqueActions = [...new Set(logs.map(log => log.action))];

  // Filter logs
  useEffect(() => {
    let filtered = logs;

    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action === filterAction);
    }

    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.old_value?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log.new_value?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [searchQuery, filterAction, logs]);

  // Paginate
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  // Export to CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      // Create CSV content
      const headers = ['ID', 'Timestamp', 'Action', 'Entity Type', 'Entity ID', 'User ID', 'Details'];
      const csvContent = [
        headers.join(','),
        ...filteredLogs.map(log => [
          log.id,
          log.created_at,
          log.action,
          log.entity_type,
          log.entity_id ?? '',
          log.user_id ?? '',
          `"${(log.old_value || log.new_value || '').replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      // Create and download file
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

  const getActionColor = (action: string) => {
    if (action.includes('APPROVE') || action.includes('VERIFY')) return '#6D7464';
    if (action.includes('REJECT') || action.includes('DEFAULT')) return '#3E3D39';
    if (action.includes('CREATE')) return '#C4A995';
    if (action.includes('UPDATE')) return '#CABAA1';
    return '#6D7464';
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

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: 'Total Logs', value: logs.length },
            { label: 'Today', value: logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length },
            { label: 'This Week', value: logs.filter(l => { const d = new Date(l.created_at); const now = new Date(); return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000; }).length },
            { label: 'This Month', value: logs.filter(l => { const d = new Date(l.created_at); const now = new Date(); return (now.getTime() - d.getTime()) < 30 * 24 * 60 * 60 * 1000; }).length },
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
              <p className="text-2xl font-bold" style={{ color: '#050505' }}>{stat.value}</p>
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
            style={{ backgroundColor: '#D5BFA4', color: '#050505', border: '1px solid #B4A58B' }}
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
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
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>Timestamp</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>Action</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>Entity</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>Details</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>User</th>
                </tr>
              </thead>
              <tbody>
                {currentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center" style={{ color: '#6D7464' }}>
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-t"
                      style={{ borderColor: '#B4A58B' }}
                    >
                      <td className="p-4">
                        <p className="text-sm" style={{ color: '#050505' }}>
                          {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                        </p>
                      </td>
                      <td className="p-4">
                        <span 
                          className="px-2 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: getActionColor(log.action), color: '#D4C8B5' }}
                        >
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm" style={{ color: '#050505' }}>
                          {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm" style={{ color: '#3E3D39' }}>
                          {log.old_value ? `From: ${log.old_value} → To: ${log.new_value}` : '-'}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" style={{ color: '#6D7464' }} />
                          <p className="text-sm" style={{ color: '#050505' }}>
                            {log.user_id ? `User #${log.user_id}` : 'System'}
                          </p>
                        </div>
                      </td>
                    </motion.tr>
                  ))
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
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: '#C4A995', color: '#050505' }}
                >
                  <ChevronLeft className="w-5 h-5" />
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
                      className="w-10 h-10 rounded-lg text-sm font-medium"
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
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
