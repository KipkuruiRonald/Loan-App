from pydantic_settings import BaseSettings
from typing import List, Dict
from datetime import datetime


class Settings(BaseSettings):
    """Application configuration settings"""
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/okoleo_db"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Application
    DEBUG: bool = True
    CORS_ORIGINS: str = '["http://localhost:3000"]'
    
    # ============================================================
    # OKOLEO 9-DAY LOAN PARAMETERS (Section 8.1)
    # ============================================================
    OKOLEO_TERM_DAYS: int = 9  # Fixed 9-day term
    OKOLEO_INTEREST_RATE_ANNUAL: float = 0.04  # 4% annual interest
    OKOLEO_PENALTY_RATE: float = 0.068  # 6.8% of principal
    OKOLEO_PROCESSING_FEE: float = 0.0  # Flat fee (TBD)
    OKOLEO_CURRENCY: str = "KSh"  # Kenya Shilling
    
    # Credit System Parameters
    OKOLEO_MAX_SYSTEM_LIMIT: float = 15000.0  # Maximum limit cap
    
    # ============================================================
    # CREDIT TIER STRUCTURE (Section 2.2)
    # ============================================================
    TIER_LIMITS: Dict[int, float] = {
        1: 500.0,     # Tier 1: 500 KSh
        2: 1000.0,    # Tier 2: 1000 KSh
        3: 2000.0,    # Tier 3: 2000 KSh
        4: 3500.0,    # Tier 4: 3500 KSh
        5: 5000.0,    # Tier 5: 5000 KSh
        6: 7500.0,    # Tier 6: 7500 KSh
        7: 10000.0,   # Tier 7: 10000 KSh
        8: 15000.0,   # Tier 8: 15000 KSh
    }
    
    # ============================================================
    # SCORE-TO-TIER MAPPING (Section 3.3)
    # ============================================================
    TIER_SCORE_THRESHOLDS: Dict[int, tuple] = {
        1: (0, 199),
        2: (200, 349),
        3: (350, 499),
        4: (500, 649),
        5: (650, 799),
        6: (800, 899),
        7: (900, 1000),
        8: (1001, float('inf')),
    }
    
    # ============================================================
    # STREAK REQUIREMENTS FOR TIER UPGRADE (Section 2.2)
    # ============================================================
    TIER_STREAK_REQUIREMENTS: Dict[int, int] = {
        1: 0,   # Entry level
        2: 1,   # 1 perfect repayment
        3: 2,   # 2 consecutive perfect
        4: 3,   # 3 consecutive perfect
        5: 5,   # 5 consecutive perfect
        6: 8,   # 8 consecutive perfect
        7: 12,  # 12 consecutive perfect
        8: 20,  # 20 consecutive perfect
    }
    
    # ============================================================
    # LIMIT DECREASE RULES (Section 4.2)
    # ============================================================
    PENALTY_LATE_1_3_TIER_DROP: int = 1
    PENALTY_LATE_4_9_TIER_DROP: int = 2
    PENALTY_LATE_10PLUS_TIER_RESET: int = 1  # Reset to tier 1
    PENALTY_DEFAULT_SCORE_REDUCTION: int = 300
    PENALTY_DEFAULT_BLOCK_DAYS: int = 90
    
    # ============================================================
    # INITIAL LIMIT ASSIGNMENT (Section 2.3)
    # ============================================================
    INITIAL_TIER_CLEAN_CRB: int = 2  # CRB score >= 300
    INITIAL_TIER_NO_CRB: int = 1
    INITIAL_LIMIT_CLEAN_CRB: float = 1000.0
    INITIAL_LIMIT_NO_CRB: float = 500.0
    INITIAL_SCORE_CLEAN_CRB: int = 200
    INITIAL_SCORE_NO_CRB: int = 150
    CRB_SCORE_THRESHOLD: int = 300  # Minimum for clean CRB
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS from string to list"""
        import json
        try:
            return json.loads(self.CORS_ORIGINS)
        except:
            return ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"


settings = Settings()
