from fastapi import APIRouter, HTTPException

from app.database import get_db
from app.services.alert_service import row_to_alert

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
def list_alerts(severity: str | None = None, camera_id: int | None = None):
    query = "SELECT * FROM alerts WHERE 1=1"
    params: list = []
    if severity:
        query += " AND severity=?"
        params.append(severity)
    if camera_id:
        query += " AND camera_id=?"
        params.append(camera_id)
    query += " ORDER BY timestamp DESC"
    with get_db() as conn:
        return [row_to_alert(row) for row in conn.execute(query, params).fetchall()]


@router.get("/recent")
def recent_alerts():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 8").fetchall()
    return [row_to_alert(row) for row in rows]


@router.put("/{alert_id}/resolve")
def resolve_alert(alert_id: int):
    with get_db() as conn:
        conn.execute("UPDATE alerts SET status='resolvido' WHERE id=?", (alert_id,))
        row = conn.execute("SELECT * FROM alerts WHERE id=?", (alert_id,)).fetchone()
    return row_to_alert(row)


@router.post("/{alert_id}/convert-to-occurrence", status_code=201)
def convert_to_occurrence(alert_id: int):
    type_map = {
        "area_restrita": "acesso_indevido",
        "permanencia_excessiva": "comportamento_suspeito",
        "limite_pessoas": "comportamento_suspeito",
        "zona_critica": "acesso_indevido",
    }
    with get_db() as conn:
        alert = conn.execute("SELECT * FROM alerts WHERE id=?", (alert_id,)).fetchone()
        if not alert:
            raise HTTPException(404, "Alerta nao encontrado")
        cursor = conn.execute(
            """
            INSERT INTO occurrences
            (type, severity, camera_id, zone_id, data_hora, description, snapshot_path, status, registered_by, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'em_analise', 'Sistema', ?)
            """,
            (
                type_map.get(alert["type"], "outro"),
                alert["severity"],
                alert["camera_id"],
                alert["zone_id"],
                alert["timestamp"],
                alert["message"],
                alert["snapshot_path"],
                "Convertido automaticamente a partir de alerta comportamental. Sem biometria.",
            ),
        )
        conn.execute("UPDATE alerts SET status='visualizado' WHERE id=?", (alert_id,))
        return dict(conn.execute("SELECT * FROM occurrences WHERE id=?", (cursor.lastrowid,)).fetchone())
