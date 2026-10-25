from fastapi import APIRouter
from app.database import check_db_connection
from app.config import settings

router = APIRouter()


@router.get("/health")
def health_check():
    """
    Health check endpoint to verify backend server & database status.
    """
    db_status = check_db_connection()
    return {
        "status": "ok",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": db_status
    }


@router.get("/health/ready")
def readiness_check():
    """
    Readiness probe for cloud deployments and load balancers.
    """
    db_status = check_db_connection()
    is_ready = db_status.get("status") in ["connected", "disconnected"]  # Server can operate statelessly
    return {
        "status": "ready" if is_ready else "not_ready",
        "service": "landguard-backend",
        "version": settings.VERSION,
        "database_connected": db_status.get("status") == "connected"
    }
