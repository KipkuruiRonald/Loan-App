-- ============================================================
-- OKOLEO DATABASE CLEANUP MIGRATION (PostgreSQL)
-- ============================================================
-- This script removes AI/Blockchain/Role tables and columns
-- Aligns database with simplified loan app requirements
-- Run with: psql -U okoleo_user -d okoleo_db -f database_cleanup.sql
-- ============================================================

-- STEP 1: DROP UNUSED TABLES
-- These tables are from old features and can be dropped entirely
-- ============================================================

DROP TABLE IF EXISTS ai_models CASCADE;
DROP TABLE IF EXISTS risk_explanations CASCADE;

-- STEP 2: REMOVE UNUSED COLUMNS FROM USERS TABLE
-- ============================================================
ALTER TABLE users DROP COLUMN IF EXISTS near_account_id CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS role CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS tier_history CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS limit_increase_date CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS limit_decrease_date CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS limit_decrease_reason CASCADE;

-- STEP 3: ADD MISSING COLUMNS TO USERS (if not exist)
-- ============================================================
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'phone') THEN
      ALTER TABLE users ADD COLUMN phone VARCHAR(20);
   END IF;
   
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'last_login') THEN
      ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
   END IF;
   
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'last_login_ip') THEN
      ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(50);
   END IF;
   
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'login_count') THEN
      ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
   END IF;
END $$;

-- STEP 4: ADD INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- STEP 5: REMOVE UNUSED COLUMNS FROM LOANS TABLE
-- ============================================================
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
-- ============================================================
ALTER TABLE transactions DROP COLUMN IF EXISTS near_tx_hash CASCADE;
ALTER TABLE transactions DROP COLUMN IF EXISTS block_height CASCADE;
ALTER TABLE transactions DROP COLUMN IF EXISTS loan_token_id CASCADE;
ALTER TABLE transactions DROP COLUMN IF EXISTS fraction CASCADE;

-- STEP 7: REMOVE UNUSED COLUMNS FROM NOTIFICATIONS TABLE
-- ============================================================
ALTER TABLE notifications DROP COLUMN IF EXISTS role CASCADE;

-- STEP 8: VERIFY CLEANUP
-- ============================================================
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;

-- List remaining tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
