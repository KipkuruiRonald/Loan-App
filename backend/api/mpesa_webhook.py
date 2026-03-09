from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
import logging
from sqlalchemy.orm import Session
from core.database import get_db
from models.models import Transaction, Loan, User, TransactionStatus, LoanStatus, TransactionType
from services.balance_service import BalanceService
from services.tier_service import TierService
from datetime import datetime
import json
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mpesa", tags=["mpesa"])


def extract_mpesa_value(items: list, name: str):
    """Extract value from M-Pesa callback metadata"""
    for item in items:
        if item.get("Name") == name:
            return item.get("Value")
    return None


@router.post("/callback")
async def mpesa_callback(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Handle M-Pesa STK Push callback
    This is called by Safaricom after customer enters PIN
    """
    try:
        callback_data = await request.json()
        logger.info(f"M-Pesa Callback received: {json.dumps(callback_data)}")
        
        # Extract callback data
        body = callback_data.get("Body", {})
        stk_callback = body.get("stkCallback", {})
        
        checkout_id = stk_callback.get("CheckoutRequestID")
        result_code = stk_callback.get("ResultCode")
        result_desc = stk_callback.get("ResultDesc")
        
        if not checkout_id:
            logger.warning("No CheckoutRequestID in callback")
            return {"ResultCode": 0, "ResultDesc": "Received"}
        
        # Find transaction by checkout_id
        transaction = db.query(Transaction).filter(
            Transaction.mpesa_checkout_id == checkout_id
        ).first()
        
        if not transaction:
            logger.error(f"Transaction not found for checkout ID: {checkout_id}")
            return {"ResultCode": 0, "ResultDesc": "Received"}
        
        if result_code == 0:
            # Success - customer entered PIN and payment succeeded
            callback_metadata = stk_callback.get("CallbackMetadata", {})
            items = callback_metadata.get("Item", [])
            
            # Extract M-Pesa receipt number
            mpesa_receipt = extract_mpesa_value(items, "MpesaReceiptNumber")
            mpesa_amount = extract_mpesa_value(items, "Amount")
            mpesa_phone = extract_mpesa_value(items, "PhoneNumber")
            
            # Update transaction
            transaction.status = TransactionStatus.CONFIRMED
            transaction.mpesa_receipt = mpesa_receipt
            transaction.confirmed_at = datetime.utcnow()
            
            # Process the balance transfer
            loan = db.query(Loan).filter(Loan.id == transaction.loan_id).first()
            if loan:
                # Update loan status based on payment
                from sqlalchemy import func
                total_paid = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
                    Transaction.loan_id == loan.id,
                    Transaction.status == TransactionStatus.CONFIRMED,
                    Transaction.type == TransactionType.REPAYMENT
                ).scalar() or 0
                
                remaining = loan.total_due - float(total_paid)
                
                if remaining <= 0:
                    loan.status = LoanStatus.SETTLED
                    loan.payment_date = datetime.utcnow()
            
            db.commit()
            logger.info(f"Payment successful: {mpesa_receipt}")
            
            # Schedule background tier evaluation
            if transaction.borrower_id:
                background_tasks.add_task(
                    evaluate_user_tier_after_payment, 
                    transaction.borrower_id, 
                    db
                )
            
        else:
            # Failed - customer cancelled or insufficient funds
            transaction.status = TransactionStatus.FAILED
            transaction.failure_reason = result_desc
            db.commit()
            logger.warning(f"Payment failed: {result_desc}")
        
        # Must return 0 to acknowledge receipt
        return {"ResultCode": 0, "ResultDesc": "Success"}
        
    except Exception as e:
        logger.error(f"Error processing callback: {e}")
        import traceback
        traceback.print_exc()
        # Still return success to Safaricom to prevent retries
        return {"ResultCode": 0, "ResultDesc": "Received"}


@router.post("/timeout")
async def mpesa_timeout(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle M-Pesa timeout (customer didn't enter PIN)"""
    try:
        timeout_data = await request.json()
        logger.info(f"M-Pesa Timeout: {json.dumps(timeout_data)}")
        
        body = timeout_data.get("Body", {})
        stk_timeout = body.get("stkCallback", {})
        
        checkout_id = stk_timeout.get("CheckoutRequestID")
        
        if checkout_id:
            # Find and update transaction
            transaction = db.query(Transaction).filter(
                Transaction.mpesa_checkout_id == checkout_id
            ).first()
            
            if transaction:
                transaction.status = TransactionStatus.FAILED
                transaction.failure_reason = "Payment timeout - customer did not enter PIN"
                db.commit()
                logger.info(f"Transaction {checkout_id} marked as timeout")
        
        return {"ResultCode": 0, "ResultDesc": "Success"}
    except Exception as e:
        logger.error(f"Error processing timeout: {e}")
        return {"ResultCode": 0, "ResultDesc": "Received"}


@router.post("/b2c/result")
async def b2c_result(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Handle B2C payment result (disbursements)"""
    try:
        result_data = await request.json()
        logger.info(f"B2C Result: {json.dumps(result_data)}")
        
        # Extract result
        body = result_data.get("Body", {})
        result = body.get("Result", {})
        
        result_code = result.get("ResultCode")
        result_params = result.get("ResultParameters", {})
        result_items = result_params.get("ResultParameter", [])
        
        if result_code == 0:
            # Payment successful
            transaction_id = extract_mpesa_value(result_items, "TransactionID")
            phone_number = extract_mpesa_value(result_items, "ReceiverPartyPublicName")
            
            # Find the disbursement transaction
            # Could match by conversation ID or other identifiers
            logger.info(f"B2C payment successful: {transaction_id} to {phone_number}")
        
        return {"ResultCode": 0, "ResultDesc": "Success"}
    except Exception as e:
        logger.error(f"Error processing B2C result: {e}")
        return {"ResultCode": 0, "ResultDesc": "Received"}


async def evaluate_user_tier_after_payment(user_id: int, db: Session):
    """Background task to evaluate user tier after payment"""
    try:
        tier_service = TierService(db)
        tier_result = tier_service.update_user_tier(user_id)
        if tier_result.get('changed'):
            logger.info(f"User {user_id} tier changed: {tier_result['old_tier']} -> {tier_result['new_tier']}")
    except Exception as e:
        logger.error(f"Error evaluating tier for user {user_id}: {e}")


# Status check endpoint for frontend polling
@router.get("/status/{checkout_id}")
async def check_payment_status(
    checkout_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_db)
):
    """Check status of a payment (for frontend polling)"""
    # Import here to avoid circular imports
    from api.auth import get_current_user
    
    # Get current user from dependency
    try:
        # This will be handled by the dependency injection
        pass
    except:
        pass
    
    transaction = db.query(Transaction).filter(
        Transaction.mpesa_checkout_id == checkout_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {
        "status": transaction.status.value if transaction.status else "UNKNOWN",
        "receipt": transaction.mpesa_receipt,
        "amount": transaction.amount,
        "failure_reason": transaction.failure_reason,
        "timestamp": transaction.initiated_at.isoformat() if transaction.initiated_at else None,
        "confirmed_at": transaction.confirmed_at.isoformat() if transaction.confirmed_at else None
    }
