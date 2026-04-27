from fastapi import APIRouter

from app.services.metrics_service import MetricsService

router = APIRouter(prefix="/analytics", tags=["analytics"])
metrics = MetricsService()


@router.get("/overview")
def overview():
    return metrics.overview()


@router.get("/cameras/{camera_id}")
def camera_analytics(camera_id: int):
    return metrics.camera_analytics(camera_id)


@router.get("/zones/{zone_id}")
def zone_analytics(zone_id: int):
    return metrics.zone_analytics(zone_id)


@router.get("/cashiers-ranking")
def cashiers_ranking():
    return metrics.cashiers_ranking()
