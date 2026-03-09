// User types
export enum UserRole {
  BORROWER = 'BORROWER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: number
  email: string
  username: string
  full_name: string
  phone: string
  role: UserRole
  is_active: boolean
  credit_tier: number
  credit_score: number
  current_limit: number
  perfect_repayment_streak: number
  created_at: string
  updated_at?: string
}

// Loan types
export enum LoanStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SETTLED = 'SETTLED',
  DEFAULTED = 'DEFAULTED',
}

export interface Loan {
  id: number
  loan_id: string
  borrower_id: number
  principal: number
  interest_rate: number
  term_days: number
  processing_fee: number
  interest_amount: number
  total_due: number
  due_date: string
  payment_date?: string
  late_days: number
  perfect_repayment: boolean
  late_penalty_amount: number
  status: LoanStatus
  created_at: string
  updated_at?: string
}

export interface LoanDetail extends Loan {
  borrower: User
}

// Payment types (replaces transaction types)
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Payment {
  id: number
  payment_id: string
  borrower_id: number
  loan_id: number
  amount: number
  payment_method: 'mpesa' | 'card' | 'bank'
  mpesa_reference?: string
  status: PaymentStatus
  initiated_at: string
  completed_at?: string
}

// Auth types
export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
  full_name: string
  phone: string
}

export interface AuthToken {
  access_token: string
  token_type: string
}

// API response types
export interface ApiError {
  detail: string
}

export interface HealthCheck {
  status: string
  version: string
  database: string
}

// ========================================
// ADMIN PANEL TYPES
// ========================================

// Admin user types
export interface AdminUser {
  id: number
  email: string
  username: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  last_login?: string
  total_loans?: number
  phone?: string
}

// Admin loan types
export interface AdminLoan {
  id: number
  loan_id: string
  borrower_name: string
  borrower_id: number
  principal: number
  interest_rate: number
  term_days: number
  total_due: number
  current_outstanding: number
  late_days: number
  perfect_repayment: boolean
  status: LoanStatus
  submitted_at: string
  approved_at?: string
  due_date?: string
}

// Admin stats types
export interface AdminStats {
  active_loans: number
  disbursed_today: number
  default_rate: number
  pending_approvals: number
  total_users: number
  total_disbursed: number
  average_loan_size: number
}

// Audit log types
export interface AuditLog {
  id: number
  user_id: number
  user_name: string
  action: string
  entity_type: string
  entity_id?: number
  details?: string
  ip_address?: string
  created_at: string
}

// CRB Report types
export interface CRBReport {
  id: number
  borrower_id: number
  borrower_name: string
  id_number: string
  report_type: 'DEFAULT' | 'SETTLEMENT' | 'UPDATE'
  status: 'PENDING' | 'SUBMITTED' | 'COMPLETED' | 'FAILED'
  submitted_at?: string
  created_at: string
}

// System settings types
export interface SystemSettings {
  interest_rate_min: number
  interest_rate_max: number
  penalty_rate: number
  default_grace_days: number
  min_loan_amount: number
  max_loan_amount: number
  tier_limits: TierLimit[]
}

export interface TierLimit {
  tier: string
  min_amount: number
  max_amount: number
  max_tenure_days: number
}

// Activity feed types
export interface ActivityFeed {
  id: number
  type: 'LOAN_APPROVED' | 'LOAN_REJECTED' | 'PAYMENT_RECEIVED' | 'USER_REGISTERED' | 'DEFAULT_NOTICE'
  title: string
  description: string
  user_id?: number
  user_name?: string
  loan_id?: number
  created_at: string
}

// ========================================
// NOTIFICATION TYPES
// ========================================

export enum NotificationType {
  // Loan notifications
  LOAN_APPROVED = 'LOAN_APPROVED',
  LOAN_DECLINED = 'LOAN_DECLINED',
  LOAN_DISBURSED = 'LOAN_DISBURSED',
  LOAN_REPAID = 'LOAN_REPAID',
  
  // Payment notifications
  PAYMENT_DUE_REMINDER = 'PAYMENT_DUE_REMINDER',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REPAYMENT_CONFIRMATION = 'REPAYMENT_CONFIRMATION',
  
  // Account notifications
  CREDIT_LIMIT_INCREASED = 'CREDIT_LIMIT_INCREASED',
  CREDIT_LIMIT_DECREASED = 'CREDIT_LIMIT_DECREASED',
  TIER_UPGRADE = 'TIER_UPGRADE',
  TIER_DOWNGRADE = 'TIER_DOWNGRADE',
  WELCOME_MESSAGE = 'WELCOME_MESSAGE',
  REFERRAL_BONUS = 'REFERRAL_BONUS',
  ACCOUNT_UPDATE = 'ACCOUNT_UPDATE',
  
  // Security notifications
  SECURITY_ALERT = 'SECURITY_ALERT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  NEW_DEVICE_LOGIN = 'NEW_DEVICE_LOGIN',
  
  // System notifications
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  PROMOTIONAL = 'PROMOTIONAL',
  
  // Admin notifications
  NEW_LOAN_APPLICATION = 'NEW_LOAN_APPLICATION',
  FRAUD_ALERT = 'FRAUD_ALERT',
  HIGH_RISK_USER = 'HIGH_RISK_USER',
  DEFAULT_REPORTING_NEEDED = 'DEFAULT_REPORTING_NEEDED',
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',
  DAILY_PERFORMANCE_STATS = 'DAILY_PERFORMANCE_STATS',
  USER_REGISTRATION_ALERT = 'USER_REGISTRATION_ALERT',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface Notification {
  id: number
  user_id: number
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  is_read: boolean
  read_at?: string
  related_entity_type?: string
  related_entity_id?: number
  created_at: string
}

export interface NotificationPreference {
  id: number
  user_id: number
  email_enabled: boolean
  email_for_loans: boolean
  email_for_payments: boolean
  push_enabled: boolean
  push_for_loans: boolean
  push_for_payments: boolean
  sms_enabled: boolean
  sms_for_critical: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  created_at: string
  updated_at?: string
}

export interface NotificationListResponse {
  notifications: Notification[]
  total: number
  unread_count: number
}

// ========================================
// REPAYMENT TYPES
// ========================================

export interface RepaymentLoan {
  id: number
  loan_id: string
  principal: number
  interest_rate: number
  term_days: number
  total_due: number
  remaining_balance: number
  start_date: string
  due_date: string
  status: 'ACTIVE' | 'SETTLED' | 'DEFAULTED'
  days_remaining: number
  total_paid: number
}

export interface RepaymentSummary {
  total_outstanding: number
  total_due_today: number
  next_payment_date: string
  next_payment_amount: number
  overdue_loans: number
  overdue_amount: number
  perfect_repayment_streak: number
  current_credit_tier: number
  credit_limit: number
}

// M-Pesa payment response
export interface MpesaPaymentResponse {
  success: boolean
  transaction_id: string
  phone_number: string
  amount: number
  timestamp: string
  confirmation_code?: string
}

export type PaymentResponse = MpesaPaymentResponse
