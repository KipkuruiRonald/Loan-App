from fastapi import Request
from fastapi.responses import JSONResponse
import logging
import time
from collections import defaultdict

logger = logging.getLogger(__name__)

# Rate limiting storage
last_request_time = defaultdict(lambda: 0)
RATE_LIMIT_SECONDS = 1  # Only allow 1 request per second per client

async def maintenance_middleware(request: Request, call_next):
    """Check if system is in maintenance mode"""
    
    # Rate limit the status endpoint
    client_ip = request.client.host if request.client else "unknown"
    current_time = time.time()
    
    # Log ALL requests to maintenance status endpoint for debugging
    if request.url.path == "/api/admin/maintenance/status":
        print(f"[MAINTENANCE] Status check from {client_ip}")
        # Skip rate limiting for status endpoint - let it through
        last_request_time[client_ip] = current_time
    
    # CRITICAL: Always allow OPTIONS requests (preflight) with CORS headers
    if request.method == "OPTIONS":
        response = JSONResponse(
            status_code=200,
            content={"message": "OK"}
        )
        # Add CORS headers
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Max-Age"] = "3600"
        return response
    
    # Skip maintenance check for admin endpoints
    if request.url.path.startswith("/api/admin"):
        return await call_next(request)
    
    # Allow settings endpoints (admins need to manage settings during maintenance)
    if request.url.path.startswith("/api/settings"):
        return await call_next(request)
    
    # Skip for login/health endpoints
    if request.url.path in ["/api/auth/login", "/health", "/", "/docs", "/redoc", "/openapi.json"]:
        return await call_next(request)
    
    # Skip for static files
    if request.url.path.startswith("/static") or request.url.path.startswith("/_next"):
        return await call_next(request)
    
    # Get maintenance status from app state
    maintenance = getattr(request.app.state, "maintenance_mode", {"enabled": False})
    
    if maintenance and maintenance.get("enabled"):
        response = JSONResponse(
            status_code=503,
            content={
                "error": "Service Unavailable",
                "message": maintenance.get("message", "System under maintenance"),
                "estimated_completion": maintenance.get("end_time"),
                "status": "maintenance"
            }
        )
        # Add CORS headers
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response
    
    return await call_next(request)
