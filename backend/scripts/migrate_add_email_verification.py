"""
Migration script to add email verification fields to the users table.
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


def add_email_verification_fields():
    """Add email verification fields to users table"""
    try:
        with engine.connect() as conn:
            # Check if columns exist before adding
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('email_verified', 'email_verification_token', 'email_verification_sent_at', 'email_verified_at', 'verification_attempts', 'last_verification_email_sent')
            """)).fetchall()
            
            existing_columns = [row[0] for row in result]
            
            if 'email_verified' not in existing_columns:
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN email_verified BOOLEAN DEFAULT FALSE
                """))
                logger.info("Added email_verified column")
            
            if 'email_verification_token' not in existing_columns:
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN email_verification_token VARCHAR(100)
                """))
                conn.execute(text("""
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_verification_token 
                    ON users(email_verification_token)
                """))
                logger.info("Added email_verification_token column and index")
            
            if 'email_verification_sent_at' not in existing_columns:
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN email_verification_sent_at TIMESTAMP WITH TIME ZONE
                """))
                logger.info("Added email_verification_sent_at column")
            
            if 'email_verified_at' not in existing_columns:
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE
                """))
                logger.info("Added email_verified_at column")
            
            if 'verification_attempts' not in existing_columns:
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN verification_attempts INTEGER DEFAULT 0
                """))
                logger.info("Added verification_attempts column")
            
            if 'last_verification_email_sent' not in existing_columns:
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN last_verification_email_sent TIMESTAMP WITH TIME ZONE
                """))
                logger.info("Added last_verification_email_sent column")
            
            conn.commit()
            logger.info("Email verification fields migration completed successfully")
        
        return True
    except Exception as e:
        logger.error(f"Error adding email verification fields: {e}")
        return False


def rollback():
    """Rollback - drop the email verification columns"""
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                ALTER TABLE users 
                DROP COLUMN IF EXISTS email_verified,
                DROP COLUMN IF EXISTS email_verification_token,
                DROP COLUMN IF EXISTS email_verification_sent_at,
                DROP COLUMN IF EXISTS email_verified_at,
                DROP COLUMN IF EXISTS verification_attempts,
                DROP COLUMN IF EXISTS last_verification_email_sent
            """))
            conn.commit()
            logger.info("Email verification fields rolled back successfully")
        return True
    except Exception as e:
        logger.error(f"Error rolling back email verification fields: {e}")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migration script for email verification fields")
    parser.add_argument("--rollback", action="store_true", help="Rollback the migration")
    args = parser.parse_args()
    
    if args.rollback:
        print("Rolling back migration...")
        rollback()
    else:
        print("Running migration...")
        add_email_verification_fields()
