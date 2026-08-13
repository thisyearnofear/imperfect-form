/**
 * Central z-index token system — the single source of truth for stacking order.
 *
 * Rationale: overlays were scattered across components with ad-hoc z-values,
 * causing visual stacking conflicts (LandscapePrompt and the achievement
 * overlay both sat at z-[100]; the leaderboard breakdown used a magic
 * z-[2002]; the Summary achievement toast painted behind the modal backdrop it
 * was meant to celebrate over).
 *
 * Rules:
 *  - Never add ad-hoc z-index values to new components; use these tokens.
 *  - `Z` is the numeric form (for inline styles / Radix `style` props).
 *  - `zIndexClasses` is the Tailwind arbitrary-class form (for `className`).
 *  - Overlays should only be visible during their active phase (progressive
 *    disclosure — see the P2 plan) rather than stacked simultaneously.
 *
 * The modal tier mirrors the committed designTokens.zIndex scale (see
 * designTokens.ts, which fully delegates to this file) so nothing shifts.
 */
export const Z = {
  // ── Camera stack (bottom-up inside the canvas stage) ────────────────────
  cameraBg: 0,
  cameraVideo: 10,
  cameraCanvas: 20,

  // ── Game container chrome ───────────────────────────────────────────────
  /** Fullscreen / orientation-lock controls, top-right of the game container */
  gameTopControls: 20,
  /** Race banner across the top of the HUD */
  raceBanner: 30,

  // ── App chrome (top bar, bottom nav, dev panels) ────────────────────────
  topBar: 50,
  bottomNav: 50,
  debugPanel: 50,
  /** Legacy dropdown tier (kept for designTokens.zIndex parity) */
  dropdown: 10,

  // ── Workout overlays (inside the camera canvas) ─────────────────────────
  /** Rep count pop / form flash */
  overlayFeedback: 85,
  /** See→show juxtaposition (user arm vs coach arm) during a demonstration */
  overlaySeeShow: 88,
  /** Loading overlay during pose-detection warm-up */
  overlayLoader: 90,

  // ── Modal stack ─────────────────────────────────────────────────────────
  modalBackdrop: 900,
  modalContent: 1000,
  /** Nested popups inside a modal (leaderboard user breakdown) + floating
   *  chrome that stays above modal content (fullscreen exit). */
  modalNested: 1002,
  /** Legacy popover / tooltip tiers (kept for designTokens.zIndex parity) */
  popover: 1100,
  tooltip: 1200,
  /**
   * Achievement / celebration toasts. The Summary achievement toast is a fixed
   * sibling of the modal, so it must sit above modalContent (not at the
   * in-workout toast tier) to stay visible over the backdrop it celebrates on
   * top of.
   */
  overlayAchievement: 1300,

  // ── Wallet modal (deliberately above SDK-injected wallet overlays) ──────
  walletModalBackdrop: 2000,
  walletModalContent: 2001,

  // ── Full-screen gates ───────────────────────────────────────────────────
  /** Camera permission primer — blocks everything until dismissed */
  gate: 9999,
} as const;

/** Numeric z-index → Tailwind utility classes (kept literal so JIT sees them). */
export const zIndexClasses: Record<keyof typeof Z, string> = {
  cameraBg: 'z-0',
  cameraVideo: 'z-10',
  cameraCanvas: 'z-20',
  gameTopControls: 'z-20',
  raceBanner: 'z-30',
  topBar: 'z-50',
  bottomNav: 'z-50',
  debugPanel: 'z-50',
  dropdown: 'z-10',
  overlayFeedback: 'z-[85]',
  overlaySeeShow: 'z-[88]',
  overlayLoader: 'z-[90]',
  modalBackdrop: 'z-[900]',
  modalContent: 'z-[1000]',
  modalNested: 'z-[1002]',
  popover: 'z-[1100]',
  tooltip: 'z-[1200]',
  overlayAchievement: 'z-[1300]',
  walletModalBackdrop: 'z-[2000]',
  walletModalContent: 'z-[2001]',
  gate: 'z-[9999]',
};
