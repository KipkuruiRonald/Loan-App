from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, cast, String
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from pydantic import BaseModel

from core.database import get_db
from models.models import User, UserRole, AuditLog, Loan, LoanStatus, Transaction, TransactionType, TransactionStatus, Notification, NotificationType, NotificationPriority, SystemSettings, UserProfile, SystemMaintenance
from schemas.schemas import AuditLogResponse, UserResponse, AdminUserResponse
from api.auth import get_current_user, require_role
from services.balance_service import BalanceService
from services.sms_service import sms_service, SMSService

router = APIRouter()


class UserUpdateSchema(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# Stats endpoint
@router.get("/stats")
async def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get comprehensive admin statistics"""
    try:
        # Count active loans
        active_loans = db.query(Loan).filter(Loan.status == 'ACTIVE').count()
        
        # Count pending loans
        pending_loans = db.query(Loan).filter(Loan.status == 'PENDING').count()
        
        # Count total users
        total_users = db.query(User).count()
        
        # Calculate default rate
        total_loans_count = db.query(Loan).count()
        defaulted_loans = db.query(Loan).filter(Loan.status == 'DEFAULTED').count()
        default_rate = (defaulted_loans / total_loans_count * 100) if total_loans_count > 0 else 0
        
        # Calculate portfolio value (sum of total_due for active loans)
        portfolio_value = db.query(func.sum(Loan.total_due)).filter(Loan.status == 'ACTIVE').scalar() or 0
        
        # Calculate disbursed today (sum of principal for loans created today)
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        disbursed_today = db.query(func.sum(Loan.principal)).filter(Loan.created_at >= today_start).scalar() or 0
        
        # Total disbursed all time
        total_disbursed = db.query(func.sum(Loan.principal)).scalar() or 0
        
        # Total repaid
        total_repaid = db.query(func.sum(Transaction.amount)).filter(
            Transaction.type == "REPAYMENT",
            Transaction.status == "CONFIRMED"
        ).scalar() or 0
        
        # Outstanding balance - sum of total_due for ACTIVE loans
        outstanding = db.query(func.sum(Loan.total_due)).filter(
            Loan.status == "ACTIVE"
        ).scalar() or 0
        
        # If total_due is not populated, calculate from principal + interest
        if outstanding == 0 and active_loans > 0:
            # Fallback calculation
            active_loan_records = db.query(Loan).filter(Loan.status == "ACTIVE").all()
            outstanding = sum(float(loan.principal or 0) + float(loan.interest_amount or 0) for loan in active_loan_records)
        
        # Recent loans for charts (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_loans_query = db.query(
            func.date(Loan.created_at).label('date'),
            func.count(Loan.id).label('count'),
            func.sum(Loan.principal).label('total')
        ).filter(
            Loan.created_at >= thirty_days_ago
        ).group_by(
            func.date(Loan.created_at)
        ).order_by(
            func.date(Loan.created_at)
        ).all()
        
        # Loan status breakdown
        status_counts = db.query(
            Loan.status,
            func.count(Loan.id).label('count')
        ).group_by(Loan.status).all()
        
        return {
            "active_loans": active_loans,
            "pending_approvals": pending_loans,
            "total_users": total_users,
            "default_rate": round(default_rate, 2),
            "portfolio_value": float(portfolio_value),
            "disbursed_today": float(disbursed_today),
            "total_disbursed": float(total_disbursed),
            "total_repaid": float(total_repaid),
            "outstanding": float(outstanding),
            "recent_loans": [
                {
                    "date": r.date.isoformat() if r.date else None,
                    "count": r.count,
                    "total": float(r.total or 0)
                } for r in recent_loans_query
            ],
            "status_breakdown": [
                {
                    "status": s.status.value if s.status else None,
                    "count": s.count
                } for s in status_counts
            ],
            "user_tiers": {},
        }
    except Exception as e:
        print(f"ERROR in get_admin_stats: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "active_loans": 0,
            "pending_approvals": 0,
            "total_users": 0,
            "default_rate": 0,
            "portfolio_value": 0,
            "disbursed_today": 0,
            "total_disbursed": 0,
            "total_repaid": 0,
            "outstanding": 0,
            "recent_loans": [],
            "status_breakdown": [],
            "user_tiers": {},
            "error": str(e)
        }
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending-approvals", response_model=List[dict])
async def get_pending_approvals(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Get all pending loan applications"""
    try:
        loans = db.query(Loan).filter(Loan.status == 'PENDING').offset(skip).limit(limit).all()
        
        result = []
        for loan in loans:
            borrower = db.query(User).filter(User.id == loan.borrower_id).first() if loan.borrower_id else None
            result.append({
                "id": loan.id,
                "loan_id": loan.loan_id,
                "borrower_name": borrower.full_name if borrower else "Unknown",
                "borrower_id": loan.borrower_id,
                "principal": loan.principal,
                "interest_rate": loan.interest_rate,
                "term_days": loan.term_days,
                "total_due": loan.total_due,
                "status": loan.status.value if loan.status else None,
                "submitted_at": loan.created_at.isoformat() if loan.created_at else None,
                "due_date": loan.due_date.isoformat() if loan.due_date else None,
                "borrower": {
                    "full_name": borrower.full_name if borrower else "Unknown",
                    "email": borrower.email if borrower else "",
                } if borrower else None,
            })
        
        return result
    except Exception as e:
        print(f"ERROR in get_pending_approvals: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/loans/{loan_id}/approve")
async def approve_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Approve a loan application and trigger M-Pesa B2C disbursement"""
    try:
        # Lock the loan row to prevent concurrent approvals
        loan = db.query(Loan).filter(Loan.id == loan_id).with_for_update().first()
        
        if not loan:
            raise HTTPException(status_code=404, detail="Loan not found")
        
        # Check if already processed
        if loan.status != LoanStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Loan already {loan.status.value}. Cannot approve."
            )
        
        # Check for existing pending/confirmed disbursement transaction
        existing = db.query(Transaction).filter(
            Transaction.loan_id == loan_id,
            Transaction.type == TransactionType.DISBURSEMENT,
            Transaction.status.in_([TransactionStatus.PROCESSING, TransactionStatus.CONFIRMED])
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Loan already has a pending or completed disbursement"
            )
        
        # Set status to PROCESSING to prevent concurrent approvals
        loan.status = LoanStatus.PROCESSING
        db.commit()
        
        # Initialize balance service
        balance_service = BalanceService(db)
        
        # Check if company has enough funds for disbursement
        eligible, message = balance_service.check_disbursement_eligibility(loan.principal)
        if not eligible:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        # Get borrower's phone
        user = db.query(User).filter(User.id == loan.borrower_id).first()
        if not user or not user.phone:
            raise HTTPException(status_code=400, detail="Borrower has no phone number")
        
        # Process actual B2C disbursement via M-Pesa
        disbursement_result = balance_service.process_disbursement(
            user_id=loan.borrower_id,
            amount=loan.principal,
            loan_id=loan.id,
            phone_number=user.phone
        )
        
        if not disbursement_result.get("success"):
            # Revert status to PENDING on failure
            loan.status = LoanStatus.PENDING
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=disbursement_result.get("message", "Failed to process disbursement")
            )
        
        # Loan status updates to ACTIVE only after successful disbursement
        loan.status = LoanStatus.ACTIVE
        
        # Commit all changes
        db.commit()
        
        # Create audit log
        audit = AuditLog(
            user_id=current_user.id,
            action='LOAN_APPROVED',
            entity_type='Loan',
            entity_id=str(loan_id),
            old_value='PENDING',
            new_value='ACTIVE',
            details=f'Loan {loan.loan_id} approved. KSh {loan.principal} disbursed to {user.phone}. Transaction: {disbursement_result.get("transaction_id")}'
        )
        db.add(audit)
        
        # Create notification for borrower
        notification = Notification(
            user_id=loan.borrower_id,
            type=NotificationType.LOAN_APPROVED,
            title="Loan Approved ✓",
            message=f"Your loan application for KSh {loan.principal:,.0f} has been approved. Funds have been sent to your M-Pesa.",
            priority=NotificationPriority.HIGH,
            related_entity_type="LOAN",
            related_entity_id=loan.id
        )
        db.add(notification)
        db.commit()
        
        return {
            "success": True,
            "message": "Loan approved and disbursement initiated",
            "loan_id": loan.loan_id,
            "transaction_id": disbursement_result.get("transaction_id"),
            "amount": loan.principal,
            "phone_number": user.phone
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in approve_loan: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/loans/{loan_id}/reject")
async def reject_loan(
    loan_id: int,
    reason: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Reject a loan application.
    NO M-Pesa transaction occurs - just status update and notification.
    """
    try:
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        
        if not loan:
            raise HTTPException(status_code=404, detail="Loan not found")
        
        # Check if already processed
        if loan.status != LoanStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Loan already {loan.status}. Cannot reject."
            )
        
        # Update loan status - NO PAYMENT, just rejection
        loan.status = LoanStatus.REJECTED
        db.commit()
        
        # Create audit log
        audit = AuditLog(
            user_id=current_user.id,
            action='LOAN_REJECTED',
            entity_type='Loan',
            entity_id=loan_id,
            old_value='PENDING',
            new_value='REJECTED',
            details=f'Loan {loan.loan_id} rejected by admin {current_user.username}. Reason: {reason or "No reason provided"}'
        )
        db.add(audit)
        
        # Create notification for borrower
        rejection_message = reason if reason else "Your application did not meet our current lending criteria."
        notification = Notification(
            user_id=loan.borrower_id,
            type=NotificationType.LOAN_DECLINED,
            title="Loan Application Update",
            message=f"Your loan application for KSh {loan.principal:,.0f} has been reviewed. {rejection_message} If you have questions, please contact support.",
            priority=NotificationPriority.MEDIUM,
            related_entity_type="LOAN",
            related_entity_id=loan.id
        )
        db.add(notification)
        db.commit()
        
        return {
            "success": True,
            "message": "Loan rejected successfully. No payment sent.",
            "loan_id": loan.loan_id,
            "status": "REJECTED",
            "disbursement": False
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in reject_loan: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/loans")
async def get_admin_loans(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Get all loans with optional status filter"""
    try:
        query = db.query(Loan)
        
        if status:
            query = query.filter(Loan.status == status.upper())
        
        loans = query.offset(skip).limit(limit).all()
        
        result = []
        for loan in loans:
            borrower = db.query(User).filter(User.id == loan.borrower_id).first() if loan.borrower_id else None
            
            # Calculate current outstanding from transactions
            total_paid = db.query(func.sum(Transaction.amount)).filter(
                Transaction.loan_id == loan.id,
                Transaction.type == "REPAYMENT",
                Transaction.status == "CONFIRMED"
            ).scalar() or 0
            
            current_outstanding = max(0, (loan.total_due or 0) - total_paid)
            
            result.append({
                "id": loan.id,
                "loan_id": loan.loan_id,
                "borrower_name": borrower.full_name if borrower else "Unknown",
                "borrower_id": loan.borrower_id,
                "principal": float(loan.principal or 0),
                "interest_rate": float(loan.interest_rate or 0),
                "term_days": loan.term_days,
                "total_due": float(loan.total_due or 0),
                "current_outstanding": float(current_outstanding),
                "status": loan.status.value if loan.status else None,
                "due_date": loan.due_date.isoformat() if loan.due_date else None,
                "created_at": loan.created_at.isoformat() if loan.created_at else None,
                "updated_at": loan.updated_at.isoformat() if loan.updated_at else None,
            })
        
        return result
    except Exception as e:
        print(f"ERROR in get_admin_loans: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/loans/{loan_id}/mark-default")
async def mark_loan_default(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Mark a loan as defaulted"""
    try:
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        
        if not loan:
            raise HTTPException(status_code=404, detail="Loan not found")
        
        loan.status = 'DEFAULTED'
        db.commit()
        
        # Create audit log
        audit = AuditLog(
            user_id=current_user.id,
            action='LOAN_DEFAULTED',
            entity_type='Loan',
            entity_id=loan_id,
            details=f'Loan {loan.loan_id} marked as defaulted'
        )
        db.add(audit)
        db.commit()
        
        return {"message": "Loan marked as defaulted", "loan_id": loan_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in mark_loan_default: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users", response_model=List[AdminUserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Get all users with KYC status (Admin only)"""
    try:
        users = db.query(User).offset(skip).limit(limit).all()
        
        # Build response with KYC status from UserProfile
        result = []
        for user in users:
            # Get KYC status from UserProfile
            profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
            
            user_dict = {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "phone": user.phone,
                "national_id": user.national_id,
                "date_of_birth": user.date_of_birth,
                "location": user.location,
                "role": user.role.value if user.role else None,
                "is_active": user.is_active,
                "is_verified": profile.kyc_status == "VERIFIED" if profile else False,
                "last_login": user.last_login,
                "last_login_ip": user.last_login_ip,
                "login_count": user.login_count,
                "credit_tier": user.credit_tier,
                "credit_score": user.credit_score,
                "perfect_repayment_streak": user.perfect_repayment_streak,
                "current_limit": user.current_limit,
                "max_limit_achieved": user.max_limit_achieved,
                "borrowing_blocked": user.borrowing_blocked,
                "created_at": user.created_at,
                "updated_at": user.updated_at,
                "kyc_status": profile.kyc_status if profile and profile.kyc_status else "PENDING",
            }
            result.append(user_dict)
        
        return result
    except Exception as e:
        print(f"ERROR in get_all_users: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kyc/verify/{user_id}")
async def verify_user_kyc(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Verify a user's KYC (Admin only)"""
    try:
        print(f"\n🔵 [KYC VERIFY] ====== START =====")
        print(f"🔵 [KYC VERIFY] User ID: {user_id}")
        print(f"🔵 [KYC VERIFY] Current admin: {current_user.id} - {current_user.username}")
        
        # Find user profile (KYC status is stored in UserProfile)
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        if not profile:
            # Create profile if doesn't exist
            profile = UserProfile(user_id=user_id, kyc_status="PENDING")
            db.add(profile)
            db.commit()
            db.refresh(profile)
            print(f"🔵 [KYC VERIFY] Created new profile for user {user_id}")
        
        print(f"🔵 [KYC VERIFY] Current KYC status: {profile.kyc_status}")
        
        # Update profile
        profile.kyc_status = "VERIFIED"
        profile.kyc_verified_at = datetime.utcnow()
        
        print(f"🔵 [KYC VERIFY] New KYC status set to: {profile.kyc_status}")
        print(f"🔵 [KYC VERIFY] Verified at: {profile.kyc_verified_at}")
        
        # Commit changes - THIS IS CRITICAL
        db.commit()
        print(f"✅ [KYC VERIFY] Database committed successfully")
        
        # Refresh to get latest data
        db.refresh(profile)
        print(f"✅ [KYC VERIFY] Final KYC status: {profile.kyc_status}")
        
        # Create audit log
        user = db.query(User).filter(User.id == user_id).first()
        audit = AuditLog(
            user_id=current_user.id,
            action='KYC_VERIFIED',
            entity_type='User',
            entity_id=str(user_id),
            details=f"User {user.full_name if user else user_id} KYC verified by admin"
        )
        db.add(audit)
        db.commit()
        print(f"✅ [KYC VERIFY] Audit log created")
        
        print(f"✅ [KYC VERIFY] ====== SUCCESS =====\n")
        return {"message": "User KYC verified successfully", "kyc_status": profile.kyc_status}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"🔴 [KYC VERIFY] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kyc/reject/{user_id}")
async def reject_user_kyc(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Reject a user's KYC with reason (Admin only)"""
    try:
        print(f"\n🔵 [KYC REJECT] ====== START =====")
        print(f"🔵 [KYC REJECT] User ID: {user_id}")
        
        data = await request.json()
        reason = data.get("reason", "No reason provided")
        
        print(f"🔵 [KYC REJECT] Reason: {reason}")
        
        # Find user profile (KYC status is stored in UserProfile)
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        if not profile:
            # Create profile if doesn't exist
            profile = UserProfile(user_id=user_id, kyc_status="PENDING")
            db.add(profile)
            db.commit()
            db.refresh(profile)
            print(f"🔵 [KYC REJECT] Created new profile for user {user_id}")
        
        print(f"🔵 [KYC REJECT] Current KYC status: {profile.kyc_status}")
        
        profile.kyc_status = "REJECTED"
        profile.kyc_rejection_reason = reason
        
        print(f"🔵 [KYC REJECT] New KYC status set to: {profile.kyc_status}")
        print(f"🔵 [KYC REJECT] Rejection reason: {profile.kyc_rejection_reason}")
        
        db.commit()
        print(f"✅ [KYC REJECT] Database committed successfully")
        
        # Create audit log
        user = db.query(User).filter(User.id == user_id).first()
        audit = AuditLog(
            user_id=current_user.id,
            action='KYC_REJECTED',
            entity_type='User',
            entity_id=str(user_id),
            details=f"User {user.full_name if user else user_id} KYC rejected: {reason}"
        )
        db.add(audit)
        db.commit()
        print(f"✅ [KYC REJECT] Audit log created")
        
        print(f"✅ [KYC REJECT] ====== SUCCESS =====\n")
        return {"message": "User KYC rejected", "reason": reason}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"🔴 [KYC REJECT] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit-logs")
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Get audit logs (Admin only)"""
    try:
        query = db.query(AuditLog)
        
        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
        
        if action:
            query = query.filter(AuditLog.action == action)
        
        # Get total count for pagination
        total = query.count()
        
        # Get paginated results
        logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
        
        # Format response based on actual AuditLog model fields
        items = []
        for log in logs:
            log_dict = {
                "id": log.id,
                "loan_id": log.loan_id,
                "user_id": log.user_id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            items.append(log_dict)
        
        return {
            "items": items,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        print(f"ERROR in get_audit_logs: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit-logs/loan/{loan_id}")
async def get_loan_audit_logs(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Get audit logs for a specific loan (Admin only)"""
    try:
        logs = db.query(AuditLog)\
            .filter(AuditLog.loan_id == loan_id)\
            .order_by(AuditLog.created_at.desc())\
            .all()
        
        result = []
        for log in logs:
            # Try to convert entity_id to int if possible
            entity_id_value = log.entity_id
            if entity_id_value:
                try:
                    entity_id_value = int(entity_id_value)
                except (ValueError, TypeError):
                    entity_id_value = entity_id_value
            
            result.append({
                "id": log.id,
                "loan_id": log.loan_id,
                "user_id": log.user_id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": entity_id_value,
                "details": log.details,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            })
        
        return result
    except Exception as e:
        print(f"ERROR in get_loan_audit_logs: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Activate or deactivate a user (Admin only)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.is_active = is_active
        db.commit()
        
        return {"message": f"User {user.username} {'activated' if is_active else 'deactivated'} successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in update_user_status: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    user_data: UserUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Update user details (Admin only) - preserves all data integrity"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Don't allow admin to deactivate themselves
        if user.id == current_user.id and user_data.is_active == False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="You cannot deactivate your own account"
            )
        
        # Update only provided fields
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == 'role' and value:
                try:
                    user.role = UserRole(value)
                except ValueError:
                    pass
            else:
                setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        
        # Log the action for audit trail
        audit_log = AuditLog(
            user_id=current_user.id,
            action="USER_UPDATED",
            entity_type="USER",
            entity_id=str(user_id),
            old_value=str({k: getattr(user, k) for k in update_data.keys() if hasattr(user, k)}),
            new_value=str(update_data),
            details=f"Admin {current_user.id} updated user {user_id}"
        )
        db.add(audit_log)
        
        db.commit()
        db.refresh(user)
        
        return {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role.value if user.role else None,
            "is_active": user.is_active,
            "updated_at": user.updated_at
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in update_user: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Soft delete user - sets is_active=False, preserves all historical data"""
    try:
        # Prevent self-deletion
        if user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot delete your own account"
            )
        
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if user has active loans
        active_loans = db.query(Loan).filter(
            Loan.borrower_id == user_id,
            Loan.status.in_(["ACTIVE", "PENDING"])
        ).count()
        
        if active_loans > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete user with {active_loans} active loan(s). Settle loans first."
            )
        
        # Store old values for audit
        old_values = {
            "is_active": user.is_active,
            "email": user.email,
            "full_name": user.full_name
        }
        
        # SOFT DELETE - just deactivate
        user.is_active = False
        user.email = f"deleted_{user.id}_{user.email}"  # Anonymize email
        user.phone = None  # Remove phone
        user.updated_at = datetime.utcnow()
        
        # Log the deletion for audit trail
        audit_log = AuditLog(
            user_id=current_user.id,
            action="USER_DELETED",
            entity_type="USER",
            entity_id=str(user_id),
            old_value=str(old_values),
            new_value=str({"is_active": False, "status": "deleted"}),
            details=f"Admin {current_user.id} soft deleted user {user_id}"
        )
        db.add(audit_log)
        
        db.commit()
        
        return {
            "message": "User deactivated successfully",
            "user_id": user_id,
            "status": "deleted",
            "note": "User data preserved for historical records"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in delete_user: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users/{user_id}/restore")
async def restore_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Restore a soft-deleted user"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Restore user
        user.is_active = True
        # Restore email if it was anonymized
        if user.email and user.email.startswith(f"deleted_{user_id}_"):
            user.email = user.email.replace(f"deleted_{user_id}_", "")
        user.updated_at = datetime.utcnow()
        
        # Log restoration
        audit_log = AuditLog(
            user_id=current_user.id,
            action="USER_RESTORED",
            entity_type="USER",
            entity_id=str(user_id),
            details=f"Admin {current_user.id} restored user {user_id}"
        )
        db.add(audit_log)
        
        db.commit()
        
        return {"message": "User restored successfully", "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in restore_user: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


class SendMessageRequest(BaseModel):
    message: str


@router.post("/users/{user_id}/message")
async def send_user_message(
    user_id: int,
    request: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Send an SMS message to a user using their registered phone number"""
    try:
        # Get user details
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        # Check if user has phone number (from User model)
        if not user.phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User has no phone number registered"
            )
        
        # Initialize SMS service
        sms_service = SMSService()
        
        # Prepare message with admin signature
        full_message = f"Message from Okolea Admin ({current_user.full_name}): {request.message}"
        
        # Send SMS using user.phone
        result = sms_service.send_sms(user.phone, full_message)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send SMS: {result.get('error', 'Unknown error')}"
            )
        
        # Create audit log
        audit_log = AuditLog(
            user_id=current_user.id,
            action="SMS_SENT",
            entity_type="USER",
            entity_id=str(user_id),
            details=f"Admin sent SMS to user {user_id}. Message ID: {result.get('message_id')}"
        )
        db.add(audit_log)
        db.commit()
        
        return {
            "success": True,
            "message": "SMS sent successfully",
            "message_id": result.get("message_id"),
            "recipient": user.phone
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in send_user_message: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/{user_id}/delete-check")
async def check_user_delete_eligibility(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Check if user can be deleted - returns warnings and blocks self-deletion"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # BLOCK SELF-DELETION
        if user_id == current_user.id:
            return {
                "can_delete": False,
                "self_delete": True,
                "warnings": ["You cannot delete your own account"],
                "financial_summary": {},
                "user_id": user_id
            }
        
        warnings = []
        financial_summary = {}
        can_delete = True
        
        # Financial checks - active loans
        active_loans = db.query(Loan).filter(
            Loan.borrower_id == user_id,
            Loan.status.in_(["ACTIVE", "PENDING"])
        ).all()
        
        if active_loans:
            total = sum(loan.total_due or 0 for loan in active_loans)
            warnings.append(f"{len(active_loans)} active loan(s): KSh {total:,.2f}")
            financial_summary["active_loans"] = {"count": len(active_loans), "total": total}
            can_delete = False
        
        # Financial checks - overdue loans
        overdue_loans = db.query(Loan).filter(
            Loan.borrower_id == user_id,
            Loan.status == "ACTIVE",
            Loan.due_date < datetime.now()
        ).all()
        
        if overdue_loans:
            total = sum(loan.total_due or 0 for loan in overdue_loans)
            warnings.append(f"{len(overdue_loans)} overdue loan(s): KSh {total:,.2f}")
            financial_summary["overdue_loans"] = {"count": len(overdue_loans), "total": total}
            can_delete = False
        
        # Financial checks - pending transactions
        pending_tx = db.query(Transaction).filter(
            Transaction.borrower_id == user_id,
            Transaction.status == "PENDING"
        ).all()
        
        if pending_tx:
            total = sum(t.amount for t in pending_tx)
            warnings.append(f"{len(pending_tx)} pending transaction(s): KSh {total:,.2f}")
            financial_summary["pending_transactions"] = {"count": len(pending_tx), "total": total}
            can_delete = False
        
        return {
            "can_delete": can_delete,
            "warnings": warnings,
            "financial_summary": financial_summary,
            "user_id": user_id,
            "user_name": user.full_name
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in check_user_delete_eligibility: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# SEARCH ENDPOINTS (Admin only)
# ============================================================================

@router.get("/search/users")
async def search_users(
    q: str = Query("", description="Search query"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Search users by name, email, phone, or national_id (Admin only)
    """
    try:
        search_term = f"%{q}%"
        
        # Build query with filters
        query = db.query(User).filter(
            or_(
                func.lower(User.full_name).like(func.lower(search_term)),
                func.lower(User.email).like(func.lower(search_term)),
                User.phone.like(search_term),
                User.national_id.like(search_term)
            )
        )
        
        # Get total count
        total = query.count()
        
        # Get paginated results
        users = query.offset(skip).limit(limit).all()
        
        # Get loan counts for each user
        result = []
        for user in users:
            loan_count = db.query(Loan).filter(Loan.borrower_id == user.id).count()
            total_borrowed = db.query(func.sum(Loan.principal)).filter(Loan.borrower_id == user.id).scalar() or 0
            
            result.append({
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "national_id": user.national_id,
                "role": user.role.value if user.role else None,
                "is_active": user.is_active,
                "credit_tier": user.credit_tier,
                "credit_score": user.credit_score,
                "current_limit": user.current_limit,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "loan_count": loan_count,
                "total_borrowed": float(total_borrowed),
            })
        
        return {
            "items": result,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        print(f"ERROR in search_users: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search/loans")
async def search_loans(
    q: str = Query("", description="Search query"),
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Search loans by loan_id, amount, status, or borrower name (Admin only)
    """
    try:
        search_term = f"%{q}%"
        
        # Build query with joins
        query = db.query(
            Loan,
            User.full_name.label("borrower_name"),
            User.email.label("borrower_email"),
            User.phone.label("borrower_phone")
        ).join(
            User, Loan.borrower_id == User.id
        ).filter(
            or_(
                Loan.loan_id.like(search_term),
                cast(Loan.principal, String).like(search_term),
                Loan.status.like(func.upper(search_term)),
                func.lower(User.full_name).like(func.lower(search_term)),
                User.email.like(search_term),
                User.phone.like(search_term)
            )
        )
        
        # Apply status filter if provided
        if status:
            query = query.filter(Loan.status == status.upper())
        
        # Get total count
        total = query.count()
        
        # Get paginated results
        results = query.offset(skip).limit(limit).all()
        
        # Format response
        loans = []
        for loan, borrower_name, borrower_email, borrower_phone in results:
            loans.append({
                "id": loan.id,
                "loan_id": loan.loan_id,
                "borrower_id": loan.borrower_id,
                "borrower_name": borrower_name,
                "borrower_email": borrower_email,
                "borrower_phone": borrower_phone,
                "principal": loan.principal,
                "total_due": loan.total_due,
                "interest_rate": loan.interest_rate,
                "term_days": loan.term_days,
                "status": loan.status.value if loan.status else None,
                "due_date": loan.due_date.isoformat() if loan.due_date else None,
                "created_at": loan.created_at.isoformat() if loan.created_at else None,
            })
        
        return {
            "items": loans,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        print(f"ERROR in search_loans: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search/transactions")
async def search_transactions(
    q: str = Query("", description="Search query"),
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Search transactions by transaction_id, amount, type, or user name (Admin only)
    """
    try:
        search_term = f"%{q}%"
        
        # Build query with joins
        query = db.query(
            Transaction,
            User.full_name.label("borrower_name"),
        ).join(
            User, Transaction.borrower_id == User.id
        )
        
        # Apply search filter
        if q:
            query = query.filter(
                or_(
                    Transaction.transaction_id.like(search_term),
                    cast(Transaction.amount, String).like(search_term),
                    func.lower(User.full_name).like(func.lower(search_term))
                )
            )
        
        # Apply status filter if provided
        if status:
            query = query.filter(Transaction.status == status.upper())
        
        # Get total count
        total = query.count()
        
        # Get paginated results
        results = query.offset(skip).limit(limit).all()
        
        # Format response
        transactions = []
        for txn, borrower_name in results:
            transactions.append({
                "id": txn.id,
                "transaction_id": txn.transaction_id,
                "borrower_id": txn.borrower_id,
                "borrower_name": borrower_name,
                "loan_id": txn.loan_id,
                "amount": txn.amount,
                "status": txn.status.value if txn.status else None,
                "initiated_at": txn.initiated_at.isoformat() if txn.initiated_at else None,
                "confirmed_at": txn.confirmed_at.isoformat() if txn.confirmed_at else None,
            })
        
        return {
            "items": transactions,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        print(f"ERROR in search_transactions: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search/all")
async def search_all(
    q: str = Query("", description="Search query"),
    filter: Optional[str] = Query(None, description="Filter type: users, loans, transactions"),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Comprehensive search across all entities (Admin only)
    """
    try:
        search_term = f"%{q}%"
        results = {"users": [], "loans": [], "transactions": []}
        
        # Search users if no filter or filter is 'users'
        if not filter or filter == "users":
            user_query = db.query(User).filter(
                or_(
                    func.lower(User.full_name).like(func.lower(search_term)),
                    func.lower(User.email).like(func.lower(search_term)),
                    User.phone.like(search_term)
                )
            ).limit(limit)
            
            results["users"] = [
                {
                    "id": u.id,
                    "full_name": u.full_name,
                    "email": u.email,
                    "phone": u.phone,
                    "role": u.role.value if u.role else None,
                    "type": "user"
                }
                for u in user_query.all()
            ]
        
        # Search loans if no filter or filter is 'loans'
        if not filter or filter == "loans":
            loan_query = db.query(
                Loan,
                User.full_name.label("borrower_name")
            ).join(
                User, Loan.borrower_id == User.id
            ).filter(
                or_(
                    Loan.loan_id.like(search_term),
                    cast(Loan.principal, String).like(search_term),
                    func.lower(User.full_name).like(func.lower(search_term))
                )
            ).limit(limit)
            
            results["loans"] = [
                {
                    "id": l.id,
                    "loan_id": l.loan_id,
                    "borrower_name": borrower_name,
                    "principal": l.principal,
                    "status": l.status.value if l.status else None,
                    "type": "loan"
                }
                for l, borrower_name in loan_query.all()
            ]
        
        # Search transactions if no filter or filter is 'transactions'
        if not filter or filter == "transactions":
            txn_query = db.query(
                Transaction,
                User.full_name.label("borrower_name")
            ).join(
                User, Transaction.borrower_id == User.id
            ).filter(
                or_(
                    Transaction.transaction_id.like(search_term),
                    cast(Transaction.amount, String).like(search_term)
                )
            ).limit(limit)
            
            results["transactions"] = [
                {
                    "id": t.id,
                    "transaction_id": t.transaction_id,
                    "borrower_name": buyer_name,
                    "amount": t.amount,
                    "status": t.status.value if t.status else None,
                    "type": "transaction"
                }
                for t, buyer_name in txn_query.all()
            ]
        
        return results
    except Exception as e:
        print(f"ERROR in search_all: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# TIER SETTINGS ENDPOINTS
# ============================================================================

# Default tier configuration
DEFAULT_TIER_CONFIG = {
    "tiers": [
        {
            "level": 1,
            "name": "Bronze",
            "min_score": 0,
            "max_score": 199,
            "loan_limit": 500.0,
            "interest_rate": 4.0,
            "processing_fee": 25,
            "requirements": "Initial tier for new users",
            "color": "#CD7F32"
        },
        {
            "level": 2,
            "name": "Silver",
            "min_score": 200,
            "max_score": 349,
            "loan_limit": 1000.0,
            "interest_rate": 3.9,
            "processing_fee": 23,
            "requirements": "3+ on-time payments",
            "color": "#C0C0C0"
        },
        {
            "level": 3,
            "name": "Silver",
            "min_score": 350,
            "max_score": 499,
            "loan_limit": 2000.0,
            "interest_rate": 3.8,
            "processing_fee": 20,
            "requirements": "5+ on-time payments",
            "color": "#C0C0C0"
        },
        {
            "level": 4,
            "name": "Gold",
            "min_score": 500,
            "max_score": 649,
            "loan_limit": 3500.0,
            "interest_rate": 3.7,
            "processing_fee": 18,
            "requirements": "90% on-time rate",
            "color": "#FFD700"
        },
        {
            "level": 5,
            "name": "Gold",
            "min_score": 650,
            "max_score": 799,
            "loan_limit": 5000.0,
            "interest_rate": 3.5,
            "processing_fee": 15,
            "requirements": "5+ loans, 90% on-time",
            "color": "#FFD700"
        },
        {
            "level": 6,
            "name": "Platinum",
            "min_score": 800,
            "max_score": 899,
            "loan_limit": 7500.0,
            "interest_rate": 3.3,
            "processing_fee": 12,
            "requirements": "Perfect streak",
            "color": "#E5E4E2"
        },
        {
            "level": 7,
            "name": "Platinum",
            "min_score": 900,
            "max_score": 1000,
            "loan_limit": 10000.0,
            "interest_rate": 3.2,
            "processing_fee": 10,
            "requirements": "10+ loans, perfect streak",
            "color": "#E5E4E2"
        },
        {
            "level": 8,
            "name": "Diamond",
            "min_score": 1001,
            "max_score": 9999,
            "loan_limit": 15000.0,
            "interest_rate": 3.0,
            "processing_fee": 0,
            "requirements": "Perfect repayment history",
            "color": "#B9F2FF"
        }
    ]
}


def validate_tier_config(config: dict) -> bool:
    """Validate tier configuration"""
    if 'tiers' not in config:
        raise HTTPException(status_code=400, detail="Missing 'tiers' key in config")
    
    required_fields = ['level', 'name', 'min_score', 'max_score', 'loan_limit']
    
    for tier in config['tiers']:
        for field in required_fields:
            if field not in tier:
                raise HTTPException(status_code=400, detail=f"Missing field {field} in tier config")
        
        # Ensure score ranges don't overlap
        if tier['min_score'] >= tier['max_score']:
            raise HTTPException(status_code=400, detail=f"Invalid score range for {tier['name']}")
    
    # Ensure tiers are in order
    tiers = sorted(config['tiers'], key=lambda x: x['level'])
    for i in range(len(tiers) - 1):
        if tiers[i]['max_score'] != tiers[i+1]['min_score'] - 1:
            # Allow gaps for now, just warn
            pass
    
    return True


@router.get("/tier-settings")
async def get_tier_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get current tier configuration"""
    try:
        settings = db.query(SystemSettings).filter(
            SystemSettings.category == "tier_config",
            SystemSettings.setting_key == "tiers"
        ).first()
        
        if not settings:
            # Return default configuration
            return DEFAULT_TIER_CONFIG
        
        import json
        return json.loads(settings.setting_value)
    except Exception as e:
        print(f"ERROR in get_tier_settings: {str(e)}")
        import traceback
        traceback.print_exc()
        return DEFAULT_TIER_CONFIG


@router.put("/tier-settings")
async def update_tier_settings(
    tier_config: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update tier configuration"""
    try:
        # Validate the configuration
        validate_tier_config(tier_config)
        
        import json
        
        # Save to database
        setting = db.query(SystemSettings).filter(
            SystemSettings.category == "tier_config",
            SystemSettings.setting_key == "tiers"
        ).first()
        
        if not setting:
            setting = SystemSettings(
                category="tier_config",
                setting_key="tiers",
                setting_type="json",
                description="Tier configuration for borrower credit tiers"
            )
            db.add(setting)
        
        setting.setting_value = json.dumps(tier_config)
        db.commit()
        
        return {"message": "Tier settings updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in update_tier_settings: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tier-distribution")
async def get_tier_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get count of users in each tier"""
    try:
        distribution = db.query(
            User.credit_tier,
            func.count(User.id).label('count')
        ).group_by(User.credit_tier).all()
        
        result = {}
        for tier, count in distribution:
            result[f"tier_{tier}"] = count
        
        # Include all tiers even if count is 0
        for i in range(1, 9):
            if f"tier_{i}" not in result:
                result[f"tier_{i}"] = 0
        
        return result
    except Exception as e:
        print(f"ERROR in get_tier_distribution: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tiers/evaluate-user/{user_id}")
async def evaluate_user_tier(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Evaluate and update a single user's tier"""
    from services.tier_service import TierService
    
    service = TierService(db)
    result = service.update_user_tier(user_id)
    
    if not result['success']:
        raise HTTPException(status_code=404, detail=result['message'])
    
    return result


@router.post("/tiers/evaluate-all")
async def evaluate_all_users_tiers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Evaluate all users for tier updates"""
    from services.tier_service import TierService
    
    service = TierService(db)
    result = service.evaluate_all_users()
    
    return {
        "message": f"Evaluated {result['total']} users. Updated {result['updated']} users.",
        "details": result
    }


@router.get("/tiers/user-status/{user_id}")
async def get_user_tier_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get detailed tier status for a user"""
    from services.tier_service import TierService
    
    service = TierService(db)
    metrics = service.calculate_user_metrics(user_id)
    recommended_tier = service.determine_appropriate_tier(user_id)
    
    return {
        "user_id": user_id,
        "current_tier": metrics['current_tier'],
        "recommended_tier": recommended_tier,
        "credit_score": metrics['current_score'],
        "metrics": metrics
    }


# ============================================================================
# KYC VERIFICATION ADMIN ENDPOINTS
# ============================================================================

@router.get("/kyc/pending")
async def get_pending_kyc(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all users pending KYC verification"""
    profiles = db.query(UserProfile).filter(
        UserProfile.kyc_status == "SUBMITTED"
    ).all()
    
    result = []
    for profile in profiles:
        user = db.query(User).filter(User.id == profile.user_id).first()
        if user:
            result.append({
                "user_id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "phone": profile.phone,
                "national_id": profile.national_id,
                "date_of_birth": profile.date_of_birth.isoformat() if profile.date_of_birth else None,
                "location": profile.location,
                "address": profile.address,
                "kyc_submitted_at": profile.updated_at.isoformat() if profile.updated_at else None,
            })
    
    return result


@router.post("/kyc/verify/{user_id}")
async def verify_kyc(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Verify a user's KYC"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    if profile.kyc_status == "VERIFIED":
        raise HTTPException(status_code=400, detail="User is already verified")
    
    from datetime import datetime, timedelta
    profile.kyc_status = "VERIFIED"
    profile.kyc_verified_at = datetime.utcnow()
    profile.kyc_rejection_reason = None
    
    db.commit()
    db.refresh(profile)
    
    return {
        "message": f"User {user_id} KYC verified successfully",
        "kyc_status": profile.kyc_status,
        "kyc_verified_at": profile.kyc_verified_at.isoformat()
    }


@router.post("/kyc/reject/{user_id}")
async def reject_kyc(
    user_id: int,
    rejection_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Reject a user's KYC with reason"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    reason = rejection_data.get("reason", "Your documents could not be verified")
    
    profile.kyc_status = "REJECTED"
    profile.kyc_rejection_reason = reason
    profile.kyc_verified_at = None
    
    db.commit()
    db.refresh(profile)
    
    return {
        "message": f"User {user_id} KYC rejected",
        "kyc_status": profile.kyc_status,
        "kyc_rejection_reason": reason
    }


# ============================================================================
# Maintenance Mode Endpoints
# ============================================================================

class MaintenanceToggleSchema(BaseModel):
    enabled: bool
    message: Optional[str] = None
    duration_minutes: Optional[int] = None


@router.post("/maintenance/toggle")
async def toggle_maintenance(
    request: Request,
    data: MaintenanceToggleSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Enable or disable maintenance mode"""
    try:
        print(f"[MAINTENANCE TOGGLE] Received request: enabled={data.enabled}, duration_minutes={data.duration_minutes}")
        
        # Get or create maintenance record
        maintenance = db.query(SystemMaintenance).first()
        if not maintenance:
            maintenance = SystemMaintenance()
            db.add(maintenance)
        
        # Update settings
        maintenance.is_enabled = data.enabled
        maintenance.message = data.message or "System is under scheduled maintenance. Please check back later."
        maintenance.created_by = current_user.id
        
        if data.enabled:
            maintenance.start_time = datetime.utcnow()
            if data.duration_minutes:
                maintenance.end_time = datetime.utcnow() + timedelta(minutes=data.duration_minutes)
                maintenance.estimated_duration = data.duration_minutes
                print(f"[MAINTENANCE TOGGLE] Set end_time to: {maintenance.end_time}")
        else:
            maintenance.end_time = datetime.utcnow()
        
        db.commit()
        
        # Update app state
        request.app.state.maintenance_mode = {
            "enabled": data.enabled,
            "message": maintenance.message,
            "end_time": maintenance.end_time.isoformat() if maintenance.end_time else None
        }
        
        print(f"[MAINTENANCE TOGGLE] Returning end_time: {maintenance.end_time}")
        
        return {
            "success": True,
            "enabled": data.enabled,
            "message": maintenance.message,
            "end_time": maintenance.end_time
        }
    except Exception as e:
        print(f"Error toggling maintenance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/maintenance/status")
async def get_maintenance_status(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get current maintenance status"""
    try:
        maintenance = db.query(SystemMaintenance).first()
        
        if maintenance and maintenance.is_enabled:
            response_data = {
                "enabled": True,
                "message": maintenance.message,
                "start_time": maintenance.start_time.isoformat() if maintenance.start_time else None,
                "end_time": maintenance.end_time.isoformat() if maintenance.end_time else None,
                "estimated_duration": maintenance.estimated_duration
            }
            print(f"[MAINTENANCE STATUS] Returning: {response_data}")
            response = JSONResponse(content=response_data)
        else:
            print("[MAINTENANCE STATUS] Maintenance not enabled")
            response = JSONResponse(content={"enabled": False})
        
        # Add CORS headers
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response
    except Exception as e:
        print(f"Error getting maintenance status: {str(e)}")
        response = JSONResponse(content={"enabled": False})
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
        return response
