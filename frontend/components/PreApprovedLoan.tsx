'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  calculateLoanDetailsWithMax, 
  LOAN_CONFIG, 
  validateLoanAmount,
  formatKSh,
  LoanCalculation 
} from '@/lib/calculations';

interface PreApprovedLoanProps {
  userName: string;
  minAmount?: number;
  maxAmount?: number;
  defaultAmount?: number;
  onApply: (loanData: {
    principal: number;
    transactionFee: number;
    interestAmount: number;
    totalRepayment: number;
    amountReceived: number;
    termDays: number;
  }) => void;
  isLoading?: boolean;
}

export default function PreApprovedLoan({
  userName,
  minAmount = LOAN_CONFIG.MIN_AMOUNT,
  maxAmount = LOAN_CONFIG.MAX_AMOUNT,
  defaultAmount = 10000,
  onApply,
  isLoading = false,
}: PreApprovedLoanProps) {
  // State for the loan amount
  const [amount, setAmount] = useState(defaultAmount);
  const [calculation, setCalculation] = useState<LoanCalculation>(
    calculateLoanDetailsWithMax(defaultAmount, maxAmount)
  );
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(defaultAmount.toString());

  // Recalculate when amount changes
  useEffect(() => {
    const newCalc = calculateLoanDetailsWithMax(amount, maxAmount);
    setCalculation(newCalc);
    
    // Validate
    const validation = validateLoanAmount(amount, maxAmount);
    setError(validation.error || null);
  }, [amount, maxAmount]);

  // Handle slider change
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = parseInt(e.target.value, 10);
    if (!isNaN(newAmount)) {
      setAmount(newAmount);
      setInputValue(newAmount.toString());
    }
  }, []);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setInputValue(value);
    
    const numericValue = parseInt(value, 10);
    if (!isNaN(numericValue) && numericValue > 0) {
      // Clamp to valid range
      const clampedAmount = Math.min(Math.max(numericValue, minAmount), maxAmount);
      setAmount(clampedAmount);
    }
  }, [minAmount, maxAmount]);

  // Handle input blur - reset to valid amount
  const handleInputBlur = useCallback(() => {
    const cleanValue = inputValue.replace(/[^0-9]/g, '');
    const numericValue = parseInt(cleanValue || '0', 10);
    if (isNaN(numericValue) || numericValue < minAmount) {
      setAmount(minAmount);
      setInputValue(minAmount.toString());
    } else if (numericValue > maxAmount) {
      setAmount(maxAmount);
      setInputValue(maxAmount.toString());
    } else {
      setInputValue(numericValue.toString());
    }
  }, [inputValue, minAmount, maxAmount]);

  // Handle apply button click
  const handleApply = useCallback(() => {
    if (error) return;
    
    onApply({
      principal: calculation.principal,
      transactionFee: calculation.transactionFee,
      interestAmount: calculation.interestAmount,
      totalRepayment: calculation.totalRepayment,
      amountReceived: calculation.amountReceived,
      termDays: calculation.termDays,
    });
  }, [calculation, error, onApply]);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Pre-approved Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium mb-4">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Pre-approved
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Congratulations {userName}!
        </h2>
        <p className="text-[var(--text-secondary)] mt-2">
          Your loan is ready
        </p>
      </motion.div>

      {/* Principal Amount Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-6"
      >
        <p className="text-sm text-[var(--text-secondary)] mb-1">Your loan amount</p>
        <p className="text-4xl font-bold text-[var(--text-primary)]">
          {formatKSh(calculation.principal)}
        </p>
      </motion.div>

      {/* Fee Breakdown Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-4 mb-6"
      >
        {/* Transaction Fee - deducted */}
        <div className="flex justify-between items-center py-3 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)]">Transaction Fee (5%)</span>
            <span className="text-xs text-[var(--text-muted)]">(deducted)</span>
          </div>
          <span className="text-red-400 font-medium">
            -{formatKSh(calculation.transactionFee)}
          </span>
        </div>

        {/* Interest - added to repayment */}
        <div className="flex justify-between items-center py-3 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)]">Interest (4%)</span>
            <span className="text-xs text-[var(--text-muted)]">(added)</span>
          </div>
          <span className="text-amber-400 font-medium">
            +{formatKSh(calculation.interestAmount)}
          </span>
        </div>

        {/* Total Repayment */}
        <div className="flex justify-between items-center py-3">
          <span className="text-[var(--text-primary)] font-semibold">Total to Repay</span>
          <span className="text-[var(--text-primary)] font-bold text-lg">
            {formatKSh(calculation.totalRepayment)}
          </span>
        </div>
      </motion.div>

      {/* Amount You'll Receive */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 p-4 mb-6"
      >
        <div className="text-center">
          <p className="text-sm text-[var(--text-secondary)] mb-1">You&apos;ll receive</p>
          <p className="text-3xl font-bold text-green-400">
            {formatKSh(calculation.amountReceived)}
          </p>
        </div>
      </motion.div>

      {/* Term Display */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-sm text-[var(--text-muted)] mb-6"
      >
        <span className="inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {calculation.termDays} days term
        </span>
        <span className="mx-2">•</span>
        <span>4% interest</span>
      </motion.div>

      {/* Amount Slider/Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-6"
      >
        <label className="block text-sm text-[var(--text-secondary)] mb-2">
          Adjust loan amount
        </label>
        
        {/* Slider */}
        <input
          type="range"
          min={minAmount}
          max={maxAmount}
          step={500}
          value={amount}
          onChange={handleSliderChange}
          className="w-full h-2 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer accent-green-500"
          style={{
            background: `linear-gradient(to right, #22c55e 0%, #22c55e ${((amount - minAmount) / (maxAmount - minAmount)) * 100}%, var(--bg-subtle) ${((amount - minAmount) / (maxAmount - minAmount)) * 100}%, var(--bg-subtle) 100%)`
          }}
        />
        
        {/* Min/Max Labels */}
        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1 mb-3">
          <span>{formatKSh(minAmount)}</span>
          <span>{formatKSh(maxAmount)}</span>
        </div>

        {/* Manual Input */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            KSh
          </span>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
            placeholder="Enter amount"
          />
        </div>
        
        {/* Error Message */}
        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
      </motion.div>

      {/* Apply Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <button
          onClick={handleApply}
          disabled={isLoading || !!error}
          className={`
            w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300
            ${isLoading || error
              ? 'bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-400 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
            }
          `}
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : (
            `Apply for ${formatKSh(calculation.principal)}`
          )}
        </button>
      </motion.div>

      {/* Disclaimer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-xs text-[var(--text-muted)] text-center mt-4"
      >
        By applying, you agree to our terms and conditions. 
        Interest and fees are calculated per the 9-day term.
      </motion.p>
    </div>
  );
}
