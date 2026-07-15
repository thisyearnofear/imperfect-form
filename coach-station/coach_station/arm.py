"""Arm backends: Cyberwave twin (simulation or live SO-101) or console sim.

Sim-first: ConsoleArm needs no deps and prints the choreography; CyberwaveArm
drives the twin once the SDK is installed (`uv sync --extra cyberwave`).
Uses joints.set(..., degrees=True) per Cyberwave Python SDK docs.

Live (Milestone 2): COACH_AFFECT=live requires COACH_LIVE_CONFIRM=1 plus a
physical dead-man — never arm live by env typo alone.
"""

from __future__ import annotations

import asyncio
import logging
import os

from .primitives import Demonstration
from .trajectory import iter_trajectory

logger = logging.getLogger("coach_station.arm")

# Catalog slug from Cyberwave docs (SO-101). Override after `cyberwave pair`.
SO101_TWIN = os.environ.get("COACH_TWIN", "the-robot-studio/so101")


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


class ConsoleArm:
    """Zero-dependency backend: logs the motion the real arm would perform."""

    async def demonstrate(self, demo: Demonstration) -> None:
        waypoints = list(iter_trajectory(demo))
        total = sum(s for _, s in waypoints)
        logger.info(
            "[SIM] %s: %s %.0f° -> %.0f° | %d waypoints · %.1fs | %s",
            demo.name,
            demo.joint,
            demo.from_deg,
            demo.to_deg,
            len(waypoints),
            total,
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
        self._cw.affect(affect)
        self._twin = self._cw.twin(SO101_TWIN)
        self._joint_api = self._twin.joints
        logger.info("Cyberwave twin %s ready (affect=%s)", SO101_TWIN, affect)

    async def demonstrate(self, demo: Demonstration) -> None:
        try:
            for deg, sleep_s in iter_trajectory(demo):
                self._joint_api.set(demo.joint, deg, degrees=True)
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
