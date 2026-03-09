/**
 * Okolea Loan Calculations
 * 
 * Rates:
 * - Interest: 4% per 9-day term
 * - Transaction Fee: 5% of principal
 * - Late Penalty: 6.8% of principal
 */

export const LOAN_CONFIG = {
  // Interest: 4% per 9-day term
  INTEREST_RATE: 0.04,
  // Transaction fee: 5% of principal
  TRANSACTION_FEE_RATE: 0.05,
  // Late penalty: 6.8% of principal
  LATE_PENALTY_RATE: 0.068,
  // Loan term in days
  TERM_DAYS: 9,
  // Minimum and maximum loan amounts
  MIN_AMOUNT: 500,
  MAX_AMOUNT: 15000,
  // Maximum after user builds history
  MAX_AMOUNT_VERIFIED: 50000,
} as const;

/**
 * Interface for loan calculation results
 */
export interface LoanCalculation {
  principal: number;
  transactionFee: number;      // 5% of principal (deducted from amount received)
  interestAmount: number;       // 4% of principal (added to repayment)
  totalRepayment: number;       // principal + interest
  amountReceived: number;       // principal - transactionFee
  termDays: number;
}

/**
 * Calculate loan details based on principal amount
 * 
 * @param principal - The loan amount requested
 * @returns LoanCalculation object with all fee breakdowns
 * 
 * Example with KSh 20,000:
 * - Interest (4%): KSh 800
 * - Transaction Fee (5%): KSh 1,000
 * - Total Repayment: KSh 20,800
 * - You Receive: KSh 19,000
 */
export function calculateLoanDetails(principal: number): LoanCalculation {
  // Validate input
  if (principal < LOAN_CONFIG.MIN_AMOUNT) {
    principal = LOAN_CONFIG.MIN_AMOUNT;
  }
  if (principal > LOAN_CONFIG.MAX_AMOUNT) {
    principal = LOAN_CONFIG.MAX_AMOUNT;
  }

  // Calculate fees
  const transactionFee = Math.round(principal * LOAN_CONFIG.TRANSACTION_FEE_RATE);
  const interestAmount = Math.round(principal * LOAN_CONFIG.INTEREST_RATE);
  
  // Calculate totals
  const totalRepayment = principal + interestAmount;
  const amountReceived = principal - transactionFee;

  return {
    principal,
    transactionFee,
    interestAmount,
    totalRepayment,
    amountReceived,
    termDays: LOAN_CONFIG.TERM_DAYS,
  };
}

/**
 * Calculate loan details with custom max amount (for verified users)
 */
export function calculateLoanDetailsWithMax(
  principal: number, 
  maxAmount: number = LOAN_CONFIG.MAX_AMOUNT
): LoanCalculation {
  // Validate input
  if (principal < LOAN_CONFIG.MIN_AMOUNT) {
    principal = LOAN_CONFIG.MIN_AMOUNT;
  }
  if (principal > maxAmount) {
    principal = maxAmount;
  }

  // Calculate fees
  const transactionFee = Math.round(principal * LOAN_CONFIG.TRANSACTION_FEE_RATE);
  const interestAmount = Math.round(principal * LOAN_CONFIG.INTEREST_RATE);
  
  // Calculate totals
  const totalRepayment = principal + interestAmount;
  const amountReceived = principal - transactionFee;

  return {
    principal,
    transactionFee,
    interestAmount,
    totalRepayment,
    amountReceived,
    termDays: LOAN_CONFIG.TERM_DAYS,
  };
}

/**
 * Calculate late penalty amount
 * 
 * @param principal - The original principal amount
 * @returns Late penalty amount (6.8% of principal)
 */
export function calculateLatePenalty(principal: number): number {
  return Math.round(principal * LOAN_CONFIG.LATE_PENALTY_RATE);
}

/**
 * Validate loan amount is within allowed range
 * 
 * @param amount - The amount to validate
 * @param maxAmount - Optional custom max amount
 * @returns Object with isValid flag and error message
 */
export function validateLoanAmount(
  amount: number, 
  maxAmount: number = LOAN_CONFIG.MAX_AMOUNT
): { isValid: boolean; error?: string } {
  if (isNaN(amount) || amount <= 0) {
    return { 
      isValid: false, 
      error: 'Please enter a valid amount' 
    };
  }
  
  if (amount < LOAN_CONFIG.MIN_AMOUNT) {
    return { 
      isValid: false, 
      error: `Minimum loan amount is KSh ${LOAN_CONFIG.MIN_AMOUNT.toLocaleString()}` 
    };
  }
  
  if (amount > maxAmount) {
    return { 
      isValid: false, 
      error: `Maximum loan amount is KSh ${maxAmount.toLocaleString()}` 
    };
  }
  
  return { isValid: true };
}

/**
 * Format amount as Kenyan Shillings
 * 
 * @param amount - The amount to format
 * @returns Formatted string like "KSh 20,000"
 */
export function formatKSh(amount: number): string {
  return `KSh ${amount.toLocaleString('en-KE')}`;
}
