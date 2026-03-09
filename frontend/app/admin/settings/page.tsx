'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '@/components/AdminLayout';
import CollapsibleSection from '@/components/CollapsibleSection';
import { 
  Settings, 
  Save, 
  Bell, 
  Shield, 
  CreditCard, 
  Globe,
  Loader2,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Wrench,
  Clock,
  Calendar
} from 'lucide-react';
import { settingsApi } from '@/lib/api';
import { validateLoanSettings, ValidationResult } from '@/lib/validation';
import { getErrorMessage } from '@/lib/utils';

type CategoryType = 'general' | 'loan' | 'payment' | 'security' | 'notification' | 'maintenance';

interface SettingItem {
  key: string;
  value: any;
  type: string;
  description?: string;
  is_editable: boolean;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryType>('general');
  const [settingsData, setSettingsData] = useState<Record<string, SettingItem[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Maintenance mode specific state
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceDuration, setMaintenanceDuration] = useState(30);
  const [maintenanceScheduledDate, setMaintenanceScheduledDate] = useState('');
  const [maintenanceScheduledTime, setMaintenanceScheduledTime] = useState('');
  const [maintenanceStatus, setMaintenanceStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  const categories = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'loan', label: 'Loan Settings', icon: DollarSign },
    { id: 'payment', label: 'Payment Gateway', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notification', label: 'Notifications', icon: Bell },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  ];

  useEffect(() => {
    loadSettings();
    fetchMaintenanceStatus();
  }, []);

  // Fetch maintenance status
  const fetchMaintenanceStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/admin/maintenance/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMaintenanceEnabled(data.enabled);
        setMaintenanceMessage(data.message || '');
        if (data.estimated_duration) {
          setMaintenanceDuration(data.estimated_duration);
        }
      }
    } catch (err) {
      console.error('Failed to fetch maintenance status:', err);
    }
  };

  // Handle maintenance toggle
  const handleMaintenanceToggle = async () => {
    setTogglingMaintenance(true);
    setMaintenanceStatus(null);
    
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/admin/maintenance/toggle', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled: !maintenanceEnabled,
          message: maintenanceMessage || 'System is under scheduled maintenance. Please check back later.',
          duration_minutes: maintenanceDuration
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setMaintenanceEnabled(data.enabled);
        setMaintenanceStatus({
          type: 'success',
          message: `Maintenance mode ${data.enabled ? 'enabled' : 'disabled'} successfully`
        });
      } else {
        const error = await res.json();
        setMaintenanceStatus({
          type: 'error',
          message: error.detail || 'Failed to update maintenance mode'
        });
      }
    } catch (err) {
      setMaintenanceStatus({
        type: 'error',
        message: 'Failed to connect to server'
      });
    } finally {
      setTogglingMaintenance(false);
      setTimeout(() => setMaintenanceStatus(null), 3000);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await settingsApi.getSystemSettings();
      setSettingsData(data);
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setFieldErrors({});
    
    // Validate loan settings if on loan category
    if (activeCategory === 'loan') {
      const loanSettings = settingsData['loan'] || [];
      const interestRateItem = loanSettings.find(s => s.key === 'interest_rate');
      const penaltyRateItem = loanSettings.find(s => s.key === 'penalty_rate');
      const termDaysItem = loanSettings.find(s => s.key === 'term_days');
      
      const validation = validateLoanSettings({
        interest_rate: interestRateItem?.value,
        penalty_rate: penaltyRateItem?.value,
        term_days: termDaysItem?.value,
      });
      
      if (!validation.isValid) {
        setFieldErrors(validation.errors);
        return;
      }
    }
    
    setSaving(true);
    try {
      // Flatten settings for API
      const settingsToUpdate: any[] = [];
      
      Object.entries(settingsData).forEach(([category, items]) => {
        items.forEach(item => {
          if (item.is_editable) {
            settingsToUpdate.push({
              category,
              key: item.key,
              value: item.value,
            });
          }
        });
      });

      // Save to backend
      await settingsApi.updateSystemSettings(settingsToUpdate);
      
      // Reload settings from backend to verify and get fresh data
      await loadSettings();
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(getErrorMessage(err, 'Failed to save settings. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (category: string, key: string, value: any) => {
    setSettingsData((prev: any) => ({
      ...prev,
      [category]: prev[category]?.map((item: SettingItem) => 
        item.key === key ? { ...item, value } : item
      ) || [],
    }));
  };

  const renderInput = (item: SettingItem, category: string) => {
    if (!item.is_editable) {
      return (
        <div className="px-4 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-500">
          {String(item.value)}
        </div>
      );
    }

    switch (item.type) {
      case 'boolean':
        return (
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(item.value)}
              onChange={(e) => handleValueChange(category, item.key, e.target.checked)}
              className="w-5 h-5 rounded text-tan"
            />
          </label>
        );
      case 'number':
        return (
          <input
            type="number"
            value={Number(item.value)}
            onChange={(e) => handleValueChange(category, item.key, parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 md:px-4 md:py-3 rounded-xl outline-none text-sm md:text-base"
            style={{ backgroundColor: '#C4A995', border: '1px solid #B4A58B', color: '#050505' }}
          />
        );
      default:
        return (
          <input
            type="text"
            value={String(item.value || '')}
            onChange={(e) => handleValueChange(category, item.key, e.target.value)}
            className="w-full px-3 py-2 md:px-4 md:py-3 rounded-xl outline-none text-sm md:text-base"
            style={{ backgroundColor: '#C4A995', border: '1px solid #B4A58B', color: '#050505' }}
          />
        );
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#3E3D39' }} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#050505' }}>
              System Settings
            </h1>
            <p className="text-sm mt-1" style={{ color: '#3E3D39' }}>
              Configure platform settings and preferences
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-xl font-medium transition-colors hover:opacity-80 w-full md:w-auto"
            style={{ backgroundColor: '#3E3D39', color: '#D4C8B5' }}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-tan border border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div
              className="rounded-2xl p-3 lg:p-4"
              style={{ backgroundColor: '#D5BFA4', border: '1px solid #B4A58B' }}
            >
              <nav className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id as CategoryType)}
                    className={`w-full flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-xl text-left transition-colors ${
                      activeCategory === cat.id
                        ? 'font-medium'
                        : ''
                    }`}
                    style={{
                      backgroundColor: activeCategory === cat.id ? '#3E3D39' : 'transparent',
                      color: activeCategory === cat.id ? '#D4C8B5' : '#050505',
                    }}
                  >
                    <cat.icon className="w-4 h-4 lg:w-5 lg:h-5" />
                    <span className="text-sm">{cat.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl p-4 lg:p-6"
              style={{ backgroundColor: '#D5BFA4', border: '1px solid #B4A58B' }}
            >
              {/* Category Title */}
              <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-6">
                {(() => {
                  const CatIcon = categories.find(c => c.id === activeCategory)?.icon || Settings;
                  return <CatIcon className="w-5 h-5" style={{ color: '#3E3D39' }} />;
                })()}
                <h2 className="h2" style={{ color: '#050505' }}>
                  {categories.find(c => c.id === activeCategory)?.label}
                </h2>
              </div>

              {/* Settings Grid */}
              <div className="space-y-4">
                {activeCategory === 'maintenance' ? (
                  <div className="space-y-6">
                    {/* Status Banner */}
                    {maintenanceEnabled && (
                      <div 
                        className="p-4 rounded-xl flex items-center gap-3"
                        style={{ backgroundColor: '#FEE2E2', border: '1px solid #EF4444' }}
                      >
                        <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
                        <div>
                          <p className="font-medium" style={{ color: '#DC2626' }}>
                            Maintenance Mode is ACTIVE
                          </p>
                          <p className="text-xs" style={{ color: '#991B1B' }}>
                            Users cannot access the application. You are seeing this because you are an admin.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Toggle Switch */}
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium" style={{ color: '#050505' }}>Enable Maintenance Mode</p>
                          <p className="text-xs mt-1" style={{ color: '#6D7464' }}>
                            When enabled, all non-admin users will see a maintenance page
                          </p>
                        </div>
                        <button
                          onClick={handleMaintenanceToggle}
                          disabled={togglingMaintenance}
                          className="relative w-14 h-7 rounded-full transition-colors"
                          style={{ 
                            backgroundColor: maintenanceEnabled ? '#EF4444' : '#6D7464',
                            opacity: togglingMaintenance ? 0.5 : 1
                          }}
                        >
                          <div 
                            className="absolute w-5 h-5 rounded-full bg-white top-1 transition-all"
                            style={{ left: maintenanceEnabled ? '34px' : '2px' }}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Message Input */}
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#050505' }}>
                        Maintenance Message
                      </label>
                      <textarea
                        value={maintenanceMessage}
                        onChange={(e) => setMaintenanceMessage(e.target.value)}
                        placeholder="Enter message to display to users..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                        style={{ 
                          backgroundColor: '#D5BFA4',
                          color: '#050505',
                          border: '1px solid #B4A58B'
                        }}
                      />
                      <p className="text-xs mt-2" style={{ color: '#6D7464' }}>
                        This message will be shown to users during maintenance
                      </p>
                    </div>

                    {/* Duration Slider */}
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#050505' }}>
                        Estimated Duration (minutes)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="5"
                          max="240"
                          step="5"
                          value={maintenanceDuration}
                          onChange={(e) => setMaintenanceDuration(parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" style={{ color: '#6D7464' }} />
                          <span className="font-medium" style={{ color: '#050505' }}>{maintenanceDuration} min</span>
                        </div>
                      </div>
                    </div>

                    {/* Schedule (Optional) */}
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#050505' }}>
                        Schedule Maintenance (Optional)
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#D5BFA4' }}>
                          <Calendar className="w-4 h-4" style={{ color: '#6D7464' }} />
                          <input
                            type="date"
                            value={maintenanceScheduledDate}
                            onChange={(e) => setMaintenanceScheduledDate(e.target.value)}
                            className="bg-transparent outline-none text-sm w-full"
                            style={{ color: '#050505' }}
                          />
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#D5BFA4' }}>
                          <Clock className="w-4 h-4" style={{ color: '#6D7464' }} />
                          <input
                            type="time"
                            value={maintenanceScheduledTime}
                            onChange={(e) => setMaintenanceScheduledTime(e.target.value)}
                            className="bg-transparent outline-none text-sm w-full"
                            style={{ color: '#050505' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preview Card */}
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#C4A995' }}>
                      <p className="text-sm font-medium mb-3" style={{ color: '#050505' }}>User View Preview</p>
                      <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#D5BFA4' }}>
                        <Wrench className="w-10 h-10 mx-auto mb-2" style={{ color: '#6D7464' }} />
                        <p className="font-bold" style={{ color: '#050505' }}>
                          {maintenanceEnabled ? 'System Under Maintenance' : 'Maintenance Mode Disabled'}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#6D7464' }}>
                          {maintenanceEnabled 
                            ? (maintenanceMessage || 'System is under scheduled maintenance. Please check back later.')
                            : 'Users can access the system normally.'}
                        </p>
                        {maintenanceEnabled && (
                          <p className="text-xs mt-2" style={{ color: '#3E3D39' }}>
                            Estimated completion: {maintenanceDuration} minutes
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Toast */}
                    {maintenanceStatus && (
                      <div 
                        className="p-3 rounded-xl flex items-center gap-2"
                        style={{ 
                          backgroundColor: maintenanceStatus.type === 'success' ? '#22C55E' : '#EF4444',
                          color: '#FFFFFF'
                        }}
                      >
                        {maintenanceStatus.type === 'success' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                        <span className="text-sm">{maintenanceStatus.message}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Existing settings rendering */
                  settingsData[activeCategory]
                    ?.filter((item: SettingItem) => item.key !== 'maintenance_mode' && item.key !== 'maintenance_message' && item.key !== 'maintenance_duration')
                    .map((item: SettingItem) => (
                    <div key={item.key} className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-start">
                      <div className="md:col-span-2">
                        <label 
                          className="block text-sm font-medium mb-1" 
                          style={{ color: '#3E3D39' }}
                        >
                          {item.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        {item.description && (
                          <p className="text-xs" style={{ color: '#6B6560' }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="w-full">
                        {renderInput(item, activeCategory)}
                      </div>
                    </div>
                  ))
                )}

                {/* Empty state */}
                {(!settingsData[activeCategory] || settingsData[activeCategory]?.length === 0) && activeCategory !== 'maintenance' && (
                  <div className="text-center py-8">
                    <p style={{ color: '#6B6560' }}>
                      No settings in this category
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Info Box */}
        <div 
          className="rounded-xl p-3 md:p-4 mt-4"
          style={{ backgroundColor: '#E8E4DC', border: '1px solid #B4A58B' }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: '#3E3D39' }} />
            <div>
              <p className="font-medium" style={{ color: '#050505' }}>
                Configuration Note
              </p>
              <p className="text-sm mt-1" style={{ color: '#3E3D39' }}>
                Some settings may require a server restart to take effect. 
                Contact your system administrator if changes don&apos;t appear immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
