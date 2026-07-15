"""Arm backends: Cyberwave twin (simulation or live SO-101) or console sim.

Sim-first: ConsoleArm needs no deps and prints the choreography; CyberwaveArm
drives the twin once the SDK is installed (`uv sync --extra cyberwave`).
Uses joints.set(..., degrees=True) per Cyberwave Python SDK docs.

Live (Milestone 2): COACH_AFFECT=live requires COACH_LIVE_CONFIRM=1 plus a
physical dead-man — never arm live by env typo alone. Command path re-clamps
every waypoint via safety limits (defense in depth).
"""

from __future__ import annotations

import asyncio
import logging
import os

from .primitives import Demonstration
from .safety import clamp_elbow_deg, load_safety_limits, resolve_affect
from .trajectory import iter_trajectory

# Re-export for callers/tests that imported resolve_affect from arm
__all__ = ["ConsoleArm", "CyberwaveArm", "create_arm", "resolve_affect"]

logger = logging.getLogger("coach_station.arm")

# Catalog slug from Cyberwave docs (SO-101). Override after `cyberwave pair`.
SO101_TWIN = os.environ.get("COACH_TWIN", "the-robot-studio/so101")


class ConsoleArm:
    """Zero-dependency backend: logs the motion the real arm would perform."""

    async def demonstrate(self, demo: Demonstration) -> None:
        limits = load_safety_limits()
        waypoints = list(iter_trajectory(demo, limits))
        total = sum(s for _, s in waypoints)
        logger.info(
            "[SIM] %s: %s %.0f° -> %.0f° | %d waypoints · %.1fs | speed≤%.0f°/s step≤%.1f° | %s",
            demo.name,
            demo.joint,
            demo.from_deg,
            demo.to_deg,
            len(waypoints),
            total,
            limits.max_speed_deg_s,
            limits.max_step_deg,
            demo.narration,
        )
        # Compress wall-clock in console mode: sleep proportional but capped
        # so demos are watchable without waiting full physical duration.
        scale = min(1.0, 3.0 / max(total, 0.01))
        for deg, sleep_s in waypoints:
            logger.debug("[SIM]   %s = %.1f°", demo.joint, deg)
            await asyncio.sleep(sleep_s * scale)


class CyberwaveArm:
    """Drives the SO-101 twin through the Cyberwave SDK.

    Default COACH_AFFECT=simulation (MuJoCo / Playground twin). Set
    COACH_AFFECT=live + COACH_LIVE_CONFIRM=1 only behind a physical dead-man.
    """

    def __init__(self) -> None:
        from cyberwave import Cyberwave  # optional dependency

        self._cw = Cyberwave()
        affect = resolve_affect()
        self._affect = affect
        self._limits = load_safety_limits(live=(affect == "live"))
        self._cw.affect(affect)
        self._twin = self._cw.twin(SO101_TWIN)
        self._joint_api = self._twin.joints
        logger.info(
            "Cyberwave twin %s ready (affect=%s elbow=[%.0f,%.0f] max_speed=%.0f max_step=%.1f)",
            SO101_TWIN,
            affect,
            self._limits.elbow_min_deg,
            self._limits.elbow_max_deg,
            self._limits.max_speed_deg_s,
            self._limits.max_step_deg,
        )

    async def demonstrate(self, demo: Demonstration) -> None:
        try:
            for deg, sleep_s in iter_trajectory(demo, self._limits):
                # Defense in depth: re-clamp at the wire even if trajectory drifts
                cmd = clamp_elbow_deg(deg, self._limits) if demo.joint == "elbow_flex" else deg
                self._joint_api.set(demo.joint, cmd, degrees=True)
                await asyncio.sleep(sleep_s)
        except Exception as exc:
            # Fail soft: one bad demo must not take down the websocket server.
            logger.error(
                "Demonstration %s aborted (%s) — station stays up",
                demo.name,
                exc,
            )


def create_arm():
    """CyberwaveArm when the SDK is available, ConsoleArm otherwise."""
    force_console = os.environ.get("COACH_ARM", "").lower() in ("console", "sim", "log")
    if force_console:
        logger.info("COACH_ARM=%s — using console simulation", os.environ.get("COACH_ARM"))
        return ConsoleArm()
    try:
        return CyberwaveArm()
    except Exception as exc:  # SDK missing or not paired - stay in console sim
        logger.info("Cyberwave unavailable (%s); using console simulation", exc)
        return ConsoleArm()
