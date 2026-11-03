# The Receiving Experience — "Fig 1"

Spec for the shared-link landing (`?niggle=<joint>:<context>&from=<name>`).
Written 2026-11-03. Design sources: ai-iso-skill (plate figures that DO
something), smear-blur-showreel (motion carries meaning text can't),
motionsites-web-builder (one artifact per viewport, spec→screenshot→fix),
codrops/atelier-north (scroll-driven pixel reveals, minimal gallery pacing),
codrops/SeamTransitions (seam vocabulary between hero and content).

**Who:** a non-technical person arriving from a friend's link — sore
trap/neck, possibly anxious, definitely not reading a wall of copy.
**What she must feel:** this was made for me; I already understand what it
does; the button is the only thing left.

## Invariants

- Only `?niggle=` arrivals get this experience. `parseNiggleParam` returning
  null → normal CoachFoyer. Incoming challenge/race → normal flow.
- The CTA must never wait on animation: it starts `reading: true` exactly as
  CoachFoyer does; the iris plays _during_ the existing start fade.
- Reduced motion = every seam a cut, figure static at the raised pose,
  pips fill instantly. One `prefers-reduced-motion` check, shared.
- Mobile 390x844 first. No Lenis for v1. GSAP + ScrollTrigger lazy-loaded
  only on this path (dynamic import inside an effect — never in the main
  bundle for organic visitors).
- No video/audio assets. The figure is hand-drawn inline SVG (zero deps).
- All copy stays in the instrument voice: honest, never clinical, never
  hype. "A meter, not a diagnosis" discipline from brandPositioning.

## Structure

### Act 0 — envelope (~1.2s, skippable on tap)

Dark studio. A hairline brass ring (the ReadGauge idiom, enlarged) draws
itself via stroke-dashoffset. Inside: "{name} sent you this" materializes
word-by-word blur→sharp. The ring seams apart — a canvas-2D pixel dissolve
(or clip-path wipe fallback) — into Act 1. On repeat view same session:
skip straight to Act 1 (no replay).

### Act 1 — Fig 1, the living plate (the entire first viewport)

A numbered plate: `· FIG 1 · THE REACH ·` engraved top, `PLATE I` bottom.
Inside, a hairline figure (head/shoulders/spine/pelvis, one arm) in the
studio-teal hairline style. The arm raises on a ~4s loop: a light pulse
travels up the arm (stroke-dashoffset chase), 2–3 ghost poses trail behind
(smear — low-opacity duplicate paths, not filters), and 5 pips along the
plate's base edge fill once per raise. Tap the plate → one slow rep plays
through; holding scrubs it (pointer-position → arm angle).

Type: greeting block, then headline, then one practical line, then the
button, then one quiet link `not your niggle? change it` which unfolds
the standard intake chips (reuse the CoachFoyer intake block
markup/styles — do not rebuild).

**Greeting block (2026-11-03 revision — the gift, not the diagnosis):**
"{name} sent you this" stays the small sender line. Under it, an italic
note line — `&note=` param (sanitized like the sender name, ~140 chars,
stored as `imf_gift_note_v1`) when the sender wrote one, else the
context's `giftLine` (new field per niggle context, empathy voice —
e.g. desk → "Heard it's been tight lately — here's a way to see if it's
actually settling."). Note-without-sender still renders the quote alone.

**Headline by variant:** link recipients get `See if it's actually
getting better.` — the promise a worried person wants. Organic keeps
`Your niggle, measured.` (joint-aware title on selection still applies:
"Your knee, measured." etc.).

**Practical line:** `5 slow raises. The camera watches; nothing leaves
your phone.` — unchanged. The CTA stays the honest action label.

**Send-side:** "Send this to a friend" gains a small "add your name +
a line" affordance — two compact inputs whose values build the shared
URL's `&from=`/`&note=` params live; copy/share uses that URL.

### Act 2 — scroll story, five beats, seam between each

Seam = canvas-2D pixel dissolve at 0.6 progress of the viewport crossing,
or a brass hairline wipe on reduced budget. Each beat: one figure idea +
max two lines of copy + a hairline.

- Beat 1 THE QUESTION — "Tension can't be photographed." / "But how the
  arm travels can — range, control, left-right. A meter, not a mirror."
  Figure: the plate arm frozen mid-raise, ghost trail emphasized.
- Beat 2 THE COMPANY — "You're in enormous, invisible company." /
  "Somewhere between one in five and two in five adults report
  neck-and-shoulder discomfort in any three-month stretch — desk work
  makes it nearly universal. What isn't common is measuring it. Almost
  everyone guesses." Footnote hairline: "US CDC 2019, GP surveys — the
  table this instrument was designed from." Visual: a row of five small
  figure marks, two lit brass. (Honest: reuse the epidemiology framing in
  DESIGN_EVOLUTION, no new citations.)
- Beat 3 THE READ — "The meter watches three things." Scroll-scrubbed:
  scroll progress IS the rep — range arc draws, a control dot steadies,
  L/R mirror fills. Label: `Range · Control · Balance`. No gate numbers.
- Beat 4 THE RITUAL — "A healthy way to hold a niggle." /
  "Once a week, same setup, five slow raises. Feels better and the meter
  agrees — confidence. Numbers moved but it feels the same — healing on a
  schedule you can't feel yet. Hurts more and nothing moved — see a
  professional; that's the body's job, not the meter's." Three hairline
  rows for the three pairings (DESIGN_EVOLUTION §F, in plain words).
- Beat 5 THE HONESTY — "A meter that can't read says so." Trust ledger,
  one hairline list: `video never uploads` · `reads stay in this browser`
  · `wellness guidance, not medicine`.

### Outro

Compact "Common questions" (reuse the existing FAQ data/accordion if it
extracts cleanly from LandingSections, else port the same Q&As into a
minimal accordion here — keep the same answers verbatim where possible).
Final CTA mirrors the hero: plate figure frozen mid-pulse + button.

### Act 3 — the iris into the camera (signature)

On CTA press: the plate's frame scales + fades to become the camera HUD
frame (~500ms, GSAP or WAAPI), pips carry into the live HUD. Start camera
prefetch on ReceivingFoyer mount (reuse `prefetchWebcamChunk`). Do NOT
request permission early — the OS prompt still fires on press.

### Stretch (do last, cut first)

- SessionRecap re-cast as "Fig 2 · Your reading" header for protocol modes.
- Smear-fill on the HUD `ReadingPips` for reading sessions.

## Architecture

- New `src/components/receive/ReceivingFoyer.tsx` (+ `.css`) rendered by
  Game in place of CoachFoyer when `receivedLink && !hasIncomingChallenge`
  && !raceParam. `receivedLink` = state set in the existing URL-param
  effect where `parseNiggleParam` succeeds. Props it needs: mode, onStart
  (same closure as CoachFoyer's), plus whatever the intake-unfold reuses.
- SVG figure as its own component `src/components/receive/ReachPlate.tsx`
  (arm pose driven by a `progress` 0–1 prop so scroll-scrub and tap both
  drive the same drawing).
- Seams/scrub/iris in `src/components/receive/useReceivingMotion.ts` —
  all GSAP imports dynamic; no-op under reduced motion.
- Copy constants local to the component (don't grow brandPositioning for
  one-surface copy unless a string is genuinely shared).
- LandingSections NOT rendered on the receiving path.

## Organic variant (2026-11-03) — this becomes THE landing

The receiving experience replaces the wall-copy foyer for everyone, not
just `?niggle=` arrivals. Incoming challenge/race still routes to
CoachFoyer; `?intent=train` still routes to the arcade foyer.

- **Envelope:** organic visitors see the ring + `NIGGLEOMETER`
  materializing (no sender line). `?from=` keeps "{name} sent you this".
- **Hero intake:** "Where does it nag?" renders as plate-idiom hairline
  chips under the title (not a form block). Context row unfolds on pick.
  CTA stays honest: `Take a N-rep reading` when joint+protocol,
  `Try one rep` otherwise. "or pick a movement" unfolds the exercise
  cards for non-niggle visitors; "Send this to a friend" lives in the
  unfolded intake only.
- **Company beat generalizes:** show all three flagship zones with their
  figures (back ~39%, neck/shoulder ~18–43%, knee ~17–36%); highlight the
  selected joint's stat. Headline adapts: "Whichever it is, you're in
  company."
- **Coach arm beat:** one plate-style beat for the SO-101 (Fig 2 · The
  Coach Arm, existing public/atmosphere imagery + 3-step how-it-works
  compressed to one line each) between Ritual and Honesty.
- No movement picker, no "Sound familiar" essay, no standalone trust
  section — all folded into beats or the outro.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm vitest run` touched tests.
- Update `e2e/niggle-link.spec.ts`: valid link → greeting + plate + CTA;
  "not your niggle" reveals chips; `?niggle=bogus` → the organic variant
  (receiving experience, no sender greeting, intake visible).
- agent-browser `--session imperfect-form-receive` 390x844: screenshot
  envelope mid-frame, settled hero, each beat, intake unfolded, and a
  reduced-motion variant. /tmp/imf-shots/. Close session, pgrep check.
- No commit. Leave dev server running.
