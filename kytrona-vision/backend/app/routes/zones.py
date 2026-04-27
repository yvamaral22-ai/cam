import json

from fastapi import APIRouter, HTTPException

from app.database import get_db
from app.schemas import ZoneCreate, ZoneUpdate

router = APIRouter(prefix="/zones", tags=["zones"])


def zone_dict(row) -> dict:
    data = dict(row)
    data["coordinates"] = json.loads(data["coordinates"])
    data["active"] = bool(data["active"])
    return data


@router.get("")
def list_zones():
    with get_db() as conn:
        return [zone_dict(row) for row in conn.execute("SELECT * FROM zones ORDER BY id DESC").fetchall()]


@router.post("", status_code=201)
def create_zone(payload: ZoneCreate):
    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO zones
            (name, camera_id, type, coordinates, time_limit_seconds, people_limit, schedule_start, schedule_end, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.name,
                payload.camera_id,
                payload.type,
                json.dumps(payload.coordinates),
                payload.time_limit_seconds,
                payload.people_limit,
                payload.schedule_start,
                payload.schedule_end,
                int(payload.active),
            ),
        )
        return zone_dict(conn.execute("SELECT * FROM zones WHERE id=?", (cursor.lastrowid,)).fetchone())


@router.get("/{zone_id}")
def get_zone(zone_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM zones WHERE id=?", (zone_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Zona nao encontrada")
    return zone_dict(row)


@router.put("/{zone_id}")
def update_zone(zone_id: int, payload: ZoneUpdate):
    data = payload.model_dump(exclude_unset=True)
    if "coordinates" in data:
        data["coordinates"] = json.dumps(data["coordinates"])
    if "active" in data:
        data["active"] = int(data["active"])
    if data:
        fields = ", ".join(f"{key}=?" for key in data)
        with get_db() as conn:
            conn.execute(f"UPDATE zones SET {fields} WHERE id=?", (*data.values(), zone_id))
    return get_zone(zone_id)


@router.delete("/{zone_id}", status_code=204)
def delete_zone(zone_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM zones WHERE id=?", (zone_id,))
