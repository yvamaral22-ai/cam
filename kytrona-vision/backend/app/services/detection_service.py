from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

import cv2

from app.config import get_settings


@dataclass
class Detection:
    track_id: int | None
    bbox: tuple[int, int, int, int]
    confidence: float
    center: tuple[int, int]
    timestamp: float


class DetectionService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.model: Any | None = None
        self._load_model()

    def _load_model(self) -> None:
        try:
            from ultralytics import YOLO

            self.model = YOLO(self.settings.yolo_model)
        except Exception as exc:
            print(f"[KYTRONA] YOLO indisponivel, usando modo demonstrativo: {exc}")
            self.model = None

    def detect_people(self, frame) -> list[Detection]:
        if self.model is None:
            return []

        results = self.model.predict(
            frame,
            classes=[0],
            conf=self.settings.confidence_threshold,
            verbose=False,
        )
        detections: list[Detection] = []
        now = time.time()
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                confidence = float(box.conf[0])
                center = ((x1 + x2) // 2, (y1 + y2) // 2)
                detections.append(Detection(None, (x1, y1, x2, y2), confidence, center, now))
        return detections

    @staticmethod
    def draw(frame, detections: list[Detection]) -> None:
        for detection in detections:
            x1, y1, x2, y2 = detection.bbox
            label = f"Pessoa #{detection.track_id or '-'} {detection.confidence:.0%}"
            cv2.rectangle(frame, (x1, y1), (x2, y2), (32, 143, 93), 2)
            cv2.putText(frame, label, (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (32, 143, 93), 2)
