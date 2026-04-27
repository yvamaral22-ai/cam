import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.config import get_settings


def _db_path() -> Path:
    url = get_settings().database_url
    if not url.startswith("sqlite:///"):
        raise RuntimeError("Este MVP suporta somente SQLite.")
    return Path(url.replace("sqlite:///", "", 1))


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(_db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS cameras (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                source TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'offline',
                location TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS zones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                camera_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                coordinates TEXT NOT NULL,
                time_limit_seconds INTEGER DEFAULT 180,
                people_limit INTEGER DEFAULT 4,
                schedule_start TEXT DEFAULT '08:00',
                schedule_end TEXT DEFAULT '18:00',
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(camera_id) REFERENCES cameras(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS camera_detection_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                camera_id INTEGER NOT NULL,
                label TEXT NOT NULL,
                target_class TEXT NOT NULL DEFAULT 'person',
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(camera_id) REFERENCES cameras(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                camera_id INTEGER NOT NULL,
                zone_id INTEGER,
                type TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                snapshot_path TEXT,
                status TEXT NOT NULL DEFAULT 'novo',
                FOREIGN KEY(camera_id) REFERENCES cameras(id) ON DELETE CASCADE,
                FOREIGN KEY(zone_id) REFERENCES zones(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                camera_id INTEGER NOT NULL,
                zone_id INTEGER,
                people_count INTEGER NOT NULL DEFAULT 0,
                avg_dwell_seconds REAL NOT NULL DEFAULT 0,
                timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(camera_id) REFERENCES cameras(id) ON DELETE CASCADE,
                FOREIGN KEY(zone_id) REFERENCES zones(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS occurrences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                severity TEXT NOT NULL,
                camera_id INTEGER NOT NULL,
                zone_id INTEGER,
                data_hora TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                description TEXT NOT NULL,
                snapshot_path TEXT,
                video_clip_path TEXT,
                status TEXT NOT NULL DEFAULT 'em_analise',
                registered_by TEXT NOT NULL,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(camera_id) REFERENCES cameras(id) ON DELETE CASCADE,
                FOREIGN KEY(zone_id) REFERENCES zones(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS watchlist_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'comportamento',
                severity TEXT NOT NULL DEFAULT 'media',
                description TEXT NOT NULL,
                camera_id INTEGER,
                zone_id INTEGER,
                active INTEGER NOT NULL DEFAULT 1,
                instructions TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(camera_id) REFERENCES cameras(id) ON DELETE SET NULL,
                FOREIGN KEY(zone_id) REFERENCES zones(id) ON DELETE SET NULL
            );
            """
        )


def seed_data() -> None:
    # O MVP inicia sem cameras automaticas: a tela deve exibir apenas cameras cadastradas pelo usuario.
    return


def cleanup_legacy_seed_data() -> None:
    legacy_cameras = [
        ("Webcam Local", "webcam", "0", "Entrada principal"),
        ("Video de Teste Local", "video_file", "videos/exemplo.mp4", "Arquivo demonstrativo"),
        ("Camera IP da Rede", "ip_camera", "http://192.168.0.20:8080/video", "Rede local"),
    ]
    with get_db() as conn:
        for name, camera_type, source, location in legacy_cameras:
            rows = conn.execute(
                """
                SELECT id FROM cameras
                WHERE name=? AND type=? AND source=? AND COALESCE(location, '')=?
                """,
                (name, camera_type, source, location),
            ).fetchall()
            for row in rows:
                camera_id = row["id"]
                conn.execute("DELETE FROM camera_detection_rules WHERE camera_id=?", (camera_id,))
                conn.execute("DELETE FROM metrics WHERE camera_id=?", (camera_id,))
                conn.execute("DELETE FROM alerts WHERE camera_id=?", (camera_id,))
                conn.execute("DELETE FROM occurrences WHERE camera_id=?", (camera_id,))
                conn.execute("DELETE FROM zones WHERE camera_id=?", (camera_id,))
                conn.execute("DELETE FROM cameras WHERE id=?", (camera_id,))
