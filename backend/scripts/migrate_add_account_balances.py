"""
Migration script to add account_balances table for real money validation.
Run this script to create the account_balances table.
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from core.database import engine, Base
from models.models import AccountBalance
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_account_balances_table():
    """Create the account_balances table"""
    try:
        # Create the table using SQLAlchemy model
        AccountBalance.__table__.create(bind=engine, checkfirst=True)
        logger.info("account_balances table created successfully")
        
        # Insert default company disbursement account
        with engine.connect() as conn:
            # Check if company account already exists
            result = conn.execute(text("""
                SELECT id FROM account_balances 
                WHERE user_id IS NULL AND account_type = 'company_disbursement'
            """)).fetchone()
            
            if not result:
                conn.execute(text("""
                    INSERT INTO account_balances 
                    (account_type, balance, currency, created_at, updated_at)
                    VALUES 
                    ('company_disbursement', 1000000.0, 'KES', NOW(), NOW())
                """))
                conn.commit()
                logger.info("Created default company disbursement account with KSh 1,000,000")
            else:
                logger.info("Company disbursement account already exists")
        
        return True
    except Exception as e:
        logger.error(f"Error creating account_balances table: {e}")
        return False


def rollback():
    """Rollback - drop the account_balances table"""
    try:
        AccountBalance.__table__.drop(bind=engine)
        logger.info("account_balances table dropped successfully")
        return True
    except Exception as e:
        logger.error(f"Error dropping account_balances table: {e}")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migration script for account_balances table")
    parser.add_argument("--rollback", action="store_true", help="Rollback the migration")
    args = parser.parse_args()
    
    if args.rollback:
        print("Rolling back migration...")
        rollback()
    else:
        print("Running migration...")
        create_account_balances_table()
