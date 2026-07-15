"""Joint-space trajectory helpers for SO-101 demonstrations.

Interpolates Demonstration.from_deg → to_deg at the persona MotionProfile
speed, clamps to workspace limits, and yields (deg, sleep_s) waypoints that
both ConsoleArm and CyberwaveArm can execute.
"""

from __future__ import annotations

import os
from typing import Iterator

from .primitives import Demonstration

# Conservative desk-arm elbow workspace. Override with env when twin limits differ.
_DEFAULT_ELBOW_MIN = 0.0
_DEFAULT_ELBOW_MAX = 180.0
STEP_DT_S = 0.04  # ~25 Hz command rate — readable in sim, gentle on MQTT


def elbow_limits() -> tuple[float, float]:
    lo = float(os.environ.get("COACH_ELBOW_MIN", _DEFAULT_ELBOW_MIN))
    hi = float(os.environ.get("COACH_ELBOW_MAX", _DEFAULT_ELBOW_MAX))
    if lo > hi:
        lo, hi = hi, lo
    return lo, hi


def clamp_deg(deg: float, joint: str = "elbow_flex") -> float:
    """Clamp joint command to workspace. Non-elbow joints pass through unchanged."""
    if joint != "elbow_flex":
        return deg
    lo, hi = elbow_limits()
    return max(lo, min(hi, deg))


def iter_trajectory(demo: Demonstration) -> Iterator[tuple[float, float]]:
    """Yield (position_deg, sleep_s) for one full demonstration (all repeats).

    Each repeat: sweep from → to at profile.speed_deg_s, pause, then return
    to → from (so the arm is ready for the next cue).
    """
    speed = max(demo.profile.speed_deg_s, 1.0)
    start = clamp_deg(demo.from_deg, demo.joint)
    end = clamp_deg(demo.to_deg, demo.joint)

    for _ in range(max(demo.profile.repeats, 1)):
        yield from _sweep(start, end, speed)
        if demo.profile.pause_s > 0:
            yield (end, demo.profile.pause_s)
        yield from _sweep(end, start, speed)
        if demo.profile.pause_s > 0:
            yield (start, demo.profile.pause_s * 0.5)


def _sweep(from_deg: float, to_deg: float, speed_deg_s: float) -> Iterator[tuple[float, float]]:
    sweep = abs(to_deg - from_deg)
    if sweep < 1e-6:
        yield (to_deg, STEP_DT_S)
        return

    duration = sweep / speed_deg_s
    n_steps = max(1, int(duration / STEP_DT_S))
    dt = duration / n_steps
    for i in range(1, n_steps + 1):
        t = i / n_steps
        deg = from_deg + (to_deg - from_deg) * t
        yield (deg, dt)


def trajectory_duration_s(demo: Demonstration) -> float:
    """Total sleep time for the interpolated demonstration."""
    return sum(sleep for _, sleep in iter_trajectory(demo))
