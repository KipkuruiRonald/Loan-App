"""
Migration script to update existing loans to use 20% interest rate.

This script updates all ACTIVE and SETTLED loans to use the new 20% interest rate
and recalculates total_due accordingly.

Usage:
    python -m backend.scripts.update_loan_interest_rate
"""

import sys
import os

# Add the backend directory to the path
script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(script_dir)

# Load environment variables from .env
from pathlib import Path
env_file = Path(script_dir) / '.env'
if env_file.exists():
    from dotenv import load_dotenv
    load_dotenv(env_file)

from sqlalchemy import text, create_engine

# Create engine using DATABASE_URL from environment
DATABASE_URL = os.getenv('DATABASE_URL', f'sqlite:///{os.path.join(script_dir, "okoleo.db")}')
engine = create_engine(DATABASE_URL)


def update_loan_interest_rates():
    """Update all loans to use 20% interest rate."""
    
    print("Starting loan interest rate update...")
    
    with engine.connect() as conn:
        # First, let's see what loans exist and their current values
        print("\n--- Current loan data (before update) ---")
        result = conn.execute(text("""
            SELECT id, loan_id, principal, interest_rate, total_due, status
            FROM loans 
            WHERE status IN ('ACTIVE', 'SETTLED', 'PENDING')
            ORDER BY created_at DESC
            LIMIT 10
        """))
        rows = result.fetchall()
        
        if not rows:
            print("No loans found to update.")
            return
            
        print(f"Found {len(rows)} loans to check:")
        for row in rows:
            print(f"  ID: {row[0]}, Loan: {row[1]}, Principal: {row[2]}, Rate: {row[3]}%, Total Due: {row[4]}, Status: {row[5]}")
        
        # Calculate new values
        # New rate: 20% = 0.20
        # New total_due = principal + (principal * 0.20) = principal * 1.20
        
        print("\n--- Updating loans to 20% interest rate ---")
        
        # Update ACTIVE loans
        active_result = conn.execute(text("""
            UPDATE loans 
            SET 
                interest_rate = 20,
                total_due = principal * 1.20,
                updated_at = NOW()
            WHERE status = 'ACTIVE'
            RETURNING id, loan_id, principal, total_due
        """))
        active_updated = active_result.fetchall()
        print(f"Updated {len(active_updated)} ACTIVE loans:")
        for row in active_updated:
            print(f"  Loan: {row[1]}, Principal: {row[2]}, New Total Due: {row[3]}")
        
        # Update SETTLED loans
        settled_result = conn.execute(text("""
            UPDATE loans 
            SET 
                interest_rate = 20,
                total_due = principal * 1.20,
                updated_at = NOW()
            WHERE status = 'SETTLED'
            RETURNING id, loan_id, principal, total_due
        """))
        settled_updated = settled_result.fetchall()
        print(f"Updated {len(settled_updated)} SETTLED loans")
        
        # Update PENDING loans (they will use the new rate when approved)
        pending_result = conn.execute(text("""
            UPDATE loans 
            SET 
                interest_rate = 20,
                total_due = principal * 1.20,
                updated_at = NOW()
            WHERE status = 'PENDING'
            RETURNING id, loan_id, principal, total_due
        """))
        pending_updated = pending_result.fetchall()
        print(f"Updated {len(pending_updated)} PENDING loans")
        
        conn.commit()
        
        # Verify the updates
        print("\n--- Verifying updates ---")
        verify_result = conn.execute(text("""
            SELECT id, loan_id, principal, interest_rate, total_due, status
            FROM loans 
            WHERE status IN ('ACTIVE', 'SETTLED', 'PENDING')
            ORDER BY created_at DESC
            LIMIT 10
        """))
        verify_rows = verify_result.fetchall()
        
        print("Updated loan data:")
        for row in verify_rows:
            print(f"  ID: {row[0]}, Loan: {row[1]}, Principal: {row[2]}, Rate: {row[3]}%, Total Due: {row[4]}, Status: {row[5]}")
        
        print(f"\n--- Summary ---")
        print(f"Total loans updated: {len(active_updated) + len(settled_updated) + len(pending_updated)}")
        print(f"  - ACTIVE: {len(active_updated)}")
        print(f"  - SETTLED: {len(settled_updated)}")
        print(f"  - PENDING: {len(pending_updated)}")
        
        # Note: outstanding_balance column does not exist in this database
        # The frontend uses current_outstanding or total_due as fallback
        print("\nNote: outstanding_balance column does not exist in database.")
        print("The application uses current_outstanding or total_due as fallback.")
        
        conn.commit()
        
        print("\n--- Verifying outstanding balances ---")
        verify_result = conn.execute(text("""
            SELECT id, loan_id, principal, total_due, status
            FROM loans 
            WHERE status IN ('ACTIVE', 'SETTLED', 'PENDING')
            ORDER BY created_at DESC
            LIMIT 10
        """))
        verify_rows = verify_result.fetchall()
        
        print("Updated loan data:")
        for row in verify_rows:
            print(f"  ID: {row[0]}, Loan: {row[1]}, Principal: {row[2]}, Total Due: {row[3]}, Status: {row[4]}")
        
        print("\nMigration completed successfully!")


if __name__ == "__main__":
    update_loan_interest_rates()
