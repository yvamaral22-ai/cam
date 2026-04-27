from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.database import get_db
from app.schemas import OccurrenceCreate, OccurrenceUpdate

router = APIRouter(prefix="/occurrences", tags=["occurrences"])


def occurrence_dict(row) -> dict:
    return dict(row)


@router.get("")
def list_occurrences(type: str | None = None, severity: str | None = None, status: str | None = None):
    query = "SELECT * FROM occurrences WHERE 1=1"
    params: list = []
    if type:
        query += " AND type=?"
        params.append(type)
    if severity:
        query += " AND severity=?"
        params.append(severity)
    if status:
        query += " AND status=?"
        params.append(status)
    query += " ORDER BY data_hora DESC"
    with get_db() as conn:
        return [occurrence_dict(row) for row in conn.execute(query, params).fetchall()]


@router.post("", status_code=201)
def create_occurrence(payload: OccurrenceCreate):
    data_hora = payload.data_hora or datetime.now()
    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO occurrences
            (type, severity, camera_id, zone_id, data_hora, description, snapshot_path, video_clip_path, status, registered_by, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.type,
                payload.severity,
                payload.camera_id,
                payload.zone_id,
                data_hora.isoformat(sep=" ", timespec="seconds"),
                payload.description,
                payload.snapshot_path,
                payload.video_clip_path,
                payload.status,
                payload.registered_by,
                payload.notes,
            ),
        )
        return occurrence_dict(conn.execute("SELECT * FROM occurrences WHERE id=?", (cursor.lastrowid,)).fetchone())


@router.get("/{occurrence_id}")
def get_occurrence(occurrence_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM occurrences WHERE id=?", (occurrence_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Ocorrencia nao encontrada")
    return occurrence_dict(row)


@router.put("/{occurrence_id}")
def update_occurrence(occurrence_id: int, payload: OccurrenceUpdate):
    data = payload.model_dump(exclude_unset=True)
    if "data_hora" in data and data["data_hora"] is not None:
        data["data_hora"] = data["data_hora"].isoformat(sep=" ", timespec="seconds")
    if data:
        fields = ", ".join(f"{key}=?" for key in data)
        with get_db() as conn:
            conn.execute(f"UPDATE occurrences SET {fields} WHERE id=?", (*data.values(), occurrence_id))
    return get_occurrence(occurrence_id)


@router.delete("/{occurrence_id}", status_code=204)
def delete_occurrence(occurrence_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM occurrences WHERE id=?", (occurrence_id,))
