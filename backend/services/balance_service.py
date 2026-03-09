import logging
import uuid
from sqlalchemy.orm import Session
from models.models import AccountBalance, User, Loan, Transaction, TransactionType, TransactionStatus
from datetime import datetime

logger = logging.getLogger(__name__)


class BalanceService:
    """Service to handle account balance operations for real money validation"""
    
    def __init__(self, db: Session):
        self.db = db
        # Import MpesaService here to avoid circular imports
        from .mpesa_service import MpesaService
        self.mpesa_service = MpesaService()
    
    def get_company_disbursement_balance(self) -> float:
        """Get current company disbursement account balance"""
        account = self.db.query(AccountBalance).filter(
            AccountBalance.user_id.is_(None),
            AccountBalance.account_type == 'company_disbursement'
        ).first()
        
        if not account:
            # Create default company account if not exists
            account = AccountBalance(
                account_type='company_disbursement',
                balance=1000000.0,  # Initial seed money - KSh 1,000,000
                currency='KES'
            )
            self.db.add(account)
            self.db.commit()
            self.db.refresh(account)
        
        return account.balance
    
    def check_disbursement_eligibility(self, amount: float) -> tuple[bool, str]:
        """Check if company has enough funds for disbursement"""
        company_balance = self.get_company_disbursement_balance()
        
        if company_balance >= amount:
            return True, "Sufficient funds"
        else:
            return False, f"Insufficient company funds. Available: KSh {company_balance:,.2f}, Required: KSh {amount:,.2f}"
    
    def check_duplicate_disbursement(self, loan_id: int) -> bool:
        """Check if there's already a pending/completed disbursement for this loan"""
        existing_transaction = self.db.query(Transaction).filter(
            Transaction.loan_id == loan_id,
            Transaction.type == TransactionType.DISBURSEMENT,
            Transaction.status.in_([TransactionStatus.PROCESSING, TransactionStatus.CONFIRMED])
        ).first()
        
        return existing_transaction is not None
    
    def process_disbursement(self, user_id: int, amount: float, loan_id: int, phone_number: str = None) -> dict:
        """
        Process actual money transfer for disbursement via M-Pesa B2C.
        Returns dict with success status and details.
        """
        # Check eligibility first
        eligible, message = self.check_disbursement_eligibility(amount)
        if not eligible:
            logger.error(f"Disbursement failed: {message}")
            return {"success": False, "message": message, "mpesa_response": None}
        
        # Check for duplicate disbursement
        if self.check_duplicate_disbursement(loan_id):
            logger.error(f"Duplicate disbursement detected for loan {loan_id}")
            return {"success": False, "message": "Loan already has a pending or completed disbursement", "mpesa_response": None}
        
        # Get user's phone number if not provided
        if not phone_number:
            user = self.db.query(User).filter(User.id == user_id).first()
            if user and user.phone:
                phone_number = user.phone
        
        if not phone_number:
            logger.error(f"No phone number found for user {user_id}")
            return {"success": False, "message": "Borrower has no phone number", "mpesa_response": None}
        
        # Get loan for transaction record
        loan = self.db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            return {"success": False, "message": "Loan not found", "mpesa_response": None}
        
        # Create pending transaction record
        tx_id = f"DISB-{uuid.uuid4().hex[:12].upper()}"
        transaction = Transaction(
            transaction_id=tx_id,
            borrower_id=user_id,
            loan_id=loan_id,
            type=TransactionType.DISBURSEMENT,
            amount=amount,
            status=TransactionStatus.PROCESSING,
            mpesa_phone=phone_number
        )
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        
        try:
            # Initiate B2C payment via M-Pesa
            mpesa_result = self.mpesa_service.b2c_payment(
                phone_number=phone_number,
                amount=amount,
                remarks=f"Loan Disbursement - {loan.loan_id}"
            )
            
            # Update transaction with M-Pesa response
            transaction.mpesa_checkout_id = mpesa_result.get("conversation_id")
            
            if mpesa_result.get("success"):
                # M-Pesa accepted the request - mark as processing
                transaction.status = TransactionStatus.PROCESSING
                
                # Deduct from company account
                company_account = self.db.query(AccountBalance).filter(
                    AccountBalance.user_id.is_(None),
                    AccountBalance.account_type == 'company_disbursement'
                ).first()
                
                if company_account:
                    company_account.balance -= amount
                    company_account.last_updated = datetime.utcnow()
                
                logger.info(f"B2C payment initiated: KSh {amount} to {phone_number} for loan {loan_id}")
                
                self.db.commit()
                
                return {
                    "success": True,
                    "message": "Disbursement initiated successfully",
                    "mpesa_response": mpesa_result,
                    "transaction_id": tx_id
                }
            else:
                # M-Pesa rejected the request
                transaction.status = TransactionStatus.FAILED
                transaction.failure_reason = mpesa_result.get("response_message", "Unknown error")
                self.db.commit()
                
                return {
                    "success": False,
                    "message": mpesa_result.get("response_message", "M-Pesa disbursement failed"),
                    "mpesa_response": mpesa_result
                }
                
        except Exception as e:
            # Mark transaction as failed
            transaction.status = TransactionStatus.FAILED
            transaction.failure_reason = str(e)
            self.db.commit()
            
            logger.error(f"B2C payment error for loan {loan_id}: {e}")
            return {
                "success": False,
                "message": f"Disbursement failed: {str(e)}",
                "mpesa_response": None
            }
    
    def process_repayment(self, user_id: int, phone_number: str, amount: float, loan_id: int) -> bool:
        """Process actual money transfer for repayment"""
        # Check eligibility first
        eligible, message = self.check_repayment_eligibility(user_id, phone_number, amount)
        if not eligible:
            logger.error(f"Repayment failed: {message}")
            return False
        
        # Deduct from user's M-Pesa account
        user_account = self.db.query(AccountBalance).filter(
            AccountBalance.user_id == user_id,
            AccountBalance.account_type == 'mpesa',
            AccountBalance.phone_number == phone_number
        ).first()
        
        if user_account:
            user_account.balance -= amount
            user_account.last_updated = datetime.utcnow()
        
        # Add to company account
        company_account = self.db.query(AccountBalance).filter(
            AccountBalance.user_id.is_(None),
            AccountBalance.account_type == 'company_disbursement'
        ).first()
        
        if company_account:
            company_account.balance += amount
            company_account.last_updated = datetime.utcnow()
        
        logger.info(f"Received repayment KSh {amount} from user {user_id} for loan {loan_id}")
        
        self.db.commit()
        return True
    
    def check_repayment_eligibility(self, user_id: int, phone_number: str, amount: float) -> tuple[bool, str]:
        """Check if user has enough M-Pesa balance for repayment"""
        user_account = self.db.query(AccountBalance).filter(
            AccountBalance.user_id == user_id,
            AccountBalance.account_type == 'mpesa',
            AccountBalance.phone_number == phone_number
        ).first()
        
        if not user_account:
            return False, "No M-Pesa account found for this phone number"
        
        user_balance = user_account.balance
        
        if user_balance >= amount:
            return True, "Sufficient funds"
        else:
            return False, f"Insufficient balance. Available: KSh {user_balance:,.2f}, Required: KSh {amount:,.2f}"
