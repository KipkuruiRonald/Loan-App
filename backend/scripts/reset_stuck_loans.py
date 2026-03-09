"""
Reset stuck loans script
Run this to fix loans stuck in PROCESSING status
"""
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up database URL
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://okoleo_user:325813@localhost:5432/okoleo_db')
os.environ['DATABASE_URL'] = DATABASE_URL

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def reset_stuck_loans():
    """Reset all loans stuck in PROCESSING status back to PENDING"""
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # First check which loans are stuck
        result = session.execute(text("SELECT id, loan_id, status, principal FROM loans WHERE status = 'PROCESSING'"))
        stuck_loans = result.fetchall()
        
        if stuck_loans:
            print(f"Found {len(stuck_loans)} stuck loans:")
            for loan in stuck_loans:
                print(f"  - Loan ID: {loan[0]}, loan_id: {loan[1]}, status: {loan[2]}, principal: {loan[3]}")
            
            # Reset them
            session.execute(text("UPDATE loans SET status = 'PENDING' WHERE status = 'PROCESSING'"))
            session.commit()
            print(f"\n✓ Reset {len(stuck_loans)} loans back to PENDING status")
        else:
            print("No stuck loans found - all loans are fine!")
            
    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    print("Resetting stuck loans...\n")
    reset_stuck_loans()
    print("\nDone!")
