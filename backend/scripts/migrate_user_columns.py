"""
Migration script to add missing columns to users table.
Run this script to fix the registration error.

Usage:
    python -m scripts.migrate_user_columns
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from core.database import engine


def migrate():
    """Add missing columns to users table"""
    
    # Columns to add
    columns = [
        ("phone", "VARCHAR(20)"),
        ("national_id", "VARCHAR(50)"),
        ("date_of_birth", "DATE"),
        ("location", "VARCHAR(255)"),
        ("last_login", "TIMESTAMP WITH TIME ZONE"),
        ("last_login_ip", "VARCHAR(50)"),
        ("login_count", "INTEGER DEFAULT 0"),
    ]
    
    with engine.connect() as conn:
        # Check existing columns
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        """))
        existing_columns = [row[0] for row in result]
        
        print(f"Existing columns: {existing_columns}")
        
        # Add missing columns
        for col_name, col_type in columns:
            if col_name not in existing_columns:
                try:
                    sql = f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"
                    conn.execute(text(sql))
                    conn.commit()
                    print(f"✅ Added column: {col_name}")
                except Exception as e:
                    print(f"❌ Error adding {col_name}: {e}")
            else:
                print(f"⏭️  Column already exists: {col_name}")
        
        # Create index for phone if it doesn't exist
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)"))
            conn.commit()
            print("✅ Created index: idx_users_phone")
        except Exception as e:
            print(f"⏭️  Index already exists or error: {e}")
        
        # Update login_count for existing records
        try:
            conn.execute(text("UPDATE users SET login_count = 0 WHERE login_count IS NULL"))
            conn.commit()
            print("✅ Updated existing records")
        except Exception as e:
            print(f"⏭️  No records to update or error: {e}")
        
        # Verify final state
        result = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        """))
        
        print("\n📊 Final table structure:")
        for row in result:
            print(f"  - {row[0]}: {row[1]}")


if __name__ == "__main__":
    print("🚀 Starting migration...\n")
    migrate()
    print("\n✅ Migration complete!")
