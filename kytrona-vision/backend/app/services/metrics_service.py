from __future__ import annotations

import sqlite3
from collections import Counter

from app.database import get_db


class MetricsService:
    def record_frame(self, camera_id: int, people_count: int, zone_id: int | None = None, avg_dwell_seconds: float = 0) -> None:
        with get_db() as conn:
            camera_exists = conn.execute("SELECT 1 FROM cameras WHERE id=?", (camera_id,)).fetchone()
            if not camera_exists:
                return

            if zone_id is not None:
                zone_exists = conn.execute("SELECT 1 FROM zones WHERE id=? AND camera_id=?", (zone_id, camera_id)).fetchone()
                if not zone_exists:
                    zone_id = None

            try:
                conn.execute(
                    "INSERT INTO metrics (camera_id, zone_id, people_count, avg_dwell_seconds) VALUES (?, ?, ?, ?)",
                    (camera_id, zone_id, people_count, avg_dwell_seconds),
                )
            except sqlite3.IntegrityError:
                # A camera/zone can be removed while an active stream still emits frames.
                return

    def overview(self) -> dict:
        with get_db() as conn:
            cameras_online = conn.execute("SELECT COUNT(*) AS total FROM cameras WHERE status='online'").fetchone()["total"]
            zones_total = conn.execute("SELECT COUNT(*) AS total FROM zones WHERE active=1").fetchone()["total"]
            critical_alerts = conn.execute(
                "SELECT COUNT(*) AS total FROM alerts WHERE severity IN ('alta','critica') AND status != 'resolvido'"
            ).fetchone()["total"]
            people_today = conn.execute(
                "SELECT COALESCE(MAX(people_count), 0) AS total FROM metrics WHERE date(timestamp)=date('now')"
            ).fetchone()["total"]
            alerts_by_hour = [
                dict(row)
                for row in conn.execute(
                    """
                    SELECT strftime('%H:00', timestamp) AS hour, COUNT(*) AS total
                    FROM alerts
                    WHERE date(timestamp)=date('now')
                    GROUP BY hour ORDER BY hour
                    """
                ).fetchall()
            ]
            occurrences_open = conn.execute(
                "SELECT COUNT(*) AS total FROM occurrences WHERE status IN ('em_analise','confirmado')"
            ).fetchone()["total"]
            occurrences_critical = conn.execute(
                "SELECT COUNT(*) AS total FROM occurrences WHERE severity='critica' AND status!='resolvido'"
            ).fetchone()["total"]
            occurrences_confirmed = conn.execute(
                "SELECT COUNT(*) AS total FROM occurrences WHERE status='confirmado'"
            ).fetchone()["total"]
            occurrences_by_type = [
                dict(row)
                for row in conn.execute(
                    "SELECT type, COUNT(*) AS total FROM occurrences GROUP BY type ORDER BY total DESC"
                ).fetchall()
            ]
            recent_occurrences = [
                dict(row)
                for row in conn.execute(
                    "SELECT * FROM occurrences ORDER BY data_hora DESC LIMIT 6"
                ).fetchall()
            ]
            watchlist_active = conn.execute("SELECT COUNT(*) AS total FROM watchlist_items WHERE active=1").fetchone()["total"]
        return {
            "online_cameras": cameras_online,
            "people_today": people_today,
            "critical_alerts": critical_alerts,
            "monitored_zones": zones_total,
            "alerts_by_hour": alerts_by_hour or self._mock_alerts_by_hour(),
            "cashiers_ranking": self.cashiers_ranking(),
            "occurrences_open": occurrences_open,
            "occurrences_critical": occurrences_critical,
            "occurrences_confirmed": occurrences_confirmed,
            "occurrences_by_type": occurrences_by_type,
            "recent_occurrences": recent_occurrences,
            "watchlist_active": watchlist_active,
        }

    def camera_analytics(self, camera_id: int) -> dict:
        with get_db() as conn:
            row = conn.execute(
                """
                SELECT COALESCE(AVG(people_count), 0) AS avg_people,
                       COALESCE(MAX(people_count), 0) AS peak_people,
                       COALESCE(AVG(avg_dwell_seconds), 0) AS avg_dwell
                FROM metrics WHERE camera_id=?
                """,
                (camera_id,),
            ).fetchone()
        return dict(row)

    def zone_analytics(self, zone_id: int) -> dict:
        with get_db() as conn:
            row = conn.execute(
                """
                SELECT COALESCE(AVG(avg_dwell_seconds), 0) AS avg_dwell,
                       COALESCE(MAX(people_count), 0) AS peak_people
                FROM metrics WHERE zone_id=?
                """,
                (zone_id,),
            ).fetchone()
        return dict(row)

    def cashiers_ranking(self) -> list[dict]:
        with get_db() as conn:
            rows = conn.execute(
                """
                SELECT z.id, z.name, COALESCE(AVG(m.avg_dwell_seconds), z.time_limit_seconds * 0.62) AS avg_seconds
                FROM zones z
                LEFT JOIN metrics m ON m.zone_id = z.id
                WHERE z.type = 'caixa'
                GROUP BY z.id
                ORDER BY avg_seconds ASC
                """
            ).fetchall()
        return [dict(row) for row in rows] or [{"id": 1, "name": "Caixa 1", "avg_seconds": 112}]

    @staticmethod
    def _mock_alerts_by_hour() -> list[dict]:
        data = Counter({"08:00": 1, "10:00": 2, "14:00": 1, "18:00": 3})
        return [{"hour": hour, "total": total} for hour, total in data.items()]
