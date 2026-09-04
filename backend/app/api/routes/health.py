from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "RecoverIQ Decision Engine",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
