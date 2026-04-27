from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime
from typing import AsyncGenerator

import cv2
import numpy as np

from app.database import get_db
from app.schemas import AlertCreate
from app.services.alert_service import AlertService
from app.services.camera_control_service import camera_controls
from app.services.detection_service import Detection, DetectionService
from app.services.metrics_service import MetricsService
from app.services.tracking_service import AnonymousTrackingService


class VideoProcessor:
    def __init__(self) -> None:
        self.detector = DetectionService()
        self.tracker = AnonymousTrackingService()
        self.metrics = MetricsService()
        self.alerts = AlertService()
        self.last_alert_at: dict[str, float] = {}

    async def mjpeg_stream(self, camera_id: int) -> AsyncGenerator[bytes, None]:
        camera = self._get_camera(camera_id)
        capture = self._open_capture(camera) if camera else None
        frame_index = 0

        while True:
            detection_rule = self._active_detection_rule(camera_id)
            controls = camera_controls.get(camera_id)
            ok, frame = (False, None)
            if capture and capture.isOpened():
                ok, frame = capture.read()
                if not ok and camera and camera["type"] == "video_file":
                    capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ok, frame = capture.read()

            if not ok or frame is None:
                frame = self._mock_frame(camera_id, frame_index)
                frame = self._apply_zoom(frame, controls["zoom"])
                detections = self._mock_detections(frame, frame_index) if detection_rule else []
            else:
                frame = self._apply_zoom(frame, controls["zoom"])
                detections = self.detector.detect_people(frame) if detection_rule else []

            if controls["recording_requested"] and not controls["recording"]:
                controls = camera_controls.start_recording(camera_id, frame.shape)
            frame_index += 1
            tracked = self.tracker.update(detections)
            zones = self._zones_for_camera(camera_id)
            await self._process_zones(camera_id, frame, zones, tracked)
            if detection_rule:
                self.detector.draw(frame, tracked, detection_rule["label"])
            if detection_rule and self.detector.model is None and ok:
                self._draw_detection_warning(frame, detection_rule["label"])
            self._draw_zones(frame, zones)
            self._draw_control_status(frame, controls)
            self._draw_hud(frame, camera, len(tracked))
            if controls["recording"]:
                camera_controls.write_frame(camera_id, frame)

            if frame_index % 20 == 0:
                self.metrics.record_frame(camera_id, len(tracked))

            encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 82])[1].tobytes()
            yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + encoded + b"\r\n"
            await asyncio.sleep(0.06)

    @staticmethod
    def _get_camera(camera_id: int):
        with get_db() as conn:
            return conn.execute("SELECT * FROM cameras WHERE id=?", (camera_id,)).fetchone()

    @staticmethod
    def _active_detection_rule(camera_id: int) -> dict | None:
        with get_db() as conn:
            row = conn.execute(
                """
                SELECT * FROM camera_detection_rules
                WHERE camera_id=? AND active=1 AND target_class='person'
                ORDER BY id DESC LIMIT 1
                """,
                (camera_id,),
            ).fetchone()
        return dict(row) if row else None

    @staticmethod
    def _zones_for_camera(camera_id: int) -> list[dict]:
        with get_db() as conn:
            rows = conn.execute("SELECT * FROM zones WHERE camera_id=? AND active=1", (camera_id,)).fetchall()
        zones: list[dict] = []
        for row in rows:
            zone = dict(row)
            zone["coordinates"] = json.loads(zone["coordinates"])
            zones.append(zone)
        return zones

    @staticmethod
    def _open_capture(camera):
        if not camera:
            return None
        source = int(camera["source"]) if camera["type"] == "webcam" and str(camera["source"]).isdigit() else camera["source"]
        capture = cv2.VideoCapture(source)
        if capture.isOpened():
            with get_db() as conn:
                conn.execute("UPDATE cameras SET status='online' WHERE id=?", (camera["id"],))
        return capture

    async def _process_zones(self, camera_id: int, frame, zones: list[dict], detections: list[Detection]) -> None:
        height, width = frame.shape[:2]
        for zone in zones:
            x1, y1, x2, y2 = self._zone_pixels(zone["coordinates"], width, height)
            inside = [d for d in detections if x1 <= d.center[0] <= x2 and y1 <= d.center[1] <= y2]
            dwell_values = []
            for detection in inside:
                if detection.track_id is None:
                    continue
                dwell = self.tracker.dwell_seconds(detection.track_id, zone["id"], True)
                dwell_values.append(dwell)
                if dwell > zone["time_limit_seconds"]:
                    await self._throttled_alert(
                        f"dwell:{zone['id']}:{detection.track_id}",
                        AlertCreate(
                            camera_id=camera_id,
                            zone_id=zone["id"],
                            type="permanencia_excessiva",
                            severity="media",
                            message=f"Pessoa anonima permaneceu mais de {zone['time_limit_seconds']}s em {zone['name']}.",
                        ),
                    )

            if len(inside) > zone["people_limit"]:
                await self._throttled_alert(
                    f"capacity:{zone['id']}",
                    AlertCreate(
                        camera_id=camera_id,
                        zone_id=zone["id"],
                        type="limite_pessoas",
                        severity="alta" if zone["type"] == "caixa" else "media",
                        message=f"{zone['name']} acima do limite operacional: {len(inside)} pessoas.",
                    ),
                )

            now_hhmm = datetime.now().strftime("%H:%M")
            if inside and zone["type"] == "area_restrita" and not (zone["schedule_start"] <= now_hhmm <= zone["schedule_end"]):
                await self._throttled_alert(
                    f"restricted:{zone['id']}",
                    AlertCreate(
                        camera_id=camera_id,
                        zone_id=zone["id"],
                        type="area_restrita",
                        severity="critica",
                        message=f"Movimento detectado em {zone['name']} fora do horario permitido.",
                    ),
                )
            elif inside and zone["type"] == "area_restrita":
                await self._throttled_alert(
                    f"critical-entry:{zone['id']}",
                    AlertCreate(
                        camera_id=camera_id,
                        zone_id=zone["id"],
                        type="zona_critica",
                        severity="alta",
                        message=f"Entrada detectada em zona critica {zone['name']}. Registro comportamental sem biometria.",
                    ),
                    cooldown=120,
                )

            if dwell_values:
                self.metrics.record_frame(camera_id, len(inside), zone["id"], sum(dwell_values) / len(dwell_values))

    async def _throttled_alert(self, key: str, payload: AlertCreate, cooldown: int = 45) -> None:
        now = time.time()
        if now - self.last_alert_at.get(key, 0) >= cooldown:
            self.last_alert_at[key] = now
            await self.alerts.create_alert(payload)

    @staticmethod
    def _zone_pixels(coords: dict, width: int, height: int) -> tuple[int, int, int, int]:
        if coords.get("unit") == "percent":
            x = int(width * coords.get("x", 0) / 100)
            y = int(height * coords.get("y", 0) / 100)
            w = int(width * coords.get("w", 20) / 100)
            h = int(height * coords.get("h", 20) / 100)
        else:
            x, y, w, h = int(coords.get("x", 0)), int(coords.get("y", 0)), int(coords.get("w", 100)), int(coords.get("h", 100))
        return x, y, x + w, y + h

    def _draw_zones(self, frame, zones: list[dict]) -> None:
        height, width = frame.shape[:2]
        for zone in zones:
            x1, y1, x2, y2 = self._zone_pixels(zone["coordinates"], width, height)
            color = (36, 112, 214) if zone["type"] == "area_restrita" else (41, 171, 135)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, zone["name"], (x1 + 8, y1 + 24), cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2)

    @staticmethod
    def _draw_hud(frame, camera, people_count: int) -> None:
        title = camera["name"] if camera else "Camera demonstrativa"
        cv2.rectangle(frame, (0, 0), (frame.shape[1], 48), (20, 31, 43), -1)
        cv2.putText(frame, f"KYTRONA VISION | {title} | Deteccoes: {people_count}", (18, 31), cv2.FONT_HERSHEY_SIMPLEX, 0.72, (245, 248, 250), 2)

    @staticmethod
    def _draw_control_status(frame, controls: dict) -> None:
        labels = []
        if controls["zoom"] > 1:
            labels.append(f"Zoom {controls['zoom']:.1f}x")
        if controls["recording"]:
            labels.append("REC")
        if controls["audio_enabled"]:
            labels.append("Audio ON")
        if controls["microphone_enabled"]:
            labels.append("Mic ON")
        if labels:
            text = " | ".join(labels)
            cv2.rectangle(frame, (0, frame.shape[0] - 38), (frame.shape[1], frame.shape[0]), (20, 31, 43), -1)
            cv2.putText(frame, text, (18, frame.shape[0] - 13), cv2.FONT_HERSHEY_SIMPLEX, 0.62, (245, 248, 250), 2)

    @staticmethod
    def _draw_detection_warning(frame, label: str) -> None:
        text = f"{label} ativa | deteccao indisponivel no backend"
        cv2.rectangle(frame, (0, 50), (frame.shape[1], 86), (31, 70, 93), -1)
        cv2.putText(frame, text, (18, 74), cv2.FONT_HERSHEY_SIMPLEX, 0.62, (245, 248, 250), 2)

    @staticmethod
    def _apply_zoom(frame, zoom: float):
        if zoom <= 1:
            return frame
        height, width = frame.shape[:2]
        crop_w = int(width / zoom)
        crop_h = int(height / zoom)
        x1 = max(0, (width - crop_w) // 2)
        y1 = max(0, (height - crop_h) // 2)
        cropped = frame[y1 : y1 + crop_h, x1 : x1 + crop_w]
        return cv2.resize(cropped, (width, height), interpolation=cv2.INTER_LINEAR)

    @staticmethod
    def _mock_frame(camera_id: int, frame_index: int):
        frame = np.zeros((540, 960, 3), dtype=np.uint8)
        frame[:] = (236, 241, 243)
        cv2.rectangle(frame, (70, 270), (410, 505), (219, 235, 229), -1)
        cv2.rectangle(frame, (560, 95), (885, 410), (226, 231, 238), -1)
        cv2.putText(frame, f"Camera {camera_id} em modo demonstrativo", (260, 72), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (30, 41, 54), 2)
        return frame

    @staticmethod
    def _mock_detections(frame, frame_index: int) -> list[Detection]:
        now = time.time()
        x = 125 + (frame_index * 7) % 260
        y = 310
        detections = [Detection(None, (x, y, x + 56, y + 140), 0.91, (x + 28, y + 70), now)]
        if frame_index % 90 > 30:
            detections.append(Detection(None, (660, 170, 720, 320), 0.88, (690, 245), now))
        return detections


video_processor = VideoProcessor()
