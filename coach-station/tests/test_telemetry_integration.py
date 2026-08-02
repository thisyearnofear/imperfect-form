"""Tests for the #1-#3 Cyberwave integration surfaces.

Coverage:
  1. publish_fault (twin alerts on adapter failures) — opt-in, fail-silent.
  2. Trajectory progress carries measured_deg end-to-end when the adapter
     can observe (sim or live), and stays None on echo-only backends.
  3. read_joint_deg is additive (no change to coaching flow on missing SDK
     or cached-read failure).

No `cyberwave` SDK install required — the CyberwaveArm is exercised via
stub twins injected in __init__-less construction paths.
"""

from __future__ import annotations

import asyncio
import json
import math

import pytest

from coach_station.arm import ConsoleArm, CyberwaveArm, _run_waypoints
from coach_station.schema import CommandResultV1, TrajectoryProgressV1
from coach_station.server import CoachStation


# ---------- #2: trajectory runner observed seam --------------------------------


def test_run_waypoints_emits_observed_when_observer_provides():
    events: list[tuple[float, float, float | None]] = []

    async def on_progress(deg: float, pct: float, measured: float | None) -> None:
        events.append((deg, pct, measured))

    async def drive() -> None:
        await _run_waypoints(
            [(100.0, 0.01), (105.0, 0.01)],
            on_progress=on_progress,
            observe=lambda: 99.5,
        )

    asyncio.run(drive())
    assert events, "expected progress callbacks"
    assert all(payload[2] == 99.5 for payload in events)


def test_run_waypoints_emits_none_when_observer_returns_none():
    events: list[tuple[float, float, float | None]] = []

    async def on_progress(deg: float, pct: float, measured: float | None) -> None:
        events.append((deg, pct, measured))

    async def drive() -> None:
        await _run_waypoints(
            [(100.0, 0.01)],
            on_progress=on_progress,
            observe=lambda: None,
        )

    asyncio.run(drive())
    assert events and events[0][2] is None


def test_run_waypoints_survives_observer_exceptions():
    events: list[tuple[float, float, float | None]] = []

    async def on_progress(deg: float, pct: float, measured: float | None) -> None:
        events.append((deg, pct, measured))

    def exploding():
        raise RuntimeError("telemetry pipeline down")

    async def drive() -> None:
        await _run_waypoints(
            [(100.0, 0.01)],
            on_progress=on_progress,
            observe=exploding,
        )

    asyncio.run(drive())
    assert events and events[0][2] is None  # fails soft, keeps going


# ---------- #2: schema round trip -----------------------------------------------


def test_trajectory_progress_schema_round_trip_with_measured():
    p = TrajectoryProgressV1(
        command_id="cmd-a",
        joint="elbow_flex",
        current_deg=100.0,
        progress_pct=0.5,
        timestamp_ms=1,
        measured_deg=99.5,
    )
    payload = p.model_dump()
    assert payload["measured_deg"] == 99.5
    reparsed = TrajectoryProgressV1.model_validate(payload)
    assert reparsed.measured_deg == 99.5


def test_trajectory_progress_schema_defaults_to_none_measured():
    p = TrajectoryProgressV1(
        command_id="cmd-a",
        joint="elbow_flex",
        current_deg=100.0,
        progress_pct=0.5,
        timestamp_ms=1,
    )
    assert p.measured_deg is None


def test_trajectory_progress_schema_rejects_out_of_range_measured():
    with pytest.raises(ValueError):
        TrajectoryProgressV1(
            command_id="cmd-a",
            joint="elbow_flex",
            current_deg=100.0,
            progress_pct=0.5,
            timestamp_ms=1,
            measured_deg=181.0,
        )


# ---------- #3: twin alert publishing -------------------------------------------


class AlertingArm:
    """Stub adapter with a recordable publish_fault."""

    name = "alerting"
    affect = "simulation"

    def __init__(self, raise_in_execute: Exception | None = None) -> None:
        self.faults: list[tuple[str, str]] = []
        self._raise = raise_in_execute

    async def execute(self, intent, on_progress=None):
        if self._raise:
            raise self._raise
        return CommandResultV1(
            command_id=intent.command_id,
            status="succeeded",
            adapter=self.name,
            affect=self.affect,
            completed_at_ms=1,
        )

    def publish_fault(self, name: str, description: str) -> None:
        self.faults.append((name, description))


class FakeWS:
    def __init__(self) -> None:
        self.messages: list[dict] = []

    async def send(self, payload: str) -> None:
        self.messages.append(json.loads(payload))


def _form_payload() -> str:
    return json.dumps(
        {
            "type": "form_event",
            "mode": "curls",
            "issue": "elbow_swing",
            "severity": "warning",
            "cue": "Pin your elbows",
            "personality": "RASTA",
            "rep_count": 2,
            "timestamp_ms": 1,
        }
    )


def test_publish_fault_fires_on_adapter_failure():
    arm = AlertingArm(raise_in_execute=RuntimeError("boom"))
    station = CoachStation(arm=arm)
    ws = FakeWS()

    asyncio.run(station.handle_event(ws, _form_payload()))

    assert len(arm.faults) == 1
    name, description = arm.faults[0]
    assert "demonstrate_strict_curl" in name
    assert "boom" in description
    # Error robot_state still went out on the wire
    assert ws.messages[-1]["status"] == "error"


def test_publish_fault_not_fired_on_success():
    arm = AlertingArm()
    station = CoachStation(arm=arm)
    ws = FakeWS()

    asyncio.run(station.handle_event(ws, _form_payload()))

    assert arm.faults == []
    assert ws.messages[-1]["status"] == "idle"


def test_publish_fault_failure_does_not_break_feedback():
    class FaultyPublisher(AlertingArm):
        def publish_fault(self, name: str, description: str) -> None:
            raise RuntimeError("alerting backend is down too")

    arm = FaultyPublisher(raise_in_execute=RuntimeError("boom"))
    station = CoachStation(arm=arm)
    ws = FakeWS()

    asyncio.run(station.handle_event(ws, _form_payload()))

    # The command_result + error state still flowed despite the alert blowup
    types = [m["type"] for m in ws.messages]
    assert "command_result" in types
    assert ws.messages[-1]["status"] == "error"


# ---------- #2: read_joint_deg on adapters --------------------------------------


def test_console_arm_cannot_observe():
    arm = ConsoleArm()
    assert arm.read_joint_deg("elbow_flex") is None


class _StubJoints:
    """Pretends to be cyberwave's joints API with cached states."""

    def __init__(self) -> None:
        self.commands: list[tuple[str, float]] = []

    def set(self, name: str, value: float, degrees: bool = False) -> None:
        assert degrees is True
        self.commands.append((name, value))

    def get_all(self) -> dict[str, float]:
        # SDK returns radians — pick a Pythonic pin: 90°
        return {"elbow_flex": math.pi / 2, "shoulder_pan": 0.0}


class _StubTwin:
    def __init__(self) -> None:
        self.joints = _StubJoints()


def test_cyberwave_arm_reads_measured_degrees(monkeypatch):
    # Build CyberwaveArm without going through __init__ (avoids SDK import).
    arm = CyberwaveArm.__new__(CyberwaveArm)
    arm._twin = _StubTwin()  # type: ignore[attr-defined]
    arm._joint_api = arm._twin.joints  # type: ignore[attr-defined]

    deg = arm.read_joint_deg("elbow_flex")
    assert deg is not None
    assert math.isclose(deg, 90.0, abs_tol=0.01)


def test_cyberwave_arm_read_joint_deg_swallows_errors():
    class _BrokenJoints:
        def get_all(self):
            raise RuntimeError("mqtt disconnected")

    arm = CyberwaveArm.__new__(CyberwaveArm)
    arm._twin = type("T", (), {"joints": _BrokenJoints()})()  # type: ignore[attr-defined]
    arm._joint_api = arm._twin.joints  # type: ignore[attr-defined]

    assert arm.read_joint_deg("elbow_flex") is None
