from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path

import cv2

from app.config import get_settings


@dataclass
class CameraControlState:
    zoom: float = 1.0
    audio_enabled: bool = False
    microphone_enabled: bool = False
    recording: bool = False
    recording_requested: bool = False
    recording_path: str | None = None
    last_message: str = "Pronto"


class CameraControlService:
    def __init__(self) -> None:
        self.controls: dict[int, CameraControlState] = {}
        self.recorders: dict[int, cv2.VideoWriter] = {}

    def get(self, camera_id: int) -> dict:
        return asdict(self._state(camera_id))

    def update(self, camera_id: int, payload: dict) -> dict:
        state = self._state(camera_id)
        if "zoom" in payload:
            state.zoom = min(4.0, max(1.0, float(payload["zoom"])))
        if "audio_enabled" in payload:
            state.audio_enabled = bool(payload["audio_enabled"])
        if "microphone_enabled" in payload:
            state.microphone_enabled = bool(payload["microphone_enabled"])
        state.last_message = "Controles atualizados"
        return asdict(state)

    def start_recording(self, camera_id: int, frame_shape: tuple[int, int, int]) -> dict:
        state = self._state(camera_id)
        if state.recording:
            return asdict(state)

        settings = get_settings()
        settings.videos_dir.mkdir(exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = settings.videos_dir / f"camera_{camera_id}_{timestamp}.avi"
        height, width = frame_shape[:2]
        writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"XVID"), 12.0, (width, height))

        if not writer.isOpened():
            state.last_message = "Nao foi possivel iniciar a gravacao"
            return asdict(state)

        self.recorders[camera_id] = writer
        state.recording = True
        state.recording_requested = False
        state.recording_path = str(Path("videos") / path.name)
        state.last_message = "Gravacao iniciada"
        return asdict(state)

    def stop_recording(self, camera_id: int) -> dict:
        state = self._state(camera_id)
        writer = self.recorders.pop(camera_id, None)
        if writer:
            writer.release()
        state.recording = False
        state.recording_requested = False
        state.last_message = "Gravacao parada"
        return asdict(state)

    def request_recording(self, camera_id: int) -> dict:
        state = self._state(camera_id)
        state.recording_requested = True
        state.last_message = "Gravacao solicitada; abra o stream da camera para iniciar o arquivo."
        return asdict(state)

    def write_frame(self, camera_id: int, frame) -> None:
        writer = self.recorders.get(camera_id)
        if writer:
            writer.write(frame)

    def _state(self, camera_id: int) -> CameraControlState:
        self.controls.setdefault(camera_id, CameraControlState())
        return self.controls[camera_id]


camera_controls = CameraControlService()
