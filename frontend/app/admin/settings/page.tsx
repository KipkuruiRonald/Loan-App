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
  DollarSign
} from 'lucide-react';
import { settingsApi } from '@/lib/api';
import { validateLoanSettings, ValidationResult } from '@/lib/validation';
import { getErrorMessage } from '@/lib/utils';

type CategoryType = 'general' | 'loan' | 'payment' | 'security' | 'notification';

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

  const categories = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'loan', label: 'Loan Settings', icon: DollarSign },
    { id: 'payment', label: 'Payment Gateway', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notification', label: 'Notifications', icon: Bell },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

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
                {settingsData[activeCategory]?.map((item: SettingItem) => (
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
                ))}

                {(!settingsData[activeCategory] || settingsData[activeCategory]?.length === 0) && (
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
