# Design, UI and storytelling — state of play

Last reviewed 2026-10-04, after the RoboHub-discipline and design-truth passes.

This is a working document, not a design spec. It records what was fixed, what
was deliberately left alone, and what is still open — so the next pass starts
from evidence rather than from memory.

## The honesty constraint

Everything below is governed by one rule: **no user-facing string may claim a
capability the code does not have.**

This is not new. `docs/MOVEMENT_INTELLIGENCE.md` already says "Trajectory
estimates are scenarios, not promises", and the copy already labels confidence
as `Clear read` / `Usable read` / `Early read`. The failure mode was narrower
and easier to miss: a few strings _did_ overclaim while everything else was
careful.

The test applied to any new claim: if you deleted the subsystem that made it
true, would the sentence still be defensible? If not, it does not ship.

`src/lib/brandClaims.test.ts` enforces two invariants mechanically:

- No brand string claims a training loop that does not exist.
- Every internal link in the exhibit, recap and sitemap resolves to a real page.

Both were verified to fail when the defect is reintroduced.

## Fixed

### Trust

| Was                                                                        | Now                                                                    |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `/build` 404'd from three places (deleted in the working tree)             | Restored from HEAD                                                     |
| "the arm learns from real coaching sessions" / "the loop is closed"        | Marked as the next stage; Milestone 3 is unchecked                     |
| "joint angles mapped to Sandow's 1897 proportional ideals"                 | Describes the software safety interlock, which is real and inspectable |
| "the cabinet is fabricated in a British workshop"                          | Stated as a finalist-phase plan; the grant is unawarded                |
| "real-time teleoperation" as the hero capability                           | Describes the actual intent protocol                                   |
| `BRAND.flywheelLine` claimed each set was "a coaching episode for the arm" | "stored on your device as a movement read"                             |
| `/lore` hardcoded `armLinked`, asserting a live arm                        | Defaults to the honest `playbook · arm offline`                        |

### Coaching surface

- **Mobile had no form-warning surface at all.** The warning lived only in the
  desktop branch of `GameHUD`, so a phone user mid-set got no form-error signal.
  Now a shared strip in both registers.
- **The depth meter unmounted at `depth > 0`**, disappearing exactly when a user
  holds still between reps. Now stays mounted.
- **The three personas never reached the coaching line.** `LiveCoachingStatus`
  was a state machine of ~20 hardcoded strings ignoring persona entirely, so the
  user always heard a machine. `src/lib/personaDelivery.ts` now wraps the shared
  instruction — the fix named stays identical across personas, only the delivery
  changes. Arcade is deliberately excluded: it already has a loud register.
- **The form grade was the sixth thing competing for the same glance**, below a
  dial, range track, robot readout and angle readout. It now leads the rail.
- The rep counter no longer accumulates size across a set (studio register).

### Story

- **The recap rendered ~12 panels at once**, burying the one sentence a set
  produces. All instrumentation now sits behind one "Session detail and
  history" disclosure; the story and retry action stay above the fold.
- **The share card said "Onchain Olympians" in Press Start 2P** — a second
  product's branding, in the register NORTH_STAR explicitly rejects. Now the
  studio register, leading with one useful movement signal. The success frame
  carries the same framing. The _leaderboard's_ title is left alone: that is
  earned game chrome, not a share surface.
- **The gated analytics read as withheld features.** "Build the comparison
  first" described the engineering state, not the user's next action. Now: "This
  compares you to you. We are still collecting enough people to show how your
  range stacks up against others." Saying the gate is more persuasive to a judge
  than hiding it.

### Landing page correctness

Found by measuring the built page rather than reading the code. On a 390x664
viewport the day-0 foyer was **unusable**:

- **The primary CTA was unreachable.** `mobile-wallet-browser.css` applies
  `max-height: 45vh !important` to `#screen` in portrait — written for a live
  session, where camera, controls and leaderboard compete for height. It also
  applied to the pre-session foyer, clipping "Try one rep" to y=698 in a 664px
  viewport. Worse, `body, html { height: 100% }` pinned the page to exactly one
  viewport, so it could not scroll to reach it. **A phone visitor could not
  start a set at all.**
- **The robot photo painted over the content.** `.studio-atmosphere` is a
  `position: fixed; z-index: 0` sibling of the content and the foyer column is
  centred on top of it. On a phone the stage landed at y=334 — exactly where the
  exercise picker sits — covering it outright. On desktop it washed across the
  lede and trust line.
- **The coach-status pill overlapped the provenance line.** A `-0.65rem` top
  margin tightened the desktop stack but rode the pill up over the text at every
  width (pill 346 vs provenance 336–357 on desktop; 270 vs 240–281 on mobile).
- **A stray orientation-lock button** rendered over the lede before a session
  existed — a session control with no session to control.

Fixed by scoping each rule to what it was written for: the 45vh cap now applies
only when a live session is present, `body` uses `min-height`, the stage became a
dimmed backdrop behind a scrim rather than a layer over the copy, the pill
returns to normal vertical rhythm, and the top-controls cluster is gated on
`started`.

Verified by measurement at 1440x900, 1280x800, 768x1024 and 390x664: no
overlap, and the CTA is either above the fold or reachable by scroll.

`e2e/landing.spec.ts` guards all four. Writing them was humbling: the first
three versions **passed against the broken page**. `scrollIntoViewIfNeeded` is
a no-op for a clipped element (Playwright counts a non-empty box as visible),
an explicit `scrollIntoView` then masked the real failure because it succeeds
whenever the page is scrollable at all, and reverting each fix separately
did nothing because the two CSS fixes mask each other. The guard only bites
when it measures _without scrolling first_ on a phone viewport — which now
reports `CTA at 726-774 in a 664px viewport, and the page cannot scroll`
when the bug is reintroduced.

### The bay now reacts to the athlete

The flatness was diagnosable, not a matter of taste: **the product's personality
was all ambient and none of it causal.** `useCoachBayPulse` already bridged
coach-station cues onto `body[data-coach-pulse]`, so the arm glowed when the
_coach_ spoke — but nothing responded to the _athlete_. Your rep did not change
the room. Your form grade did not change anything. The coaching was text in a
box.

`useCoachAtmosphereBridge` adds the missing link, writing three body attributes
the atmosphere already knows how to read:

| attribute            | drives                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `data-coach-rep`     | the arm acknowledges each completed rep (glow + plinth)                                   |
| `data-coach-quality` | `good` warms the bay; `poor` cools it and drops the ghost arm further behind the real one |
| `data-coach-depth`   | the arc reads as live rather than decorative                                              |

Bands match the coaching engine's own grade table (80 good, 60 keep-adjusting),
and an **unknown score yields no attribute at all** rather than defaulting to
`good` — a bay that congratulated an athlete who was never measured is exactly
the dishonesty this repo has been removing elsewhere.

Verified in a real browser: `good` shifts the photo filter, `poor` takes the
ghost from 0.22 to 0.11 opacity with a desaturating filter, `data-coach-rep`
fires `arm-acknowledge`, `data-coach-depth` lifts the arc to 0.9.

The scrim added for legibility is what made restoring the atmosphere possible —
the stage keeps its full presence instead of being dimmed to 28%, because energy
and legibility were never actually in conflict. Only the copy being centred over
the art made them look like it.

### Craft

- `#fcb131` and `#56d9c3` were declared nine times across six stylesheets under
  per-file names. Each now aliases the canonical token.
- `session-register.css` shipped **a different green than its own shell** —
  `#5eead4` against `--studio-teal`'s `#56d9c3`. It is lazily chunked, so the
  divergence was invisible in review.
- HUD labels were 10.4px and 9.6px — below the legibility floor for tracked
  uppercase read at arm's length on a phone. Raised to 12px and 11.2px.
- `/debug-wallet`, `/debug-mobile` and `/verification-test` shipped inside the
  `(shell)` group and were reachable in production. Now gated by a server
  layout.

### Dead surface removed

- `OnboardingModal` and `OnboardingContext` deleted. The modal never mounted —
  `e2e/onboarding.spec.ts` skipped it in every run and `ring0.spec.ts` seeded
  `imf_seenOnboarding_v1` to bypass a modal that never appeared — while holding
  the best-written expectation-setting copy in the repo. The foyer's inline copy
  is better, so mounting it would have been a downgrade. **The copy survives** as
  `ONBOARDING_STEPS` in `brandPositioning.ts`; only the unreachable component
  and its context are gone.
- `src/components/profile/` deleted whole. `ProfileDisplay`, `XpProgressBar`,
  `ThemeSwitcher` and `StatCell` were referenced only by each other and by their
  own barrel — a four-file subtree nothing imported. The _other_
  `ProfileDisplay` (`leaderboard/`, 111 lines) is live and untouched; the two
  files sharing a name were unrelated.
- `MemoryButton` deleted. `Button.tsx` documents itself as replacing it, and
  the only reference anywhere was that comment. It still wore Press Start 2P on
  its primary button — the "second app" the design lock forbids.
- `PioneerBadge`, `ThemeDemo`, `LoadingDemo` and `ThemeIndicator` deleted as
  unreferenced. `.motion-demo` and its `studio-demo` keyframes went with them: a
  1.4s infinite border-colour loop that nothing used.

## Deliberately not done

- **No cohort benchmarks, age bands or archetypes in copy.** Gated on real pilot
  data per `MOVEMENT_INTELLIGENCE.md`. The MI spine leads with self-comparison,
  which the product can already do honestly.
- **The arcade register stays earned** (`useImmersive`, default off).
  `e2e/ring0.spec.ts:44-46` deliberately asserts Sandow imagery is absent from
  the doorway — a considered decision, not an oversight.
- **No `/lore` rewrite.** It is well-executed. Only the false claims and the
  hardcoded `armLinked` changed.
- **No new animation library.** Motion is already the most disciplined part of
  the system: CSS-only, with an explicit vocabulary and `prefers-reduced-motion`
  handled in both CSS and JS.

## Open

| Item                                                   | Why it is open                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hand-rolled dialog markup**                          | `Game.tsx`'s camera primer and the (now deleted) onboarding modal both used raw `role="dialog"` rather than the Radix `AccessibleDialog` that eight other modals use. The primer is left alone deliberately: it is e2e-covered and carries bespoke denial-recovery semantics (re-ask the browser, restore focus on cancel) that `AccessibleDialog` does not model. Converting it is a behaviour change, not a refactor. |
| **Loader primitives still split**                      | Spinner logic exists in `Spinner`, `LoadingIcons`, and inline in `Button`. `MemoryButton` is gone, which removed the fourth. Worth consolidating onto one, but it is cosmetic and no surface is currently broken by it.                                                                                                                                                                                                 |
| **Model weights not pre-warmed**                       | The pose _chunk_ is prefetched on idle and on CTA hover, but MediaPipe weights are not, so a cold first visit can stall on the "Coach AI" phase. `FIRST_VISIT_AND_MANUAL_STAGE.md` measures comprehension, not latency.                                                                                                                                                                                                 |
| **`SandowCabinet` footer**                             | Still reads "we closed the loop with a robot arm". Arguably lineage rhetoric in a heritage exhibit, but it sits adjacent to the claims that were just corrected, so it deserves a deliberate decision rather than a default.                                                                                                                                                                                            |
| **`zTokens.ts` vs `designTokens.zIndex`**              | These do **not** conflict — the latter delegates to `Z`. Left alone deliberately.                                                                                                                                                                                                                                                                                                                                       |
| **The arm does not follow the elbow, only the cursor** | The gaze parallax reacts to `pointermove`. Closing that loop — move your elbow, the arm follows — is the whole thesis in one interaction, and the camera already exists. It is a larger change than this pass: the arm would need to track a live joint rather than a cursor.                                                                                                                                           |
| **Personas do not tint the room**                      | SNEL/STEDDIE/RASTA now reach the coaching line but present identically everywhere else. Persona could drive idle tempo, palette temperature, and how the arm moves.                                                                                                                                                                                                                                                     |

### Closed after review

Two items were investigated and intentionally _not_ changed:

- **The per-second desktop HUD pulse.** `GameHUD` re-renders on a one-second
  timer to scale the rep counter. It looked wasteful, but it is bounded to the
  final two minutes, desktop-only, and the mobile branch is already exempt with
  a comment explaining the frame-budget reason. It is a deliberate flourish on a
  bounded window, not an oversight.
- **The camera primer's bespoke dialog.** See the first row above.

## A platform quirk worth knowing

`notFound()` in this app (Next 16.2, `next start`) serves the not-found body
with **HTTP 200**, verified by calling it unconditionally. So the debug-route
gate guarantees "no debug markup in production", not "404 status". The gate is a
server layout with `force-dynamic` because the pages are `'use client'` — a
`notFound()` inside a client component never runs against prerendered HTML.
That was observed directly: the first attempt returned 200 with full debug
markup.

Worth re-checking on the real host — if Vercel 404s properly, the comment in
`src/lib/debugPages.ts` is overly cautious rather than wrong.

## Verification

```bash
pnpm test                  # 326 vitest
pnpm lint                  # 0 errors
npx tsc --noEmit           # clean
pnpm build                 # green
pnpm exec playwright test e2e/ring0.spec.ts --project=chromium
cd coach-station && python -m pytest -q   # 115
```
