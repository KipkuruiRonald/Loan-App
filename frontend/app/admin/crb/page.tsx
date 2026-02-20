'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '@/components/AdminLayout';
import { 
  Shield, 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle,
  Loader2,
  Download,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface CRBRecord {
  id: number;
  national_id: string;
  borrower_name: string;
  credit_score: number;
  credit_rating: string;
  total_debt: number;
  last_updated: string;
  status: 'clean' | 'default' | 'pending';
}

export default function CRBManagementPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [records, setRecords] = useState<CRBRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // In production, you would upload to your API
      // For demo, we'll simulate adding records
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Add demo records
      const newRecords: CRBRecord[] = [
        { id: 1, national_id: '12345678', borrower_name: 'John Kamau', credit_score: 750, credit_rating: 'A', total_debt: 50000, last_updated: new Date().toISOString(), status: 'clean' },
        { id: 2, national_id: '23456789', borrower_name: 'Mary Wanjiku', credit_score: 620, credit_rating: 'C', total_debt: 150000, last_updated: new Date().toISOString(), status: 'default' },
        { id: 3, national_id: '34567890', borrower_name: 'Peter Ochieng', credit_score: 580, credit_rating: 'D', total_debt: 200000, last_updated: new Date().toISOString(), status: 'default' },
        { id: 4, national_id: '45678901', borrower_name: 'Sarah Akinyi', credit_score: 800, credit_rating: 'A', total_debt: 25000, last_updated: new Date().toISOString(), status: 'clean' },
        { id: 5, national_id: '56789012', borrower_name: 'James Mbugua', credit_score: 700, credit_rating: 'B', total_debt: 75000, last_updated: new Date().toISOString(), status: 'clean' },
      ];

      setRecords(prev => [...newRecords, ...prev]);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch('http://localhost:8000/api/admin/crb/clear', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setRecords([]);
    } catch (err) {
      console.error('Failed to clear records:', err);
      setRecords([]);
    }
  };

  // Handle export
  const handleExport = () => {
    const headers = ['ID', 'National ID', 'Name', 'Score', 'Rating', 'Total Debt', 'Status', 'Last Updated'];
    const csvContent = [
      headers.join(','),
      ...records.map(r => [
        r.id,
        r.national_id,
        `"${r.borrower_name}"`,
        r.credit_score,
        r.credit_rating,
        r.total_debt,
        r.status,
        r.last_updated
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `crb_records_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean': return '#6D7464';
      case 'default': return '#3E3D39';
      case 'pending': return '#CABAA1';
      default: return '#6D7464';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 700) return '#6D7464';
    if (score >= 600) return '#CABAA1';
    return '#3E3D39';
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#050505' }}>
              CRB Management
            </h1>
            <p className="text-sm mt-1" style={{ color: '#3E3D39' }}>
              Manage Credit Reference Bureau records
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={records.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: '#3E3D39', color: '#D4C8B5' }}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={records.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: '#C4A995', color: '#050505', border: '1px solid #B4A58B' }}
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>

        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6"
          style={{ backgroundColor: '#D5BFA4', border: '1px solid #B4A58B' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-5 h-5" style={{ color: '#3E3D39' }} />
            <h2 className="text-lg font-bold" style={{ color: '#050505' }}>
              Upload CRB Data
            </h2>
          </div>

          <div 
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
            style={{ borderColor: '#B4A58B', backgroundColor: '#C4A995' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-10 h-10" style={{ color: '#3E3D39' }} />
                <p className="font-medium" style={{ color: '#050505' }}>{selectedFile.name}</p>
                <p className="text-sm" style={{ color: '#6D7464' }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-10 h-10" style={{ color: '#6D7464' }} />
                <p className="font-medium" style={{ color: '#050505' }}>
                  Click to upload CRB data file
                </p>
                <p className="text-sm" style={{ color: '#6D7464' }}>
                  Supports CSV, XLSX formats
                </p>
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="mt-4">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: '#3E3D39', color: '#D4C8B5' }}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload and Process
                  </>
                )}
              </button>
              {uploading && (
                <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#C4A995' }}>
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ width: `${uploadProgress}%`, backgroundColor: '#3E3D39' }}
                  />
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: 'Total Records', value: records.length, icon: FileText },
            { label: 'Clean Records', value: records.filter(r => r.status === 'clean').length, icon: CheckCircle },
            { label: 'Defaulted', value: records.filter(r => r.status === 'default').length, icon: XCircle },
            { label: 'Avg Score', value: records.length > 0 ? Math.round(records.reduce((a, b) => a + b.credit_score, 0) / records.length) : 0, icon: Shield },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-xl p-4"
              style={{ backgroundColor: '#D5BFA4', border: '1px solid #B4A58B' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4" style={{ color: '#3E3D39' }} />
                <p className="text-sm" style={{ color: '#6D7464' }}>{stat.label}</p>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#050505' }}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Records Table */}
        {records.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: '#D5BFA4', border: '1px solid #B4A58B' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#C4A995' }}>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>National ID</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>Borrower</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>Credit Score</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>Rating</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>Total Debt</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: '#050505' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr 
                      key={record.id} 
                      className="border-t"
                      style={{ borderColor: '#B4A58B' }}
                    >
                      <td className="p-4">
                        <p className="text-sm font-mono" style={{ color: '#050505' }}>{record.national_id}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm" style={{ color: '#050505' }}>{record.borrower_name}</p>
                      </td>
                      <td className="p-4">
                        <span 
                          className="px-2 py-1 rounded-lg text-sm font-bold"
                          style={{ backgroundColor: getScoreColor(record.credit_score), color: '#D4C8B5' }}
                        >
                          {record.credit_score}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold" style={{ color: '#050505' }}>{record.credit_rating}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm" style={{ color: '#050505' }}>KSh {record.total_debt.toLocaleString()}</p>
                      </td>
                      <td className="p-4">
                        <span 
                          className="px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 w-fit"
                          style={{ backgroundColor: getStatusColor(record.status), color: '#D4C8B5' }}
                        >
                          {record.status === 'clean' && <CheckCircle className="w-3 h-3" />}
                          {record.status === 'default' && <AlertTriangle className="w-3 h-3" />}
                          {record.status === 'pending' && <Loader2 className="w-3 h-3" />}
                          {record.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {records.length === 0 && !uploading && (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 mx-auto mb-4" style={{ color: '#B4A58B' }} />
            <p className="text-lg font-medium" style={{ color: '#050505' }}>No CRB Records</p>
            <p className="text-sm" style={{ color: '#6D7464' }}>Upload a CRB data file to get started</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
