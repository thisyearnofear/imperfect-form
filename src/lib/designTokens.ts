/**
 * Design Tokens - Single Source of Truth
 * Consolidates all colors, spacing, typography, and animation timing
 * Used across web, mobile, and Farcaster
 *
 * PRINCIPLE: DRY - Every value defined once, referenced everywhere
 */

// ═══════════════════════════════════════════════════════════════════════════
// COLOR TOKENS
// ═══════════════════════════════════════════════════════════════════════════

export const colors = {
  // Primary Brand (Gold/Yellow)
  primary: '#fcb131',
  primaryDark: '#f39c12',
  primaryLight: '#ffed4e',

  // Success (Green)
  success: '#10b981',
  successDark: '#059669',
  successLight: '#6ee7b7',

  // Network Colors
  network: {
    base: '#0052FF', // Bright blue
    polygon: '#8247E5', // Purple
    monad: '#FFD700', // Gold
    celo: '#00a651', // Green
  },

  // Semantic Colors
  error: '#ef4444',
  errorDark: '#dc2626',
  errorLight: '#fecaca',
  warning: '#f59e0b',
  warningDark: '#d97706',
  info: '#3b82f6',
  infoDark: '#1d4ed8',

  // Neutral Grays
  neutral: {
    black: '#000000',
    900: '#0a0a0a', // Almost black
    800: '#1a1a1a',
    700: '#2d2d2d',
    600: '#404040',
    500: '#737373',
    400: '#a3a3a3',
    300: '#d4d4d4',
    200: '#e5e5e5',
    100: '#f5f5f5',
    white: '#ffffff',
  },

  // Background Colors
  background: {
    primary: '#000000',
    secondary: '#0a0a0a',
    tertiary: '#1a1a1a',
    overlay: 'rgba(0, 0, 0, 0.8)',
    overlayDim: 'rgba(0, 0, 0, 0.5)',
  },

  // Text Colors
  text: {
    primary: '#ffffff',
    secondary: '#d4d4d4',
    tertiary: '#a3a3a3',
    inverse: '#000000',
    accent: '#fcb131',
  },

  // Interactive States
  interactive: {
    hover: 'rgba(252, 177, 49, 0.1)',
    active: 'rgba(252, 177, 49, 0.2)',
    disabled: 'rgba(255, 255, 255, 0.4)',
    focus: 'rgba(252, 177, 49, 0.3)',
  },

  // Borders
  border: {
    light: 'rgba(255, 255, 255, 0.1)',
    medium: 'rgba(255, 255, 255, 0.2)',
    strong: '#fcb131',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SPACING TOKENS
// ═══════════════════════════════════════════════════════════════════════════

export const spacing = {
  // Core spacing scale (4px base)
  0: '0',
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  12: '3rem', // 48px
  16: '4rem', // 64px

  // Semantic spacing
  xs: '0.5rem', // 8px
  sm: '1rem', // 16px
  md: '1.5rem', // 24px
  lg: '2rem', // 32px
  xl: '3rem', // 48px

  // Component-specific
  button: {
    paddingX: '1rem',
    paddingY: '0.75rem',
    paddingSmall: '0.5rem 0.75rem',
    paddingLarge: '1rem 1.5rem',
  },

  card: {
    padding: '1.5rem',
    paddingCompact: '1rem',
    paddingMobile: '1rem',
  },

  modal: {
    padding: '1.5rem',
    paddingMobile: '1rem',
    gap: '1.5rem',
  },

  input: {
    paddingX: '1rem',
    paddingY: '0.75rem',
    height: '2.75rem',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY TOKENS
// ═══════════════════════════════════════════════════════════════════════════

export const typography = {
  // Font families
  fontFamily: {
    primary: 'system-ui, -apple-system, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    display: '"PressStart2P", monospace', // Retro display font
  },

  // Font sizes
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },

  // Font weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  // Component-specific typography
  heading: {
    h1: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
  },

  body: {
    default: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    small: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
  },

  button: {
    primary: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    small: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// BORDER RADIUS TOKENS
// ═══════════════════════════════════════════════════════════════════════════

export const borderRadius = {
  none: '0',
  xs: '0.25rem', // 4px
  sm: '0.375rem', // 6px
  base: '0.5rem', // 8px
  md: '0.75rem', // 12px
  lg: '1rem', // 16px
  xl: '1.5rem', // 24px
  full: '9999px',

  // Semantic
  small: '0.375rem',
  medium: '0.75rem',
  large: '1rem',
  pill: '9999px',
};

// ═══════════════════════════════════════════════════════════════════════════
// SHADOW TOKENS
// ═══════════════════════════════════════════════════════════════════════════

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',

  // Brand-specific shadows with primary color
  primary: '0 0 20px rgba(252, 177, 49, 0.5)',
  primarySm: '0 0 8px rgba(252, 177, 49, 0.3)',
  primaryLg: '0 0 30px rgba(252, 177, 49, 0.6)',

  // Focus state
  focus: '0 0 0 3px rgba(252, 177, 49, 0.5)',
};

// ═══════════════════════════════════════════════════════════════════════════
// TRANSITION / ANIMATION TOKENS
// ═══════════════════════════════════════════════════════════════════════════

export const transitions = {
  // Durations (milliseconds)
  duration: {
    fast: 100,
    base: 150,
    normal: 300,
    slow: 500,
  },

  // Timing functions (easing)
  timing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    cubic: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
    easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    easeOutExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',
  },

  // Preset transitions
  fade: 'opacity 300ms ease-out',
  slideIn: 'all 300ms ease-out',
  scaleIn: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',

  // Component-specific transitions
  modal: {
    enter: 'all 300ms ease-out',
    exit: 'all 300ms ease-in',
  },
  button: {
    hover: 'all 150ms ease-out',
    active: 'all 100ms ease-out',
  },
  progressBar: {
    default: 'width 300ms ease-out',
    loading: 'width 500ms ease-out',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT SIZE TOKENS
// ═══════════════════════════════════════════════════════════════════════════

export const sizes = {
  // Button sizes
  button: {
    xs: {
      height: '1.75rem',
      paddingX: '0.5rem',
      fontSize: '0.75rem',
    },
    sm: {
      height: '2rem',
      paddingX: '0.75rem',
      fontSize: '0.875rem',
    },
    base: {
      height: '2.5rem',
      paddingX: '1rem',
      fontSize: '1rem',
    },
    lg: {
      height: '3rem',
      paddingX: '1.5rem',
      fontSize: '1.125rem',
    },
  },

  // Input sizes
  input: {
    sm: {
      height: '2rem',
      paddingX: '0.75rem',
      fontSize: '0.875rem',
    },
    base: {
      height: '2.5rem',
      paddingX: '1rem',
      fontSize: '1rem',
    },
    lg: {
      height: '3rem',
      paddingX: '1.25rem',
      fontSize: '1.125rem',
    },
  },

  // Modal sizes
  modal: {
    xs: '20rem',
    sm: '24rem',
    base: '28rem',
    lg: '32rem',
    xl: '36rem',
    full: '90vw',
  },

  // Card sizes
  card: {
    sm: '16rem',
    base: '20rem',
    lg: '24rem',
  },

  // Progress bar
  progressBar: {
    xs: '0.25rem',
    sm: '0.375rem',
    base: '0.5rem',
    lg: '0.75rem',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// BREAKPOINTS (Mobile-First)
// ═══════════════════════════════════════════════════════════════════════════

export const breakpoints = {
  xs: '0px',
  sm: '640px', // Mobile+
  md: '768px', // Tablet
  lg: '1024px', // Desktop
  xl: '1280px', // Wide
  '2xl': '1536px', // Extra wide
};

// ═══════════════════════════════════════════════════════════════════════════
// Z-INDEX TOKENS
// ═══════════════════════════════════════════════════════════════════════════

export const zIndex = {
  // Layering hierarchy (low to high)
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 900,
  modal: 1000,
  popover: 1100,
  tooltip: 1200,
  notification: 1300,
  debug: 9999, // Debug panels stay on top
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTION: Get responsive value
// ═══════════════════════════════════════════════════════════════════════════

export function getResponsiveValue<T>(
  mobileValue: T,
  tabletValue?: T,
  desktopValue?: T
): Record<string, T> {
  return {
    mobile: mobileValue,
    tablet: tabletValue || mobileValue,
    desktop: desktopValue || tabletValue || mobileValue,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT CONSOLIDATED TOKEN OBJECT
// ═══════════════════════════════════════════════════════════════════════════

export const designTokens = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  transitions,
  sizes,
  breakpoints,
  zIndex,
} as const;

export type DesignTokens = typeof designTokens;

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN VALIDATION & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map of known hardcoded colors to token paths for migration
 */
export const colorTokenMap = {
  '#fcb131': 'colors.primary',
  '#f39c12': 'colors.primaryDark',
  '#ffed4e': 'colors.primaryLight',
  '#10b981': 'colors.success',
  '#059669': 'colors.successDark',
  '#6ee7b7': 'colors.successLight',
  '#ef4444': 'colors.error',
  '#dc2626': 'colors.errorDark',
  '#fecaca': 'colors.errorLight',
  '#f59e0b': 'colors.warning',
  '#d97706': 'colors.warningDark',
  '#3b82f6': 'colors.info',
  '#1d4ed8': 'colors.infoDark',
} as const;

/**
 * Validate if a value uses design tokens
 */
export function validateTokenUsage(value: string): {
  isValid: boolean;
  suggestion?: string;
} {
  if (/#[a-fA-F0-9]{6}/.test(value)) {
    const color = value.match(/#[a-fA-F0-9]{6}/)?.[0];
    const mapped = color ? colorTokenMap[color as keyof typeof colorTokenMap] : null;
    return {
      isValid: false,
      suggestion: mapped
        ? `Use designTokens.${mapped}`
        : 'Replace hardcoded color with design token',
    };
  }
  return { isValid: true };
}
