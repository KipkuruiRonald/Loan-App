"""
Demo Data Generation Script

Creates synthetic users, loans, and transactions for development and demonstration.

Usage:
    python generate_demo_data.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from core.database import SessionLocal, init_db
from core.security import get_password_hash
from models.models import User, UserRole, Loan, LoanStatus, RiskGrade, AIModel
from datetime import datetime, timedelta
import random


def create_demo_users(db: Session):
    """Create demo users with different roles"""
    print("Creating demo users...")
    
    users = [
        {
            "email": "admin@loantrading.com",
            "username": "admin",
            "hashed_password": get_password_hash("admin123"),
            "full_name": "Admin User",
            "role": UserRole.ADMIN,
            "near_account_id": "admin.testnet",
            "is_active": True,
        },
        {
            "email": "originator1@bank.com",
            "username": "originator1",
            "hashed_password": get_password_hash("originator123"),
            "full_name": "First National Bank",
            "role": UserRole.ORIGINATOR,
            "near_account_id": "firstbank.testnet",
            "is_active": True,
        },
        {
            "email": "originator2@credit.com",
            "username": "originator2",
            "hashed_password": get_password_hash("originator123"),
            "full_name": "Credit Union Group",
            "role": UserRole.ORIGINATOR,
            "near_account_id": "creditunion.testnet",
            "is_active": True,
        },
        {
            "email": "investor1@fund.com",
            "username": "investor1",
            "hashed_password": get_password_hash("investor123"),
            "full_name": "Institutional Investor Fund",
            "role": UserRole.INVESTOR,
            "near_account_id": "investor1.testnet",
            "is_active": True,
        },
        {
            "email": "investor2@asset.com",
            "username": "investor2",
            "hashed_password": get_password_hash("investor123"),
            "full_name": "Asset Management Corp",
            "role": UserRole.INVESTOR,
            "near_account_id": "investor2.testnet",
            "is_active": True,
        },
    ]
    
    created_users = []
    for user_data in users:
        user = User(**user_data)
        db.add(user)
        created_users.append(user)
    
    db.commit()
    print(f"✓ Created {len(created_users)} demo users")
    return created_users


def create_demo_loans(db: Session, originators: list):
    """Create diverse set of demo loans"""
    print("Creating demo loans...")
    
    loan_templates = [
        # High-quality loans (Grade A-B)
        {
            "principal": 50000,
            "interest_rate": 7.5,
            "tenure_months": 36,
            "borrower_credit_score": 780,
            "borrower_income": 85000,
            "borrower_employment_type": "Full-time",
            "loan_purpose": "Home Improvement",
            "emis_paid": 12,
            "emis_missed": 0,
        },
        {
            "principal": 100000,
            "interest_rate": 8.0,
            "tenure_months": 60,
            "borrower_credit_score": 750,
            "borrower_income": 120000,
            "borrower_employment_type": "Full-time",
            "loan_purpose": "Debt Consolidation",
            "emis_paid": 24,
            "emis_missed": 1,
        },
        {
            "principal": 25000,
            "interest_rate": 6.5,
            "tenure_months": 24,
            "borrower_credit_score": 800,
            "borrower_income": 95000,
            "borrower_employment_type": "Full-time",
            "loan_purpose": "Medical Expenses",
            "emis_paid": 18,
            "emis_missed": 0,
        },
        # Medium-quality loans (Grade B-C)
        {
            "principal": 75000,
            "interest_rate": 10.5,
            "tenure_months": 48,
            "borrower_credit_score": 680,
            "borrower_income": 65000,
            "borrower_employment_type": "Full-time",
            "loan_purpose": "Vehicle Purchase",
            "emis_paid": 30,
            "emis_missed": 3,
        },
        {
            "principal": 40000,
            "interest_rate": 12.0,
            "tenure_months": 36,
            "borrower_credit_score": 650,
            "borrower_income": 55000,
            "borrower_employment_type": "Contract",
            "loan_purpose": "Business Expansion",
            "emis_paid": 15,
            "emis_missed": 2,
        },
        # Lower-quality loans (Grade C-D)
        {
            "principal": 30000,
            "interest_rate": 14.5,
            "tenure_months": 24,
            "borrower_credit_score": 620,
            "borrower_income": 45000,
            "borrower_employment_type": "Part-time",
            "loan_purpose": "Personal",
            "emis_paid": 8,
            "emis_missed": 4,
        },
        {
            "principal": 60000,
            "interest_rate": 16.0,
            "tenure_months": 36,
            "borrower_credit_score": 580,
            "borrower_income": 40000,
            "borrower_employment_type": "Self-employed",
            "loan_purpose": "Emergency",
            "emis_paid": 10,
            "emis_missed": 5,
        },
    ]
    
    created_loans = []
    for i, template in enumerate(loan_templates):
        # Randomly assign to originators
        originator = random.choice(originators)
        
        # Calculate monthly EMI (simplified)
        principal = template["principal"]
        annual_rate = template["interest_rate"] / 100
        monthly_rate = annual_rate / 12
        months = template["tenure_months"]
        
        # EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
        if monthly_rate > 0:
            emi = principal * monthly_rate * (1 + monthly_rate)**months / ((1 + monthly_rate)**months - 1)
        else:
            emi = principal / months
        
        # Calculate current outstanding
        emis_paid = template["emis_paid"]
        outstanding = principal - (emi * emis_paid * 0.7)  # Simplified principal reduction
        
        loan = Loan(
            loan_id=f"LOAN-{2024001 + i:06d}",
            originator_id=originator.id,
            principal=principal,
            interest_rate=template["interest_rate"],
            tenure_months=months,
            monthly_emi=round(emi, 2),
            borrower_credit_score=template["borrower_credit_score"],
            borrower_income=template["borrower_income"],
            borrower_employment_type=template["borrower_employment_type"],
            loan_purpose=template["loan_purpose"],
            current_outstanding=round(outstanding, 2),
            emis_paid=emis_paid,
            emis_missed=template["emis_missed"],
            status=LoanStatus.PENDING,
        )
        
        db.add(loan)
        created_loans.append(loan)
    
    db.commit()
    print(f"✓ Created {len(created_loans)} demo loans")
    return created_loans


def create_ai_model_record(db: Session):
    """Create AI model version record"""
    print("Creating AI model record...")
    
    model = AIModel(
        model_name="Risk Assessment Model",
        version="1.0.0",
        model_type="risk_assessment",
        file_path="./ai/models/risk_model_v1.0.0.pkl",
        hyperparameters='{"max_iter": 1000, "solver": "lbfgs", "class_weight": "balanced"}',
        training_metrics='{"accuracy": 0.87, "precision": 0.85, "recall": 0.89}',
        is_active=True,
    )
    
    db.add(model)
    db.commit()
    print("✓ Created AI model record")


async def main():
    """Main function to generate all demo data"""
    print("=" * 60)
    print("AI-Powered Loan Trading Platform - Demo Data Generator")
    print("=" * 60)
    print()
    
    # Initialize database
    print("Initializing database...")
    init_db()
    print("✓ Database initialized")
    print()
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Create demo users
        users = create_demo_users(db)
        print()
        
        # Get originators
        originators = [u for u in users if u.role == UserRole.ORIGINATOR]
        
        # Create demo loans
        loans = create_demo_loans(db, originators)
        print()
        
        # Create AI model record
        create_ai_model_record(db)
        print()
        
        print("=" * 60)
        print("Demo data generation completed successfully!")
        print("=" * 60)
        print()
        print("Login Credentials:")
        print("-" * 60)
        print("Admin:")
        print("  Username: admin")
        print("  Password: admin123")
        print()
        print("Originator 1 (First National Bank):")
        print("  Username: originator1")
        print("  Password: originator123")
        print()
        print("Originator 2 (Credit Union Group):")
        print("  Username: originator2")
        print("  Password: originator123")
        print()
        print("Investor 1 (Institutional Investor Fund):")
        print("  Username: investor1")
        print("  Password: investor123")
        print()
        print("Investor 2 (Asset Management Corp):")
        print("  Username: investor2")
        print("  Password: investor123")
        print("=" * 60)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
