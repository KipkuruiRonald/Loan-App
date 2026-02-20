"""
Notification Service for borrower notifications.
Simplified for pure loan application.
"""

from sqlalchemy.orm import Session
from typing import Optional

from models.models import (
    Notification, NotificationType, NotificationPriority, 
    User, Loan
)


class NotificationService:
    """Service for creating and managing borrower notifications"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_notification(
        self,
        user_id: int,
        notification_type: NotificationType,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[int] = None
    ) -> Notification:
        """Create a single notification"""
        
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            priority=priority,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id
        )
        
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        
        return notification
    
    def notify_user_loan_approved(self, loan: Loan) -> Notification:
        """Notify user that their loan has been approved"""
        return self.create_notification(
            user_id=loan.borrower_id,
            notification_type=NotificationType.LOAN_APPROVED,
            title="Loan Approved! 🎉",
            message=f"Your loan application for KSh {loan.principal:,.2f} has been approved. The funds will be disbursed shortly.",
            priority=NotificationPriority.HIGH,
            related_entity_type="loan",
            related_entity_id=loan.id
        )
    
    def notify_user_loan_declined(self, loan: Loan, reason: str = "") -> Notification:
        """Notify user that their loan has been declined"""
        message = f"Your loan application for KSh {loan.principal:,.2f} has been declined."
        if reason:
            message += f" Reason: {reason}"
        
        return self.create_notification(
            user_id=loan.borrower_id,
            notification_type=NotificationType.LOAN_DECLINED,
            title="Loan Application Declined",
            message=message,
            priority=NotificationPriority.MEDIUM,
            related_entity_type="loan",
            related_entity_id=loan.id
        )
    
    def notify_payment_reminder(self, loan: Loan, days_until_due: int) -> Notification:
        """Send payment reminder to user"""
        message = f"Your loan payment of KSh {loan.total_due:,.2f} is due in {days_until_due} days."
        
        return self.create_notification(
            user_id=loan.borrower_id,
            notification_type=NotificationType.PAYMENT_DUE_REMINDER,
            title="Payment Reminder",
            message=message,
            priority=NotificationPriority.HIGH,
            related_entity_type="loan",
            related_entity_id=loan.id
        )
    
    def notify_credit_limit_increased(self, user: User, new_limit: float) -> Notification:
        """Notify user of credit limit increase"""
        return self.create_notification(
            user_id=user.id,
            notification_type=NotificationType.CREDIT_LIMIT_INCREASED,
            title="Credit Limit Increased! 🚀",
            message=f"Your credit limit has been increased to KSh {new_limit:,.2f}. You're now eligible for larger loans!",
            priority=NotificationPriority.HIGH,
            related_entity_type="user",
            related_entity_id=user.id
        )
    
    def notify_tier_upgrade(self, user: User, new_tier: int) -> Notification:
        """Notify user of tier upgrade"""
        return self.create_notification(
            user_id=user.id,
            notification_type=NotificationType.TIER_UPGRADE,
            title=f"Welcome to Tier {new_tier}! ⭐",
            message=f"Congratulations! You've been upgraded to Tier {new_tier}. Enjoy better rates and higher limits!",
            priority=NotificationPriority.HIGH,
            related_entity_type="user",
            related_entity_id=user.id
        )
    
    def notify_welcome(self, user: User) -> Notification:
        """Send welcome notification to new user"""
        return self.create_notification(
            user_id=user.id,
            notification_type=NotificationType.WELCOME_MESSAGE,
            title="Welcome to Okoleo! 🎊",
            message="Thank you for joining Okoleo. Start your journey to better financial health today!",
            priority=NotificationPriority.MEDIUM,
            related_entity_type="user",
            related_entity_id=user.id
        )


def get_notification_service(db: Session) -> NotificationService:
    """Factory function to get notification service"""
    return NotificationService(db)
