'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { 
  Settings, 
  Save,
  RefreshCw,
  Users,
  TrendingUp,
  DollarSign,
  Edit2,
  Check,
  X,
  Layers
} from 'lucide-react';

interface TierConfig {
  level: number;
  name: string;
  min_score: number;
  max_score: number;
  loan_limit: number;
  interest_rate: number;
  processing_fee: number;
  requirements: string;
  color: string;
}

interface TierSettings {
  tiers: TierConfig[];
}

export default function TierSettingsPage() {
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTierSettings();
    fetchDistribution();
  }, []);

  const fetchTierSettings = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/tier-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data: TierSettings = await res.json();
      setTiers(data.tiers);
    } catch (err) {
      console.error('Failed to fetch tier settings:', err);
      // Use default values if fetch fails
      setTiers([
        { level: 1, name: 'Bronze', min_score: 0, max_score: 199, loan_limit: 500, interest_rate: 4.0, processing_fee: 25, requirements: 'Initial tier for new users', color: '#CD7F32' },
        { level: 2, name: 'Silver', min_score: 200, max_score: 349, loan_limit: 1000, interest_rate: 3.9, processing_fee: 23, requirements: '3+ on-time payments', color: '#C0C0C0' },
        { level: 3, name: 'Silver', min_score: 350, max_score: 499, loan_limit: 2000, interest_rate: 3.8, processing_fee: 20, requirements: '5+ on-time payments', color: '#C0C0C0' },
        { level: 4, name: 'Gold', min_score: 500, max_score: 649, loan_limit: 3500, interest_rate: 3.7, processing_fee: 18, requirements: '90% on-time rate', color: '#FFD700' },
        { level: 5, name: 'Gold', min_score: 650, max_score: 799, loan_limit: 5000, interest_rate: 3.5, processing_fee: 15, requirements: '5+ loans, 90% on-time', color: '#FFD700' },
        { level: 6, name: 'Platinum', min_score: 800, max_score: 899, loan_limit: 7500, interest_rate: 3.3, processing_fee: 12, requirements: 'Perfect streak', color: '#E5E4E2' },
        { level: 7, name: 'Platinum', min_score: 900, max_score: 1000, loan_limit: 10000, interest_rate: 3.2, processing_fee: 10, requirements: '10+ loans, perfect streak', color: '#E5E4E2' },
        { level: 8, name: 'Diamond', min_score: 1001, max_score: 9999, loan_limit: 15000, interest_rate: 3.0, processing_fee: 0, requirements: 'Perfect repayment history', color: '#B9F2FF' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistribution = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/tier-distribution`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDistribution(data);
    } catch (err) {
      console.error('Failed to fetch distribution:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/tier-settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tiers })
      });
      
      if (res.ok) {
        setSaveMessage({ type: 'success', text: 'Tier settings saved successfully!' });
        setEditing(null);
      } else {
        const data = await res.json();
        setSaveMessage({ type: 'error', text: data.detail || 'Failed to save settings' });
      }
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const updateTier = (level: number, field: keyof TierConfig, value: any) => {
    setTiers(tiers.map(tier => 
      tier.level === level ? { ...tier, [field]: value } : tier
    ));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('KES', 'KSh');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent-primary)' }} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Tier Configuration
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Manage borrower credit tiers and limits
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span 
                className={`text-sm px-3 py-1 rounded-full ${
                  saveMessage.type === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {saveMessage.text}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: 'var(--accent-primary)', 
                color: 'white' 
              }}
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>

        {/* Distribution Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {tiers.map(tier => (
            <div 
              key={tier.level} 
              className="p-4 rounded-lg border"
              style={{ 
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-light)'
              }}
            >
              <div className="text-sm font-medium" style={{ color: tier.color }}>{tier.name}</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {distribution[`tier_${tier.level}`] || 0}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>users</div>
            </div>
          ))}
        </div>

        {/* Tier Configuration Table */}
        <div 
          className="rounded-lg border overflow-hidden"
          style={{ 
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-light)'
          }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y" style={{ borderColor: 'var(--border-light)' }}>
              <thead style={{ backgroundColor: 'var(--bg-card-alt)' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Score Range</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Loan Limit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Interest Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Fee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Requirements</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                {tiers.map(tier => (
                  <tr key={tier.level}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: tier.color }} 
                        />
                        <div>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{tier.name}</span>
                          <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>Tier {tier.level}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {editing === tier.level ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={tier.min_score}
                            onChange={(e) => updateTier(tier.level, 'min_score', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 rounded border text-sm"
                            style={{ 
                              backgroundColor: 'var(--bg-primary)',
                              borderColor: 'var(--border-light)',
                              color: 'var(--text-primary)'
                            }}
                          />
                          <span style={{ color: 'var(--text-secondary)' }}>-</span>
                          <input
                            type="number"
                            value={tier.max_score}
                            onChange={(e) => updateTier(tier.level, 'max_score', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 rounded border text-sm"
                            style={{ 
                              backgroundColor: 'var(--bg-primary)',
                              borderColor: 'var(--border-light)',
                              color: 'var(--text-primary)'
                            }}
                          />
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-primary)' }}>
                          {tier.min_score} - {tier.max_score}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {editing === tier.level ? (
                        <input
                          type="number"
                          value={tier.loan_limit}
                          onChange={(e) => updateTier(tier.level, 'loan_limit', parseFloat(e.target.value) || 0)}
                          className="w-28 px-2 py-1 rounded border text-sm"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)',
                            borderColor: 'var(--border-light)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-primary)' }} className="font-medium">
                          {formatCurrency(tier.loan_limit)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {editing === tier.level ? (
                        <input
                          type="number"
                          step="0.1"
                          value={tier.interest_rate}
                          onChange={(e) => updateTier(tier.level, 'interest_rate', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 rounded border text-sm"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)',
                            borderColor: 'var(--border-light)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-primary)' }}>
                          {tier.interest_rate}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {editing === tier.level ? (
                        <input
                          type="number"
                          value={tier.processing_fee}
                          onChange={(e) => updateTier(tier.level, 'processing_fee', parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 rounded border text-sm"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)',
                            borderColor: 'var(--border-light)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-primary)' }}>
                          {tier.processing_fee === 0 ? 'Free' : formatCurrency(tier.processing_fee)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {editing === tier.level ? (
                        <input
                          type="text"
                          value={tier.requirements}
                          onChange={(e) => updateTier(tier.level, 'requirements', e.target.value)}
                          className="w-full px-2 py-1 rounded border text-sm"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)',
                            borderColor: 'var(--border-light)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }} className="text-sm">
                          {tier.requirements}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {editing === tier.level ? (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setEditing(null)} 
                            className="p-1 rounded hover:bg-green-100"
                            title="Save"
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setEditing(tier.level)} 
                          className="p-1 rounded hover:bg-gray-100"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Preview Section */}
        <div 
          className="p-6 rounded-lg"
          style={{ backgroundColor: 'var(--bg-card-alt)' }}
        >
          <h2 
            className="text-lg font-semibold mb-4 flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <Layers className="w-5 h-5" />
            Preview: Borrower Dashboard View
          </h2>
          <div className="max-w-md mx-auto">
            {/* Sample tier card matching borrower dashboard */}
            <div 
              className="p-6 rounded-lg border"
              style={{ 
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-light)'
              }}
            >
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Your Tier</div>
              <div 
                className="text-2xl font-bold mt-1" 
                style={{ color: tiers[0]?.color || 'var(--text-primary)' }}
              >
                {tiers[0]?.name || 'Bronze'}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: 'var(--text-secondary)' }}>Progress to next tier</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>65%</span>
                </div>
                <div 
                  className="w-full h-2 rounded-full" 
                  style={{ backgroundColor: 'var(--bg-card-alt)' }}
                >
                  <div 
                    className="h-2 rounded-full" 
                    style={{ 
                      width: '65%',
                      backgroundColor: 'var(--accent-primary)' 
                    }} 
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Make on-time repayments to increase your tier
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
