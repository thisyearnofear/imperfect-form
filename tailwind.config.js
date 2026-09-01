/** @type {import('tailwindcss').Config} */
import { designTokens } from './src/lib/designTokens.ts';

// Only the numeric spacing keys (0,1,2,3...) are safe to merge into Tailwind's
// core spacing scale. The semantic names (xs, sm, md, lg, xl) must be kept
// separate — Tailwind uses those same names for built-in size presets
// (max-w-sm, text-sm, etc.) and spreading them would override those defaults.
const numericSpacing = Object.fromEntries(
  Object.entries(designTokens.spacing).filter(([k]) => /^\d+$/.test(k))
);

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Colors from design tokens
      colors: {
        primary: designTokens.colors.primary,
        'primary-dark': designTokens.colors.primaryDark,
        'primary-light': designTokens.colors.primaryLight,
        success: designTokens.colors.success,
        'success-dark': designTokens.colors.successDark,
        'success-light': designTokens.colors.successLight,
        error: designTokens.colors.error,
        'error-dark': designTokens.colors.errorDark,
        'error-light': designTokens.colors.errorLight,
        warning: designTokens.colors.warning,
        'warning-dark': designTokens.colors.warningDark,
        info: designTokens.colors.info,
        'info-dark': designTokens.colors.infoDark,
        // Network colors
        'network-base': designTokens.colors.network.base,
        'network-polygon': designTokens.colors.network.polygon,
        'network-monad': designTokens.colors.network.monad,
        'network-celo': designTokens.colors.network.celo,
        // Sandow spine — reference the CSS custom properties from
        // sandow-spine.css so there is ONE source of truth. These let
        // components use text-brass / bg-brass / text-studio-teal instead
        // of raw Tailwind yellow-500 / violet-600 (the named anti-pattern).
        brass: {
          DEFAULT: 'var(--sandow-brass)',
          dim: 'var(--sandow-brass-dim)',
          soft: 'var(--sandow-brass-soft)',
        },
        sandow: {
          ink: 'var(--sandow-ink)',
          paper: 'var(--sandow-paper)',
          rule: 'var(--sandow-rule)',
        },
        studio: {
          teal: 'var(--studio-teal)',
          'teal-bright': 'var(--studio-teal-bright)',
          'teal-cta': 'var(--studio-teal-cta)',
          'teal-deep': 'var(--studio-teal-deep)',
          paper: 'var(--studio-paper)',
          'paper-soft': 'var(--studio-paper-soft)',
          muted: 'var(--studio-muted)',
          'muted-dim': 'var(--studio-muted-dim)',
          border: 'var(--studio-border)',
          'border-strong': 'var(--studio-border-strong)',
          surface: 'var(--studio-surface)',
        },
        // Neutrals
        neutral: designTokens.colors.neutral,
        // Semantic surface colors
        surface: {
          primary: designTokens.colors.background.primary,
          secondary: designTokens.colors.background.secondary,
          tertiary: designTokens.colors.background.tertiary,
        },
        // Semantic border colors
        'border-color': {
          DEFAULT: designTokens.colors.border.light,
          strong: designTokens.colors.border.strong,
        },
        // Interactive states
        interactive: {
          hover: designTokens.colors.interactive.hover,
          active: designTokens.colors.interactive.active,
          disabled: designTokens.colors.interactive.disabled,
          focus: designTokens.colors.interactive.focus,
        },
      },
      // Spacing from design tokens — numeric keys only.
      // Semantic names (xs/sm/md/lg/xl) are intentionally excluded to avoid
      // overriding Tailwind's built-in named size presets (max-w-sm, text-sm…)
      spacing: {
        ...numericSpacing,
      },
      // Font sizes
      fontSize: {
        ...designTokens.typography.fontSize,
      },
      // Font weights
      fontWeight: {
        ...designTokens.typography.fontWeight,
      },
      // Line heights
      lineHeight: {
        ...designTokens.typography.lineHeight,
      },
      // Border radius
      borderRadius: {
        ...designTokens.borderRadius,
      },
      // Shadows
      boxShadow: {
        ...designTokens.shadows,
      },
      // Z-index
      zIndex: {
        ...designTokens.zIndex,
      },
      // Transitions
      transitionDuration: {
        fast: `${designTokens.transitions.duration.fast}ms`,
        base: `${designTokens.transitions.duration.base}ms`,
        normal: `${designTokens.transitions.duration.normal}ms`,
        slow: `${designTokens.transitions.duration.slow}ms`,
      },
      transitionTimingFunction: {
        ...designTokens.transitions.timing,
      },
      // Font families
      fontFamily: {
        press: ["'PressStart2P'", 'monospace'],
        sans: designTokens.typography.fontFamily.primary.split(', '),
        mono: designTokens.typography.fontFamily.mono.split(', '),
      },
      // Component sizes
      width: {
        'modal-xs': designTokens.sizes.modal.xs,
        'modal-sm': designTokens.sizes.modal.sm,
        'modal-base': designTokens.sizes.modal.base,
        'modal-lg': designTokens.sizes.modal.lg,
        'modal-xl': designTokens.sizes.modal.xl,
        'card-sm': designTokens.sizes.card.sm,
        'card-base': designTokens.sizes.card.base,
        'card-lg': designTokens.sizes.card.lg,
      },
      maxWidth: {
        'modal-xs': designTokens.sizes.modal.xs,
        'modal-sm': designTokens.sizes.modal.sm,
        'modal-base': designTokens.sizes.modal.base,
        'modal-lg': designTokens.sizes.modal.lg,
        'modal-xl': designTokens.sizes.modal.xl,
      },
      height: {
        'input-sm': designTokens.sizes.input.sm.height,
        'input-base': designTokens.sizes.input.base.height,
        'input-lg': designTokens.sizes.input.lg.height,
        'button-xs': designTokens.sizes.button.xs.height,
        'button-sm': designTokens.sizes.button.sm.height,
        'button-base': designTokens.sizes.button.base.height,
        'button-lg': designTokens.sizes.button.lg.height,
      },
      // Screens (breakpoints)
      screens: {
        ...designTokens.breakpoints,
      },
    },
  },
  plugins: [],
};
