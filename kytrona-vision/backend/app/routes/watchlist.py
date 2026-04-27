from fastapi import APIRouter, HTTPException

from app.database import get_db
from app.schemas import WatchlistItemCreate, WatchlistItemUpdate

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


def item_dict(row) -> dict:
    data = dict(row)
    data["active"] = bool(data["active"])
    return data


@router.get("")
def list_watchlist():
    with get_db() as conn:
        return [item_dict(row) for row in conn.execute("SELECT * FROM watchlist_items ORDER BY id DESC").fetchall()]


@router.post("", status_code=201)
def create_watchlist_item(payload: WatchlistItemCreate):
    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO watchlist_items
            (title, type, severity, description, camera_id, zone_id, active, instructions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.title,
                payload.type,
                payload.severity,
                payload.description,
                payload.camera_id,
                payload.zone_id,
                int(payload.active),
                payload.instructions,
            ),
        )
        return item_dict(conn.execute("SELECT * FROM watchlist_items WHERE id=?", (cursor.lastrowid,)).fetchone())


@router.get("/{item_id}")
def get_watchlist_item(item_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM watchlist_items WHERE id=?", (item_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Item de watchlist nao encontrado")
    return item_dict(row)


@router.put("/{item_id}")
def update_watchlist_item(item_id: int, payload: WatchlistItemUpdate):
    data = payload.model_dump(exclude_unset=True)
    if "active" in data:
        data["active"] = int(data["active"])
    if data:
        fields = ", ".join(f"{key}=?" for key in data)
        with get_db() as conn:
            conn.execute(f"UPDATE watchlist_items SET {fields} WHERE id=?", (*data.values(), item_id))
    return get_watchlist_item(item_id)


@router.delete("/{item_id}", status_code=204)
def delete_watchlist_item(item_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM watchlist_items WHERE id=?", (item_id,))
