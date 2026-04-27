from __future__ import annotations

import math
import time
from dataclasses import replace

from app.services.detection_service import Detection


class AnonymousTrackingService:
    def __init__(self, max_distance: int = 90, ttl_seconds: int = 3) -> None:
        self.max_distance = max_distance
        self.ttl_seconds = ttl_seconds
        self.next_id = 1
        self.tracks: dict[int, dict] = {}
        self.zone_entry: dict[tuple[int, int], float] = {}

    def update(self, detections: list[Detection]) -> list[Detection]:
        now = time.time()
        assigned: set[int] = set()
        tracked: list[Detection] = []

        for detection in detections:
            track_id = self._nearest_track(detection.center, assigned)
            if track_id is None:
                track_id = self.next_id
                self.next_id += 1
            assigned.add(track_id)
            self.tracks[track_id] = {"center": detection.center, "last_seen": now}
            tracked.append(replace(detection, track_id=track_id))

        expired = [tid for tid, data in self.tracks.items() if now - data["last_seen"] > self.ttl_seconds]
        for tid in expired:
            self.tracks.pop(tid, None)
            for key in list(self.zone_entry):
                if key[0] == tid:
                    self.zone_entry.pop(key, None)
        return tracked

    def _nearest_track(self, center: tuple[int, int], assigned: set[int]) -> int | None:
        best_id: int | None = None
        best_distance = self.max_distance
        for track_id, data in self.tracks.items():
            if track_id in assigned:
                continue
            distance = math.dist(center, data["center"])
            if distance < best_distance:
                best_id = track_id
                best_distance = distance
        return best_id

    def dwell_seconds(self, track_id: int, zone_id: int, inside: bool) -> float:
        key = (track_id, zone_id)
        if inside:
            self.zone_entry.setdefault(key, time.time())
            return time.time() - self.zone_entry[key]
        self.zone_entry.pop(key, None)
        return 0
