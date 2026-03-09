from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import Optional
import logging
import secrets

from core.database import get_db
from core.security import verify_password, create_access_token, get_password_hash, decode_access_token
from core.config import settings
from models.models import User
from schemas.schemas import UserCreate, UserResponse, Token, LoginRequest
from services.email_validation import get_email_validation_service

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

# Setup logging
logger = logging.getLogger(__name__)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user


def require_role(allowed_roles: list):
    """Deprecated: Use get_current_user and check user.role == UserRole.ADMIN instead"""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        from models.models import UserRole
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden. Required roles: {[r.value if hasattr(r, 'value') else r for r in allowed_roles]}"
            )
        return current_user
    return role_checker


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with email validation"""
    
    logger.info(f"Registration attempt for email: {user_data.email}, username: {user_data.username}")
    
    # Validate email thoroughly
    email_service = get_email_validation_service()
    validation = email_service.validate_email(user_data.email)
    
    if not validation['valid']:
        logger.warning(f"Registration failed - invalid email: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Invalid email address",
                "errors": validation['errors'],
                "suggestion": validation.get('suggestion')
            }
        )
    
    # Check if username exists
    if db.query(User).filter(User.username == user_data.username).first():
        logger.warning(f"Registration failed - username already exists: {user_data.username}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email exists
    if db.query(User).filter(User.email == user_data.email).first():
        logger.warning(f"Registration failed - email already exists: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if phone exists (if provided)
    if user_data.phone:
        if db.query(User).filter(User.phone == user_data.phone).first():
            logger.warning(f"Registration failed - phone already exists: {user_data.phone}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )
    
    # Generate verification token
    verification_token = secrets.token_urlsafe(32)
    
    # Create user - simplified (no role selection, users are borrowers)
    from models.models import UserRole
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
        national_id=user_data.national_id,
        date_of_birth=user_data.date_of_birth,
        location=user_data.location,
        role=UserRole.BORROWER,  # Default role for all users
        is_active=True,
        email_verified=False,
        email_verification_token=verification_token,
        email_verification_sent_at=datetime.utcnow()
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    logger.info(f"User registered successfully: ID={user.id}, email={user.email}, username={user.username}")
    
    # In production, send verification email here
    # For now, return user with requires_verification flag
    return user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Login and receive JWT token"""
    
    # Log login attempt
    client_ip = request.client.host if request and request.client else "unknown"
    logger.info(f"Login attempt for username: {form_data.username} from IP: {client_ip}")
    
    # Find user
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Login failed for username: {form_data.username} - Invalid credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        logger.warning(f"Login failed for username: {form_data.username} - Inactive user")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    # Update login statistics
    user.last_login = datetime.utcnow()
    user.last_login_ip = client_ip
    user.login_count = (user.login_count or 0) + 1
    db.commit()
    
    logger.info(f"Login successful for user ID: {user.id}, username: {user.username}, login_count: {user.login_count}")
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout current user"""
    return {"success": True, "message": "Logged out successfully"}


# ================================================================================
# EMAIL VERIFICATION ENDPOINTS
# ================================================================================

@router.get("/verify-email")
async def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    """Verify email with token"""
    logger.info(f"Email verification attempt with token: {token[:10]}...")
    
    # Find user with this token
    user = db.query(User).filter(
        User.email_verification_token == token,
        User.email_verified == False
    ).first()
    
    if not user:
        logger.warning(f"Invalid verification token: {token[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link"
        )
    
    # Check if token expired (24 hours)
    if user.email_verification_sent_at:
        from datetime import timedelta
        expiry = user.email_verification_sent_at + timedelta(hours=24)
        if datetime.utcnow() > expiry:
            logger.warning(f"Expired verification token for user {user.id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification link expired. Please request a new one."
            )
    
    # Mark email as verified
    user.email_verified = True
    user.email_verified_at = datetime.utcnow()
    user.email_verification_token = None
    db.commit()
    
    logger.info(f"Email verified successfully for user {user.id}")
    
    return {
        "success": True,
        "message": "Email verified successfully! You can now log in.",
        "email": user.email
    }


@router.post("/resend-verification")
async def resend_verification(
    email: str,
    db: Session = Depends(get_db)
):
    """Resend verification email (rate limited)"""
    logger.info(f"Resend verification email request for: {email}")
    
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Don't reveal if email exists
        return {"success": True, "message": "If email exists, verification email will be sent"}
    
    if user.email_verified:
        return {"success": True, "message": "Email already verified"}
    
    # Rate limiting - max 3 attempts per hour
    from datetime import timedelta
    if user.verification_attempts >= 3:
        if user.last_verification_email_sent:
            time_since = datetime.utcnow() - user.last_verification_email_sent
            if time_since < timedelta(hours=1):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many attempts. Please wait an hour."
                )
    
    # Generate new token
    new_token = secrets.token_urlsafe(32)
    user.email_verification_token = new_token
    user.email_verification_sent_at = datetime.utcnow()
    user.verification_attempts += 1
    user.last_verification_email_sent = datetime.utcnow()
    db.commit()
    
    # In production, send verification email here
    logger.info(f"New verification token generated for user {user.id}")
    
    return {
        "success": True,
        "message": "Verification email sent. Please check your inbox."
    }


@router.get("/check-email")
async def check_email(
    email: str,
    db: Session = Depends(get_db)
):
    """Check if email is valid before registration"""
    logger.info(f"Email check request for: {email}")
    
    # Validate email format
    email_service = get_email_validation_service()
    validation = email_service.validate_email(email)
    
    # Check if email already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return {
            "valid": False,
            "message": "Email already registered"
        }
    
    return {
        "valid": validation['valid'],
        "message": "Email is valid" if validation['valid'] else validation['errors'][0] if validation['errors'] else "Invalid email",
        "suggestion": validation.get('suggestion')
    }
