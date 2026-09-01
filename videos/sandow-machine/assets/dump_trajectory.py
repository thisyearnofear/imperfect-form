"""Dump the real coach-station curl correction trajectory to JSON.

Used by the Cræft Prize video: the animated arm beat is driven by these
actual waypoints (elbow_flex 160° → 50° at capped persona speed), so the
motion shown on screen is the genuine simulated correction.
"""

import json
import sys

from coach_station.demo import DEMOS
from coach_station.primitives import resolve_demonstration
from coach_station.trajectory import iter_trajectory

event = DEMOS[sys.argv[1] if len(sys.argv) > 1 else "curl"]
demo = resolve_demonstration(event)
if demo is None:
    raise SystemExit(f"no demonstration for event: {event}")

t = 0.0
waypoints = []
for deg, sleep_s in iter_trajectory(demo):
    t += sleep_s
    waypoints.append({"t": round(t, 3), "deg": round(deg, 2)})

out = {
    "event": {"issue": event.issue, "mode": event.mode, "personality": str(event.personality)},
    "demo": {"name": demo.name, "joint": demo.joint, "from_deg": demo.from_deg, "to_deg": demo.to_deg, "narration": demo.narration},
    "duration_s": round(t, 3),
    "waypoints": waypoints,
}
path = "/Users/udingethe/Dev/imperfect-form/videos/sandow-machine/assets/trajectory-curl.json"
with open(path, "w") as f:
    json.dump(out, f, indent=1)
print(f"{demo.name}: {demo.from_deg}° → {demo.to_deg}°, {len(waypoints)} waypoints, {t:.1f}s → {path}")
print("narration:", demo.narration)
