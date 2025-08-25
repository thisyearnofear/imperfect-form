/**
 * Theme Utilities and Helper Functions
 *
 * This module provides utility functions for working with themes,
 * including CSS custom property generation, color manipulation,
 * and theme validation.
 */

import type {
  ChainTheme,
  ChainId,
  ColorPalette,
  CSSCustomProperties,
  ThemeValidationResult,
  ComponentVariant,
  ComponentSize,
  DeepPartial,
} from '@/types/theme';
import { CHAIN_THEMES, DEFAULT_THEME } from './chainThemes';

// CSS Custom Properties Generation
export const generateCSSCustomProperties = (theme: ChainTheme): CSSCustomProperties => {
  const properties: CSSCustomProperties = {};

  // Color palette properties - map to expected CSS variable names
  Object.entries(theme.palette).forEach(([key, value]) => {
    properties[`--color-${kebabCase(key)}`] = value;
  });

  // Typography properties
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    properties[`--font-size-${key}`] = value;
  });

  Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
    properties[`--font-weight-${key}`] = value.toString();
  });

  Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
    properties[`--line-height-${key}`] = value.toString();
  });

  Object.entries(theme.typography.letterSpacing).forEach(([key, value]) => {
    properties[`--letter-spacing-${key}`] = value;
  });

  // Font family
  properties['--font-family'] = theme.typography.fontFamily;

  // Spacing properties
  Object.entries(theme.spacing).forEach(([key, value]) => {
    properties[`--spacing-${key}`] = value;
  });

  // Border radius properties
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    properties[`--radius-${key}`] = value;
  });

  // Shadow properties
  Object.entries(theme.shadows).forEach(([key, value]) => {
    properties[`--shadow-${key}`] = value;
  });

  // Animation properties
  Object.entries(theme.animations).forEach(([animKey, animValue]) => {
    properties[`--animation-${kebabCase(animKey)}-duration`] = `${animValue.duration}ms`;
    properties[`--animation-${kebabCase(animKey)}-timing`] = animValue.timing;
    if (animValue.delay) {
      properties[`--animation-${kebabCase(animKey)}-delay`] = `${animValue.delay}ms`;
    }
  });

  // Additional CSS properties that the enhanced-theme.css expects
  properties['--gradient-primary'] = theme.palette.gradientPrimary;
  properties['--gradient-secondary'] = theme.palette.gradientSecondary;
  properties['--gradient-accent'] = theme.palette.gradientAccent;

  // Chain-specific properties
  properties['--chain-id'] = theme.id;
  properties['--chain-brand-color'] = theme.metadata.brandColor;

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `Generated ${Object.keys(properties).length} CSS custom properties for theme: ${theme.id}`
    );
    console.log('Sample properties:', {
      primary: properties['--color-primary'],
      background: properties['--color-background'],
      surface: properties['--color-surface'],
      text: properties['--color-text'],
    });
  }

  return properties;
};

// Apply CSS custom properties to document
export const applyCSSCustomProperties = (properties: CSSCustomProperties): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  Object.entries(properties).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};

// Remove CSS custom properties from document
export const removeCSSCustomProperties = (properties: CSSCustomProperties): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  Object.keys(properties).forEach((property) => {
    root.style.removeProperty(property);
  });
};

// Color manipulation utilities
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export const adjustOpacity = (color: string, opacity: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
};

export const lightenColor = (color: string, amount: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * amount));
  const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * amount));
  const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * amount));

  return rgbToHex(r, g, b);
};

export const darkenColor = (color: string, amount: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const r = Math.max(0, Math.floor(rgb.r * (1 - amount)));
  const g = Math.max(0, Math.floor(rgb.g * (1 - amount)));
  const b = Math.max(0, Math.floor(rgb.b * (1 - amount)));

  return rgbToHex(r, g, b);
};

// Enhanced theme validation with comprehensive checks
export const validateTheme = (theme: DeepPartial<ChainTheme>): ThemeValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!theme.id) errors.push('Theme ID is required');
  if (!theme.name) errors.push('Theme name is required');
  if (!theme.palette) errors.push('Theme palette is required');

  // Palette validation
  if (theme.palette) {
    const requiredColors = ['primary', 'secondary', 'accent', 'background', 'surface', 'text'];
    requiredColors.forEach((color) => {
      if (!theme.palette![color as keyof ColorPalette]) {
        errors.push(`Palette color '${color}' is required`);
      }
    });

    // Color format validation
    Object.entries(theme.palette).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        if (!isValidColor(value)) {
          warnings.push(`Color '${key}' may have invalid format: ${value}`);
        }
      }
    });

    // Accessibility validation
    if (theme.palette.text && theme.palette.background) {
      const contrast = getContrastRatio(theme.palette.text, theme.palette.background);
      if (contrast < 4.5) {
        warnings.push(
          `Text/background contrast ratio (${contrast.toFixed(2)}) is below WCAG AA standard (4.5)`
        );
      }
    }
  }

  // Component validation
  if (theme.components) {
    // Button validation
    if (theme.components?.button) {
      if (!theme.components.button.variants) {
        errors.push('Button component must have variants');
      } else {
        const requiredVariants: ComponentVariant[] = [
          'primary',
          'secondary',
          'accent',
          'ghost',
          'outline',
        ];
        requiredVariants.forEach((variant) => {
          if (theme.components?.button?.variants && !theme.components.button.variants[variant]) {
            warnings.push(`Button variant '${variant}' is missing`);
          }
        });
      }

      if (!theme.components.button.sizes) {
        errors.push('Button component must have sizes');
      } else {
        const requiredSizes: ComponentSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];
        requiredSizes.forEach((size) => {
          if (theme.components?.button?.sizes && !theme.components.button.sizes[size]) {
            warnings.push(`Button size '${size}' is missing`);
          }
        });
      }
    }

    // Card validation
    if (theme.components.card) {
      if (!theme.components.card.background) {
        errors.push('Card component must have background');
      }
      if (!theme.components.card.border) {
        warnings.push('Card component should have border');
      }
    }

    // Modal validation
    if (theme.components.modal) {
      if (!theme.components.modal.backdrop) {
        errors.push('Modal component must have backdrop');
      }
      if (!theme.components.modal.animations) {
        warnings.push('Modal component should have animations');
      }
    }
  }

  // Typography validation
  if (theme.typography) {
    if (!theme.typography.fontFamily) {
      warnings.push('Typography should have fontFamily');
    }
    if (!theme.typography.fontSize) {
      errors.push('Typography must have fontSize configuration');
    }
  }

  // Animation validation
  if (theme.animations) {
    Object.entries(theme.animations).forEach(([key, animation]) => {
      if (animation.duration && (animation.duration < 0 || animation.duration > 10000)) {
        warnings.push(`Animation '${key}' duration should be between 0-10000ms`);
      }
      if (animation.timing && !isValidAnimationTiming(animation.timing)) {
        warnings.push(`Animation '${key}' has invalid timing function: ${animation.timing}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// Enhanced validation helpers
const isValidAnimationTiming = (timing: string): boolean => {
  const validTimings = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'];
  return (
    validTimings.includes(timing) ||
    /^cubic-bezier\([\d.,\s-]+\)$/.test(timing) ||
    /^steps\(\d+/.test(timing)
  );
};

// Theme fallback mechanisms
export const createThemeFallback = (partialTheme: DeepPartial<ChainTheme>): ChainTheme => {
  const fallbackTheme = deepMerge(DEFAULT_THEME, partialTheme);

  // Ensure all required properties exist
  if (!fallbackTheme.id) fallbackTheme.id = 'fallback';
  if (!fallbackTheme.name) fallbackTheme.name = 'Fallback Theme';
  if (!fallbackTheme.displayName) fallbackTheme.displayName = fallbackTheme.name;
  if (!fallbackTheme.description) fallbackTheme.description = 'Auto-generated fallback theme';

  // Validate and fix palette
  const requiredPaletteKeys = ['primary', 'secondary', 'accent', 'background', 'surface', 'text'];
  requiredPaletteKeys.forEach((key) => {
    if (!fallbackTheme.palette[key as keyof ColorPalette]) {
      fallbackTheme.palette[key as keyof ColorPalette] =
        DEFAULT_THEME.palette[key as keyof ColorPalette];
    }
  });

  // Ensure component themes exist
  if (!fallbackTheme.components) {
    fallbackTheme.components = DEFAULT_THEME.components;
  }

  return fallbackTheme as ChainTheme;
};

// Safe theme getter with fallback
export const getSafeTheme = (chainId: string): ChainTheme => {
  try {
    if (chainId in CHAIN_THEMES) {
      const theme = CHAIN_THEMES[chainId as ChainId];
      const validation = validateTheme(theme);

      if (validation.isValid) {
        return theme;
      } else {
        console.warn(`Theme validation failed for ${chainId}:`, validation.errors);
        return createThemeFallback(theme);
      }
    }
  } catch (error) {
    console.error(`Error loading theme for ${chainId}:`, error);
  }

  return DEFAULT_THEME;
};

// Theme recovery utilities
export const repairTheme = (brokenTheme: DeepPartial<ChainTheme>): ChainTheme => {
  const validation = validateTheme(brokenTheme);

  if (validation.isValid) {
    return brokenTheme as ChainTheme;
  }

  console.warn('Repairing broken theme:', validation.errors);
  return createThemeFallback(brokenTheme);
};

// Color format validation
const isValidColor = (color: string): boolean => {
  // Check hex colors
  if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) return true;

  // Check rgb/rgba colors
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/.test(color)) return true;

  // Check hsl/hsla colors
  if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+)?\s*\)$/.test(color)) return true;

  // Check gradients
  if (color.includes('gradient')) return true;

  // Check CSS color names (basic check)
  const cssColors = ['transparent', 'inherit', 'currentColor'];
  if (cssColors.includes(color)) return true;

  return false;
};

// Theme merging utility
export const mergeThemes = (
  baseTheme: ChainTheme,
  overrides: DeepPartial<ChainTheme>
): ChainTheme => {
  return deepMerge(baseTheme, overrides) as ChainTheme;
};

// Deep merge utility

const deepMerge = (target: any, source: any): any => {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
};

// String utilities
const kebabCase = (str: string): string => {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
};

// Theme property getters
export const getThemeColor = (theme: ChainTheme, path: string): string => {
  const keys = path.split('.');

  let value: any = theme.palette;

  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) break;
  }

  return value || theme.palette.primary;
};

export const getThemeSpacing = (theme: ChainTheme, size: keyof ChainTheme['spacing']): string => {
  return theme.spacing[size] || theme.spacing.md;
};

export const getThemeRadius = (
  theme: ChainTheme,
  size: keyof ChainTheme['borderRadius']
): string => {
  return theme.borderRadius[size] || theme.borderRadius.md;
};

export const getThemeShadow = (theme: ChainTheme, type: keyof ChainTheme['shadows']): string => {
  return theme.shadows[type] || theme.shadows.md;
};

// Component theme getters
export const getButtonTheme = (
  theme: ChainTheme,
  variant: ComponentVariant = 'primary',
  size: ComponentSize = 'md'
) => {
  const buttonTheme = theme.components.button;
  return {
    variant: buttonTheme.variants[variant] || buttonTheme.variants.primary,
    size: buttonTheme.sizes[size] || buttonTheme.sizes.md,
    animations: buttonTheme.animations,
  };
};

export const getCardTheme = (theme: ChainTheme) => {
  return theme.components.card;
};

export const getModalTheme = (theme: ChainTheme) => {
  return theme.components.modal;
};

export const getInputTheme = (theme: ChainTheme) => {
  return theme.components.input;
};

// Theme switching utilities
export const createThemeTransition = (duration: number = 300): string => {
  const properties = ['background-color', 'border-color', 'color', 'box-shadow', 'opacity'];

  return properties.map((prop) => `${prop} ${duration}ms ease-in-out`).join(', ');
};

// Accessibility utilities
export const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const luminance1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const luminance2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const brightest = Math.max(luminance1, luminance2);
  const darkest = Math.min(luminance1, luminance2);

  return (brightest + 0.05) / (darkest + 0.05);
};

const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

export const isAccessibleContrast = (
  color1: string,
  color2: string,
  level: 'AA' | 'AAA' = 'AA'
): boolean => {
  const ratio = getContrastRatio(color1, color2);
  return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
};

// Performance utilities
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Export all utilities
export const themeUtils = {
  generateCSSCustomProperties,
  applyCSSCustomProperties,
  removeCSSCustomProperties,
  hexToRgb,
  rgbToHex,
  adjustOpacity,
  lightenColor,
  darkenColor,
  validateTheme,
  mergeThemes,
  getThemeColor,
  getThemeSpacing,
  getThemeRadius,
  getThemeShadow,
  getButtonTheme,
  getCardTheme,
  getModalTheme,
  getInputTheme,
  createThemeTransition,
  getContrastRatio,
  isAccessibleContrast,
  debounce,
  throttle,
};
