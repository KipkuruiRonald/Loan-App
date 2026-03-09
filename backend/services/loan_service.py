"""
Loan Service

Business logic for loan management.
Handles Okolea 9-day loan product with dynamic credit limits.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import logging

from models.models import Loan, User, AuditLog, LoanStatus, CreditScoreHistory
from schemas.schemas import LoanCreate, LoanUpdate, CreditStatusResponse
from core.config import settings

logger = logging.getLogger(__name__)


class LoanService:
    """Service for loan-related operations"""
    
    def __init__(self):
        pass
    
    # ============================================================
    # CREDIT LIMIT MANAGEMENT (Section 2-4)
    # ============================================================
    
    def get_credit_status(self, user: User) -> Dict:
        """Get user's credit status including tier and limit"""
        return {
            'credit_tier': user.credit_tier,
            'credit_score': user.credit_score,
            'current_limit': user.current_limit,
            'max_limit_achieved': user.max_limit_achieved,
            'perfect_repayment_streak': user.perfect_repayment_streak,
            'borrowing_blocked': user.borrowing_blocked,
            'block_expiry': user.block_expiry
        }
    
    def check_loan_eligibility(self, user: User, requested_amount: float) -> Dict:
        """
        Check if user is eligible for a loan amount.
        
        Section 2.4 Available Loan Amounts:
        - New users: Only 500 or 1000
        - Returning users: Dynamic based on current_limit
        """
        # Check if borrowing is blocked
        if user.borrowing_blocked:
            if user.block_expiry and user.block_expiry > datetime.utcnow():
                return {
                    'eligible': False,
                    'reason': 'BORROWING_BLOCKED',
                    'message': f'Borrowing blocked until {user.block_expiry}'
                }
            else:
                # Block expired, unblock user
                user.borrowing_blocked = False
                user.block_expiry = None
        
        # Check amount against current limit
        if requested_amount > user.current_limit:
            return {
                'eligible': False,
                'reason': 'LIMIT_EXCEEDED',
                'message': f'Amount {requested_amount} exceeds limit {user.current_limit}',
                'current_limit': user.current_limit
            }
        
        # For new users (no loans completed), restrict to 500/1000 only
        if user.perfect_repayment_streak == 0 and user.max_limit_achieved == 500.0:
            if requested_amount not in [500, 1000]:
                return {
                    'eligible': False,
                    'reason': 'NEW_USER_RESTRICTED',
                    'message': 'New users can only borrow 500 or 1000 KSh',
                    'allowed_amounts': [500, 1000]
                }
        
        return {
            'eligible': True,
            'current_limit': user.current_limit,
            'requested_amount': requested_amount
        }
    
    def calculate_total_due(
        self,
        principal: float,
        term_days: int = None,
        processing_fee: float = None,
        late_days: int = 0
    ) -> Dict:
        """
        Calculate total amount due for a 9-day loan.
        
        Section 1.3 Modified Calculation Formulas:
        total_due = principal 
                  + (principal × 0.04 ÷ 365 × 9)
                  + processing_fee
                  + IF late_days > 0 THEN (principal × 0.068) + (principal × 0.04 ÷ 365 × late_days)
                  + ELSE 0
        """
        term_days = term_days or settings.OKOLEO_TERM_DAYS
        processing_fee = processing_fee or settings.OKOLEO_PROCESSING_FEE
        
        # Calculate interest (4% annual rate for 9 days)
        daily_rate = settings.OKOLEO_INTEREST_RATE_ANNUAL / 365
        interest_amount = principal * daily_rate * term_days
        
        # Calculate late penalty if applicable
        late_penalty = 0.0
        if late_days > 0:
            late_penalty = principal * settings.OKOLEO_PENALTY_RATE
            late_penalty += principal * daily_rate * late_days
        
        total_due = principal + interest_amount + processing_fee + late_penalty
        
        return {
            'principal': principal,
            'interest_amount': interest_amount,
            'processing_fee': processing_fee,
            'late_penalty': late_penalty,
            'total_due': total_due
        }
    
    def process_repayment(
        self,
        db: Session,
        loan: Loan,
        payment_amount: float,
        payment_date: datetime
    ) -> Dict:
        """
        Process loan repayment and update credit status.
        
        Section 3.2 Score Update Triggers:
        - AFTER loan.mark_as_paid():
          IF payment_date ≤ due_date AND payment_amount = total_due
          THEN perfect_repayment_streak += 1, credit_score += 40
          ELSE IF payment_date > due_date
          THEN perfect_repayment_streak = 0, credit_score -= calculate_late_penalty_points
        """
        # Calculate late days
        late_days = 0
        if loan.due_date and payment_date > loan.due_date:
            late_days = (payment_date - loan.due_date).days
        
        # Calculate penalty if late
        penalty_amount = 0.0
        is_perfect = True
        
        if late_days > 0:
            is_perfect = False
            penalty_amount = loan.principal * settings.OKOLEO_PENALTY_RATE
            # Late interest
            daily_rate = settings.OKOLEO_INTEREST_RATE_ANNUAL / 365
            penalty_amount += loan.principal * daily_rate * late_days
        
        # Update loan
        loan.payment_date = payment_date
        loan.late_days = late_days
        loan.perfect_repayment = is_perfect
        loan.late_penalty_amount = penalty_amount
        
        # Calculate total paid
        total_paid = payment_amount
        if total_paid >= loan.total_due + penalty_amount:
            loan.status = LoanStatus.SETTLED
            # Process credit update for successful payment
            self._handle_successful_payment(db, loan, is_perfect, late_days)
        else:
            loan.status = LoanStatus.ACTIVE
        
        db.commit()
        
        return {
            'loan_id': loan.loan_id,
            'payment_amount': payment_amount,
            'late_days': late_days,
            'penalty_applied': penalty_amount,
            'perfect_repayment': is_perfect,
            'new_status': loan.status.value
        }
    
    def _handle_successful_payment(
        self,
        db: Session,
        loan: Loan,
        is_perfect: bool,
        late_days: int
    ):
        """Handle credit update after successful payment"""
        user = db.query(User).filter(User.id == loan.borrower_id).first()
        if not user:
            return
        
        if is_perfect:
            # Perfect repayment: streak +1, score +40
            user.perfect_repayment_streak += 1
            user.credit_score += 40
            
            # Check for tier upgrade
            self._check_tier_upgrade(db, user)
        else:
            # Late payment: streak reset, score penalty
            self._handle_late_payment(db, user, late_days)
        
        # Update max limit achieved
        if user.current_limit > user.max_limit_achieved:
            user.max_limit_achieved = user.current_limit
        
        db.commit()
        
        # Log audit
        self._log_audit(
            db,
            loan.id,
            user.id,
            "REPAYMENT_PROCESSED",
            "Loan",
            loan.loan_id,
            new_value=f"perfect={is_perfect}, score={user.credit_score}, streak={user.perfect_repayment_streak}"
        )
    
    def _handle_late_payment(self, db: Session, user: User, late_days: int):
        """
        Handle late payment and apply limit decrease rules.
        
        Section 4.2 New Limit Decrease Rule:
        - IF days_late BETWEEN 1 AND 3: tier -= 1 if tier ≥ 3
        - IF days_late BETWEEN 4 AND 9: tier = MAX(1, tier - 2)
        - IF days_late ≥ 10: tier = 1, limit = 500, score -= 200
        """
        user.perfect_repayment_streak = 0
        
        # Calculate score penalty based on days late
        score_penalty = min(late_days * 5, 100)  # Max 100 points penalty
        user.credit_score -= score_penalty
        
        # Apply tier decrease based on severity
        if late_days <= 3:
            # 1-3 days late: drop 1 tier if tier >= 3
            if user.credit_tier >= 3:
                user.credit_tier -= 1
        elif late_days <= 9:
            # 4-9 days late: drop 2 tiers, minimum tier 1
            user.credit_tier = max(1, user.credit_tier - 2)
        else:
            # 10+ days late: reset to tier 1
            user.credit_tier = 1
            user.credit_score = max(0, user.credit_score - 200)
        
        # Update limit based on new tier
        new_limit = settings.TIER_LIMITS.get(user.credit_tier, 500.0)
        if new_limit != user.current_limit:
            user.current_limit = new_limit
            user.limit_decrease_date = datetime.utcnow()
            
            if late_days <= 3:
                user.limit_decrease_reason = "LATE_1_3_DAYS"
            elif late_days <= 9:
                user.limit_decrease_reason = "LATE_4_9_DAYS"
            else:
                user.limit_decrease_reason = "LATE_10_PLUS_DAYS"
    
    def _check_tier_upgrade(self, db: Session, user: User):
        """
        Check and apply automatic tier upgrade.
        
        Section 4.1 New Limit Increase Rule:
        IF perfect_repayment_streak ≥ threshold_for_next_tier
        AND credit_score ≥ min_score_for_next_tier
        AND no_active_defaults = TRUE
        THEN tier += 1, current_limit = tier_limits[tier]
        """
        next_tier = user.credit_tier + 1
        
        # Check if next tier exists
        if next_tier > 8:
            return  # Already at max tier
        
        # Check streak requirement
        required_streak = settings.TIER_STREAK_REQUIREMENTS.get(next_tier, 0)
        if user.perfect_repayment_streak < required_streak:
            return
        
        # Check score threshold
        tier_score_range = settings.TIER_SCORE_THRESHOLDS.get(next_tier, (0, float('inf')))
        min_score = tier_score_range[0]
        if user.credit_score < min_score:
            return
        
        # Apply tier upgrade
        old_tier = user.credit_tier
        old_limit = user.current_limit
        
        user.credit_tier = next_tier
        user.current_limit = settings.TIER_LIMITS[next_tier]
        user.limit_increase_date = datetime.utcnow()
        
        # Log the upgrade
        logger.info(
            f"User {user.id} tier upgrade: {old_tier}->{next_tier}, "
            f"limit: {old_limit}->{user.current_limit}"
        )
        
        # Log audit
        self._log_audit(
            db,
            None,
            user.id,
            "TIER_UPGRADE",
            "User",
            str(user.id),
            old_value=f"tier={old_tier}, limit={old_limit}",
            new_value=f"tier={next_tier}, limit={user.current_limit}"
        )
    
    def handle_default(self, db: Session, loan: Loan):
        """
        Handle loan default (30+ days late).
        
        Section 4.3 Default Handling:
        - perfect_repayment_streak = 0
        - credit_tier = 1
        - current_limit = 500
        - credit_score -= 300
        - borrowing_blocked = TRUE
        - block_expiry = NOW() + 90 days
        """
        user = db.query(User).filter(User.id == loan.borrower_id).first()
        if not user:
            return
        
        # Apply default penalties
        user.perfect_repayment_streak = 0
        user.credit_tier = 1
        user.current_limit = 500.0
        user.credit_score = max(0, user.credit_score - settings.PENALTY_DEFAULT_SCORE_REDUCTION)
        user.borrowing_blocked = True
        user.block_expiry = datetime.utcnow() + timedelta(days=settings.PENALTY_DEFAULT_BLOCK_DAYS)
        user.limit_decrease_date = datetime.utcnow()
        user.limit_decrease_reason = "DEFAULT"
        
        # Update loan status
        loan.status = LoanStatus.DEFAULTED
        
        db.commit()
        
        # Log audit
        self._log_audit(
            db,
            loan.id,
            user.id,
            "DEFAULT_HANDLED",
            "Loan",
            loan.loan_id,
            new_value="status=DEFAULTED, tier=1, limit=500, blocked=90days"
        )
        
        logger.info(f"User {user.id} defaulted: tier reset to 1, blocked for 90 days")
    
    def initialize_user_credit(
        self,
        db: Session,
        user: User,
        crb_score: int = None,
        crb_clean: bool = False
    ):
        """
        Initialize credit tier and limit for new user.
        
        Section 2.3 Initial Limit Assignment:
        - IF CRB_score ≥ 300 AND no defaults: tier=2, limit=1000, score=200
        - ELSE: tier=1, limit=500, score=150
        """
        if crb_clean and crb_score and crb_score >= settings.CRB_SCORE_THRESHOLD:
            user.credit_tier = settings.INITIAL_TIER_CLEAN_CRB
            user.current_limit = settings.INITIAL_LIMIT_CLEAN_CRB
            user.credit_score = settings.INITIAL_SCORE_CLEAN_CRB
        else:
            user.credit_tier = settings.INITIAL_TIER_NO_CRB
            user.current_limit = settings.INITIAL_LIMIT_NO_CRB
            user.credit_score = settings.INITIAL_SCORE_NO_CRB
        
        user.max_limit_achieved = user.current_limit
        
        db.commit()
        
        logger.info(
            f"User {user.id} credit initialized: tier={user.credit_tier}, "
            f"limit={user.current_limit}, score={user.credit_score}"
        )
    
    # ============================================================
    # LOAN CREATION AND MANAGEMENT
    # ============================================================
    
    async def create_loan(
        self,
        db: Session,
        loan_data: LoanCreate,
        borrower_id: int
    ) -> Loan:
        """
        Create a new 9-day loan.
        
        Args:
            db: Database session
            loan_data: Loan creation data
            borrower_id: ID of the borrowing user
            
        Returns:
            Created loan object
        """
        logger.info(f"Creating loan {loan_data.loan_id} for borrower {borrower_id}")
        
        # Verify loan_id is unique
        existing = db.query(Loan).filter(Loan.loan_id == loan_data.loan_id).first()
        if existing:
            raise ValueError(f"Loan ID {loan_data.loan_id} already exists")
        
        # Calculate due date (9 days from now)
        due_date = datetime.utcnow() + timedelta(days=settings.OKOLEO_TERM_DAYS)
        
        # Calculate total due
        total_due_calc = self.calculate_total_due(
            principal=loan_data.principal,
            term_days=settings.OKOLEO_TERM_DAYS,
            processing_fee=loan_data.processing_fee
        )
        
        # Create loan
        loan = Loan(
            loan_id=loan_data.loan_id,
            borrower_id=borrower_id,
            principal=loan_data.principal,
            interest_rate=settings.OKOLEO_INTEREST_RATE_ANNUAL,
            term_days=settings.OKOLEO_TERM_DAYS,
            processing_fee=loan_data.processing_fee or settings.OKOLEO_PROCESSING_FEE,
            interest_amount=total_due_calc['interest_amount'],
            total_due=total_due_calc['total_due'],
            due_date=due_date,
            status=LoanStatus.PENDING
        )
        
        db.add(loan)
        db.commit()
        db.refresh(loan)
        
        # Log audit
        self._log_audit(db, loan.id, None, "LOAN_CREATED", "Loan", loan.loan_id)
        
        return loan
    
    def get_loan_by_id(self, db: Session, loan_id: int) -> Optional[Loan]:
        """Get loan by database ID"""
        return db.query(Loan).filter(Loan.id == loan_id).first()
    
    def get_loan_by_loan_id(self, db: Session, loan_id: str) -> Optional[Loan]:
        """Get loan by loan_id"""
        return db.query(Loan).filter(Loan.loan_id == loan_id).first()
    
    def get_loans_by_borrower(
        self,
        db: Session,
        borrower_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Loan]:
        """Get all loans for a borrower"""
        return db.query(Loan)\
            .filter(Loan.borrower_id == borrower_id)\
            .offset(skip)\
            .limit(limit)\
            .all()
    
    def update_loan(
        self,
        db: Session,
        loan_id: int,
        update_data: LoanUpdate,
        user_id: int
    ) -> Loan:
        """Update loan details"""
        loan = self.get_loan_by_id(db, loan_id)
        if not loan:
            raise ValueError(f"Loan {loan_id} not found")
        
        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(loan, key, value)
        
        db.commit()
        db.refresh(loan)
        
        # Log audit
        self._log_audit(db, loan.id, user_id, "LOAN_UPDATED", "Loan", loan.loan_id)
        
        return loan
    
    def _log_audit(
        self,
        db: Session,
        loan_id: Optional[int],
        user_id: Optional[int],
        action: str,
        entity_type: str,
        entity_id: str,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None
    ) -> None:
        """Log audit trail"""
        audit_log = AuditLog(
            loan_id=loan_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=old_value,
            new_value=new_value
        )
        db.add(audit_log)
        db.commit()
