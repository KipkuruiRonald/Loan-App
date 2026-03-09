"""
Migration script to add TIER_CHANGE to the notificationtype enum.

This is needed because the tier service sends TIER_CHANGE notifications
but the enum doesn't have this value yet.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Fix Unicode for Windows
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

load_dotenv()


def add_tier_change_enum():
    """Add TIER_CHANGE to the notificationtype enum"""
    
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not found in environment")
        return
    
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if 'TIER_CHANGE' already exists
        try:
            result = conn.execute(text("""
                SELECT unnest(enum_range(NULL::notificationtype))::text
            """))
            existing_values = [row[0] for row in result]
            
            print(f"Current enum values: {existing_values}")
            
            if 'TIER_CHANGE' not in existing_values:
                conn.execute(text("ALTER TYPE notificationtype ADD VALUE 'TIER_CHANGE'"))
                conn.commit()
                print("SUCCESS: Added TIER_CHANGE to notificationtype enum")
            else:
                print("SUCCESS: TIER_CHANGE already exists in enum")
                
        except Exception as e:
            print(f"ERROR: {e}")
            # Try alternative approach - check if we can add the value
            try:
                # Try to add the value directly
                conn.execute(text("ALTER TYPE notificationtype ADD VALUE 'TIER_CHANGE'"))
                conn.commit()
                print("SUCCESS: Added TIER_CHANGE to notificationtype enum (alternative approach)")
            except Exception as e2:
                print(f"ERROR - Alternative approach also failed: {e2}")


if __name__ == "__main__":
    add_tier_change_enum()
