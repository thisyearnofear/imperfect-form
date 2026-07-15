"""Arm backends: Cyberwave twin (simulation or live SO-101) or console sim.

Sim-first development: the ConsoleArm needs no dependencies and prints the
choreography; the CyberwaveArm drives the real twin once the SDK is installed
and the station is paired (`cyberwave pair`).
"""

import asyncio
import logging
import os

from .primitives import Demonstration

logger = logging.getLogger("coach_station.arm")

# Twin identifier for the SO-101 in Cyberwave's catalog. Verify against your
# workspace after `cyberwave pair` - see docs.cyberwave.com.
SO101_TWIN = os.environ.get("COACH_TWIN", "the-robot-studio/so-101")


class ConsoleArm:
    """Zero-dependency backend: logs the motion the real arm would perform."""

    async def demonstrate(self, demo: Demonstration) -> None:
        sweep = abs(demo.to_deg - demo.from_deg)
        duration = sweep / demo.profile.speed_deg_s
        for rep in range(demo.profile.repeats):
            logger.info(
                "[SIM] %s: %s %.0f° -> %.0f° over %.1fs (rep %d/%d) | %s",
                demo.name,
                demo.joint,
                demo.from_deg,
                demo.to_deg,
                duration,
                rep + 1,
                demo.profile.repeats,
                demo.narration,
            )
            await asyncio.sleep(duration + demo.profile.pause_s)


class CyberwaveArm:
    """Drives the SO-101 twin through the Cyberwave SDK.

    Set COACH_AFFECT=live to move real hardware; default is simulation.
    """

    def __init__(self) -> None:
        from cyberwave import Cyberwave  # optional dependency

        self._cw = Cyberwave()
        self._twin = self._cw.twins(SO101_TWIN)
        affect = os.environ.get("COACH_AFFECT", "simulation")
        self._cw.affect(affect)
        logger.info("Cyberwave twin %s ready (affect=%s)", SO101_TWIN, affect)

    async def demonstrate(self, demo: Demonstration) -> None:
        # Phase 2: replace with proper joint-space trajectory once the twin's
        # joint API is confirmed against the workspace. Keep motions slow and
        # within workspace limits.
        for _ in range(demo.profile.repeats):
            self._twin.move_joint(  # type: ignore[attr-defined]
                joint=demo.joint,
                position_deg=demo.to_deg,
                speed_deg_s=demo.profile.speed_deg_s,
            )
            await asyncio.sleep(demo.profile.pause_s)
            self._twin.move_joint(  # type: ignore[attr-defined]
                joint=demo.joint,
                position_deg=demo.from_deg,
                speed_deg_s=demo.profile.speed_deg_s,
            )


def create_arm():
    """CyberwaveArm when the SDK is available, ConsoleArm otherwise."""
    try:
        return CyberwaveArm()
    except Exception as exc:  # SDK missing or not paired - stay in console sim
        logger.info("Cyberwave unavailable (%s); using console simulation", exc)
        return ConsoleArm()
