"""Routing between the multi-joint choreography path and the single-joint path.

`_resolve_choreography` sends some curl issues to a multi-joint choreography and
everything else to a single-joint primitive. The protocol and telemetry suites
deliberately use issue="depth" to stay on the single-joint path, so the
choreography branch needs its own coverage here — otherwise a routing regression
would only show up as an unrelated failure in those suites.
"""

from __future__ import annotations

import asyncio
import json

import pytest

from coach_station.schema import CommandResultV1, FormEvent
from coach_station.server import CoachStation


class FakeWebSocket:
    def __init__(self) -> None:
        self.messages: list[dict] = []

    async def send(self, payload: str) -> None:
        self.messages.append(json.loads(payload))


class RecordingArm:
    """Records which adapter entry point the station actually used."""

    name = "recording"
    affect = "simulation"

    def __init__(self) -> None:
        self.choreographies: list[str] = []
        self.intents: list[object] = []
        self.keyframe_callbacks = 0

    async def execute(self, intent, on_progress=None):
        self.intents.append(intent)
        return CommandResultV1(
            command_id=intent.command_id,
            status="succeeded",
            adapter=self.name,
            affect=self.affect,
            completed_at_ms=1,
        )

    async def run_choreography(self, choreography, *, speed_scale=1.0, on_keyframe=None):
        self.choreographies.append(choreography.name)
        if on_keyframe is not None:
            for index, keyframe in enumerate(choreography.keyframes):
                await on_keyframe(index, keyframe)
            self.keyframe_callbacks += 1


def _event(issue: str, mode: str = "curls") -> FormEvent:
    return FormEvent(
        type="form_event",
        mode=mode,
        issue=issue,
        severity="warning",
        cue="Pin your elbows",
        personality="RASTA",
        rep_count=2,
        timestamp_ms=1,
    )


# ─── Routing table ──────────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "issue,mode,expected",
    [
        ("elbow_swing", "curls", "bicep_curl"),
        ("momentum", "curls", "demo_curl_strict"),
        # Not routed to a choreography.
        ("depth", "curls", None),
        ("elbow_swing", "pushups", None),
        ("momentum", "squats", None),
    ],
)
def test_routing_table(issue: str, mode: str, expected: str | None) -> None:
    station = CoachStation(arm=RecordingArm())
    choreography = station._resolve_choreography(_event(issue, mode))
    assert (choreography.name if choreography else None) == expected


# ─── Choreography path ──────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "issue,expected",
    [("elbow_swing", "bicep_curl"), ("momentum", "demo_curl_strict")],
)
def test_curled_issues_use_run_choreography(issue: str, expected: str) -> None:
    arm = RecordingArm()
    station = CoachStation(arm=arm)
    websocket = FakeWebSocket()

    asyncio.run(station.handle_event(websocket, _event(issue).model_dump_json()))

    assert arm.choreographies == [expected]
    # The single-joint adapter entry point must NOT have been used.
    assert arm.intents == []


def test_choreography_emits_keyframe_progress() -> None:
    arm = RecordingArm()
    station = CoachStation(arm=arm)
    websocket = FakeWebSocket()

    asyncio.run(station.handle_event(websocket, _event("elbow_swing").model_dump_json()))

    progress = [m for m in websocket.messages if m["type"] == "choreography_progress"]
    assert progress, "no choreography_progress events were emitted"
    assert all(m["version"] == "1.0" for m in progress)
    # Every keyframe is reported, and the last one is complete.
    assert progress[-1]["progress_pct"] == 1.0
    assert progress[0]["keyframe_index"] == 0
    assert all(m["total_keyframes"] == progress[0]["total_keyframes"] for m in progress)


def test_choreography_result_and_final_state_are_emitted() -> None:
    arm = RecordingArm()
    station = CoachStation(arm=arm)
    websocket = FakeWebSocket()

    asyncio.run(station.handle_event(websocket, _event("elbow_swing").model_dump_json()))

    types = [m["type"] for m in websocket.messages]
    assert "demonstration" in types
    assert "command_result" in types
    assert types[-1] == "robot_state"
    assert websocket.messages[-1]["status"] == "idle"

    result = next(m for m in websocket.messages if m["type"] == "command_result")
    assert result["status"] == "succeeded"
    assert result["version"] == "1.0"


def test_a_choreography_failure_is_reported_not_raised() -> None:
    """A raising adapter must still produce a command_result and error state."""

    class BrokenArm(RecordingArm):
        async def run_choreography(self, choreography, *, speed_scale=1.0, on_keyframe=None):
            raise RuntimeError("servo went away")

    station = CoachStation(arm=BrokenArm())
    websocket = FakeWebSocket()

    asyncio.run(station.handle_event(websocket, _event("elbow_swing").model_dump_json()))

    result = next(m for m in websocket.messages if m["type"] == "command_result")
    assert result["status"] == "aborted"
    assert "servo went away" in result["error"]
    assert websocket.messages[-1]["status"] == "error"


def test_an_adapter_without_run_choreography_aborts_cleanly() -> None:
    """Defensive: a third-party adapter may implement only execute."""

    class SingleJointOnly:
        name = "single"
        affect = "simulation"

        async def execute(self, intent, on_progress=None):
            return CommandResultV1(
                command_id=intent.command_id,
                status="succeeded",
                adapter=self.name,
                affect=self.affect,
                completed_at_ms=1,
            )

    station = CoachStation(arm=SingleJointOnly())
    websocket = FakeWebSocket()

    asyncio.run(station.handle_event(websocket, _event("elbow_swing").model_dump_json()))

    result = next(m for m in websocket.messages if m["type"] == "command_result")
    assert result["status"] == "aborted"
    assert websocket.messages[-1]["status"] == "error"


# ─── Single-joint path ──────────────────────────────────────────────────────

def test_depth_uses_the_single_joint_adapter() -> None:
    arm = RecordingArm()
    station = CoachStation(arm=arm)
    websocket = FakeWebSocket()

    asyncio.run(station.handle_event(websocket, _event("depth").model_dump_json()))

    assert arm.choreographies == []
    assert len(arm.intents) == 1
    assert next(m for m in websocket.messages if m["type"] == "demonstration_intent")[
        "name"
    ] == "demonstrate_full_curl"