# Design evolution — from fitness coach to Niggleometer

Written 2026-11-02, grounded in the code as it exists today. Companion to
[NAMING.md](./NAMING.md) (the decision) and [POSITIONING.md](./POSITIONING.md)
(the user). This doc is about what the product _surface_ has to become.

## The fork, decided

**The reading is the session.** For the instrument doorway, the user does not
"do a workout and get a score" — they _take a reading_: a short, repeatable
protocol whose output is a measured joint state and a delta versus their own
history. Coached practice happens inside the ritual; the ritual is the
product.

This is less a rebuild than a re-centering, because the pieces already exist:

| Already shipped                                                                              | What it becomes under Niggleometer                                                                            |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `curls-baseline@1.0` — a fixed 5-rep protocol embedded in a session                          | The flagship _reading_ — already reading-length and instrument-shaped                                         |
| `PAIN_INTENTS` ("What brings you here?" chips → preselects a move, swaps subhead/recap copy) | The intake mechanism — re-aimed from fitness problems to joints                                               |
| Clear / Usable / Early confidence labels                                                     | The instrument's voice — needs promotion from caption to furniture                                            |
| Movement Card + self-trajectory + `/challenge` recipient route                               | The reading, the delta, the check-your-niggle challenge — already the product heart, just buried post-session |
| Brass gauge / `sandow-spine` tokens                                                          | The literal product metaphor — the -ometer face — promoted from decoration                                    |
| Train register (arcade), game loop, leaderboards                                             | The _second door_ — for the user who came to play, not to measure                                             |

## What the surface has to become

### A. The doorway — "name the niggle"

Today `CoachFoyer` opens on exercise chips (curls / push-ups primary;
squats / pull-ups / jumps extra). The instrument doorway opens on the
_complaint_, not the exercise:

- **Joint-first intake.** Chips named for where it nags — wrist, shoulder,
  elbow, knee, ankle, back, _"not sure, just check me"_ — each mapped to the
  protocol that reads it. `PAIN_INTENTS` already does intent → mode mapping
  and copy swapping; this is a re-aim of that plumbing, not new
  infrastructure.
- **CTA becomes "Take a reading,"** not "start a workout."
- **Instrument framing.** The foyer reads as setting up a meter: the brass
  gauge motif, "calibrating" language (already in the boot shell —
  "Calibrating the gauge" — keep and deepen).
- **Safety line in the doorway, not fine print.** "A meter, not a diagnosis.
  If it hurts, stop. For clinical concerns, see a professional." The
  `squat` pain intent already carries this copy shape — generalize it.
- **Fitness users:** the Train register remains as the earned second door
  (open question in POSITIONING — recommendation: keep it, don't lead
  with it).

### B. The reading session

- **The protocol is the movement.** The coached workout stays exactly as
  built — it _is_ the measurement surface. The frame around it changes:
  "5 controlled reps at your own pace" reads as a protocol, not a set.
- **Confidence as furniture.** Read quality becomes a persistent instrument
  state — a signal-strength affordance, not a caption at the end. The user
  should watch the meter light up as the capture gets cleaner.
- **Stop-for-pain is a designed exit**, not an error: explicit, gentle,
  returns to the foyer with the "see a professional" signpost. First-class,
  not a dismissed toast.
- **Inconclusive is an honest answer.** A failed read should feel like the
  meter telling the truth — "couldn't get a clean reading; here's why" —
  never a failure state.

### C. The reading + the ritual (the center of gravity)

- **Recap → "your reading."** The Movement Card stays the artifact; the
  framing is the instrument output: read, confidence, delta vs. your own
  baseline.
- **Readings becomes a primary tab.** `MovementAssessmentHistory` +
  `MovementTrajectory` currently live inside `SessionRecap` — they only
  exist _after_ a session. For this ICP, history is the product: promote a
  Readings surface to the tab bar (Workout / Stats / Roadmap / Ghost →
  Reading / Readings-history / Train…). This is the single most important
  navigation change.
- **"Check your niggle day."** A designed weekly cadence: a "due for a
  reading" state on the home surface + a gentle 7-day notification. No
  streak-shame mechanics — the MI guardrails already forbid them; the
  instrument just sits there being accurate.
- **The "niggle cleared" milestone.** The payoff card of the whole loop —
  "Right shoulder: cleared. 9 readings." Earned, verified, shareable.

### D. The catalog gap — the honest product constraint

MoveNet gives 17 keypoints. The joints it can _read reliably_ are the
sagittal workhorses — elbow, shoulder, hip, knee. **Wrist and ankle are the
worst-measured joints in the model** and they are exactly the niggles people
have. The catalog implication:

- Launch scope = joints the meter can honestly read — "we don't grade what
  we can't measure."
- Wrist/ankle niggles route to the closest honest screen _and say so_, or
  are explicitly out of scope for v1.
- New protocols needed: small, safe, seated-or-standing joint screens a hurt
  person can actually do — not fitness moves. This is the biggest
  product-build item the direction implies; M0's "flagship protocol"
  question becomes "which joint screens validate."

#### Where the pain actually is (epidemiology → catalog)

Troublesome musculoskeletal pain, ranked (US CDC 2019; GP surveys; MSK
care reports — consistent across sources):

| Complaint zone                                                  | Share of adults w/ pain (3-mo) | Honest camera screen                                                                         |
| --------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| **Low back**                                                    | ~39% — #1 everywhere           | Standing forward fold / hip-hinge — trunk ROM (sagittal, validated)                          |
| **Neck & shoulder** (incl. "trapezius tension", desk shoulders) | ~18–43%                        | Overhead reach / shoulder flexion ROM — the proxy read; tension itself can't be photographed |
| **Knee / lower limb**                                           | ~17–36%                        | Sit-to-stand / controlled knee bend — mostly built (squats processor)                        |
| **Elbow**                                                       | smaller                        | Curl protocol — shipped; stays as the arm-demo showcase                                      |

Wrist, ankle, hand: worst keypoints in the model — explicitly out of honest
scope for v1, routed or declined with a straight answer.

**Flagship recommendation:** lead the catalog with **back, neck/shoulder,
knee** — the top-3 complaint zones — each backed by an honest sagittal
screen. Curls demotes from "the flagship" to one screen of four and keeps
its arm-demo value. The doorway intake (joint → context) names these zones
in the user's own words ("my lower back", "my neck and shoulders", "my
knee") — matching the epidemiology, not the engine's existing exercise list.

### E. The copy/code rename (landed with this pass)

Per NAMING.md's migration checklist: `brandPositioning.ts` `FoyerCopy` sets
(draft copy already written there), `BRAND.name`, topbar string, package
name, `imf_*` keys decision, Farcaster manifest re-sign, Self Protocol app
identity, og assets.

## Sequencing

1. **A — doorway** (front-end only): joint intake, "Take a reading" CTA,
   safety line, copy pass. Ships the new front door without touching the
   engine. **✅ Shipped 2026-11-02** — `niggleIntents` joint→context intake
   (+ `BodyPlate` figure), useNiggle/usePainIntent resolution, foyer rewrite,
   copy pass, Readings tab promoted.
2. **B — session** (framing + furniture): protocol language, confidence
   states, pain exit, inconclusive-as-answer. **In progress** — ReadGauge +
   readQuality shipped and mounted in GameHUD (optional props); live signal
   plumbing, pain-exit surface, and inconclusive treatment remain.
3. **C — ritual** (surfaces): readings tab ✅ (shipped with A), weekly check
   cadence, niggle-cleared card.
4. **D — catalog** (the real build): joint-screen protocols, validated like
   curls-baseline was — one at a time, publish the protocol.
5. **E — rename** lands inside A–C as copy surfaces are touched. Brand copy
   done in `brandPositioning.ts` + `layout.tsx`; package name, `imf_*` keys,
   Farcaster manifest re-sign, Self app identity still open.

## Decisions (2026-11-02)

1. **Intake shape: joint then context.** Pick where it nags, then what it
   does ("aches on stairs", "tension after desk work") — the joint maps to
   the protocol, the context personalizes copy and feeds the niggle profile.
2. **Readings/history becomes a primary tab now.** History is the product;
   do not wait for more protocols.
3. **Train register stays as the earned second door.** Instrument is the
   front; the game layer stays but recedes.
4. **Flagship = the top-3 complaint zones** (back, neck/shoulder, knee —
   see the epidemiology table), not curls alone.

## Still open

- **Which of the three flagship screens ships first.** Knee bend is closest
  to built (squats processor); overhead reach is the cleanest honest read
  and covers both example users (post-handstand shoulder, trapezius
  tension); the hip hinge serves the largest complaint zone but needs the
  most careful protocol design (a fold is easy to do badly).
- **The intake joint list** — keep it to the readable zones + "not sure,
  just check me", or include out-of-scope joints with honest routing?
