# Imperfect Form — design lock

**Studio is the chassis. Arcade is punctuation. Calm/Lab are phase modes.**

Source of truth for copy/registers: `src/lib/brandPositioning.ts`.  
Tokens: `src/styles/sandow-spine.css` (`--studio-*`, `--sandow-*`).

## Composition

| Moment                             | Register              | Mix                                                                        |
| ---------------------------------- | --------------------- | -------------------------------------------------------------------------- |
| Day-0 foyer, primer, live HUD      | Studio                | Teal glass; brass only as quiet Sandow hairline                            |
| First rep / level-up / celebrate   | Arcade burst          | Gold flash, arcade cue sound; brief Press Start OK — then return to studio |
| Earned shell (topbar, tabs, Stats) | Studio + brass accent | XP/level use `--sandow-brass`; no yellow SaaS gradients, no violet CTAs    |
| Ghost / challenge accept           | Arcade punctuation    | Brass energy on the challenge surface only                                 |
| Explicit Train / `/lore` Cræft     | Full arcade / cabinet | Press Start allowed; loud gold                                             |
| Recover                            | Calm                  | Soft, no scoreboard                                                        |
| Lab analysis                       | Lab                   | Clinical; not arcade-loud                                                  |

## Anti-patterns

- Whole screens painted in Tailwind `yellow-500` / `violet-600` that ignore studio tokens
- Press Start on Stats tabs or bottom nav (flattens punctuation into wallpaper)
- Mid-rep theme toggling
- Floating multi-widget “feature drawers” competing with the coaching loop

## Type

- Chassis: Manrope (`--font-manrope`)
- Arcade bursts / Cræft: Press Start 2P only where composition table allows
