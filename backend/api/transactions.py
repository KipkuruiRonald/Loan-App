from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, cast, String, func
from typing import List, Optional
from datetime import datetime
import uuid

from core.database import get_db
from models.models import User, UserRole, Transaction, Loan, LoanStatus, TransactionStatus, TransactionType
from schemas.schemas import TransactionCreate, TransactionResponse, TransactionListResponse
from api.auth import get_current_user

router = APIRouter()


def check_admin(user: User) -> bool:
    """Check if user is admin"""
    return user.role == UserRole.ADMIN


def calculate_outstanding_balance(db: Session, loan: Loan) -> float:
    """Calculate outstanding balance for a loan based on confirmed transactions"""
    # Get all confirmed transactions for this loan
    total_paid = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.loan_id == loan.id,
        Transaction.status == TransactionStatus.CONFIRMED
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
    # Get loan
    loan = db.query(Loan).filter(Loan.id == payment_data.loan_id).first()
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found"
        )
    
    # Verify user owns the loan
    if loan.borrower_id != current_user.id and not check_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only make payments on your own loans"
        )
    
    # Verify loan is active
    if loan.status != LoanStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loan must be active to make payments"
        )
    
    # Calculate outstanding balance
    outstanding_balance = calculate_outstanding_balance(db, loan)
    
    # Validate payment amount
    if payment_data.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be greater than 0"
        )
    
    if payment_data.amount > outstanding_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Amount exceeds outstanding balance of {outstanding_balance}"
        )
    
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
    
    db.commit()
    db.refresh(payment)
    db.refresh(loan)
    
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
