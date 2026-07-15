"""Hardware safety limits for SO-101 demonstrations.

Software gate for Milestone 2: position workspace, max sweep speed, and
max per-tick step (jerk/torque proxy — we command position, not current).
Live mode uses tighter defaults than simulation; all overridable via env.

Physical dead-man is still required for COACH_AFFECT=live (see README).
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass

logger = logging.getLogger("coach_station.safety")

# Keep in sync with trajectory command rate.
STEP_DT_S = 0.04


@dataclass(frozen=True)
class SafetyLimits:
    elbow_min_deg: float
    elbow_max_deg: float
    max_speed_deg_s: float
    max_step_deg: float  # max |Δθ| between consecutive commands


# Sim defaults: wide desk workspace (historical trajectory clamps).
_SIM_ELBOW_MIN = 0.0
_SIM_ELBOW_MAX = 180.0
_SIM_MAX_SPEED = 120.0
_SIM_MAX_STEP = 8.0

# Live defaults: stay off hard stops; keep motion gentle until torque API exists.
_LIVE_ELBOW_MIN = 20.0
_LIVE_ELBOW_MAX = 160.0
_LIVE_MAX_SPEED = 45.0
_LIVE_MAX_STEP = 3.0


def resolve_affect() -> str:
    """Return simulation | live. Live requires explicit confirm env."""
    raw = os.environ.get("COACH_AFFECT", "simulation").strip().lower()
    if raw not in ("simulation", "live", "sim"):
        logger.warning("Unknown COACH_AFFECT=%s — using simulation", raw)
        return "simulation"
    if raw == "sim":
        return "simulation"
    if raw == "live":
        if os.environ.get("COACH_LIVE_CONFIRM", "").strip() != "1":
            logger.error(
                "COACH_AFFECT=live refused: set COACH_LIVE_CONFIRM=1 only with a "
                "physical dead-man armed — falling back to simulation"
            )
            return "simulation"
        return "live"
    return "simulation"


def _env_float(name: str, default: float) -> float:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    return float(raw)


def load_safety_limits(*, live: bool | None = None) -> SafetyLimits:
    """Load limits. If live is None, infer from resolve_affect()."""
    if live is None:
        live = resolve_affect() == "live"

    if live:
        return SafetyLimits(
            elbow_min_deg=_env_float("COACH_ELBOW_MIN", _LIVE_ELBOW_MIN),
            elbow_max_deg=_env_float("COACH_ELBOW_MAX", _LIVE_ELBOW_MAX),
            max_speed_deg_s=_env_float("COACH_MAX_SPEED_DEG_S", _LIVE_MAX_SPEED),
            max_step_deg=_env_float("COACH_MAX_STEP_DEG", _LIVE_MAX_STEP),
        )
    return SafetyLimits(
        elbow_min_deg=_env_float("COACH_ELBOW_MIN", _SIM_ELBOW_MIN),
        elbow_max_deg=_env_float("COACH_ELBOW_MAX", _SIM_ELBOW_MAX),
        max_speed_deg_s=_env_float("COACH_MAX_SPEED_DEG_S", _SIM_MAX_SPEED),
        max_step_deg=_env_float("COACH_MAX_STEP_DEG", _SIM_MAX_STEP),
    )


def normalize_elbow_range(lo: float, hi: float) -> tuple[float, float]:
    if lo > hi:
        return hi, lo
    return lo, hi


def clamp_elbow_deg(deg: float, limits: SafetyLimits | None = None) -> float:
    limits = limits or load_safety_limits()
    lo, hi = normalize_elbow_range(limits.elbow_min_deg, limits.elbow_max_deg)
    return max(lo, min(hi, deg))


def capped_speed_deg_s(speed: float, limits: SafetyLimits | None = None) -> float:
    """Cap persona speed and ensure STEP-sized moves stay under max_step."""
    limits = limits or load_safety_limits()
    speed = max(float(speed), 1.0)
    speed = min(speed, max(limits.max_speed_deg_s, 1.0))
    # |Δθ| ≈ speed * dt → speed ≤ max_step / dt
    step_cap = max(limits.max_step_deg, 0.1) / max(STEP_DT_S, 1e-3)
    return min(speed, step_cap)
