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
import time
from typing import Awaitable, Callable, Protocol

from .primitives import Demonstration, from_demonstration_intent
from .schema import CommandResultV1, DemonstrationIntentV1
from .safety import clamp_elbow_deg, load_safety_limits, resolve_affect
from .trajectory import iter_trajectory

# Re-export for callers/tests that imported resolve_affect from arm
__all__ = ["ArmAdapter", "ConsoleArm", "CyberwaveArm", "create_arm", "resolve_affect"]

logger = logging.getLogger("coach_station.arm")

# Catalog slug from Cyberwave docs (SO-101). Override after `cyberwave pair`.
SO101_TWIN = os.environ.get("COACH_TWIN", "the-robot-studio/so101")


ProgressListener = Callable[[float, float], Awaitable[None]]


class ArmAdapter(Protocol):
    """Adapter boundary between normalized intent and robot execution."""

    name: str
    affect: str

    async def execute(
        self,
        intent: DemonstrationIntentV1,
        on_progress: ProgressListener | None = None,
    ) -> CommandResultV1:
        ...


class ConsoleArm:
    """Zero-dependency backend: logs the motion the real arm would perform."""

    name = "console"
    affect = "simulation"

    async def execute(
        self,
        intent: DemonstrationIntentV1,
        on_progress: ProgressListener | None = None,
    ) -> CommandResultV1:
        started = time.monotonic()
        try:
            await self.demonstrate(from_demonstration_intent(intent), on_progress=on_progress)
            return CommandResultV1(
                command_id=intent.command_id,
                status="succeeded",
                adapter=self.name,
                affect=self.affect,
                duration_s=round(time.monotonic() - started, 2),
                completed_at_ms=int(time.time() * 1000),
            )
        except Exception as exc:
            logger.error("Console demonstration %s aborted: %s", intent.name, exc)
            return CommandResultV1(
                command_id=intent.command_id,
                status="aborted",
                adapter=self.name,
                affect=self.affect,
                duration_s=round(time.monotonic() - started, 2),
                error=str(exc),
                completed_at_ms=int(time.time() * 1000),
            )

    async def demonstrate(
        self,
        demo: Demonstration,
        *,
        on_progress: ProgressListener | None = None,
    ) -> None:
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
        # Keep browser narration/progress aligned with the physical trajectory
        # by default. Developers can opt into accelerated local playback with
        # COACH_SIM_SPEED_SCALE=0.25 (or similar) when manually iterating.
        try:
            scale = max(float(os.environ.get("COACH_SIM_SPEED_SCALE", "1")), 0.01)
        except ValueError:
            scale = 1.0
        await _run_waypoints(
            waypoints,
            on_progress=on_progress,
            sleep_scale=scale,
            log_waypoint=lambda deg: logger.debug("[SIM]   %s = %.1f°", demo.joint, deg),
        )


class CyberwaveArm:
    """Drives the SO-101 twin through the Cyberwave SDK.

    Default COACH_AFFECT=simulation (MuJoCo / Playground twin). Set
    COACH_AFFECT=live + COACH_LIVE_CONFIRM=1 only behind a physical dead-man.
    """

    name = "cyberwave"

    def __init__(self) -> None:
        from cyberwave import Cyberwave  # optional dependency

        self._cw = Cyberwave()
        affect = resolve_affect()
        self._affect = affect
        self.affect = affect
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

    async def execute(
        self,
        intent: DemonstrationIntentV1,
        on_progress: ProgressListener | None = None,
    ) -> CommandResultV1:
        started = time.monotonic()
        try:
            await self.demonstrate(from_demonstration_intent(intent), on_progress=on_progress)
            return CommandResultV1(
                command_id=intent.command_id,
                status="succeeded",
                adapter=self.name,
                affect=self.affect,
                duration_s=round(time.monotonic() - started, 2),
                completed_at_ms=int(time.time() * 1000),
            )
        except Exception as exc:
            logger.error("Cyberwave demonstration %s aborted: %s", intent.name, exc)
            return CommandResultV1(
                command_id=intent.command_id,
                status="aborted",
                adapter=self.name,
                affect=self.affect,
                duration_s=round(time.monotonic() - started, 2),
                error=str(exc),
                completed_at_ms=int(time.time() * 1000),
            )

    async def demonstrate(
        self,
        demo: Demonstration,
        *,
        on_progress: ProgressListener | None = None,
    ) -> None:
        waypoints = list(iter_trajectory(demo, self._limits))

        async def send_waypoint(deg: float) -> None:
            # Defense in depth: re-clamp at the wire even if trajectory drifts.
            cmd = clamp_elbow_deg(deg, self._limits) if demo.joint == "elbow_flex" else deg
            self._joint_api.set(demo.joint, cmd, degrees=True)

        await _run_waypoints(waypoints, on_progress=on_progress, send=send_waypoint)


async def _run_waypoints(
    waypoints: list[tuple[float, float]],
    *,
    on_progress: ProgressListener | None = None,
    sleep_scale: float = 1.0,
    send: Callable[[float], Awaitable[None]] | None = None,
    log_waypoint: Callable[[float], None] | None = None,
) -> None:
    """Execute waypoints and emit progress at no more than 10Hz."""
    total = max(len(waypoints), 1)
    last_emit = 0.0
    for index, (deg, sleep_s) in enumerate(waypoints, start=1):
        if log_waypoint:
            log_waypoint(deg)
        if send:
            await send(deg)
        now = time.monotonic()
        progress = index / total
        if on_progress and (now - last_emit >= 0.1 or index == total):
            await on_progress(deg, progress)
            last_emit = now
        await asyncio.sleep(sleep_s * sleep_scale)



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
