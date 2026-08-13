"""Tests for the live-mode safety gates: first-motion verification + stall watchdog."""

from __future__ import annotations

import asyncio
import math

import pytest

from coach_station.arm import (
    CyberwaveArm,
    _run_waypoints,
    first_motion_verified,
)
from coach_station.primitives import Demonstration, MotionProfile
from coach_station.safety import ArmSafetyError, StallError, load_safety_limits


class _StubJoints:
    """Pretends to be cyberwave's joints API; measured tracks commanded unless told."""

    def __init__(self, *, tracking: bool = True, fixed_deg: float | None = None) -> None:
        self.commands: list[tuple[str, float]] = []
        self.tracking = tracking
        self.fixed_deg = fixed_deg

    def set(self, name: str, value: float, degrees: bool = False) -> None:
        assert degrees is True
        self.commands.append((name, value))

    def get_all(self) -> dict[str, float]:
        # SDK returns radians keyed by the twin schema (_<motor_id>).
        if self.fixed_deg is not None:
            deg = self.fixed_deg
        elif self.commands:
            deg = self.commands[-1][1] if self.tracking else self.commands[-1][1] - 20.0
        else:
            deg = 90.0
        return {"_3": math.radians(deg), "_1": 0.0}


def _demo() -> Demonstration:
    return Demonstration(
        name="test_curl",
        joint="elbow_flex",
        from_deg=90.0,
        to_deg=100.0,
        profile=MotionProfile(speed_deg_s=30.0, pause_s=0.0, repeats=1),
        narration="test",
    )


def _live_arm(stub: _StubJoints) -> CyberwaveArm:
    arm = CyberwaveArm.__new__(CyberwaveArm)  # avoid SDK import in __init__
    arm._affect = "live"  # type: ignore[attr-defined]
    arm._limits = load_safety_limits(live=True)  # type: ignore[attr-defined]
    arm._twin = type("T", (), {"joints": stub})()  # type: ignore[attr-defined]
    arm._joint_api = arm._twin.joints  # type: ignore[attr-defined]
    return arm


# ---------- first-motion gate ---------------------------------------------------


def test_first_motion_verified_defaults_false(monkeypatch):
    monkeypatch.delenv("COACH_MOTION_VERIFIED", raising=False)
    assert first_motion_verified() is False


def test_first_motion_verified_true_when_set(monkeypatch):
    monkeypatch.setenv("COACH_MOTION_VERIFIED", "1")
    assert first_motion_verified() is True


def test_live_demo_refused_without_verification(monkeypatch):
    monkeypatch.delenv("COACH_MOTION_VERIFIED", raising=False)
    arm = _live_arm(_StubJoints())

    async def drive() -> None:
        await arm.demonstrate(_demo())

    with pytest.raises(ArmSafetyError, match="COACH_MOTION_VERIFIED"):
        asyncio.run(drive())


def test_live_demo_runs_once_verified(monkeypatch):
    monkeypatch.setenv("COACH_MOTION_VERIFIED", "1")
    stub = _StubJoints(tracking=True)
    arm = _live_arm(stub)

    async def drive() -> None:
        await arm.demonstrate(_demo())

    asyncio.run(drive())
    assert stub.commands, "expected commanded waypoints"
    # Every commanded value was sent as degrees against the schema key.
    assert all(name == "_3" for name, _ in stub.commands)


# ---------- stall watchdog ------------------------------------------------------


def test_stall_check_raises_after_sustained_deviation(monkeypatch):
    monkeypatch.setenv("COACH_MOTION_VERIFIED", "1")
    monkeypatch.setenv("COACH_STALL_TICKS", "3")
    # Measured stays 20° behind commanded → deviation exceeds 6° tolerance.
    stub = _StubJoints(tracking=True)
    arm = _live_arm(stub)
    stub.fixed_deg = 70.0

    async def drive() -> None:
        await arm.demonstrate(_demo())

    with pytest.raises(StallError, match="stalled"):
        asyncio.run(drive())


def test_stall_check_tracks_motion_without_aborting(monkeypatch):
    monkeypatch.setenv("COACH_MOTION_VERIFIED", "1")
    stub = _StubJoints(tracking=True)
    arm = _live_arm(stub)

    async def drive() -> None:
        await arm.demonstrate(_demo())

    asyncio.run(drive())  # no exception — measured tracks commanded


def test_stall_check_ignores_missing_telemetry():
    """measured=None never trips the watchdog (progress echo still runs)."""
    events: list[tuple[float, float | None]] = []

    async def on_progress(deg: float, pct: float, measured: float | None) -> None:
        events.append((deg, measured))

    def stall(commanded: float, measured: float | None) -> None:
        assert measured is None, "stall_check should not receive telemetry here"

    async def drive() -> None:
        await _run_waypoints(
            [(100.0, 0.01), (101.0, 0.01)],
            on_progress=on_progress,
            observe=lambda: None,
            stall_check=stall,
        )

    asyncio.run(drive())
    assert all(measured is None for _, measured in events)


def test_stall_check_configuration_bounds(monkeypatch):
    monkeypatch.setenv("COACH_MOTION_VERIFIED", "1")
    monkeypatch.setenv("COACH_STALL_TICKS", "0")  # invalid → clamped to 1
    stub = _StubJoints(tracking=True)
    stub.fixed_deg = 70.0  # permanently off by 20°
    arm = _live_arm(stub)

    async def drive() -> None:
        await arm.demonstrate(_demo())

    with pytest.raises(StallError):
        asyncio.run(drive())


def test_run_waypoints_stall_check_aborts_trajectory():
    sent: list[float] = []

    async def send(deg: float) -> None:
        sent.append(deg)

    def stall(commanded: float, measured: float | None) -> None:
        raise StallError(f"stalled at {commanded}")

    async def drive() -> None:
        await _run_waypoints(
            [(100.0, 0.01), (101.0, 0.01), (102.0, 0.01)],
            send=send,
            observe=lambda: 60.0,
            stall_check=stall,
        )

    with pytest.raises(StallError, match="stalled"):
        asyncio.run(drive())
    assert len(sent) == 1  # first waypoint sent before the stall aborted the rest
