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
import math
import os
import time
from typing import Awaitable, Callable, Optional, Protocol

from .primitives import Demonstration, from_demonstration_intent
from .schema import CommandResultV1, DemonstrationIntentV1
from .safety import clamp_elbow_deg, load_safety_limits, resolve_affect
from .trajectory import iter_trajectory

# Re-export for callers/tests that imported resolve_affect from arm
__all__ = ["ArmAdapter", "ConsoleArm", "CyberwaveArm", "create_arm", "resolve_affect"]

logger = logging.getLogger("coach_station.arm")

# Catalog slug from Cyberwave docs (SO-101). Override after `cyberwave pair`.
SO101_TWIN = os.environ.get("COACH_TWIN", "the-robot-studio/so101")

# the-robot-studio/so101 schema joints are _<motor_id>. The SDK's joints.set
# rejects friendly names ("elbow_flex") when the schema list is loaded, so map
# our SO-101 joint names to the schema keys before commanding or reading.
SO101_SCHEMA_KEYS = {
    "shoulder_pan": "_1",
    "shoulder_lift": "_2",
    "elbow_flex": "_3",
    "wrist_flex": "_4",
    "wrist_roll": "_5",
    "gripper": "_6",
}


def schema_joint(joint: str) -> str:
    """Map an SO-101 joint name to its twin schema key (passes through unknown)."""
    return SO101_SCHEMA_KEYS.get(joint, joint)


ProgressListener = Callable[[float, float, "Optional[float]"], Awaitable[None]]
Observer = Callable[[], "Optional[float]"]


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

    def read_joint_deg(self, joint: str) -> float | None:
        """Return the *measured* joint angle in degrees if the backend can
        observe one (encoders on live hardware, telemetry cache in sim).

        Returns None when measurement isn't possible; callers fall back to
        echoing the commanded waypoint instead. Should never raise — telemetry
        read failure shouldn't break coaching.
        """

    def publish_fault(self, name: str, description: str) -> None:
        """Surface an adapter-visible fault outside the WebSocket loop.

        No-op for ConsoleArm; CyberwaveArm posts a twin alert so the failure
        shows up in the Cyberwave dashboard, not just in our own logs.
        """


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

    def read_joint_deg(self, joint: str) -> float | None:
        """Console backend cannot observe; callers fall back to echo."""
        return None

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

    def publish_fault(self, name: str, description: str) -> None:
        """Console backend has nothing external to notify."""
        return


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
        # Post-demo error surface in the Cyberwave dashboard — only fired for
        # aborted/error transitions, and only when explicitly enabled. Keeps
        # demo chatter out of the twin's alert feed while still lighting up
        # their console when coaching actually goes wrong.
        self._alerts_enabled = os.environ.get("COACH_TWIN_ALERTS", "").strip() in ("1", "true")
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

    def read_joint_deg(self, joint: str) -> float | None:
        """Best-effort read of the *measured* elbow from the twin cache.

        Returns None if the twin hasn't reported yet or the read fails —
        the trajectory runner then falls back to echoing commanded waypoints,
        which is still correct (sim vs live drift stays honest via logging).
        """
        try:
            states = self._joint_api.get_all()
        except Exception as exc:
            logger.debug("read_joint_deg: get_all failed (%s)", exc)
            return None
        value = states.get(schema_joint(joint))
        if not isinstance(value, (int, float)):
            return None
        # joints.get_all() returns radians per SDK docs
        deg = math.degrees(float(value))
        return deg if math.isfinite(deg) else None

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
            self._joint_api.set(schema_joint(demo.joint), cmd, degrees=True)

        await _run_waypoints(
            waypoints,
            on_progress=on_progress,
            send=send_waypoint,
            observe=lambda: self.read_joint_deg(demo.joint),
        )

    def publish_fault(self, name: str, description: str) -> None:
        """Post a twin alert so errors show up in the Cyberwave dashboard.

        Enabled via COACH_TWIN_ALERTS=1 (default off). Fail-silent: alerting
        must never take down the coaching loop.
        """
        if not self._alerts_enabled:
            return
        try:
            self._twin.alerts.create(
                name=name,
                description=description,
                severity="error",
                alert_type="coach_demo_fault",
            )
        except Exception as exc:
            logger.warning("Twin alert publish failed (%s: %s) — continuing", name, exc)


async def _run_waypoints(
    waypoints: list[tuple[float, float]],
    *,
    on_progress: ProgressListener | None = None,
    sleep_scale: float = 1.0,
    send: Callable[[float], Awaitable[None]] | None = None,
    observe: Observer | None = None,
    log_waypoint: Callable[[float], None] | None = None,
) -> None:
    """Execute waypoints and emit progress at no more than 10Hz.

    `observe` reads the *measured* joint angle (degrees) when the backend can
    see it; the emitted payload carries both commanded and measured so the UI
    can distinguish "sent" from "actually moved" — the difference matters in
    live mode, and is what makes the twin instrument honest about reality.
    """
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
            measured = None
            if observe is not None:
                try:
                    measured = observe()
                except Exception as exc:
                    logger.debug("observe() failed at waypoint %d: %s", index, exc)
            await on_progress(deg, progress, measured)
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
