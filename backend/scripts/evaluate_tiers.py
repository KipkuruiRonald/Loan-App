import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import SessionLocal
from services.tier_service import TierService


def run_tier_evaluation():
    """Run tier evaluation for all users"""
    db = SessionLocal()
    try:
        service = TierService(db)
        result = service.evaluate_all_users()
        print(f"Tier evaluation complete:")
        print(f"   Total users: {result['total']}")
        print(f"   Updated: {result['updated']}")
        print(f"   Promotions: {result['promotions']}")
        print(f"   Demotions: {result['demotions']}")
        print(f"   Errors: {result['errors']}")
        return result
    finally:
        db.close()


if __name__ == "__main__":
    run_tier_evaluation()
