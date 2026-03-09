from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, cast, String, func
from typing import List, Optional
from datetime import datetime
import uuid
import logging

# Configure logging
logger = logging.getLogger(__name__)

from core.database import get_db
from models.models import User, UserRole, Transaction, Loan, LoanStatus, TransactionStatus, TransactionType
from schemas.schemas import TransactionCreate, TransactionResponse, TransactionListResponse
from api.auth import get_current_user

router = APIRouter()


def check_admin(user: User) -> bool:
    """Check if user is admin"""
    return user.role == UserRole.ADMIN


def calculate_outstanding_balance(db: Session, loan: Loan) -> float:
    """Calculate outstanding balance for a loan based on confirmed REPAYMENT transactions"""
    # Get only REPAYMENT transactions for this loan (exclude disbursements)
    total_paid = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.loan_id == loan.id,
        Transaction.status == TransactionStatus.CONFIRMED,
        Transaction.type == TransactionType.REPAYMENT  # Only count repayments, not disbursements
    ).scalar() or 0
    
    return max(0, loan.total_due - float(total_paid))



@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment_data: TransactionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a payment record for a loan repayment.
    """
    logger.info(f"[PAYMENT DEBUG] User {current_user.id} attempting payment for loan {payment_data.loan_id} with amount {payment_data.amount}")
    logger.info(f"[PAYMENT DEBUG] Payment data: loan_id={payment_data.loan_id}, amount={payment_data.amount}, phone_number={getattr(payment_data, 'phone_number', 'NOT_PROVIDED')}")
    
    # Get loan
    loan = db.query(Loan).filter(Loan.id == payment_data.loan_id).first()
    if not loan:
        logger.warning(f"[PAYMENT DEBUG] Loan {payment_data.loan_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found"
        )
    
    logger.info(f"[PAYMENT DEBUG] Found loan: id={loan.id}, borrower_id={loan.borrower_id}, status={loan.status}, phone_number={loan.phone_number}, total_due={loan.total_due}")
    
    # Verify user owns the loan
    if loan.borrower_id != current_user.id and not check_admin(current_user):
        logger.warning(f"[PAYMENT DEBUG] VALIDATION FAILED: User {current_user.id} does not own loan {loan.id} (borrower_id={loan.borrower_id})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only make payments on your own loans"
        )
    
    # Verify loan is active
    logger.info(f"[PAYMENT DEBUG] CHECKING: Loan status = {loan.status} (expected: {LoanStatus.ACTIVE})")
    if loan.status != LoanStatus.ACTIVE:
        logger.warning(f"[PAYMENT DEBUG] VALIDATION FAILED: Loan status is {loan.status}, must be {LoanStatus.ACTIVE}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Loan must be active to make payments. Current status: {loan.status}"
        )
    
    # Log phone number for audit (allow different numbers for payment flexibility)
    user_phone = current_user.phone  # Use user's current phone from profile
    if user_phone:
        # Normalize phone numbers for comparison
        submitted_phone = payment_data.phone_number.replace(' ', '').replace('-', '').replace('+254', '0') if hasattr(payment_data, 'phone_number') and payment_data.phone_number else None
        registered_phone = user_phone.replace(' ', '').replace('-', '').replace('+254', '0')
        
        logger.info(f"[PAYMENT DEBUG] Phone comparison: submitted='{submitted_phone}' (raw: '{getattr(payment_data, 'phone_number', None)}') vs registered='{registered_phone}'")
        
        if submitted_phone and submitted_phone != registered_phone:
            # Allow payment from different number but log it for audit
            logger.info(f"[PAYMENT] User {current_user.id} paying from different number: registered={registered_phone}, used={submitted_phone}")
    else:
        logger.info(f"[PAYMENT DEBUG] No phone number on user profile, skipping phone validation")
    
    # Calculate outstanding balance
    outstanding_balance = calculate_outstanding_balance(db, loan)
    logger.info(f"[PAYMENT DEBUG] Outstanding balance calculated: {outstanding_balance} (loan.total_due={loan.total_due})")
    
    # Validate payment amount
    logger.info(f"[PAYMENT DEBUG] CHECKING: Amount validation - amount={payment_data.amount}")
    if payment_data.amount <= 0:
        logger.warning(f"[PAYMENT DEBUG] VALIDATION FAILED: Amount <= 0 ({payment_data.amount})")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount must be greater than 0. Received: {payment_data.amount}"
        )
    
    # For loans with outstanding balance less than 100, allow exact amount
    if outstanding_balance < 100:
        logger.info(f"[PAYMENT DEBUG] Small balance loan detected: outstanding={outstanding_balance}")
        if payment_data.amount > outstanding_balance:
            logger.warning(f"[PAYMENT DEBUG] VALIDATION FAILED: Amount > outstanding balance ({payment_data.amount} > {outstanding_balance})")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Amount exceeds outstanding balance of {outstanding_balance}. Payment amount: {payment_data.amount}"
            )
    else:
        # For normal loans, enforce minimum 100
        if payment_data.amount < 100:
            logger.warning(f"[PAYMENT DEBUG] VALIDATION FAILED: Amount < 100 ({payment_data.amount})")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Minimum payment amount is KSh 100. Received: {payment_data.amount}"
            )
        
        if payment_data.amount > outstanding_balance:
            logger.warning(f"[PAYMENT DEBUG] VALIDATION FAILED: Amount > outstanding balance ({payment_data.amount} > {outstanding_balance})")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Amount exceeds outstanding balance of {outstanding_balance}. Payment amount: {payment_data.amount}"
            )
    
    logger.info(f"[PAYMENT DEBUG] All validations passed, creating payment record")
    
    # Create payment record
    tx_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
    
    # Calculate new balance after payment
    new_balance = outstanding_balance - payment_data.amount
    
    payment = Transaction(
        transaction_id=tx_id,
        borrower_id=current_user.id,
        loan_id=loan.id,
        type=TransactionType.REPAYMENT,
        amount=payment_data.amount,
        remaining_balance=new_balance,
        status=TransactionStatus.CONFIRMED
    )
    
    db.add(payment)
    
    # Check if fully paid
    if new_balance <= 0:
        loan.status = LoanStatus.SETTLED
        loan.payment_date = datetime.utcnow()
    
    # Update perfect repayment streak based on payment timing
    # Check if payment is on time (before or on due date)
    is_on_time = datetime.utcnow().date() <= loan.due_date.date() if loan.due_date else True
    
    # Bonus points for on-time payment (default 40 from loan parameters)
    bonus_points = 40
    
    if is_on_time:
        # Increment perfect repayment streak
        current_user.perfect_repayment_streak = (current_user.perfect_repayment_streak or 0) + 1
        # Add bonus points to credit score
        current_user.credit_score = (current_user.credit_score or 150) + bonus_points
        logger.info(f"[STREAK] User {current_user.id}: On-time payment! Streak: {current_user.perfect_repayment_streak}, +{bonus_points} credit points")
    else:
        # Reset streak on late payment
        old_streak = current_user.perfect_repayment_streak or 0
        current_user.perfect_repayment_streak = 0
        logger.info(f"[STREAK] User {current_user.id}: Late payment! Streak reset from {old_streak} to 0")
    
    db.commit()
    db.refresh(payment)
    db.refresh(loan)
    db.refresh(current_user)
    
    # After successful payment, evaluate user's tier
    try:
        from services.tier_service import TierService
        tier_service = TierService(db)
        tier_result = tier_service.update_user_tier(current_user.id)
        if tier_result.get('changed'):
            logger.info(f"[TIER] User {current_user.id} tier changed: {tier_result['old_tier']} -> {tier_result['new_tier']}")
    except Exception as tier_error:
        logger.error(f"[TIER] Error evaluating tier for user {current_user.id}: {tier_error}")
    
    return payment


# Also handle POST without trailing slash
@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_no_slash(
    payment_data: TransactionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a payment record for a loan repayment (no trailing slash).
    """
    logger.info(f"[PAYMENT DEBUG] User {current_user.id} attempting payment for loan {payment_data.loan_id} with amount {payment_data.amount}")
    logger.info(f"[PAYMENT DEBUG] Payment data: loan_id={payment_data.loan_id}, amount={payment_data.amount}, phone_number={getattr(payment_data, 'phone_number', 'NOT_PROVIDED')}")
    
    # Get loan
    loan = db.query(Loan).filter(Loan.id == payment_data.loan_id).first()
    if not loan:
        logger.warning(f"[PAYMENT DEBUG] Loan {payment_data.loan_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found"
        )
    
    logger.info(f"[PAYMENT DEBUG] Found loan: id={loan.id}, borrower_id={loan.borrower_id}, status={loan.status}, phone_number={loan.phone_number}, total_due={loan.total_due}")
    
    # Verify user owns the loan
    if loan.borrower_id != current_user.id and not check_admin(current_user):
        logger.warning(f"[PAYMENT DEBUG] VALIDATION FAILED: User {current_user.id} does not own loan {loan.id} (borrower_id={loan.borrower_id})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only make payments on your own loans"
        )
    
    # Verify loan is active
    logger.info(f"[PAYMENT DEBUG] CHECKING: Loan status = {loan.status} (expected: {LoanStatus.ACTIVE})")
    if loan.status != LoanStatus.ACTIVE:
        logger.warning(f"[PAYMENT DEBUG] VALIDATION FAILED: Loan status is {loan.status}, must be {LoanStatus.ACTIVE}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Loan must be active to make payments. Current status: {loan.status}"
        )
    
    # Log phone number for audit (allow different numbers for payment flexibility)
    user_phone = current_user.phone  # Use user's current phone from profile
    if user_phone:
        # Normalize phone numbers for comparison
        submitted_phone = payment_data.phone_number.replace(' ', '').replace('-', '').replace('+254', '0') if hasattr(payment_data, 'phone_number') and payment_data.phone_number else None
        registered_phone = user_phone.replace(' ', '').replace('-', '').replace('+254', '0')
        
        logger.info(f"[PAYMENT DEBUG] Phone comparison: submitted='{submitted_phone}' (raw: '{getattr(payment_data, 'phone_number', None)}') vs registered='{registered_phone}'")
        
        if submitted_phone and submitted_phone != registered_phone:
            # Allow payment from different number but log it for audit
            logger.info(f"[PAYMENT] User {current_user.id} paying from different number: registered={registered_phone}, used={submitted_phone}")
    else:
        logger.info(f"[PAYMENT DEBUG] No phone number on user profile, skipping phone validation")
    
    # Calculate outstanding balance
    outstanding_balance = calculate_outstanding_balance(db, loan)
    logger.info(f"[PAYMENT DEBUG] Outstanding balance calculated: {outstanding_balance} (loan.total_due={loan.total_due})")
    
    # Validate payment amount
    logger.info(f"[PAYMENT DEBUG] CHECKING: Amount validation - amount={payment_data.amount}")
    if payment_data.amount <= 0:
        logger.warning(f"[PAYMENT DEBUG] VALIDATION FAILED: Amount <= 0 ({payment_data.amount})")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount must be greater than 0. Received: {payment_data.amount}"
        )
    
    # For loans with outstanding balance less than 100, allow exact amount
    if outstanding_balance < 100:
        logger.info(f"[PAYMENT DEBUG] Small balance loan detected: outstanding={outstanding_balance}")
        if payment_data.amount > outstanding_balance:
            logger.warning(f"[PAYMENT DEBUG] VALIDATION FAILED: Amount > outstanding balance ({payment_data.amount} > {outstanding_balance})")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Amount exceeds outstanding balance of {outstanding_balance}. Payment amount: {payment_data.amount}"
            )
    else:
        # For normal loans, enforce minimum 100
        if payment_data.amount < 100:
            logger.warning(f"[PAYMENT DEBUG] VALIDATION FAILED: Amount < 100 ({payment_data.amount})")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Minimum payment amount is KSh 100. Received: {payment_data.amount}"
            )
        
        if payment_data.amount > outstanding_balance:
            logger.warning(f"[PAYMENT DEBUG] VALIDATION FAILED: Amount > outstanding balance ({payment_data.amount} > {outstanding_balance})")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Amount exceeds outstanding balance of {outstanding_balance}. Payment amount: {payment_data.amount}"
            )
    
    logger.info(f"[PAYMENT DEBUG] All validations passed, creating payment record")
    
    # Create payment record
    tx_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
    
    # Calculate new balance after payment
    new_balance = outstanding_balance - payment_data.amount
    
    payment = Transaction(
        transaction_id=tx_id,
        borrower_id=current_user.id,
        loan_id=loan.id,
        type=TransactionType.REPAYMENT,
        amount=payment_data.amount,
        remaining_balance=new_balance,
        status=TransactionStatus.CONFIRMED
    )
    
    db.add(payment)
    
    # Check if fully paid
    if new_balance <= 0:
        loan.status = LoanStatus.SETTLED
        loan.payment_date = datetime.utcnow()
    
    # Update perfect repayment streak based on payment timing
    # Check if payment is on time (before or on due date)
    is_on_time = datetime.utcnow().date() <= loan.due_date.date() if loan.due_date else True
    
    # Bonus points for on-time payment (default 40 from loan parameters)
    bonus_points = 40
    
    if is_on_time:
        # Increment perfect repayment streak
        current_user.perfect_repayment_streak = (current_user.perfect_repayment_streak or 0) + 1
        # Add bonus points to credit score
        current_user.credit_score = (current_user.credit_score or 150) + bonus_points
        logger.info(f"[STREAK] User {current_user.id}: On-time payment! Streak: {current_user.perfect_repayment_streak}, +{bonus_points} credit points")
    else:
        # Reset streak on late payment
        old_streak = current_user.perfect_repayment_streak or 0
        current_user.perfect_repayment_streak = 0
        logger.info(f"[STREAK] User {current_user.id}: Late payment! Streak reset from {old_streak} to 0")
    
    db.commit()
    db.refresh(payment)
    db.refresh(loan)
    db.refresh(current_user)
    
    # After successful payment, evaluate user's tier
    try:
        from services.tier_service import TierService
        tier_service = TierService(db)
        tier_result = tier_service.update_user_tier(current_user.id)
        if tier_result.get('changed'):
            logger.info(f"[TIER] User {current_user.id} tier changed: {tier_result['old_tier']} -> {tier_result['new_tier']}")
    except Exception as tier_error:
        logger.error(f"[TIER] Error evaluating tier for user {current_user.id}: {tier_error}")
    
    return payment


@router.get("/", response_model=List[TransactionResponse])
async def get_my_payments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get payments for current user"""
    if check_admin(current_user):
        # Admins see all payments
        payments = db.query(Transaction).offset(skip).limit(limit).all()
    else:
        # Regular users see only their payments
        payments = db.query(Transaction).filter(
            Transaction.borrower_id == current_user.id
        ).offset(skip).limit(limit).all()
    
    return payments


# Also handle route without trailing slash (prevents redirect that loses auth token)
@router.get("", response_model=List[TransactionResponse])
async def get_my_payments_no_slash(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get payments for current user (no trailing slash)"""
    if check_admin(current_user):
        # Admins see all payments
        payments = db.query(Transaction).offset(skip).limit(limit).all()
    else:
        # Regular users see only their payments
        payments = db.query(Transaction).filter(
            Transaction.borrower_id == current_user.id
        ).offset(skip).limit(limit).all()
    
    return payments


# Search endpoint - MUST come before parameterized routes
@router.get("/search", response_model=TransactionListResponse)
async def search_payments(
    q: str = Query("", description="Search query"),
    status: Optional[str] = Query(None, description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search payments for current user.
    
    - Regular users can only see their own payments
    - Admins can see all payments
    """
    search_term = f"%{q}%"
    
    # Base query depending on user role
    if check_admin(current_user):
        # Admins see all payments
        query = db.query(Transaction)
    else:
        # Regular users see only their payments
        query = db.query(Transaction).filter(Transaction.borrower_id == current_user.id)
    
    # Apply search filter
    if q:
        query = query.filter(
            or_(
                Transaction.transaction_id.like(search_term),
                cast(Transaction.amount, String).like(search_term)
            )
        )
    
    # Apply status filter
    if status:
        try:
            query = query.filter(Transaction.status == status.upper())
        except ValueError:
            pass  # Invalid status value, ignore filter
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    payments = query.order_by(Transaction.initiated_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "items": payments,
        "total": total,
        "skip": skip,
        "limit": limit
    }


# Recent payments endpoint - MUST come before parameterized routes
@router.get("/recent")
async def get_recent_payments(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent payments for current user (empty search fallback)
    """
    if check_admin(current_user):
        payments = db.query(Transaction).order_by(
            Transaction.initiated_at.desc()
        ).offset(skip).limit(limit).all()
    else:
        payments = db.query(Transaction).filter(
            Transaction.borrower_id == current_user.id
        ).order_by(Transaction.initiated_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "items": payments,
        "total": len(payments),
        "skip": skip,
        "limit": limit
    }


# Get payment by ID - MUST be LAST (parameterized route)
@router.get("/{payment_id}", response_model=TransactionResponse)
async def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get payment details"""
    payment = db.query(Transaction).filter(Transaction.id == payment_id).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Check access permissions
    if not check_admin(current_user) and payment.borrower_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return payment
