---
workflow: general-video
flow: automation
storyboard: no
message: 'Britain invented the form-check in 1897 — Imperfect Form finishes that loop with a robot arm'
destination: craeft-prize-submission
aspect: 1920x1080
language: en
audience: The British Cræft Prize judges (Nation of Artisans) — heritage craft + technology
length: 160s
angle: heritage-lineage-narrative
---

## Intent

A 2:30–2:45 submission film for The British Cræft Prize (window closes
31 Aug 2026). The pitch: Eugen Sandow ran the world's first AI form-check by
Royal Mail in 1897 — photo in, graded against ideal tables, correction out,
spring-grip dumbbell under Royal Warrant. Imperfect Form closes that same loop
with on-device pose estimation and an SO-101 robot arm that physically
demonstrates the correction. Tone: satire with a steel core — Victorian
seaside arcade register on the surface, a working instrument underneath.
Anti-slop is the theme: on-device, open hardware, honest scope.

Shot-by-shot source of truth: `../../docs/CRAFFT_SUBMISSION_DRAFT.md` § 3
(video script). Design tokens: `../../src/styles/sandow-spine.css`
(teal-gold-on-night, Press Start 2P, brass gauge, Royal Warrant stamp).

## Assets

- assets/ — to be staged during production:
  - screen recordings of imperfectform.fun (foyer, coached curl with
    skeleton+HUD, /lore page, Movement Card) — Act 2 + Act 4 footage
  - public-domain Sandow-era archive photograph + spring-grip dumbbell
    imagery — Act 1 heritage beats
  - cabinet concept renders, clearly labeled "finalist-phase concept" — Act 3
  - arm correction beat: MuJoCo sim capture if available, else animated
    arm diagram labeled "simulation"
- TTS voiceover (British voice) of the scripted VO lines
- Light music bed under VO

## Notes

- Honesty constraint: the physical cabinet is not built and the hardware arm
  is paused after a servo incident. Never show fake workshop footage; label
  concept renders and simulation beats explicitly. The "HONEST SCOPE" card is
  mandatory (upper-body only; learned policies after scripted demonstration).
- Grade: teal-gold-on-night; sepia + film grain for Act 1 archive register.
- End card: "Britain invented the form-check. We finished it." +
  imperfectform.fun.
