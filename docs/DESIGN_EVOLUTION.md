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
   readQuality shipped and wired live in the session chrome; the designed
   `PainExit` surface ("It hurts — stop" → right-call copy + joint mark into
   the logbook) and the recap's inconclusive lead branch (`inconclusiveReads`
   shared copy, cause + fix per reason) shipped next. **Reading mode** now
   exists as a session shape (2026-11-03): when a niggle joint is selected
   on a protocol movement the CTA is "Take a N-rep reading", the HUD counts
   protocol pips, and the session stops itself exactly on `targetReps` — the
   one-rep trial can never produce a reading, and a 120s set can never
   overshoot one. A reach reading that stalls (20s framed, no rep) lands on
   the `PainExit` 'stalled' variant — the no-read is logged as logbook
   context. Remaining: protocol-language copy pass (§B2) and the optional
   shader finish (§B5).
3. **C — ritual** (surfaces): readings tab ✅ (shipped with A). Weekly check
   cadence **shipped 2026-11-03** in the privacy-preserving form: recap shows
   "Next reading: {date}" with an on-device `.ics` (no server, no bot
   channel), and the Readings tab counts down per protocol ("Next neck &
   shoulders reading in 4 days"). This resolves part of §F's open "shape
   TBD" question in favour of the pure-local channel for the nudge itself.
   Also shipped: shared niggle links (`?niggle=<joint>:<context>` +
   `&from=<name>`) pre-fill the intake and carry a sender greeting — the
   send-a-friend doorway for the pain-ICP, now with the **receiving
   experience** (docs/RECEIVING_EXPERIENCE.md): link arrivals get the "Fig 1"
   living plate instead of the intake wall — envelope, animated reach
   plate, five scroll beats (question → company → read → ritual →
   honesty), CTA iris into the camera. Per-protocol readings history
   (reach reads now surface, previously curls-only); a plain-language
   `readingSentence` lead on a valid recap; an "Ease it · under 2 min"
   reach routine (post-read stretches + a subjective 1–5 feel log).
   Remaining: niggle-cleared card, nudge-as-bot decision still open.
4. **D — catalog** (the real build): joint-screen protocols, validated like
   curls-baseline was — one at a time, publish the protocol. **In progress** —
   `reach` (overhead reach, the neck/shoulder screen) shipped: arm-elevation
   `reachProcessor` with trunk-sway cheat detection, `reach-baseline`
   protocol on the shared assessment rails, intake re-pointed. Hip hinge
   (back) and knee bend remain.
5. **E — rename** lands inside A–C as copy surfaces are touched. Brand copy
   done in `brandPositioning.ts` + `layout.tsx`; package name, `imf_*` keys,
   Farcaster manifest re-sign, Self app identity still open.

## F — The two-surface model: logbook + laboratory

Niggles happen in life, not in the app. The product splits accordingly:

- **Phone = the logbook** — quick ambient capture the moment a niggle
  happens ("right knee, 4/10, on stairs"), the weekly check-your-niggle
  nudge channel, challenge links, replies to the meter. Shape TBD: a bot
  channel (Telegram-style) trades the nothing-leaves-device purity for
  presence — opt-in, subjective entries only, no camera data — while a PWA
  quick-journal keeps the promise intact. Decide knowingly, per channel.
- **Desktop/web = the laboratory** — the reading itself, trajectory,
  Movement Cards, coached practice, the arm demo, next-unlock guidance.

**The honest pairing** — the log is _subjective_ ("how it felt"), the
reading is _objective_ ("what the meter saw"), always labelled as which is
which. Three states nobody else can produce: feels-better + meter-agrees
(confidence); feels-the-same + numbers-moved (the insight that retains);
numbers-same + hurts-more (the honest "see a professional" flag — a real
safety feature). A log entry is **context, never a measurement** — if the
UI blurs them, the honesty moat leaks.

**Data:** `MovementProfile` gains `NiggleEntry {joint, context, severity?,
note?, timestamp}` — local-first, same semantics as assessments; the intake
(joint → context) is already the entry schema.

### Long-term vision (keep on record)

Register niggles in **novel ways** and get corrections — including
**wearables and while-you-work capture** (desk-worker niggles logged
passively during the day; posture cues at the desk, not only in front of a
camera). The phone logbook is step one of ambient capture; wearables are
step two. Every ambient signal stays _context_, not measurement — the
camera reading remains the honest instrument record.

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

## Product positioning (2026-11)

The ICP, stated plainly: **an adult with a persistent mild niggle who wants
to know whether it is settling** — not injured enough for a doctor, not
well enough to forget it. The second, differentiated role is the
**sender-carer**: the partner/friend/child-of-aging-parent who sends the
meter because they are the one who worries. A real ICP sits adjacent:
post-physio patients who leave with a sheet of exercises and no way to know
whether doing them is working — the adherence gap the clinic cannot see.

**Painkiller vs vitamin.** The actual pains are (a) _uncertainty_ — is it
getting better, or am I just used to it; (b) _loneliness_ — a mild niggle
is too small to talk about, so nobody does; (c) _drift_ — doing nothing
because nothing feels urgent. A single read is vitamin-ish: nice to have,
easy to skip. What converts it to a painkiller is retention — the second
and third read, the week pairing, the answer to "is it settling." The
product earns painkiller status only across reads, never in one session.

**The four-moment medical handoff model.** Wellness, not medicine — held
honestly at four designed points:

1. **Intake screen-out.** When a joint is actively named, one hairline
   line routes injury/numbness/swelling to a physio or doctor first —
   a signpost, never a gate; nothing stored.
2. **During the read.** Stop-for-pain is a designed exit (`PainExit`),
   not an error — the no-read lands as logbook context.
3. **Verdict tri-state.** Valid / inconclusive / see-a-professional. The
   third is a real outcome — the week pairing's "still hurts" headline —
   never a hidden failure.
4. **The handoff artifact.** "Take this to a physio" — a plain-text week
   summary (reads + dates, feel log, ease sessions) copied off-device,
   honest about what the meter is.

**Positioning: lead with the sender-carer.** The worried-about-someone
door (the sendable meter, the gift note) is the front of the story — the
self-serve niggle holder is who stays, but the carer is who arrives.
