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
    with get_db() as conn:
        camera_count = conn.execute("SELECT COUNT(*) AS total FROM cameras").fetchone()["total"]
        if camera_count:
            return

        conn.execute(
            "INSERT INTO cameras (name, type, source, status, location) VALUES (?, ?, ?, ?, ?)",
            ("Webcam Local", "webcam", "0", "offline", "Entrada principal"),
        )
        conn.execute(
            "INSERT INTO cameras (name, type, source, status, location) VALUES (?, ?, ?, ?, ?)",
            ("Video de Teste Local", "video_file", "videos/exemplo.mp4", "offline", "Arquivo demonstrativo"),
        )
        conn.execute(
            """
            INSERT INTO zones
            (name, camera_id, type, coordinates, time_limit_seconds, people_limit, schedule_start, schedule_end, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("Caixa 1", 1, "caixa", '{"x":8,"y":48,"w":34,"h":42,"unit":"percent"}', 180, 3, "08:00", "22:00", 1),
        )
        conn.execute(
            """
            INSERT INTO zones
            (name, camera_id, type, coordinates, time_limit_seconds, people_limit, schedule_start, schedule_end, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("Estoque Restrito", 1, "area_restrita", '{"x":58,"y":18,"w":34,"h":56,"unit":"percent"}', 60, 1, "08:00", "18:00", 1),
        )
        conn.execute(
            """
            INSERT INTO alerts (camera_id, zone_id, type, severity, message, status)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (1, 2, "area_restrita", "alta", "Movimento detectado no Estoque Restrito fora do horario permitido.", "novo"),
        )
        conn.execute(
            """
            INSERT INTO occurrences
            (type, severity, camera_id, zone_id, description, status, registered_by, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "acesso_indevido",
                "alta",
                1,
                2,
                "Registro manual de movimento em area restrita apos o horario permitido.",
                "em_analise",
                "Supervisor",
                "Evidencia operacional sem identificacao biometrica.",
            ),
        )
        conn.execute(
            """
            INSERT INTO watchlist_items
            (title, type, severity, description, camera_id, zone_id, active, instructions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "Acesso ao estoque fora do horario",
                "comportamento",
                "alta",
                "Acompanhar movimento manualmente na zona Estoque Restrito apos 18:00.",
                1,
                2,
                1,
                "Registrar ocorrencia se houver evidencia operacional. Nao usar biometria.",
            ),
        )
