from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List
from datetime import datetime

from core.database import get_db
from core.security import decode_access_token
from models.models import User, Notification, NotificationPreference, UserRole, NotificationType, NotificationPriority
from schemas.schemas import (
    NotificationResponse, NotificationCreate, NotificationMarkRead,
    NotificationPreferenceResponse, NotificationPreferenceUpdate,
    NotificationUnreadCount, NotificationListResponse
)

router = APIRouter()

# Import get_current_user from auth
from api.auth import get_current_user


# ============================================================================
# NOTIFICATION CRUD OPERATIONS
# ============================================================================

@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    include_read: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get notifications for the current user (role-based filtering).
    Users only see their notifications, Admins only see admin notifications.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Build query - filter by user_id only
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id
    )
    
    if not include_read:
        query = query.filter(Notification.is_read == False)
    
    # Get total count
    total = query.count()
    
    # Get paginated notifications
    notifications = query.order_by(Notification.created_at.desc()) \
        .offset(skip) \
        .limit(limit) \
        .all()
    
    # Get unread count
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    return NotificationListResponse(
        notifications=notifications,
        total=total,
        unread_count=unread_count
    )


@router.get("/unread", response_model=NotificationUnreadCount)
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get unread notification count for current user"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    return NotificationUnreadCount(
        unread_count=unread_count
    )


@router.post("/mark-read")
async def mark_notifications_read(
    data: NotificationMarkRead,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark specific notifications as read"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Verify all notifications belong to current user
    notifications = db.query(Notification).filter(
        Notification.id.in_(data.notification_ids),
        Notification.user_id == current_user.id
    ).all()
    
    if len(notifications) != len(data.notification_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more notifications not found"
        )
    
    # Mark as read
    now = datetime.utcnow()
    for notification in notifications:
        notification.is_read = True
        notification.read_at = now
    
    db.commit()
    
    return {"message": f"{len(notifications)} notifications marked as read"}


@router.post("/mark-all-read")
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Mark all as read
    now = datetime.utcnow()
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({
        Notification.is_read: True,
        Notification.read_at: now
    })
    
    db.commit()
    
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a notification"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    db.delete(notification)
    db.commit()
    
    return {"message": "Notification deleted"}


# ============================================================================
# NOTIFICATION PREFERENCES
# ============================================================================

@router.get("/preferences", response_model=NotificationPreferenceResponse)
async def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification preferences for current user"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Get or create preferences
    preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()
    
    if not preferences:
        # Create default preferences
        preferences = NotificationPreference(user_id=current_user.id)
        db.add(preferences)
        db.commit()
        db.refresh(preferences)
    
    return preferences


@router.put("/preferences", response_model=NotificationPreferenceResponse)
async def update_notification_preferences(
    preferences_data: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update notification preferences"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Get or create preferences
    preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()
    
    if not preferences:
        preferences = NotificationPreference(user_id=current_user.id)
        db.add(preferences)
    
    # Update fields
    update_data = preferences_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(preferences, key, value)
    
    db.commit()
    db.refresh(preferences)
    
    return preferences


# ============================================================================
# ADMIN: CREATE NOTIFICATIONS FOR USERS
# ============================================================================

@router.post("", response_model=NotificationResponse)
async def create_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new notification (Admin or system only)"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Verify user exists
    target_user = db.query(User).filter(User.id == notification_data.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )
    
    # Create notification
    notification = Notification(
        user_id=notification_data.user_id,
        type=notification_data.type,
        title=notification_data.title,
        message=notification_data.message,
        priority=notification_data.priority,
        related_entity_type=notification_data.related_entity_type,
        related_entity_id=notification_data.related_entity_id
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return notification


@router.post("/broadcast", response_model=dict)
async def broadcast_notification(
    type: NotificationType,
    title: str,
    message: str,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Broadcast a notification to all users (Admin only)"""
    if not current_user or current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Get all active users
    users = db.query(User).filter(User.is_active == True).all()
    
    # Create notifications for all users
    notifications = []
    for user in users:
        notification = Notification(
            user_id=user.id,
            type=type,
            title=title,
            message=message,
            priority=priority
        )
        notifications.append(notification)
    
    db.add_all(notifications)
    db.commit()
    
    return {
        "message": f"Broadcast {len(notifications)} notifications to all users",
        "count": len(notifications)
    }


# ============================================================================
# UTILITY: Get available notification types
# ============================================================================

@router.get("/types")
async def get_notification_types():
    """Get available notification types for each role"""
    return {
        "user_notifications": [
            {"type": NotificationType.LOAN_APPROVED, "description": "Loan approved notification"},
            {"type": NotificationType.LOAN_DECLINED, "description": "Loan declined notification"},
            {"type": NotificationType.PAYMENT_DUE_REMINDER, "description": "Payment due reminder"},
            {"type": NotificationType.CREDIT_LIMIT_INCREASED, "description": "Credit limit increased"},
            {"type": NotificationType.TIER_UPGRADE, "description": "Tier upgrade notification"},
            {"type": NotificationType.WELCOME_MESSAGE, "description": "Welcome message"},
            {"type": NotificationType.REFERRAL_BONUS, "description": "Referral bonus earned"},
        ],
        "admin_notifications": [
            {"type": NotificationType.NEW_LOAN_APPLICATION, "description": "New loan application pending"},
            {"type": NotificationType.FRAUD_ALERT, "description": "Fraud alert"},
            {"type": NotificationType.HIGH_RISK_USER, "description": "High-risk user detected"},
            {"type": NotificationType.DEFAULT_REPORTING_NEEDED, "description": "Default reporting needed"},
            {"type": NotificationType.SYSTEM_UPDATE, "description": "System update notification"},
            {"type": NotificationType.DAILY_PERFORMANCE_STATS, "description": "Daily performance stats"},
            {"type": NotificationType.USER_REGISTRATION_ALERT, "description": "New user registration"},
        ]
    }
