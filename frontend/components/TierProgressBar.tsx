'use client';

import { motion } from 'framer-motion';
import { Target, Loader2 } from 'lucide-react';
import { User } from '@/context/AuthContext';

interface TierProgressBarProps {
  user: User | null;
  loading?: boolean;
}

// Tier names mapping
const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
const MAX_TIER = 4; // Platinum is the max tier

// Requirements for next tier (streak and credit score)
const TIER_REQUIREMENTS: Record<number, { streak: number; score: number }> = {
  1: { streak: 3, score: 500 },   // Bronze -> Silver
  2: { streak: 6, score: 650 },   // Silver -> Gold  
  3: { streak: 12, score: 750 },  // Gold -> Platinum
  4: { streak: Infinity, score: Infinity }, // Platinum is max
};

export default function TierProgressBar({ user, loading = false }: TierProgressBarProps) {
  // Calculate progress percentage
  const calculateProgress = (): number => {
    if (!user) return 0;

    const currentTier = user.credit_tier || 1;
    
    // If at max tier, return 100%
    if (currentTier >= MAX_TIER) return 100;

    const requirements = TIER_REQUIREMENTS[currentTier];
    const streak = user.perfect_repayment_streak || 0;
    const score = user.credit_score || 0;

    // Calculate streak progress (50% weight)
    const streakProgress = Math.min(streak / requirements.streak, 1) * 50;
    
    // Calculate score progress (50% weight)
    const scoreProgress = Math.min(score / requirements.score, 1) * 50;

    // Total progress capped at 100
    return Math.min(Math.round(streakProgress + scoreProgress), 100);
  };

  // Get current tier name
  const getCurrentTierName = (): string => {
    if (!user || !user.credit_tier) return 'Bronze';
    return TIER_NAMES[user.credit_tier - 1] || `Tier ${user.credit_tier}`;
  };

  // Get next tier name
  const getNextTierName = (): string => {
    if (!user || !user.credit_tier) return 'Silver';
    const nextTier = user.credit_tier + 1;
    if (nextTier >= MAX_TIER) return 'Platinum';
    return TIER_NAMES[nextTier - 1] || `Tier ${nextTier}`;
  };

  // Calculate remaining repayments needed
  const getRemainingRepayments = (): number => {
    if (!user) return 0;
    
    const currentTier = user.credit_tier || 1;
    if (currentTier >= MAX_TIER) return 0;

    const requirements = TIER_REQUIREMENTS[currentTier];
    const streak = user.perfect_repayment_streak || 0;
    
    return Math.max(0, requirements.streak - streak);
  };

  // Get dynamic message based on progress
  const getProgressMessage = (): string => {
    if (!user) return 'Make on-time repayments to increase your tier';

    const currentTier = user.credit_tier || 1;
    const progress = calculateProgress();

    // Max tier message
    if (currentTier >= MAX_TIER) {
      return 'You are at the maximum tier!';
    }

    // Show remaining repayments needed
    const remaining = getRemainingRepayments();
    if (remaining > 0) {
      return `${remaining} more on-time repayments to reach ${getNextTierName()}`;
    }

    // Default message
    return 'Make on-time repayments to increase your tier';
  };

  const progress = calculateProgress();
  const currentTierName = getCurrentTierName();
  const progressMessage = getProgressMessage();

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border px-3 py-1.5" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--bg-card-alt)' }}>
        <Target className="h-4 w-4 animate-pulse" style={{ color: 'var(--text-secondary)' }} />
        <div className="flex flex-col gap-1">
          <div className="h-3 w-16 animate-pulse rounded" style={{ backgroundColor: 'var(--text-secondary)', opacity: 0.3 }} />
          <div className="h-2 w-24 animate-pulse rounded" style={{ backgroundColor: 'var(--text-secondary)', opacity: 0.2 }} />
        </div>
        <Loader2 className="h-3 w-3 animate-spin ml-auto" style={{ color: 'var(--text-secondary)' }} />
      </div>
    );
  }

  // No user data - show 0%
  if (!user) {
    return (
      <div className="flex items-center gap-2 rounded-xl border px-3 py-1.5" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--bg-card-alt)' }}>
        <Target className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Your Tier: Bronze
        </span>
        <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>
          Progress 0%
        </span>
      </div>
    );
  }

  const isMaxTier = (user.credit_tier || 1) >= MAX_TIER;

  return (
    <div className="flex items-center gap-2 rounded-xl border px-3 py-1.5" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--bg-card-alt)' }}>
      <Target className="h-4 w-4 shrink-0" style={{ color: isMaxTier ? 'var(--success)' : 'var(--accent-primary)' }} />
      
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            Your Tier: {currentTierName}
          </span>
          {!isMaxTier && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Progress {progress}%
            </span>
          )}
        </div>
        
        {/* Progress bar */}
        {!isMaxTier && (
          <div className="mt-1 h-1.5 w-24 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-light)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ 
                backgroundColor: progress >= 100 ? 'var(--success)' : 'var(--accent-primary)' 
              }}
            />
          </div>
        )}
        
        {/* Dynamic message */}
        <span 
          className="text-[10px] truncate max-w-[140px]" 
          style={{ 
            color: isMaxTier ? 'var(--success)' : 'var(--text-secondary)',
            fontStyle: isMaxTier ? 'normal' : 'normal'
          }}
          title={progressMessage}
        >
          {progressMessage}
        </span>
      </div>
    </div>
  );
}
