from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.database import init_db, seed_data
from app.routes import alerts, analytics, cameras, occurrences, watchlist, zones
from app.services.video_processor import video_processor
from app.websocket import manager

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cameras.router)
app.include_router(zones.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(occurrences.router)
app.include_router(watchlist.router)


@app.on_event("startup")
def startup() -> None:
    settings.snapshots_dir.mkdir(exist_ok=True)
    settings.videos_dir.mkdir(exist_ok=True)
    init_db()
    seed_data()


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name}


@app.get("/stream/{camera_id}")
async def stream(camera_id: int):
    return StreamingResponse(
        video_processor.mjpeg_stream(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.websocket("/ws/alerts")
async def alerts_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
