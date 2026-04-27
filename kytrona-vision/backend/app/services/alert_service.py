from __future__ import annotations

from datetime import datetime

from app.database import get_db
from app.schemas import AlertCreate
from app.websocket import manager


def row_to_alert(row) -> dict:
    return {
        "id": row["id"],
        "camera_id": row["camera_id"],
        "zone_id": row["zone_id"],
        "type": row["type"],
        "severity": row["severity"],
        "message": row["message"],
        "timestamp": row["timestamp"],
        "snapshot_path": row["snapshot_path"],
        "status": row["status"],
    }


class AlertService:
    async def create_alert(self, payload: AlertCreate) -> dict:
        with get_db() as conn:
            cursor = conn.execute(
                """
                INSERT INTO alerts (camera_id, zone_id, type, severity, message, snapshot_path, status)
                VALUES (?, ?, ?, ?, ?, ?, 'novo')
                """,
                (
                    payload.camera_id,
                    payload.zone_id,
                    payload.type,
                    payload.severity,
                    payload.message,
                    payload.snapshot_path,
                ),
            )
            row = conn.execute("SELECT * FROM alerts WHERE id = ?", (cursor.lastrowid,)).fetchone()
        alert = row_to_alert(row)
        await manager.broadcast({"event": "alert.created", "data": alert})
        return alert

    @staticmethod
    def should_alert_restricted_zone(zone: dict, now: datetime | None = None) -> bool:
        now = now or datetime.now()
        current = now.strftime("%H:%M")
        return zone["type"] == "area_restrita" and not (zone["schedule_start"] <= current <= zone["schedule_end"])
