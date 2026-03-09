import { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '@/lib/api';

export interface LoanParameters {
  default_interest_rate: number;
  penalty_rate: number;
  term_days: number;
  min_loan_amount: number;
  max_loan_amount: number;
  processing_fee: number;
  perfect_repayment_bonus: number;
  loading: boolean;
  error: string | null;
}

// Default values for loan parameters
const defaultParams: Omit<LoanParameters, 'loading' | 'error'> = {
  default_interest_rate: 4.0,
  penalty_rate: 6.8,
  term_days: 9,
  min_loan_amount: 500,
  max_loan_amount: 15000,
  processing_fee: 0,
  perfect_repayment_bonus: 40,
};

export function useLoanParameters() {
  const [params, setParams] = useState<LoanParameters>({
    ...defaultParams,
    loading: true,
    error: null,
  });

  const fetchParams = useCallback(async () => {
    try {
      setParams(prev => ({ ...prev, loading: true, error: null }));
      const data = await settingsApi.getLoanParameters();
      setParams({
        ...data,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Failed to fetch loan parameters:', err);
      setParams(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load loan parameters',
      }));
    }
  }, []);

  useEffect(() => {
    fetchParams();
  }, [fetchParams]);

  const refreshParams = useCallback(async () => {
    await fetchParams();
  }, [fetchParams]);

  return {
    ...params,
    refreshParams,
  };
}

// Helper function to calculate total repayment
export function calculateTotalRepayment(
  principal: number,
  interestRate: number
): { interest: number; total: number } {
  const interest = principal * (interestRate / 100);
  const total = principal + interest;
  return {
    interest,
    total,
  };
}

// Helper function to calculate late penalty
export function calculateLatePenalty(
  principal: number,
  penaltyRate: number,
  lateDays: number
): number {
  return principal * (penaltyRate / 100) * lateDays;
}

// Helper function to calculate due date
export function calculateDueDate(termDays: number): Date {
  return new Date(Date.now() + termDays * 24 * 60 * 60 * 1000);
}

