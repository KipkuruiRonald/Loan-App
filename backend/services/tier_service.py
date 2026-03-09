from sqlalchemy.orm import Session
from sqlalchemy import func
from models.models import User, Loan, Transaction, TransactionStatus, LoanStatus
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class TierService:
    """Service to handle user tier calculations and updates"""
    
    def __init__(self, db: Session):
        self.db = db
        self.tier_config = self._load_tier_config()
    
    def _load_tier_config(self) -> Dict[int, Dict]:
        """Load tier configuration from database or use defaults"""
        from models.models import SystemSettings
        import json
        
        settings = self.db.query(SystemSettings).filter(
            SystemSettings.category == "tier_config",
            SystemSettings.setting_key == "tiers"
        ).first()
        
        if settings and settings.setting_value:
            try:
                config = json.loads(settings.setting_value)
                return {tier['level']: tier for tier in config['tiers']}
            except:
                pass
        
        # Default tier configuration
        return {
            1: {"level": 1, "name": "Bronze", "min_score": 0, "max_score": 199, "loan_limit": 500, "interest_rate": 4.0, "processing_fee": 25, "requirements": "Initial tier", "color": "#CD7F32"},
            2: {"level": 2, "name": "Silver", "min_score": 200, "max_score": 349, "loan_limit": 1000, "interest_rate": 3.9, "processing_fee": 23, "requirements": "3+ on-time payments", "color": "#C0C0C0"},
            3: {"level": 3, "name": "Silver", "min_score": 350, "max_score": 499, "loan_limit": 2000, "interest_rate": 3.8, "processing_fee": 20, "requirements": "5+ on-time payments", "color": "#C0C0C0"},
            4: {"level": 4, "name": "Gold", "min_score": 500, "max_score": 649, "loan_limit": 3500, "interest_rate": 3.7, "processing_fee": 18, "requirements": "90% on-time rate", "color": "#FFD700"},
            5: {"level": 5, "name": "Gold", "min_score": 650, "max_score": 799, "loan_limit": 5000, "interest_rate": 3.5, "processing_fee": 15, "requirements": "5+ loans, 90% on-time", "color": "#FFD700"},
            6: {"level": 6, "name": "Platinum", "min_score": 800, "max_score": 899, "loan_limit": 7500, "interest_rate": 3.3, "processing_fee": 12, "requirements": "Perfect streak", "color": "#E5E4E2"},
            7: {"level": 7, "name": "Platinum", "min_score": 900, "max_score": 1000, "loan_limit": 10000, "interest_rate": 3.2, "processing_fee": 10, "requirements": "10+ loans, perfect streak", "color": "#E5E4E2"},
            8: {"level": 8, "name": "Diamond", "min_score": 1001, "max_score": 9999, "loan_limit": 15000, "interest_rate": 3.0, "processing_fee": 0, "requirements": "Perfect repayment history", "color": "#B9F2FF"},
        }
    
    def calculate_user_metrics(self, user_id: int) -> Dict:
        """Calculate user's loan statistics"""
        # Get all loans for this user
        loans = self.db.query(Loan).filter(Loan.borrower_id == user_id).all()
        
        total_loans = len(loans)
        completed_loans = len([l for l in loans if l.status == LoanStatus.SETTLED])
        active_loans = len([l for l in loans if l.status == LoanStatus.ACTIVE])
        
        # Calculate on-time payment rate
        total_payments = self.db.query(Transaction).filter(
            Transaction.borrower_id == user_id,
            Transaction.status == TransactionStatus.CONFIRMED
        ).count()
        
        # Check for late payments based on loan late_days
        late_loans = self.db.query(Loan).filter(
            Loan.borrower_id == user_id,
            Loan.late_days > 0
        ).count()
        
        on_time_rate = ((total_payments - late_loans) / total_payments * 100) if total_payments > 0 else 100
        
        # Get perfect repayment streak from user
        user = self.db.query(User).filter(User.id == user_id).first()
        perfect_streak = user.perfect_repayment_streak if user else 0
        
        return {
            "total_loans": total_loans,
            "completed_loans": completed_loans,
            "active_loans": active_loans,
            "on_time_rate": on_time_rate,
            "perfect_streak": perfect_streak,
            "current_tier": user.credit_tier if user else 1,
            "current_score": user.credit_score if user else 150
        }
    
    def determine_appropriate_tier(self, user_id: int) -> int:
        """Determine which tier a user should be in based on their metrics"""
        metrics = self.calculate_user_metrics(user_id)
        current_score = metrics['current_score']
        
        # Find the highest tier the user qualifies for based on score
        eligible_tiers = []
        
        for level, config in self.tier_config.items():
            if config['min_score'] <= current_score <= config['max_score']:
                # Check additional requirements
                if self._meets_requirements(metrics, config):
                    eligible_tiers.append(level)
        
        # Return the highest eligible tier, or current tier if none
        return max(eligible_tiers) if eligible_tiers else metrics['current_tier']
    
    def _meets_requirements(self, metrics: Dict, tier_config: Dict) -> bool:
        """Check if user meets tier-specific requirements"""
        requirements = tier_config.get('requirements', '').lower()
        
        if '3+ on-time payments' in requirements:
            return metrics['completed_loans'] >= 3
        
        if '5+ on-time payments' in requirements:
            return metrics['completed_loans'] >= 5
        
        if '90% on-time rate' in requirements:
            return metrics['on_time_rate'] >= 90
        
        if '5+ loans' in requirements:
            return metrics['total_loans'] >= 5
        
        if 'perfect streak' in requirements:
            return metrics['perfect_streak'] >= 1
        
        if '10+ loans' in requirements:
            return metrics['total_loans'] >= 10
        
        # Default - no additional requirements
        return True
    
    def update_user_tier(self, user_id: int) -> Dict:
        """Check and update user's tier if needed"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"success": False, "message": "User not found"}
        
        old_tier = user.credit_tier
        new_tier = self.determine_appropriate_tier(user_id)
        
        if new_tier != old_tier:
            # Get tier config for new tier
            new_tier_config = self.tier_config.get(new_tier, {})
            
            # Update user's tier
            user.credit_tier = new_tier
            user.current_limit = new_tier_config.get('loan_limit', user.current_limit)
            user.updated_at = func.now()
            
            self.db.commit()
            
            # Log tier change
            logger.info(f"User {user_id} tier changed from {old_tier} to {new_tier}")
            
            # Create notification for user
            self._create_tier_change_notification(user_id, old_tier, new_tier)
            
            return {
                "success": True,
                "old_tier": old_tier,
                "new_tier": new_tier,
                "changed": True,
                "new_limit": new_tier_config.get('loan_limit')
            }
        
        return {
            "success": True,
            "old_tier": old_tier,
            "new_tier": new_tier,
            "changed": False
        }
    
    def _create_tier_change_notification(self, user_id: int, old_tier: int, new_tier: int):
        """Create notification for user about tier change"""
        from models.models import Notification, NotificationPriority
        from datetime import datetime
        
        tier_names = ["", "Bronze", "Silver", "Silver", "Gold", "Gold", "Platinum", "Platinum", "Diamond"]
        old_name = tier_names[old_tier] if old_tier < len(tier_names) else f"Tier {old_tier}"
        new_name = tier_names[new_tier] if new_tier < len(tier_names) else f"Tier {new_tier}"
        
        is_promotion = new_tier > old_tier
        
        notification = Notification(
            user_id=user_id,
            type="TIER_CHANGE",
            title="Tier Update!" if is_promotion else "Tier Changed",
            message=f"Congratulations! You've been promoted from {old_name} to {new_name}!" if is_promotion 
                    else f"Your tier has been updated from {old_name} to {new_name}.",
            priority=NotificationPriority.MEDIUM,
            created_at=datetime.utcnow()
        )
        self.db.add(notification)
        self.db.commit()
    
    def evaluate_all_users(self) -> Dict:
        """Evaluate all active users for tier updates"""
        users = self.db.query(User).filter(User.is_active == True).all()
        
        results = {
            "total": len(users),
            "updated": 0,
            "errors": 0,
            "promotions": 0,
            "demotions": 0
        }
        
        for user in users:
            try:
                result = self.update_user_tier(user.id)
                if result.get('changed'):
                    results['updated'] += 1
                    if result.get('new_tier', 0) > result.get('old_tier', 0):
                        results['promotions'] += 1
                    else:
                        results['demotions'] += 1
            except Exception as e:
                logger.error(f"Error evaluating user {user.id}: {e}")
                results['errors'] += 1
        
        return results
