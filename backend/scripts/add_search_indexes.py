"""
Database migration script to add search indexes for improved search performance.

Run this script to add the necessary indexes to the database:
    python -m scripts.add_search_indexes

Indexes created:
- users: name, email, phone, credit_tier, is_active
- loans: borrower_id, status, principal, created_at, due_date
- transactions: borrower_id, loan_id, status, initiated_at, amount
- notifications: user_id, is_read, created_at
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from core.database import engine


def add_search_indexes():
    """Add search indexes to the database."""
    
    indexes = [
        # User search indexes
        ("idx_users_full_name", "CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name)"),
        ("idx_users_email", "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"),
        ("idx_users_phone", "CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)"),
        ("idx_users_credit_tier", "CREATE INDEX IF NOT EXISTS idx_users_credit_tier ON users(credit_tier)"),
        ("idx_users_is_active", "CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)"),
        
        # Loan search indexes
        ("idx_loans_borrower_id", "CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON loans(borrower_id)"),
        ("idx_loans_status", "CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status)"),
        ("idx_loans_principal", "CREATE INDEX IF NOT EXISTS idx_loans_principal ON loans(principal)"),
        ("idx_loans_created_at", "CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans(created_at)"),
        ("idx_loans_due_date", "CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date)"),
        
        # Transaction search indexes
        ("idx_transactions_borrower_id", "CREATE INDEX IF NOT EXISTS idx_transactions_borrower_id ON transactions(borrower_id)"),
        ("idx_transactions_loan_id", "CREATE INDEX IF NOT EXISTS idx_transactions_loan_id ON transactions(loan_id)"),
        ("idx_transactions_status", "CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)"),
        ("idx_transactions_initiated_at", "CREATE INDEX IF NOT EXISTS idx_transactions_initiated_at ON transactions(initiated_at)"),
        ("idx_transactions_amount", "CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount)"),
        
        # Notification indexes
        ("idx_notifications_user_id", "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)"),
        ("idx_notifications_is_read", "CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)"),
        ("idx_notifications_created_at", "CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)"),
    ]
    
    with engine.connect() as conn:
        for index_name, create_sql in indexes:
            try:
                # Check if index exists (for PostgreSQL)
                result = conn.execute(text(f"""
                    SELECT 1 FROM pg_indexes 
                    WHERE indexname = '{index_name}'
                """))
                
                if result.fetchone():
                    print(f"✓ Index {index_name} already exists, skipping...")
                else:
                    # Create index
                    conn.execute(text(create_sql))
                    conn.commit()
                    print(f"✓ Created index {index_name}")
            except Exception as e:
                print(f"✗ Error creating index {index_name}: {e}")
    
    print("\n✓ Search indexes migration complete!")


if __name__ == "__main__":
    print("Starting search indexes migration...\n")
    add_search_indexes()
