#!/usr/bin/env python3
"""
Migration script to add type and remaining_balance columns to transactions table
Supports both SQLite and PostgreSQL
"""

import sqlite3
import sys
import os
import psycopg2
from psycopg2 import sql

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def migrate_sqlite():
    """Add columns to SQLite database"""
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'okoleo.db')
    
    print(f"SQLite Database path: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check current columns
    cursor.execute("PRAGMA table_info(transactions)")
    columns = {row[1] for row in cursor.fetchall()}
    print(f"Current columns: {columns}")
    
    # Add type column if not exists
    if 'type' not in columns:
        print("Adding 'type' column...")
        cursor.execute("ALTER TABLE transactions ADD COLUMN type VARCHAR(20) DEFAULT 'REPAYMENT'")
    else:
        print("'type' column already exists")
    
    # Add remaining_balance column if not exists
    if 'remaining_balance' not in columns:
        print("Adding 'remaining_balance' column...")
        cursor.execute("ALTER TABLE transactions ADD COLUMN remaining_balance FLOAT")
    else:
        print("'remaining_balance' column already exists")
    
    # Add amount column if not exists (needed for loan transactions)
    if 'amount' not in columns:
        print("Adding 'amount' column...")
        cursor.execute("ALTER TABLE transactions ADD COLUMN amount FLOAT")
        # Copy data from price column if it exists
        if 'price' in columns:
            print("Copying data from 'price' to 'amount' column...")
            cursor.execute("UPDATE transactions SET amount = price WHERE amount IS NULL")
    else:
        print("'amount' column already exists")
    
    conn.commit()
    
    # Verify columns were added
    cursor.execute("PRAGMA table_info(transactions)")
    columns = {row[1] for row in cursor.fetchall()}
    print(f"Updated columns: {columns}")
    
    conn.close()
    print("SQLite migration completed successfully!")
    return True


def migrate_postgresql():
    """Add columns to PostgreSQL database"""
    from dotenv import load_dotenv
    load_dotenv()
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL not found in environment")
        return False
    
    # Parse database URL
    # Format: postgresql://user:password@host:port/dbname
    import re
    match = re.match(r'postgresql://(?P<user>[^:]+):(?P<password>[^@]+)@(?P<host>[^:]+):(?P<port>\d+)/(?P<dbname>.+)', database_url)
    if not match:
        print(f"Error: Could not parse DATABASE_URL: {database_url}")
        return False
    
    db_params = match.groupdict()
    print(f"Connecting to PostgreSQL: {db_params['host']}:{db_params['port']}/{db_params['dbname']}")
    
    try:
        conn = psycopg2.connect(
            host=db_params['host'],
            port=db_params['port'],
            dbname=db_params['dbname'],
            user=db_params['user'],
            password=db_params['password']
        )
        cursor = conn.cursor()
        
        # Check current columns
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'transactions'
        """)
        columns = {row[0] for row in cursor.fetchall()}
        print(f"Current columns: {columns}")
        
        # Add type column if not exists
        if 'type' not in columns:
            print("Adding 'type' column...")
            cursor.execute("ALTER TABLE transactions ADD COLUMN type VARCHAR(20) DEFAULT 'REPAYMENT'")
        else:
            print("'type' column already exists")
        
        # Add remaining_balance column if not exists
        if 'remaining_balance' not in columns:
            print("Adding 'remaining_balance' column...")
            cursor.execute("ALTER TABLE transactions ADD COLUMN remaining_balance FLOAT")
        else:
            print("'remaining_balance' column already exists")

        # Add amount column if not exists (needed for loan transactions)
        if 'amount' not in columns:
            print("Adding 'amount' column...")
            cursor.execute("ALTER TABLE transactions ADD COLUMN amount FLOAT")
            # Copy data from price column if it exists
            if 'price' in columns:
                print("Copying data from 'price' to 'amount' column...")
                cursor.execute("UPDATE transactions SET amount = price WHERE amount IS NULL")
        else:
            print("'amount' column already exists")
        
        conn.commit()
        
        # Verify columns were added
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'transactions'
        """)
        columns = {row[0] for row in cursor.fetchall()}
        print(f"Updated columns: {columns}")
        
        cursor.close()
        conn.close()
        print("PostgreSQL migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"Error connecting to PostgreSQL: {e}")
        return False


def migrate():
    """Run migrations for both SQLite and PostgreSQL"""
    # Try SQLite first
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'okoleo.db')
    if os.path.exists(db_path):
        print("=== Running SQLite migration ===")
        migrate_sqlite()
    
    # Try PostgreSQL
    print("\n=== Running PostgreSQL migration ===")
    migrate_postgresql()


if __name__ == "__main__":
    migrate()
