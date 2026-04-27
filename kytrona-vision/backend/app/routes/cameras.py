from fastapi import APIRouter, HTTPException

from app.database import get_db
from app.schemas import CameraCreate, CameraUpdate

router = APIRouter(prefix="/cameras", tags=["cameras"])


def camera_dict(row) -> dict:
    return dict(row)


@router.get("")
def list_cameras():
    with get_db() as conn:
        return [camera_dict(row) for row in conn.execute("SELECT * FROM cameras ORDER BY id DESC").fetchall()]


@router.post("", status_code=201)
def create_camera(payload: CameraCreate):
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO cameras (name, type, source, status, location) VALUES (?, ?, ?, ?, ?)",
            (payload.name, payload.type, payload.source, payload.status, payload.location),
        )
        return camera_dict(conn.execute("SELECT * FROM cameras WHERE id=?", (cursor.lastrowid,)).fetchone())


@router.get("/{camera_id}")
def get_camera(camera_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM cameras WHERE id=?", (camera_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Camera nao encontrada")
    return camera_dict(row)


@router.put("/{camera_id}")
def update_camera(camera_id: int, payload: CameraUpdate):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return get_camera(camera_id)
    fields = ", ".join(f"{key}=?" for key in data)
    with get_db() as conn:
        conn.execute(f"UPDATE cameras SET {fields} WHERE id=?", (*data.values(), camera_id))
    return get_camera(camera_id)


@router.delete("/{camera_id}", status_code=204)
def delete_camera(camera_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM cameras WHERE id=?", (camera_id,))
