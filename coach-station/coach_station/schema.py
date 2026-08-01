"""Versioned contracts between the web app and the coach station.

The browser still sends ``FormEvent`` messages. The station normalizes those
into a versioned intent before handing them to an arm adapter, then returns a
versioned command result and robot state update. This mirrors OpenPAVE's
intent/control/feedback boundary without introducing ROS2 into Ring 0.

Keep the TypeScript mirrors in ``src/services/coachStation.ts`` in sync.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field

CoachPersonality = Literal["SNEL", "STEDDIE", "RASTA"]
ProtocolVersion = Literal["1.0"]


class FormEvent(BaseModel):
    type: Literal["form_event"] = "form_event"
    mode: str  # pushups | squats | pullups | jumps | curls
    issue: str  # e.g. elbow_swing, trunk_lean, depth, asymmetry, partial_bottom_rom
    severity: Literal["info", "warning", "critical"]
    current: Optional[float] = None  # current joint angle / metric value
    target: Optional[float] = None  # target value the user should reach
    cue: str  # human-readable coaching cue
    personality: CoachPersonality = "RASTA"
    rep_count: int = 0
    timestamp_ms: int


class SessionEvent(BaseModel):
    type: Literal["session_start", "session_end"]
    mode: str
    personality: CoachPersonality = "RASTA"
    timestamp_ms: int


class DemonstrationIntentV1(BaseModel):
    """Normalized, executable intent handed to an arm adapter."""

    type: Literal["demonstration_intent"] = "demonstration_intent"
    version: ProtocolVersion = "1.0"
    command_id: str
    name: str
    mode: str
    issue: str
    personality: CoachPersonality
    # Keep the executable surface deliberately narrow until additional
    # physically validated joints are added to the primitives and safety model.
    joint: Literal["elbow_flex"]
    from_deg: float = Field(ge=0.0, le=180.0)
    to_deg: float = Field(ge=0.0, le=180.0)
    speed_deg_s: float = Field(gt=0.0, le=120.0)
    pause_s: float = Field(ge=0.0, le=10.0)
    repeats: int = Field(ge=1, le=8)
    narration: str
    duration_s: float = Field(ge=0.0, le=120.0)


class CommandResultV1(BaseModel):
    """Result of an adapter accepting and executing a normalized intent."""

    type: Literal["command_result"] = "command_result"
    version: ProtocolVersion = "1.0"
    command_id: str
    status: Literal["succeeded", "aborted", "rejected"]
    adapter: str
    affect: str
    duration_s: float = 0.0
    error: Optional[str] = None
    completed_at_ms: int


class TrajectoryProgressV1(BaseModel):
    """Throttled progress snapshot for the twin UI and future telemetry."""

    type: Literal["trajectory_progress"] = "trajectory_progress"
    version: ProtocolVersion = "1.0"
    command_id: str
    joint: Literal["elbow_flex"]
    current_deg: float = Field(ge=0.0, le=180.0)
    progress_pct: float = Field(ge=0.0, le=1.0)
    timestamp_ms: int


class RobotStateV1(BaseModel):
    """Small, transport-safe state snapshot for UI and future observability."""

    type: Literal["robot_state"] = "robot_state"
    version: ProtocolVersion = "1.0"
    status: Literal["executing", "idle", "error"]
    adapter: str
    affect: str
    command_id: Optional[str] = None
    detail: Optional[str] = None
    updated_at_ms: int
