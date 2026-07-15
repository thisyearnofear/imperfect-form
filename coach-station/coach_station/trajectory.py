"""Joint-space trajectory helpers for SO-101 demonstrations.

Interpolates Demonstration.from_deg → to_deg at a *safety-capped* persona
speed, clamps to workspace limits, and yields (deg, sleep_s) waypoints that
both ConsoleArm and CyberwaveArm can execute.
"""

from __future__ import annotations

from typing import Iterator

from .primitives import Demonstration
from .safety import STEP_DT_S, SafetyLimits, capped_speed_deg_s, clamp_elbow_deg, load_safety_limits

# Re-export for tests / callers that imported STEP_DT_S from trajectory
__all__ = [
    "STEP_DT_S",
    "elbow_limits",
    "clamp_deg",
    "iter_trajectory",
    "trajectory_duration_s",
]


def elbow_limits() -> tuple[float, float]:
    """Backward-compatible accessor used by tests."""
    limits = load_safety_limits()
    lo, hi = limits.elbow_min_deg, limits.elbow_max_deg
    if lo > hi:
        return hi, lo
    return lo, hi


def clamp_deg(deg: float, joint: str = "elbow_flex") -> float:
    """Clamp joint command to workspace. Non-elbow joints pass through unchanged."""
    if joint != "elbow_flex":
        return deg
    return clamp_elbow_deg(deg)


def iter_trajectory(
    demo: Demonstration,
    limits: SafetyLimits | None = None,
) -> Iterator[tuple[float, float]]:
    """Yield (position_deg, sleep_s) for one full demonstration (all repeats).

    Each repeat: sweep from → to at capped speed, pause, then return
    to → from (so the arm is ready for the next cue).
    """
    limits = limits or load_safety_limits()
    speed = capped_speed_deg_s(demo.profile.speed_deg_s, limits)
    start = clamp_elbow_deg(demo.from_deg, limits) if demo.joint == "elbow_flex" else demo.from_deg
    end = clamp_elbow_deg(demo.to_deg, limits) if demo.joint == "elbow_flex" else demo.to_deg

    for _ in range(max(demo.profile.repeats, 1)):
        yield from _sweep(start, end, speed, demo.joint, limits)
        if demo.profile.pause_s > 0:
            yield (end, demo.profile.pause_s)
        yield from _sweep(end, start, speed, demo.joint, limits)
        if demo.profile.pause_s > 0:
            yield (start, demo.profile.pause_s * 0.5)


def _sweep(
    from_deg: float,
    to_deg: float,
    speed_deg_s: float,
    joint: str,
    limits: SafetyLimits,
) -> Iterator[tuple[float, float]]:
    sweep = abs(to_deg - from_deg)
    if sweep < 1e-6:
        hold = clamp_elbow_deg(to_deg, limits) if joint == "elbow_flex" else to_deg
        yield (hold, STEP_DT_S)
        return

    duration = sweep / speed_deg_s
    n_steps = max(1, int(duration / STEP_DT_S))
    dt = duration / n_steps
    prev = from_deg
    for i in range(1, n_steps + 1):
        t = i / n_steps
        deg = from_deg + (to_deg - from_deg) * t
        if joint == "elbow_flex":
            deg = clamp_elbow_deg(deg, limits)
            # Enforce max step even if interpolation overshot (env mismatch)
            delta = deg - prev
            if abs(delta) > limits.max_step_deg + 1e-6:
                deg = prev + (limits.max_step_deg if delta > 0 else -limits.max_step_deg)
                deg = clamp_elbow_deg(deg, limits)
        yield (deg, dt)
        prev = deg


def trajectory_duration_s(demo: Demonstration, limits: SafetyLimits | None = None) -> float:
    """Total sleep time for the interpolated demonstration."""
    return sum(sleep for _, sleep in iter_trajectory(demo, limits))
