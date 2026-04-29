from fastapi import APIRouter, HTTPException

from app.database import get_db
from app.schemas import CameraCreate, CameraDetectionRuleCreate, CameraDetectionRuleUpdate, CameraUpdate
from app.services.camera_control_service import camera_controls
from app.services.video_processor import video_processor

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


@router.get("/detection/status")
def detection_status():
    return video_processor.detector.status()


@router.get("/{camera_id}/detections")
def list_camera_detection_rules(camera_id: int):
    get_camera(camera_id)
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM camera_detection_rules WHERE camera_id=? ORDER BY id DESC",
            (camera_id,),
        ).fetchall()
    return [dict(row) | {"active": bool(row["active"])} for row in rows]


@router.post("/{camera_id}/detections", status_code=201)
def create_camera_detection_rule(camera_id: int, payload: CameraDetectionRuleCreate):
    get_camera(camera_id)
    if payload.target_class != "person":
        raise HTTPException(400, "Neste MVP a unica classe automatica suportada e 'person'.")
    with get_db() as conn:
        existing = conn.execute(
            """
            SELECT * FROM camera_detection_rules
            WHERE camera_id=? AND target_class=? AND active=1
            ORDER BY id DESC LIMIT 1
            """,
            (camera_id, payload.target_class),
        ).fetchone()
    if existing:
        return dict(existing) | {"active": bool(existing["active"])}

    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO camera_detection_rules (camera_id, label, target_class, active)
            VALUES (?, ?, ?, ?)
            """,
            (camera_id, payload.label, payload.target_class, int(payload.active)),
        )
        row = conn.execute("SELECT * FROM camera_detection_rules WHERE id=?", (cursor.lastrowid,)).fetchone()
    return dict(row) | {"active": bool(row["active"])}


@router.put("/{camera_id}/detections/{rule_id}")
def update_camera_detection_rule(camera_id: int, rule_id: int, payload: CameraDetectionRuleUpdate):
    get_camera(camera_id)
    data = payload.model_dump(exclude_unset=True)
    if "target_class" in data and data["target_class"] != "person":
        raise HTTPException(400, "Neste MVP a unica classe automatica suportada e 'person'.")
    if "active" in data:
        data["active"] = int(data["active"])
    if data:
        fields = ", ".join(f"{key}=?" for key in data)
        with get_db() as conn:
            conn.execute(
                f"UPDATE camera_detection_rules SET {fields} WHERE id=? AND camera_id=?",
                (*data.values(), rule_id, camera_id),
            )
    with get_db() as conn:
        row = conn.execute("SELECT * FROM camera_detection_rules WHERE id=? AND camera_id=?", (rule_id, camera_id)).fetchone()
    if not row:
        raise HTTPException(404, "Regra de identificacao nao encontrada")
    return dict(row) | {"active": bool(row["active"])}


@router.delete("/{camera_id}/detections/{rule_id}", status_code=204)
def delete_camera_detection_rule(camera_id: int, rule_id: int):
    get_camera(camera_id)
    with get_db() as conn:
        conn.execute("DELETE FROM camera_detection_rules WHERE id=? AND camera_id=?", (rule_id, camera_id))


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
    camera_controls.remove(camera_id)
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM cameras WHERE id=?", (camera_id,))
        if cursor.rowcount == 0:
            raise HTTPException(404, "Camera nao encontrada")


@router.get("/{camera_id}/controls")
def get_camera_controls(camera_id: int):
    get_camera(camera_id)
    return camera_controls.get(camera_id)


@router.put("/{camera_id}/controls")
def update_camera_controls(camera_id: int, payload: dict):
    get_camera(camera_id)
    return camera_controls.update(camera_id, payload)


@router.post("/{camera_id}/recording/start")
def start_recording(camera_id: int):
    get_camera(camera_id)
    # A gravacao real comeca no proximo frame do stream, quando o tamanho do frame e conhecido.
    return camera_controls.request_recording(camera_id)


@router.post("/{camera_id}/recording/stop")
def stop_recording(camera_id: int):
    get_camera(camera_id)
    return camera_controls.stop_recording(camera_id)
