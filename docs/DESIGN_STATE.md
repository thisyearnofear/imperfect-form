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

| Item                                      | Why it is open                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hand-rolled dialog markup**             | `Game.tsx`'s camera primer and the (now deleted) onboarding modal both used raw `role="dialog"` rather than the Radix `AccessibleDialog` that eight other modals use. The primer is left alone deliberately: it is e2e-covered and carries bespoke denial-recovery semantics (re-ask the browser, restore focus on cancel) that `AccessibleDialog` does not model. Converting it is a behaviour change, not a refactor. |
| **Loader primitives still split**         | Spinner logic exists in `Spinner`, `LoadingIcons`, and inline in `Button`. `MemoryButton` is gone, which removed the fourth. Worth consolidating onto one, but it is cosmetic and no surface is currently broken by it.                                                                                                                                                                                                 |
| **Model weights not pre-warmed**          | The pose _chunk_ is prefetched on idle and on CTA hover, but MediaPipe weights are not, so a cold first visit can stall on the "Coach AI" phase. `FIRST_VISIT_AND_MANUAL_STAGE.md` measures comprehension, not latency.                                                                                                                                                                                                 |
| **`SandowCabinet` footer**                | Still reads "we closed the loop with a robot arm". Arguably lineage rhetoric in a heritage exhibit, but it sits adjacent to the claims that were just corrected, so it deserves a deliberate decision rather than a default.                                                                                                                                                                                            |
| **`zTokens.ts` vs `designTokens.zIndex`** | These do **not** conflict — the latter delegates to `Z`. Left alone deliberately.                                                                                                                                                                                                                                                                                                                                       |

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
