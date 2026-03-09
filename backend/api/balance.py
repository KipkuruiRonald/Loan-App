from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from core.database import get_db
from api.auth import get_current_user
from models.models import User, UserRole
from services.balance_service import BalanceService

router = APIRouter(prefix="/balance", tags=["balance"])


# ============================================================================
# SCHEMAS
# ============================================================================

class MpesaBalanceResponse(BaseModel):
    phone: str
    balance: float
    currency: str


class CompanyBalanceResponse(BaseModel):
    account: str
    balance: float
    currency: str


class TopUpRequest(BaseModel):
    phone_number: str
    amount: float


class SetBalanceRequest(BaseModel):
    phone_number: str
    amount: float


class UserAccountBalancesResponse(BaseModel):
    accounts: list[dict]


# ============================================================================
# ROUTES
# ============================================================================

@router.get("/mpesa", response_model=MpesaBalanceResponse)
async def get_mpesa_balance(
    phone: str = Query(..., description="Phone number to check"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get M-Pesa balance for a phone number"""
    balance_service = BalanceService(db)
    balance = balance_service.get_user_mpesa_balance(current_user.id, phone)
    
    return {
        "phone": phone,
        "balance": balance,
        "currency": "KES"
    }


@router.get("/company/disbursement", response_model=CompanyBalanceResponse)
async def get_company_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get company disbursement balance (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    balance_service = BalanceService(db)
    balance = balance_service.get_company_disbursement_balance()
    
    return {
        "account": "Company Disbursement",
        "balance": balance,
        "currency": "KES"
    }


@router.get("/accounts", response_model=UserAccountBalancesResponse)
async def get_user_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all account balances for the current user"""
    balance_service = BalanceService(db)
    accounts = balance_service.get_all_account_balances(current_user.id)
    
    return {"accounts": accounts}


@router.post("/mpesa/topup")
async def top_up_mpesa(
    request: TopUpRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add money to user's M-Pesa account (for testing/simulation)"""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    balance_service = BalanceService(db)
    success = balance_service.top_up_user_balance(
        user_id=current_user.id,
        phone_number=request.phone_number,
        amount=request.amount
    )
    
    if success:
        new_balance = balance_service.get_user_mpesa_balance(
            current_user.id, 
            request.phone_number
        )
        return {
            "success": True,
            "message": f"Topped up KSh {request.amount:,.2f}",
            "new_balance": new_balance
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to top up balance")


@router.post("/mpesa/set-balance")
async def set_mpesa_balance(
    request: SetBalanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Set user's M-Pesa balance to a specific amount (for testing)"""
    if request.amount < 0:
        raise HTTPException(status_code=400, detail="Amount cannot be negative")
    
    balance_service = BalanceService(db)
    success = balance_service.set_user_balance(
        user_id=current_user.id,
        phone_number=request.phone_number,
        amount=request.amount
    )
    
    if success:
        return {
            "success": True,
            "message": f"Set balance to KSh {request.amount:,.2f}",
            "new_balance": request.amount
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to set balance")
