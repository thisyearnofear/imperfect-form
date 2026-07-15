"""FormEvent schema - the contract between the web app and the coach station.

Mirrors the TypeScript side in src/services/coachStation.ts. Keep in sync.
"""

from typing import Literal, Optional

from pydantic import BaseModel

CoachPersonality = Literal["SNEL", "STEDDIE", "RASTA"]


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
