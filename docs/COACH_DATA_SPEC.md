# Coach station data spec

A coach-station trajectory becomes training data only if it passes every gate
below. The thresholds live in `coach-station/coach_station/gates.py` (`SPEC`);
`coach-station/tests/test_gates.py` fails if this page and the code disagree. A
rejected episode keeps the first failing gate's reason, and that is the only
reason shown.

Write an episode with:

```bash
cd coach-station
python -m coach_station.dataset --json              # gates only, writes nothing
python -m coach_station.dataset --out data/coach-station
```

## Format

| field      | value                                              |
| ---------- | -------------------------------------------------- |
| schema     | LeRobot v3.0, written with `LeRobotDataset.create` |
| robot_type | `so101_follower`                                   |
| fps        | 30                                                 |
| features   | `observation.state`, `action` — 6 values each      |
| gripper    | 0 to 100 percent of travel                         |
| camera     | none; this dataset is joint-state only             |

Joint order, matching the SO-101 schema keys in `arm.py`:

| index | joint           |
| ----- | --------------- |
| 0     | `shoulder_pan`  |
| 1     | `shoulder_lift` |
| 2     | `elbow_flex`    |
| 3     | `wrist_flex`    |
| 4     | `wrist_roll`    |
| 5     | `gripper`       |

`observation.state` holds the encoder-reported position where the arm reported
one; `action` always holds the commanded position. A policy therefore learns to
track the command rather than imitate a plan the arm never reached. Offline
flattening has no encoder feed, so those episodes are marked
`has_measured_encoders: false` in `coach_episodes.json` and both fields hold the
commanded value — that is stated rather than hidden.

**Gripper units.** Choreography poses command the gripper as 0-100 percent of
travel (45.0 means gripping). An earlier module docstring claimed 0-1, which
contradicted every pose in the file; the docstring was wrong and has been
corrected. Values are clamped to 0-100 on write.

## Gates

| id                | gate                             | pass if                                                         |
| ----------------- | -------------------------------- | --------------------------------------------------------------- |
| `frames`          | frame count                      | at least 2 frames, so the trajectory has a direction            |
| `duration`        | episode length                   | 0.5 s to 60.0 s                                                 |
| `authored_fps`    | command rate                     | 5 to 120 fps as authored                                        |
| `elbow_workspace` | elbow inside the safety envelope | every commanded elbow angle within the interlock's min/max      |
| `elbow_rate`      | elbow traverse rate              | no command interval exceeds the interlock's speed or step limit |
| `elbow_step`      | elbow step per command           | no single command moves the elbow more than `max_step_deg`      |
| `finite_joints`   | finite angles                    | no NaN or infinite commanded value                              |
| `monotonic_time`  | advancing timestamps             | every timestamp strictly increases                              |

Gates are three-state. A gate with no measurement reports `NO DATA` and never
counts as a pass — a missing measurement must not be mistaken for a good one.
Verdict: all pass → accept; any `NO DATA` → insufficient data; otherwise
reject with the first failure's reason.

## Why these numbers

These are **not** RoboHub's thresholds. RoboHub gates a simulated SO-101 doing
pick-and-place and derives its limits from the STS3215 no-load speed (about
4.7 rad/s at 7.4 V) plus measured retargeted-human velocity, acceleration and
jerk. Those rad/s figures belong to that arm, that scene and that motion; reusing
them here would import numbers never measured on this hardware.

So every limit above is derived from something already measured here:

- **Workspace and step limits** come from `safety.SafetyLimits`, which is the
  interlock the live arm is actually clamped by. In simulation the elbow
  envelope is 0-180 degrees with a 120 deg/s speed limit and an 8 degree
  per-command step limit; live it is 20-160 degrees, 45 deg/s and 3 degrees.
- **The rate bound is the stricter of two derived ceilings**:
  `min(max_speed_deg_s, max_step_deg / STEP_DT_S)`. For simulation that is
  `min(120, 8/0.04)` = **120.0 deg/s**. The gate checks that the _plan_ stays
  inside the envelope the interlock enforces — a consistency check between plan
  and interlock, not a claim about what the servo can physically do.
- **Frame rate and episode length** come from the choreography command rate
  (`TICK_HZ`, 50 by default, clamped to 1-50) rather than an arbitrary number.

### Fixed: choreographies used to exceed the speed ceiling

`bicep_curl` previously drove the elbow at **285.7 deg/s** at t=4.52s — 2.4x the
120 deg/s simulation limit. `demo_curl` peaked at 172.2 deg/s. Both were rejected
by the `elbow_rate` gate and neither was trainable data.

Root cause: `trajectory.py` applies `capped_speed_deg_s` to single-joint
demonstrations, but `execute_choreography` never applied any equivalent.
Multi-joint keyframes interpolated by duration alone, so a keyframe could plan a
sweep the single-joint path would have refused, and `arm.py` only re-clamps the
workspace at the wire — not the rate.

The fix is in the executor, not in the keyframe durations, because a duration
tweak would leave the next choreography free to exceed the ceiling again.
`cap_segment_duration` (`coach_station/choreography.py`) stretches any segment
whose easing curve would peak above the limit:

```
required = travel_deg * peak_slope(easing) / rate_ceiling
rate_ceiling = min(max_speed_deg_s, max_step_deg / STEP_DT_S)
```

It only ever lengthens a segment, never shortens one, and it never changes a
keyframe's destination pose — only how long the arm takes to get there.

### The peak-slope table is measured, not assumed

`EASING_PEAK_SLOPE` records the peak `dt` derivative of each curve relative to
its mean rate. These curves are **cubic**, despite names like `ease_in_out`
that suggest a C1 smoothstep, so several peak at **3.0x** the mean rather than
1.5x. Assuming 1.5x under-estimated the peak by 2x and left both curls ~50%
over the ceiling even after the cap landed.

`tests/test_safety_capping.py::test_easing_peak_slopes_match_the_curves`
differentiates every curve and fails if the table drifts, and
`test_easing_peak_slopes_match_the_curves` fails on an under-estimate (which
would drive the arm too fast) as well as a large over-estimate (which would
needlessly slow every motion).

Both curls now pass at **119.81 deg/s** against the 120 deg/s ceiling, with a
per-command step of 2.396 deg against an 8 degree budget. Note this makes the
motions genuinely slower than authored: `bicep_curl` runs 26.8s rather than
12.2s. That is the honest cost of the ceiling, not a bug — the authored
durations assumed a peak rate the arm is not allowed to be driven at.

Under the **live** envelope (45 deg/s, 3 deg per command, 20-160 deg) both curls
are still rejected: `bicep_curl` runs 66.4s, past the 60s `duration` limit, and
both drive the elbow to ~0.4 deg, below the 20 deg live minimum. Live motion
remains paused per README, and that is the correct outcome.

## What is still missing

This dataset is a starting point, not a trained model:

- **No camera frames.** There is no `observation.images.*` feature, so this
  cannot train a vision-language-action policy directly. Recording the front
  camera alongside each episode is the next required step.
- **No encoder ground truth offline.** Every episode written today is
  plan-only. `arm.py` already threads `measured_deg` through as the only
  ground-truth signal in the system; wiring that into this writer is what would
  make `observation.state` an observation rather than a copy of the action.
- **Single arm, single scene, two motions.** Both shipped choreographies are
  curls. Nothing here demonstrates that a policy trained on this would
  generalise.
- **No negative results recorded yet.** RoboHub's most useful document is the
  one ranking its eval failures by cause. Once a policy trains on this, failures
  should be classified the same way rather than retuned away.

## Provenance

Every accepted episode is recorded in `coach_episodes.json` alongside the
dataset: which choreography produced it, its frame count and duration, whether
encoders were read, whether it is the original plan or a retargeted copy, the
affect it was gated under, and the exact safety envelope string. A dataset that
cannot be audited later should not be written.
