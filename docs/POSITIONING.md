# Positioning — market map, wedge, pitch, virality

Written 2026-11-01 after a competitive scan. Working document; update when the
market or the product moves.

**Revised 2026-11-02** — ICP shifted from solo home exerciser to the
pain-adjacent user; product renamed **Niggleometer** (see
[NAMING.md](./NAMING.md)). The market scan stands: the dishonesty complaint,
the shareable-artifact mechanic, and the measurement gaps all cut _harder_
for a user in pain than for one chasing performance.

## The market

Camera form-checking is a real, crowded, and _open_ category — not a settled
one. Five distinct lanes:

| Lane                         | Players                                                                                                                                     | Pattern                                | Signal                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Recorded-video form checkers | Gymscore (2,500+ exercises), FormLens, LiftSight, Formax, formcheck ai                                                                      | film a set → 0–100 score → feedback    | Crowded with "film → score" clones; FormLens already claims "video stays on phone" — **on-device privacy alone is no longer a differentiator** |
| Performance / VBT            | Metric Lift, BarSpeed (LiDAR), Lifts, FormForge                                                                                             | bar speed, load-velocity, e1RM         | Serious-lifter niche; autoregulation, not form                                                                                                 |
| Niche-sport AI coaches       | SwingVision (~500k users, ~25k paying @ $180/yr, $6M Series A), HomeCourt (stale since 2022), PitchLab, Boxer AI, Wrestle AI, 3AK Sprinting | own one sport deeply; ritual + sharing | Proven model; 19 of 33 niche apps launched in 18 months and hold 83% of review velocity                                                        |
| Physical AI                  | GROWL ($4.75M, life-size projected coach, touch + 3D tracking), SEGYM, JouleFit, amp                                                        | embodied / resistance robotics         | Validated as a talked-about category; all hardware-heavy. **Nobody ships a small arm that demonstrates the correction**                        |
| Hardware graveyard           | Tonal (collapsed), Mirror (dead), Tempo (downsized), Peloton Guide (flat)                                                                   | expensive form-check hardware          | Market killed the $3–4k answer; camera-first is right                                                                                          |

The pain-adjacent user sits _across_ these lanes and buys none of them: the
recorded-video checkers assume a lifter, the VBT tools assume a barbell, the
niche apps assume a sport, and the hardware lane assumes a gym budget. The
person with a nagging wrist has no home in this market — they have Google
and a chatbot.

## What the market is telling us

1. **Its core complaint is dishonesty.** Across the niche leaders: "the AI
   analysis the listing promises does not run." Rep-counter reviews: ~25%
   detection-unreliable, ~25% bugs, ~39% paywall resentment. Users are trained
   to expect overclaim.
2. **Single-camera pose is scientifically uneven — exactly where our product
   promises.** Sagittal-plane measures (depth, lean, elbow drift, tempo,
   left/right balance) validate at r=0.68–0.94. Frontal-plane **knee valgus**
   — the most-requested flag, which we currently flag on squats — measures
   poorly (r=0.20–0.78 depending on study). Every competitor gets punished in
   reviews on exactly this. See "science posture" below.
3. **The winning growth mechanic is the shareable artifact,** not the app.
   SwingVision grew 70% organically through auto-edited highlight reels.
4. **The underserved demand is already articulated — in searches and chatbot
   prompts.** People google "niggling wrist pain" and ask ChatGPT what to do
   about a shoulder that aches. They get generic text and no measurement.
   The gap is not advice — it is _depth of feedback_: something that reads
   the actual joint and tracks whether it is actually changing. That is
   exactly what an instrument does and a text box cannot.

## Differentiation lanes (ranked)

1. **The form journal / fault ledger** — progress organized around _named
   faults_ (discovered → worked → retested → cleared), not reps and scores.
   Nobody owns it. `FORM_CHECK_THRESHOLDS` already produces faults; the
   retest protocol already produces the ritual.
2. **Depth-over-breadth (counter-position)** — Gymscore: 2,500 exercises. Us:
   a written protocol for one, expanding deliberately. "We don't grade 2,500
   lifts badly — we watch one rep deeply and show the numbers."
3. **Physical demonstrator** — the SO-101 arm showing the correction. Nobody
   else at consumer scale. Story + moat, not the front-door promise (most
   users never have a connected bay).
4. **Honest substantiation** — inspectable gates, confidence labels
   (Clear/Usable/Early read), named limits. Necessary table stakes given
   finding #1; insufficient alone as a reason to try.

## The wedge — and how to think about it

The **promise** and the **retention mechanism** are different things and
should not be conflated:

- **Promise (what we sell):** "Your niggle, measured." Someone finally reads
  the nagging joint — live, private, on your device — and shows you whether
  it is actually changing. The customer is the person whose wrist / knee /
  trapezius nags: a problem, not a doctor. Or mid-rehabilitation, discharged
  or never referred, needing nudges and milestones to finish the journey
  well. This promise does not depend on the trajectory model at all.
- **Retention mechanism (what keeps them):** the weekly **check-your-niggle**
  retest ritual + the self-versus-self trajectory + the reading that keeps a
  score that matters. Painkillers retain because the pain is still there
  tomorrow — the meter is what makes tomorrow's check meaningful.

You do not need to sell the trajectory. You need the trajectory so that week
two has a reason to exist.

## Sales pitch

**ICP:** the pain-adjacent user. Their wrist / knee / trapezius nags — a
problem, not a doctor — or they are on a rehabilitation journey and need
nudges, milestones, and proof of progress to keep going. They already search
and ask chatbots about it; they get words, not readings. The honest product
for them is adherence + visibility: _see that it is working, keep doing it._

**One-liner:** _An honest meter for a nagging body — the camera reads how
you move, on your device, and week over week you see whether it is actually
mending._

**Three-beat pitch:**

1. **Problem:** "It nags — not enough for a doctor, too much to ignore. A
   chatbot can talk about it; nothing can measure it."
2. **Mechanism:** "The camera reads the joint on your device — no upload,
   no account. Every read is labelled Clear / Usable / Early."
3. **Payoff:** "Check your niggle next week — see the delta. When the coach
   bay is connected, an arm physically shows the fix."

**Objection handling (all true):**

- _"Isn't that what ChatGPT does?"_ → "It talks about your niggle. A
  niggleometer reads it. Words are free; a measurement is the difference."
- _"Is it medical?"_ → "It's a meter, not a diagnosis — a thermometer
  doesn't treat a fever. For clinical concerns we say 'see a professional,'
  in-product."
- _"Apps like this overpromise."_ → "Every check is a named gate with real
  numbers. Every read is labelled Clear / Usable / Early. Here's exactly
  what it can't do."
- _"Is it accurate?"_ → "It's a screening instrument, not a clinical test.
  We're honest about the single-camera limits instead of hiding them."
- _"Why not just film myself?"_ → "You can't grade what you can't see. This
  reads it for you, live."

**What we never say:** accuracy percentages, injury prevention, treatment,
healing, pain relief, rehabilitation as a claim, diagnosis, clinical
language, "AI-powered" as the hook, "revolutionary." A meter promises a
reading — nothing more.

## Viral marketing offering

The shareable artifact must be honest, privacy-safe, and inherently show the
product working:

1. **The before/after reading** — the primary viral unit. Two readings
   overlaid (first vs. latest) with the named delta: "Range: 68° → 82°,
   six weeks." No video, no face, nothing uploaded — a static card or short
   loop generated locally. This is what proof-of-progress looks like, and
   nobody else can make it. Rides the existing Frames plumbing
   (`src/app/api/frames/workout/share`).
2. **The "niggle cleared" card** — "Right shoulder: cleared. 9 readings."
   A milestone worth posting because it is personal, earned, and verified
   by the instrument.
3. **The check-your-niggle challenge** — "Take the same test" shipped;
   brand phrasing is _check your niggle_. One reading becomes another —
   async peer measurement answers "nobody else can see my niggle" socially.
   It is the network effect.
4. **The arm demo clip** — spectacle shareable for the curious (and for
   grants/press): "the coach that shows the fix." Word-of-mouth layer, not
   product promise.
5. **The weekly check** — a reason to come back that isn't a notification
   nag: "check your niggle day." Consistent conditions, named gates, named
   delta vs. last week. The meter is the ritual.

## Science posture (public honesty as positioning)

Single-camera limits are an asset if we say them first:

- Lead with what 2D pose is good at: depth, lean, elbow drift, tempo,
  left/right balance.
- Hedge knee valgus explicitly — it is the most-requested flag and the least
  measurable with one camera. Being honest here is _more_ credible, not less.
- Confidence labels (Clear/Usable/Early) are the product's voice; never
  present an early read as a verdict.

## Open questions

- Does "check your niggle" or "measure your niggle" convert better as the
  lead verb? Untested — the first-visit protocol
  (`FIRST_VISIT_AND_MANUAL_STAGE.md`) exists to answer this.
- Does the fitness-without-pain user get a second door (the Train register,
  ghosts) or stay out of scope? The name chose the pain ICP; the game layer
  may quietly serve the other user anyway.
- Is the challenge loop a "check my niggle" network (supportive) or a
  competition (leaderboard)? For a pain-ICP the supportive read is almost
  certainly right — leaderboards belong to the earned game layer, not the
  instrument.
- Does "niggle" land for American users, or does the product teach the word?
- Pricing shape is undecided — the category is hostile to subscription
  surprises; whatever we charge for, say it plainly. An adherence product's
  natural shape is probably not a rep-counter subscription.
