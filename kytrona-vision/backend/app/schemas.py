from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models import AlertSeverity, AlertStatus, CameraStatus, CameraType, OccurrenceStatus, OccurrenceType, ZoneType


class CameraBase(BaseModel):
    name: str = Field(..., examples=["Webcam Local"])
    type: CameraType
    source: str = Field(..., examples=["0", "videos/exemplo.mp4", "rtsp://usuario:senha@ip/stream"])
    status: CameraStatus = CameraStatus.offline
    location: str | None = None


class CameraCreate(CameraBase):
    pass


class CameraUpdate(BaseModel):
    name: str | None = None
    type: CameraType | None = None
    source: str | None = None
    status: CameraStatus | None = None
    location: str | None = None


class Camera(CameraBase):
    id: int
    created_at: datetime


class ZoneBase(BaseModel):
    name: str
    camera_id: int
    type: ZoneType
    coordinates: dict[str, Any] = Field(default_factory=dict)
    time_limit_seconds: int = 180
    people_limit: int = 4
    schedule_start: str = "08:00"
    schedule_end: str = "18:00"
    active: bool = True


class ZoneCreate(ZoneBase):
    pass


class ZoneUpdate(BaseModel):
    name: str | None = None
    camera_id: int | None = None
    type: ZoneType | None = None
    coordinates: dict[str, Any] | None = None
    time_limit_seconds: int | None = None
    people_limit: int | None = None
    schedule_start: str | None = None
    schedule_end: str | None = None
    active: bool | None = None


class Zone(ZoneBase):
    id: int
    created_at: datetime


class Alert(BaseModel):
    id: int
    camera_id: int
    zone_id: int | None = None
    type: str
    severity: AlertSeverity
    message: str
    timestamp: datetime
    snapshot_path: str | None = None
    status: AlertStatus


class AlertCreate(BaseModel):
    camera_id: int
    zone_id: int | None = None
    type: str
    severity: AlertSeverity
    message: str
    snapshot_path: str | None = None


class OccurrenceBase(BaseModel):
    type: OccurrenceType
    severity: AlertSeverity
    camera_id: int
    zone_id: int | None = None
    description: str
    snapshot_path: str | None = None
    video_clip_path: str | None = None
    status: OccurrenceStatus = OccurrenceStatus.em_analise
    registered_by: str = "Operador"
    notes: str | None = None


class OccurrenceCreate(OccurrenceBase):
    data_hora: datetime | None = None


class OccurrenceUpdate(BaseModel):
    type: OccurrenceType | None = None
    severity: AlertSeverity | None = None
    camera_id: int | None = None
    zone_id: int | None = None
    data_hora: datetime | None = None
    description: str | None = None
    snapshot_path: str | None = None
    video_clip_path: str | None = None
    status: OccurrenceStatus | None = None
    registered_by: str | None = None
    notes: str | None = None


class Occurrence(OccurrenceBase):
    id: int
    data_hora: datetime
    created_at: datetime


class WatchlistItemCreate(BaseModel):
    title: str
    type: str = "comportamento"
    severity: AlertSeverity = AlertSeverity.media
    description: str
    camera_id: int | None = None
    zone_id: int | None = None
    active: bool = True
    instructions: str | None = None


class WatchlistItemUpdate(BaseModel):
    title: str | None = None
    type: str | None = None
    severity: AlertSeverity | None = None
    description: str | None = None
    camera_id: int | None = None
    zone_id: int | None = None
    active: bool | None = None
    instructions: str | None = None
