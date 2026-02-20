-- Migration script to add missing columns to users table
-- Run this script to fix the registration error

-- Connect to the database first:
-- psql -U okoleo_user -d okoleo_db -f migrate_add_user_columns.sql

-- Add phone column
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add national_id column
ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id VARCHAR(50);

-- Add date_of_birth column
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add location column
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Add last_login column
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Add last_login_ip column
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(50);

-- Add login_count column
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_national_id ON users(national_id);

-- Set default values for existing records (optional)
UPDATE users SET login_count = 0 WHERE login_count IS NULL;

-- Make phone nullable initially (change to NOT NULL after data migration)
-- ALTER TABLE users ALTER COLUMN phone SET NOT NULL;

-- Verify the columns were added
-- \d users
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
