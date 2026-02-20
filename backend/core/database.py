from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import logging
from .config import settings

# Setup logging
logger = logging.getLogger(__name__)

# Create database engine with logging
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG
)

# Add query logging
@event.listens_for(engine, "before_cursor_execute")
def log_query(conn, cursor, statement, parameters, context, executemany):
    logger.debug(f"SQL Query: {statement}")
    logger.debug(f"Parameters: {parameters}")

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency for getting database sessions"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
