from .health import router as health_router
from .payments import router as payments_router
from .decisions import router as decisions_router
from .dashboard import router as dashboard_router
from .metrics import router as metrics_router
from .data import router as data_router

__all__ = [
    "health_router",
    "payments_router",
    "decisions_router",
    "dashboard_router",
    "metrics_router",
    "data_router",
]
