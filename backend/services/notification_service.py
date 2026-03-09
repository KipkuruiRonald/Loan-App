"""
Notification Service for borrower notifications.
Supports all notification types including loans, payments, security, and system notifications.
"""

from sqlalchemy.orm import Session
from typing import Optional, List

from models.models import (
    Notification, NotificationType, NotificationPriority, 
    User, Loan, Transaction
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
    
    def create_notifications_bulk(
        self,
        user_ids: List[int],
        notification_type: NotificationType,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[int] = None
    ) -> List[Notification]:
        """Create notifications for multiple users"""
        
        notifications = []
        for user_id in user_ids:
            notification = Notification(
                user_id=user_id,
                type=notification_type,
                title=title,
                message=message,
                priority=priority,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id
            )
            notifications.append(notification)
        
        self.db.add_all(notifications)
        self.db.commit()
        
        return notifications

    # =========================================================================
    # LOAN NOTIFICATIONS
    # =========================================================================
    
    def notify_user_loan_approved(self, loan: Loan) -> Notification:
        """Notify user that their loan has been approved"""
        return self.create_notification(
            user_id=loan.borrower_id,
            notification_type=NotificationType.LOAN_APPROVED,
            title="Loan Approved!",
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
    
    def notify_user_loan_disbursed(self, loan: Loan) -> Notification:
        """Notify user that loan has been disbursed to M-Pesa"""
        return self.create_notification(
            user_id=loan.borrower_id,
            notification_type=NotificationType.LOAN_DISBURSED,
            title="Loan Disbursed",
            message=f"Your loan of KSh {loan.principal:,.2f} has been sent to your M-Pesa account. You should receive it within minutes.",
            priority=NotificationPriority.HIGH,
            related_entity_type="loan",
            related_entity_id=loan.id
        )
    
    def notify_user_loan_repaid(self, loan: Loan) -> Notification:
        """Notify user that their loan has been fully repaid"""
        return self.create_notification(
            user_id=loan.borrower_id,
            notification_type=NotificationType.LOAN_REPAID,
            title="Loan Fully Repaid",
            message=f"Congratulations! Your loan of KSh {loan.principal:,.2f} has been fully repaid. Thank you for your timely payments.",
            priority=NotificationPriority.HIGH,
            related_entity_type="loan",
            related_entity_id=loan.id
        )

    # =========================================================================
    # PAYMENT NOTIFICATIONS
    # =========================================================================
    
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
    
    def notify_payment_received(self, loan: Loan, amount: float) -> Notification:
        """Notify user that payment has been received"""
        return self.create_notification(
            user_id=loan.borrower_id,
            notification_type=NotificationType.PAYMENT_RECEIVED,
            title="Payment Received",
            message=f"We have received your payment of KSh {amount:,.2f}. Thank you for your prompt payment.",
            priority=NotificationPriority.MEDIUM,
            related_entity_type="loan",
            related_entity_id=loan.id
        )
    
    def notify_payment_failed(self, loan: Loan, reason: str = "") -> Notification:
        """Notify user that payment failed"""
        message = f"Your payment of KSh {loan.total_due:,.2f} could not be processed."
        if reason:
            message += f" Reason: {reason}"
        message += " Please try again or contact support."
        
        return self.create_notification(
            user_id=loan.borrower_id,
            notification_type=NotificationType.PAYMENT_FAILED,
            title="Payment Failed",
            message=message,
            priority=NotificationPriority.HIGH,
            related_entity_type="loan",
            related_entity_id=loan.id
        )
    
    def notify_repayment_confirmation(self, loan: Loan, amount: float) -> Notification:
        """Send repayment confirmation"""
        return self.create_notification(
            user_id=loan.borrower_id,
            notification_type=NotificationType.REPAYMENT_CONFIRMATION,
            title="Repayment Confirmed",
            message=f"Your repayment of KSh {amount:,.2f} has been confirmed. Remaining balance: KSh {loan.total_due:,.2f}",
            priority=NotificationPriority.MEDIUM,
            related_entity_type="loan",
            related_entity_id=loan.id
        )

    # =========================================================================
    # ACCOUNT NOTIFICATIONS
    # =========================================================================
    
    def notify_credit_limit_increased(self, user: User, new_limit: float) -> Notification:
        """Notify user of credit limit increase"""
        return self.create_notification(
            user_id=user.id,
            notification_type=NotificationType.CREDIT_LIMIT_INCREASED,
            title="Credit Limit Increased",
            message=f"Your credit limit has been increased to KSh {new_limit:,.2f}. You're now eligible for larger loans!",
            priority=NotificationPriority.HIGH,
            related_entity_type="user",
            related_entity_id=user.id
        )
    
    def notify_credit_limit_decreased(self, user: User, new_limit: float, reason: str = "") -> Notification:
        """Notify user of credit limit decrease"""
        message = f"Your credit limit has been decreased to KSh {new_limit:,.2f}."
        if reason:
            message += f" {reason}"
        
        return self.create_notification(
            user_id=user.id,
            notification_type=NotificationType.CREDIT_LIMIT_DECREASED,
            title="Credit Limit Updated",
            message=message,
            priority=NotificationPriority.MEDIUM,
            related_entity_type="user",
            related_entity_id=user.id
        )
    
    def notify_tier_upgrade(self, user: User, new_tier: int) -> Notification:
        """Notify user of tier upgrade"""
        return self.create_notification(
            user_id=user.id,
            notification_type=NotificationType.TIER_UPGRADE,
            title=f"Welcome to Tier {new_tier}",
            message=f"Congratulations! You've been upgraded to Tier {new_tier}. Enjoy better rates and higher limits!",
            priority=NotificationPriority.HIGH,
            related_entity_type="user",
            related_entity_id=user.id
        )
    
    def notify_tier_downgrade(self, user: User, new_tier: int, reason: str = "") -> Notification:
        """Notify user of tier downgrade"""
        message = f"Your tier has been changed to Tier {new_tier}."
        if reason:
            message += f" {reason}"
        message += " Continue making timely payments to upgrade again!"
        
        return self.create_notification(
            user_id=user.id,
            notification_type=NotificationType.TIER_DOWNGRADE,
            title=f"Tier Update",
            message=message,
            priority=NotificationPriority.MEDIUM,
            related_entity_type="user",
            related_entity_id=user.id
        )
    
    def notify_welcome(self, user: User) -> Notification:
        """Send welcome notification to new user"""
        return self.create_notification(
            user_id=user.id,
            notification_type=NotificationType.WELCOME_MESSAGE,
            title="Welcome to Okolea",
            message="Thank you for joining Okolea. Start your journey to better financial health today!",
            priority=NotificationPriority.MEDIUM,
            related_entity_type="user",
            related_entity_id=user.id
        )
    
    def notify_referral_bonus(self, user: User, bonus_amount: float, referee_name: str = "") -> Notification:
        """Notify user of referral bonus earned"""
        message = f"You've earned a referral bonus of KSh {bonus_amount:,.2f}!"
        if referee_name:
            message += f" Thank you for referring {referee_name}."
        
        return self.create_notification(
            user_id=user.id,
            notification_type=NotificationType.REFERRAL_BONUS,
            title="Referral Bonus Earned",
            message=message,
            priority=NotificationPriority.HIGH,
            related_entity_type="user",
            related_entity_id=user.id
        )

    # =========================================================================
    # SECURITY NOTIFICATIONS
    # =========================================================================
    
    def notify_security_alert(self, user: User, alert_type: str, message: str) -> Notification:
        """Send security alert to user"""
        return self.create_notification(
            user_id=user.id,
            notification_type=NotificationType.SECURITY_ALERT,
            title=f"Security Alert: {alert_type}",
            message=message,
            priority=NotificationPriority.CRITICAL,
            related_entity_type="user",
            related_entity_id=user.id
        )
    
    def notify_password_changed(self, user: User) -> Notification:
        """Notify user that password was changed"""
        return self.create_notification(
            user_id=user.id,
            notification_type=NotificationType.PASSWORD_CHANGED,
            title="Password Changed ✓",
            message="Your password has been successfully changed. If you didn't make this change, please contact support immediately.",
            priority=NotificationPriority.HIGH,
            related_entity_type="user",
            related_entity_id=user.id
        )
    
    def notify_new_device_login(self, user: User, device_info: str, location: str = "") -> Notification:
        """Notify user of new device login"""
        message = f"A new device ({device_info}) has logged into your account."
        if location:
            message += f" Location: {location}"
        message += " If this wasn't you, please secure your account immediately."
        
        return self.create_notification(
            user_id=user.id,
            notification_type=NotificationType.NEW_DEVICE_LOGIN,
            title="New Device Login",
            message=message,
            priority=NotificationPriority.HIGH,
            related_entity_type="user",
            related_entity_id=user.id
        )

    # =========================================================================
    # SYSTEM NOTIFICATIONS
    # =========================================================================
    
    def notify_account_update(self, user: User, update_type: str, message: str) -> Notification:
        """Notify user of account updates"""
        return self.create_notification(
            user_id=user.id,
            notification_type=NotificationType.ACCOUNT_UPDATE,
            title=f"Account Update: {update_type}",
            message=message,
            priority=NotificationPriority.MEDIUM,
            related_entity_type="user",
            related_entity_id=user.id
        )
    
    def notify_system_maintenance(self, user_id: int, maintenance_message: str, scheduled_time: str = "") -> Notification:
        """Notify user of system maintenance"""
        message = maintenance_message
        if scheduled_time:
            message += f" Scheduled time: {scheduled_time}"
        
        return self.create_notification(
            user_id=user_id,
            notification_type=NotificationType.SYSTEM_MAINTENANCE,
            title="System Maintenance",
            message=message,
            priority=NotificationPriority.MEDIUM
        )
    
    def notify_promotional(self, user: User, title: str, message: str) -> Notification:
        """Send promotional notification"""
        return self.create_notification(
            user_id=user.id,
            notification_type=NotificationType.PROMOTIONAL,
            title=title,
            message=message,
            priority=NotificationPriority.LOW
        )


def get_notification_service(db: Session) -> NotificationService:
    """Factory function to get notification service"""
    return NotificationService(db)
