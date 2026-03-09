"""
Test script for M-Pesa payment integration
Run this to verify all payment scenarios work correctly
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from core.database import get_db, engine, Base
from models.models import User, Loan, Transaction, AccountBalance, LoanStatus, TransactionStatus, TransactionType, UserRole
from services.balance_service import BalanceService
from services.mpesa_service import MpesaService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PaymentTestRunner:
    """Test runner for payment scenarios"""
    
    def __init__(self):
        self.results = []
    
    def log_result(self, scenario: str, passed: bool, details: str = ""):
        status = "✅ PASS" if passed else "❌ FAIL"
        self.results.append({
            "scenario": scenario,
            "result": status,
            "details": details
        })
        print(f"{status}: {scenario}")
        if details:
            print(f"   Details: {details}")
    
    def print_summary(self):
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        passed = sum(1 for r in self.results if "PASS" in r["result"])
        failed = sum(1 for r in self.results if "FAIL" in r["result"])
        print(f"Total: {len(self.results)} | Passed: {passed} | Failed: {failed}")
        print("="*60)


async def test_balance_check(db: Session) -> PaymentTestRunner:
    """Test 1: Balance check functionality"""
    runner = PaymentTestRunner()
    
    print("\n" + "="*60)
    print("TEST 1: BALANCE CHECK FUNCTIONALITY")
    print("="*60)
    
    balance_service = BalanceService(db)
    
    # Test 1a: Company has sufficient funds
    company_balance = balance_service.get_company_disbursement_balance()
    eligible, message = balance_service.check_disbursement_eligibility(5000)
    runner.log_result(
        "Company balance check (sufficient funds)",
        eligible == True and company_balance >= 5000,
        f"Balance: {company_balance}, Eligible: {eligible}"
    )
    
    # Test 1b: Company has insufficient funds
    eligible, message = balance_service.check_disbursement_eligibility(company_balance + 1)
    runner.log_result(
        "Company balance check (insufficient funds)",
        eligible == False and "Insufficient" in message,
        message
    )
    
    # Test 1c: User has sufficient funds
    user_balance = balance_service.get_user_mpesa_balance(1, "254708374149")
    eligible, message = balance_service.check_repayment_eligibility(1, "254708374149", 1000)
    runner.log_result(
        "User balance check (sufficient funds)",
        eligible == True and user_balance >= 1000,
        f"Balance: {user_balance}, Eligible: {eligible}"
    )
    
    # Test 1d: User has insufficient funds
    eligible, message = balance_service.check_repayment_eligibility(1, "254708374149", user_balance + 1)
    runner.log_result(
        "User balance check (insufficient funds)",
        eligible == False and "Insufficient" in message,
        message
    )
    
    runner.print_summary()
    return runner


async def test_disbursement_flow(db: Session) -> PaymentTestRunner:
    """Test 2: Disbursement flow"""
    runner = PaymentTestRunner()
    
    print("\n" + "="*60)
    print("TEST 2: DISBURSEMENT FLOW")
    print("="*60)
    
    balance_service = BalanceService(db)
    
    # Get a pending loan for testing
    loan = db.query(Loan).filter(Loan.status == LoanStatus.PENDING).first()
    
    if not loan:
        runner.log_result("Find pending loan", False, "No pending loans found")
        runner.print_summary()
        return runner
    
    runner.log_result("Find pending loan", True, f"Loan ID: {loan.id}, Amount: {loan.principal}")
    
    # Test 2a: Check eligibility with sufficient company funds
    company_balance = balance_service.get_company_disbursement_balance()
    eligible, message = balance_service.check_disbursement_eligibility(loan.principal)
    runner.log_result(
        "Disbursement eligibility check",
        eligible == True,
        f"Required: {loan.principal}, Available: {company_balance}"
    )
    
    # Test 2b: Process disbursement (simulated)
    initial_balance = company_balance
    success = balance_service.process_disbursement(
        user_id=loan.borrower_id,
        amount=loan.principal,
        loan_id=loan.id
    )
    
    new_balance = balance_service.get_company_disbursement_balance()
    runner.log_result(
        "Process disbursement",
        success == True and new_balance == initial_balance - loan.principal,
        f"Initial: {initial_balance}, New: {new_balance}, Deducted: {loan.principal}"
    )
    
    runner.print_summary()
    return runner


async def test_repayment_flow(db: Session) -> PaymentTestRunner:
    """Test 3: Repayment flow"""
    runner = PaymentTestRunner()
    
    print("\n" + "="*60)
    print("TEST 3: REPAYMENT FLOW")
    print("="*60)
    
    balance_service = BalanceService(db)
    
    # Get an active loan for testing
    loan = db.query(Loan).filter(Loan.status == LoanStatus.ACTIVE).first()
    
    if not loan:
        runner.log_result("Find active loan", False, "No active loans found")
        runner.print_summary()
        return runner
    
    # Get user phone
    user = db.query(User).filter(User.id == loan.borrower_id).first()
    phone = loan.phone_number or user.phone if user else "254708374149"
    
    runner.log_result("Find active loan", True, f"Loan ID: {loan.id}, Phone: {phone}")
    
    # Get user balance
    user_balance = balance_service.get_user_mpesa_balance(loan.borrower_id, phone)
    
    # Test payment amount (use small amount for testing)
    test_amount = min(100, user_balance)  # Use smaller of 100 or balance
    
    # Test 3a: Check eligibility
    eligible, message = balance_service.check_repayment_eligibility(
        loan.borrower_id, phone, test_amount
    )
    runner.log_result(
        "Repayment eligibility check",
        eligible == True,
        f"Required: {test_amount}, Available: {user_balance}"
    )
    
    # Test 3b: Process repayment
    initial_user_balance = user_balance
    company_balance_before = balance_service.get_company_disbursement_balance()
    
    success = balance_service.process_repayment(
        user_id=loan.borrower_id,
        phone_number=phone,
        amount=test_amount,
        loan_id=loan.id
    )
    
    new_user_balance = balance_service.get_user_mpesa_balance(loan.borrower_id, phone)
    company_balance_after = balance_service.get_company_disbursement_balance()
    
    runner.log_result(
        "Process repayment",
        success == True and new_user_balance == initial_user_balance - test_amount,
        f"User: {initial_user_balance} -> {new_user_balance}, Company: {company_balance_before} -> {company_balance_after}"
    )
    
    runner.print_summary()
    return runner


async def test_mpesa_service() -> PaymentTestRunner:
    """Test 4: M-Pesa service configuration"""
    runner = PaymentTestRunner()
    
    print("\n" + "="*60)
    print("TEST 4: M-PESA SERVICE CONFIGURATION")
    print("="*60)
    
    mpesa = MpesaService()
    
    # Test 4a: Service initialization
    runner.log_result(
        "M-Pesa service initialized",
        mpesa is not None,
        f"Base URL: {mpesa.base_url}, Shortcode: {mpesa.shortcode}"
    )
    
    # Test 4b: Phone formatting
    test_phones = [
        ("0712345678", "254712345678"),
        ("+254712345678", "254712345678"),
        ("254712345678", "254712345678"),
    ]
    
    for original, expected in test_phones:
        formatted = mpesa.format_phone(original)
        runner.log_result(
            f"Phone format: {original}",
            formatted == expected,
            f"Expected: {expected}, Got: {formatted}"
        )
    
    # Test 4c: Password generation
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = mpesa.generate_password(timestamp)
    runner.log_result(
        "Password generation",
        len(password) > 0,
        f"Timestamp: {timestamp}, Password length: {len(password)}"
    )
    
    runner.print_summary()
    return runner


async def test_validation_scenarios(db: Session) -> PaymentTestRunner:
    """Test 5: Validation scenarios"""
    runner = PaymentTestRunner()
    
    print("\n" + "="*60)
    print("TEST 5: VALIDATION SCENARIOS")
    print("="*60)
    
    balance_service = BalanceService(db)
    
    # Test 5a: Zero amount
    eligible, message = balance_service.check_disbursement_eligibility(0)
    runner.log_result(
        "Zero amount validation",
        eligible == False,
        message
    )
    
    # Test 5b: Negative amount
    eligible, message = balance_service.check_disbursement_eligibility(-100)
    runner.log_result(
        "Negative amount validation",
        eligible == False,
        message
    )
    
    # Test 5c: Very large amount (exceeds company balance)
    company_balance = balance_service.get_company_disbursement_balance()
    eligible, message = balance_service.check_disbursement_eligibility(company_balance * 2)
    runner.log_result(
        "Excessive amount validation",
        eligible == False,
        message
    )
    
    runner.print_summary()
    return runner


async def main():
    """Run all tests"""
    print("\n" + "#"*60)
    print("# OKOLEO PAYMENT INTEGRATION TEST SUITE")
    print("#"*60)
    
    # Initialize database tables
    print("\nInitializing database...")
    Base.metadata.create_all(bind=engine)
    
    # Get database session
    db = next(get_db())
    
    try:
        # Run all tests
        all_results = []
        
        results1 = await test_balance_check(db)
        all_results.extend(results1.results)
        
        results2 = await test_disbursement_flow(db)
        all_results.extend(results2.results)
        
        results3 = await test_repayment_flow(db)
        all_results.extend(results3.results)
        
        results4 = await test_mpesa_service()
        all_results.extend(results4.results)
        
        results5 = await test_validation_scenarios(db)
        all_results.extend(results5.results)
        
        # Print final summary
        print("\n" + "#"*60)
        print("# FINAL TEST SUMMARY")
        print("#"*60)
        
        passed = sum(1 for r in all_results if "PASS" in r["result"])
        failed = sum(1 for r in all_results if "FAIL" in r["result"])
        
        print(f"\nTotal Tests: {len(all_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        
        if failed == 0:
            print("\n🎉 All tests passed! Payment system is working correctly.")
        else:
            print(f"\n⚠️  {failed} test(s) failed. Please review the implementation.")
            
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
