"""
Database Migration Script - Clean up AI/Blockchain/Role tables and columns
Run: python scripts/run_migration.py
"""
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from core.config import settings

def run_migration():
    """Execute the database cleanup migration"""
    
    engine = create_engine(settings.DATABASE_URL)
    
    migration_sql = """
    -- STEP 1: DROP UNUSED TABLES
    DROP TABLE IF EXISTS ai_models CASCADE;
    DROP TABLE IF EXISTS risk_explanations CASCADE;

    -- STEP 2: REMOVE UNUSED COLUMNS FROM USERS TABLE
    ALTER TABLE users DROP COLUMN IF EXISTS near_account_id CASCADE;
    ALTER TABLE users DROP COLUMN IF EXISTS role CASCADE;
    ALTER TABLE users DROP COLUMN IF EXISTS tier_history CASCADE;
    ALTER TABLE users DROP COLUMN IF EXISTS limit_increase_date CASCADE;
    ALTER TABLE users DROP COLUMN IF EXISTS limit_decrease_date CASCADE;
    ALTER TABLE users DROP COLUMN IF EXISTS limit_decrease_reason CASCADE;

    -- STEP 3: ADD MISSING COLUMNS TO USERS (if not exist)
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

    -- STEP 4: ADD INDEXES FOR PERFORMANCE
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

    -- STEP 5: REMOVE UNUSED COLUMNS FROM LOANS TABLE
    ALTER TABLE loans DROP COLUMN IF EXISTS on_chain_token_id CASCADE;
    ALTER TABLE loans DROP COLUMN IF EXISTS risk_score CASCADE;
    ALTER TABLE loans DROP COLUMN IF EXISTS expected_loss CASCADE;
    ALTER TABLE loans DROP COLUMN IF EXISTS risk_grade CASCADE;
    ALTER TABLE loans DROP COLUMN IF EXISTS suggested_price CASCADE;
    ALTER TABLE loans DROP COLUMN IF EXISTS yield_to_maturity CASCADE;
    ALTER TABLE loans DROP COLUMN IF EXISTS model_version CASCADE;
    ALTER TABLE loans DROP COLUMN IF EXISTS last_assessment_at CASCADE;
    ALTER TABLE loans DROP COLUMN IF EXISTS tenure_months CASCADE;
    ALTER TABLE loans DROP COLUMN IF EXISTS monthly_emi CASCADE;
    ALTER TABLE loans DROP COLUMN IF EXISTS emis_paid CASCADE;
    ALTER TABLE loans DROP COLUMN IF EXISTS emis_missed CASCADE;
    ALTER TABLE loans DROP COLUMN IF EXISTS borrower_credit_score CASCADE;

    -- STEP 6: REMOVE UNUSED COLUMNS FROM TRANSACTIONS TABLE
    ALTER TABLE transactions DROP COLUMN IF EXISTS near_tx_hash CASCADE;
    ALTER TABLE transactions DROP COLUMN IF EXISTS block_height CASCADE;
    ALTER TABLE transactions DROP COLUMN IF EXISTS loan_token_id CASCADE;
    ALTER TABLE transactions DROP COLUMN IF EXISTS fraction CASCADE;

    -- STEP 7: REMOVE UNUSED COLUMNS FROM NOTIFICATIONS TABLE
    ALTER TABLE notifications DROP COLUMN IF EXISTS role CASCADE;
    """
    
    # Split by semicolon for individual statements
    statements = [s.strip() for s in migration_sql.split(';') if s.strip()]
    
    with engine.connect() as conn:
        for stmt in statements:
            if stmt and not stmt.startswith('--'):
                try:
                    print(f"Executing: {stmt[:80]}...")
                    conn.execute(text(stmt))
                    conn.commit()
                except Exception as e:
                    print(f"Warning: {e}")
                    # Continue on error (column might not exist)
                    pass
    
    print("\n=== Migration Complete ===")
    
    # Verify
    with engine.connect() as conn:
        # List tables
        result = conn.execute(text("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """))
        print("\nRemaining tables:")
        for row in result:
            print(f"  - {row[0]}")
        
        # List users columns
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public'
            ORDER BY ordinal_position
        """))
        print("\nUsers table columns:")
        for row in result:
            print(f"  - {row[0]}")
        
        # List loans columns
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'loans' AND table_schema = 'public'
            ORDER BY ordinal_position
        """))
        print("\nLoans table columns:")
        for row in result:
            print(f"  - {row[0]}")

if __name__ == "__main__":
    run_migration()
