from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import text, cast
from sqlalchemy.orm import Session
from datetime import timedelta
from pathlib import Path
import logging
from dotenv import load_dotenv
import os 

load_dotenv()
from core.config import settings as config_settings
from core.database import get_db, init_db, Base, engine
from core.security import verify_password, create_access_token, decode_access_token
from models.models import User, UserRole
from schemas.schemas import (
    UserCreate, UserResponse, Token, HealthCheck,
    LoanCreate, LoanResponse, LoanDetailResponse, LoanBulkUpload,
    TransactionInitiate, TransactionResponse
)
from services.loan_service import LoanService
from api import auth, loans, transactions, admin, notifications, settings as api_settings, balance, mpesa_webhook
from api.auth import get_current_user
from middleware.maintenance import maintenance_middleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Okolea - Quick Loans",
    description="Fast, Transparent Loans for Kenya",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware - Configure with explicit origins for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Initialize maintenance mode state
app.state.maintenance_mode = {"enabled": False}

# Add maintenance middleware
app.middleware("http")(maintenance_middleware)

# Log CORS configuration on startup
logger.info(f"CORS configured with origins: {config_settings.cors_origins_list}")


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests"""
    logger.info(f"[REQUEST] {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"[RESPONSE] {request.method} {request.url.path} - Status: {response.status_code}")
    return response

# Exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"[VALIDATION_ERROR] Path: {request.url.path}")
    logger.error(f"[VALIDATION_ERROR] Errors: {exc.errors()}")
    logger.error(f"[VALIDATION_ERROR] Body: {exc.body}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body}
    )


# Global exception handler to ensure CORS headers on errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"[UNHANDLED_ERROR] Path: {request.url.path}")
    logger.error(f"[UNHANDLED_ERROR] Error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

# Initialize database
logger.info("Initializing database...")
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully")
except Exception as e:
    logger.warning(f"Database connection failed: {e}")
    logger.warning("App will run without database persistence")

# Initialize services
loan_service = LoanService()

# Make services available globally
app.state.loan_service = loan_service


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health", response_model=HealthCheck)
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return HealthCheck(
        status="healthy" if db_status == "healthy" else "degraded",
        version="1.0.0",
        database=db_status
    )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Okolea API - Quick Loans for Kenya",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(loans.router, prefix="/api/loans", tags=["Loans"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(api_settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(balance.router, prefix="/api", tags=["Balance"])
app.include_router(mpesa_webhook.router, tags=["M-Pesa"])

# Debug endpoint to check CORS configuration
@app.get("/api/debug/cors")
async def debug_cors():
    """Debug endpoint to check CORS configuration"""
    return {
        "cors_origins": config_settings.cors_origins_list,
        "message": "CORS is configured. Admin endpoints should work."
    }

# ============================================================================
# GLOBAL SEARCH ENDPOINT
# ============================================================================

@app.get("/api/search")
async def global_search(
    q: str = "",
    filter: str = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Global search across loans, users, and transactions.
    - Regular users can only search their own data
    - Admins can search all data
    """
    from models.models import Loan, Transaction
    import sqlalchemy as sa
    
    results = {
        "loans": [],
        "users": [],
        "transactions": []
    }
    
    search_term = f"%{q}%"
    
    # Filter based on user role
    is_admin = current_user.role == UserRole.ADMIN
    user_filter = [] if is_admin else [Loan.borrower_id == current_user.id]
    
    # Search Loans
    if not filter or filter == "loans":
        loan_query = db.query(Loan)
        if not is_admin:
            loan_query = loan_query.filter(Loan.borrower_id == current_user.id)
        
        loans = loan_query.filter(
            sa.or_(
                Loan.loan_id.ilike(search_term),
                cast(Loan.principal, sa.String).ilike(search_term),
                Loan.status.cast(sa.String).ilike(search_term)
            )
        ).offset(skip).limit(limit).all()
        
        results["loans"] = [
            {
                "id": loan.id,
                "loan_id": loan.loan_id,
                "principal": loan.principal,
                "total_due": loan.total_due,
                "status": loan.status.value if loan.status else None,
                "due_date": loan.due_date.isoformat() if loan.due_date else None,
                "created_at": loan.created_at.isoformat() if loan.created_at else None
            }
            for loan in loans
        ]
    
    # Search Users (admin only)
    if is_admin and (not filter or filter == "users"):
        users = db.query(User).filter(
            sa.or_(
                User.username.ilike(search_term),
                User.email.ilike(search_term),
                User.full_name.ilike(search_term),
                User.phone.ilike(search_term),
                User.national_id.ilike(search_term)
            )
        ).offset(skip).limit(limit).all()
        
        results["users"] = [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "phone": user.phone,
                "role": user.role.value if user.role else None,
                "is_active": user.is_active
            }
            for user in users
        ]
    
    # Search Transactions
    if not filter or filter == "transactions":
        trans_query = db.query(Transaction)
        if not is_admin:
            trans_query = trans_query.filter(Transaction.borrower_id == current_user.id)
        
        transactions = trans_query.filter(
            sa.or_(
                Transaction.transaction_id.ilike(search_term),
                cast(Transaction.amount, sa.String).ilike(search_term)
            )
        ).offset(skip).limit(limit).all()
        
        results["transactions"] = [
            {
                "id": trans.id,
                "transaction_id": trans.transaction_id,
                "amount": trans.amount,
                "status": trans.status.value if trans.status else None,
                "initiated_at": trans.initiated_at.isoformat() if trans.initiated_at else None
            }
            for trans in transactions
        ]
    
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
