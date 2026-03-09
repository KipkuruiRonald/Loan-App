// Mock data store for local development without backend
import { User, Loan, Payment, LoanStatus, PaymentStatus, UserRole } from '@/types';

// Mock user data - simplified borrower
export const mockUser: User = {
  id: 1,
  username: 'okolea_user',
  email: 'user@okolea.co.ke',
  full_name: 'John Okolea User',
  phone: '0712345678',
  role: UserRole.BORROWER,
  is_active: true,
  credit_tier: 2,
  credit_score: 250,
  current_limit: 1000,
  perfect_repayment_streak: 1,
  created_at: '2024-01-01T00:00:00Z',
};

// Repayment types - simplified for 9-day loans
export interface RepaymentLoan {
  id: number;
  loan_id: string;
  principal: number;
  interest_rate: number;
  term_days: number;
  total_due: number;
  remaining_balance: number;
  start_date: string;
  due_date: string;
  status: 'ACTIVE' | 'SETTLED' | 'DEFAULTED';
  days_remaining: number;
  total_paid: number;
  next_emi_amount: number;
}

// Mock repayment loans
export const mockRepaymentLoans: RepaymentLoan[] = [
  {
    id: 1,
    loan_id: 'OKL-2024-001',
    principal: 1000,
    interest_rate: 4.0,
    term_days: 9,
    total_due: 1020,
    remaining_balance: 1020,
    start_date: '2024-01-15',
    due_date: '2024-01-24',
    status: 'ACTIVE',
    days_remaining: 5,
    total_paid: 0,
    next_emi_amount: 1020,
  },
  {
    id: 2,
    loan_id: 'OKL-2024-003',
    principal: 500,
    interest_rate: 4.0,
    term_days: 9,
    total_due: 510,
    remaining_balance: 510,
    start_date: '2024-01-18',
    due_date: '2024-01-27',
    status: 'ACTIVE',
    days_remaining: 8,
    total_paid: 0,
    next_emi_amount: 510,
  },
];

// Repayment summary
export const mockRepaymentSummary = {
  total_outstanding: 1530,
  total_due_today: 1020,
  next_payment_date: '2024-01-24',
  next_payment_amount: 1020,
  overdue_loans: 0,
  overdue_amount: 0,
  perfect_repayment_streak: 1,
  current_credit_tier: 2,
  credit_limit: 1000,
};

// Mock payments (replaces transactions)
export const mockPayments: Payment[] = [
  {
    id: 1,
    payment_id: 'PAY-001',
    borrower_id: 1,
    loan_id: 1,
    amount: 1020,
    payment_method: 'mpesa',
    status: PaymentStatus.COMPLETED,
    initiated_at: '2024-01-15T10:30:00Z',
    completed_at: '2024-01-15T10:31:00Z',
  },
  {
    id: 2,
    payment_id: 'PAY-002',
    borrower_id: 1,
    loan_id: 2,
    amount: 510,
    payment_method: 'mpesa',
    status: PaymentStatus.COMPLETED,
    initiated_at: '2024-01-18T14:20:00Z',
    completed_at: '2024-01-18T14:21:00Z',
  },
];

// M-Pesa payment response
export interface MpesaPaymentResponse {
  success: boolean;
  transaction_id: string;
  phone_number: string;
  amount: number;
  timestamp: string;
  confirmation_code?: string;
}

export type PaymentResponse = MpesaPaymentResponse;

// Helper functions
export const getCurrentUser = () => mockUser;
export const getRepaymentLoans = () => mockRepaymentLoans;
export const getRepaymentSummary = () => mockRepaymentSummary;
export const getPayments = () => mockPayments;
