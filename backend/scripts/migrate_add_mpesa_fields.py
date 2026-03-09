"""
Migration script to add M-Pesa specific fields to the transactions table.
Run this script to add the new columns.
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from core.database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def add_mpesa_fields():
    """Add M-Pesa specific fields to transactions table"""
    try:
        with engine.connect() as conn:
            # Check if columns exist before adding
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'transactions' 
                AND column_name IN ('mpesa_checkout_id', 'mpesa_receipt', 'mpesa_phone', 'failure_reason')
            """)).fetchall()
            
            existing_columns = [row[0] for row in result]
            
            if 'mpesa_checkout_id' not in existing_columns:
                conn.execute(text("""
                    ALTER TABLE transactions 
                    ADD COLUMN mpesa_checkout_id VARCHAR(100)
                """))
                conn.execute(text("""
                    CREATE INDEX idx_transactions_mpesa_checkout_id 
                    ON transactions(mpesa_checkout_id)
                """))
                logger.info("Added mpesa_checkout_id column")
            
            if 'mpesa_receipt' not in existing_columns:
                conn.execute(text("""
                    ALTER TABLE transactions 
                    ADD COLUMN mpesa_receipt VARCHAR(50)
                """))
                logger.info("Added mpesa_receipt column")
            
            if 'mpesa_phone' not in existing_columns:
                conn.execute(text("""
                    ALTER TABLE transactions 
                    ADD COLUMN mpesa_phone VARCHAR(20)
                """))
                logger.info("Added mpesa_phone column")
            
            if 'failure_reason' not in existing_columns:
                conn.execute(text("""
                    ALTER TABLE transactions 
                    ADD COLUMN failure_reason VARCHAR(255)
                """))
                logger.info("Added failure_reason column")
            
            conn.commit()
            logger.info("M-Pesa fields migration completed successfully")
        
        return True
    except Exception as e:
        logger.error(f"Error adding M-Pesa fields: {e}")
        return False


def rollback():
    """Rollback - drop the M-Pesa columns"""
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                ALTER TABLE transactions 
                DROP COLUMN IF EXISTS mpesa_checkout_id
            """))
            conn.execute(text("""
                ALTER TABLE transactions 
                DROP COLUMN IF EXISTS mpesa_receipt
            """))
            conn.execute(text("""
                ALTER TABLE transactions 
                DROP COLUMN IF EXISTS mpesa_phone
            """))
            conn.execute(text("""
                ALTER TABLE transactions 
                DROP COLUMN IF EXISTS failure_reason
            """))
            conn.commit()
            logger.info("M-Pesa fields rolled back successfully")
        return True
    except Exception as e:
        logger.error(f"Error rolling back M-Pesa fields: {e}")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migration script for M-Pesa fields")
    parser.add_argument("--rollback", action="store_true", help="Rollback the migration")
    args = parser.parse_args()
    
    if args.rollback:
        print("Rolling back migration...")
        rollback()
    else:
        print("Running migration...")
        add_mpesa_fields()
