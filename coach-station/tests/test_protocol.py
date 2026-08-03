"""OpenPAVE-inspired intent/control/feedback boundary tests."""

from __future__ import annotations

import asyncio
import json

import pytest

from coach_station.primitives import resolve_demonstration, to_demonstration_intent
from coach_station.schema import CommandResultV1, FormEvent
from coach_station.server import CoachStation


class FakeWebSocket:
    def __init__(self) -> None:
        self.messages: list[dict] = []

    async def send(self, payload: str) -> None:
        self.messages.append(json.loads(payload))


class FakeArm:
    name = "fake"
    affect = "simulation"

    def __init__(self, status: str = "succeeded") -> None:
        self.status = status
        self.intents = []

    async def execute(self, intent):
        self.intents.append(intent)
        return CommandResultV1(
            command_id=intent.command_id,
            status=self.status,
            adapter=self.name,
            affect=self.affect,
            duration_s=0.01,
            error="test failure" if self.status != "succeeded" else None,
            completed_at_ms=123,
        )


class RaisingArm:
    name = "raising"
    affect = "simulation"

    async def execute(self, _intent):
        raise RuntimeError("adapter exploded")


class MalformedArm:
    name = "malformed"
    affect = "simulation"

    async def execute(self, _intent):
        return {"unexpected": True}


class MismatchedCommandArm:
    name = "mismatched"
    affect = "simulation"

    async def execute(self, intent):
        return CommandResultV1(
            command_id=f"wrong-{intent.command_id}",
            status="succeeded",
            adapter=self.name,
            affect=self.affect,
            completed_at_ms=123,
        )


class ProgressArm:
    name = "progress"
    affect = "simulation"

    async def execute(self, intent, on_progress=None):
        if on_progress:
            await on_progress(160.0, 0.25, None)
            await on_progress(50.0, 1.0, None)

    def read_joint_deg(self, _joint: str) -> None:
        return None

    def publish_fault(self, _name: str, _description: str) -> None:
        return
        return CommandResultV1(
            command_id=intent.command_id,
            status="succeeded",
            adapter=self.name,
            affect=self.affect,
            completed_at_ms=123,
        )


def _form_event() -> FormEvent:
    return FormEvent(
        type="form_event",
        mode="curls",
        issue="elbow_swing",
        severity="warning",
        cue="Pin your elbows",
        personality="RASTA",
        rep_count=2,
        timestamp_ms=1,
    )


def test_intent_is_versioned_and_contains_adapter_parameters():
    event = _form_event()
    demo = resolve_demonstration(event)
    assert demo is not None

    intent = to_demonstration_intent(
        event,
        demo,
        command_id="cmd-test",
        duration_s=4.25,
    )

    assert intent.version == "1.0"
    assert intent.type == "demonstration_intent"
    assert intent.command_id == "cmd-test"
    assert intent.name == "demonstrate_strict_curl"
    assert intent.joint == "elbow_flex"
    assert intent.repeats == 2


def test_command_result_rejects_unknown_protocol_version():
    with pytest.raises(ValueError):
        CommandResultV1(
            version="2.0",
            command_id="cmd-test",
            status="succeeded",
            adapter="fake",
            affect="simulation",
            completed_at_ms=123,
        )


def test_station_emits_demo_state_result_and_idle_feedback():
    arm = FakeArm()
    station = CoachStation(arm=arm)
    websocket = FakeWebSocket()

    asyncio.run(station.handle_event(websocket, _form_event().model_dump_json()))

    assert len(arm.intents) == 1
    assert [message["type"] for message in websocket.messages] == [
        "robot_state",
        "demonstration_intent",
        "demonstration",
        "command_result",
        "robot_state",
    ]
    assert websocket.messages[0]["version"] == "1.0"
    command_id = websocket.messages[0]["command_id"]
    assert websocket.messages[0]["status"] == "executing"
    assert websocket.messages[0]["command_id"] == command_id
    assert websocket.messages[1]["type"] == "demonstration_intent"
    assert websocket.messages[1]["from_deg"] == 160.0
    assert websocket.messages[1]["to_deg"] == 50.0
    assert websocket.messages[1]["command_id"] == command_id
    assert websocket.messages[3]["status"] == "succeeded"
    assert websocket.messages[3]["command_id"] == command_id
    assert websocket.messages[4]["status"] == "idle"


def test_aborted_adapter_result_reports_error_state_without_crashing():
    station = CoachStation(arm=FakeArm(status="aborted"))
    websocket = FakeWebSocket()

    asyncio.run(station.handle_event(websocket, _form_event().model_dump_json()))

    assert websocket.messages[3]["status"] == "aborted"
    assert websocket.messages[3]["error"] == "test failure"
    assert websocket.messages[4]["status"] == "error"


def test_raised_adapter_exception_becomes_aborted_feedback():
    station = CoachStation(arm=RaisingArm())
    websocket = FakeWebSocket()

    asyncio.run(station.handle_event(websocket, _form_event().model_dump_json()))

    assert websocket.messages[3]["status"] == "aborted"
    assert websocket.messages[3]["error"] == "adapter exploded"
    assert websocket.messages[4]["status"] == "error"


def test_malformed_adapter_result_becomes_aborted_feedback():
    station = CoachStation(arm=MalformedArm())
    websocket = FakeWebSocket()

    asyncio.run(station.handle_event(websocket, _form_event().model_dump_json()))

    assert websocket.messages[3]["status"] == "aborted"
    assert "validation error" in websocket.messages[3]["error"]
    assert websocket.messages[4]["status"] == "error"


def test_mismatched_command_id_becomes_aborted_feedback():
    station = CoachStation(arm=MismatchedCommandArm())
    websocket = FakeWebSocket()

    asyncio.run(station.handle_event(websocket, _form_event().model_dump_json()))

    assert websocket.messages[3]["status"] == "aborted"
    assert "expected" in websocket.messages[3]["error"]
    assert websocket.messages[4]["status"] == "error"


def test_progress_capable_adapter_emits_versioned_trajectory_progress():
    station = CoachStation(arm=ProgressArm())
    websocket = FakeWebSocket()

    asyncio.run(station.handle_event(websocket, _form_event().model_dump_json()))

    progress = [message for message in websocket.messages if message["type"] == "trajectory_progress"]
    assert len(progress) == 2
    assert progress[0]["version"] == "1.0"
    assert progress[0]["joint"] == "elbow_flex"
    assert progress[0]["current_deg"] == 160.0
    assert progress[0]["progress_pct"] == 0.25
    assert progress[1]["progress_pct"] == 1.0
    assert progress[0]["command_id"] == progress[1]["command_id"]
