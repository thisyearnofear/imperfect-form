/**
 * Comprehensive Chain Theme System Types
 * 
 * This module defines all types for the enhanced chain-specific theming system.
 * It provides type safety and structure for themes, palettes, animations, and components.
 */

// Base chain identifiers
export type ChainId = "base" | "polygon" | "celo" | "monad";

// Animation timing functions and configurations
export type AnimationTiming = "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out" | "bounce" | "elastic" | string;

export interface AnimationConfig {
  duration: number;
  timing: AnimationTiming;
  delay?: number;
  iterations?: number | "infinite";
}

// Color palette structure
export interface ColorPalette {
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Secondary colors
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  
  // Accent colors
  accent: string;
  accentLight: string;
  accentDark: string;
  
  // Background colors
  background: string;
  backgroundLight: string;
  backgroundDark: string;
  
  // Surface colors (cards, modals, etc.)
  surface: string;
  surfaceLight: string;
  surfaceDark: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // State colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Interactive states
  hover: string;
  active: string;
  focus: string;
  disabled: string;
  
  // Gradients
  gradientPrimary: string;
  gradientSecondary: string;
  gradientAccent: string;
}

// Typography configuration
export interface TypographyConfig {
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
  letterSpacing: {
    tight: string;
    normal: string;
    wide: string;
  };
}

// Spacing system
export interface SpacingConfig {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
  "4xl": string;
}

// Border radius configuration
export interface BorderRadiusConfig {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

// Shadow configuration
export interface ShadowConfig {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  glow: string;
  colored: string;
}

// Component variant types
export type ComponentVariant = "primary" | "secondary" | "accent" | "ghost" | "outline";
export type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl";

// Component-specific theme configurations
export interface ButtonTheme {
  variants: Record<ComponentVariant, {
    background: string;
    color: string;
    border: string;
    hover: {
      background: string;
      color: string;
      border: string;
      transform: string;
    };
    active: {
      background: string;
      color: string;
      border: string;
      transform: string;
    };
    disabled: {
      background: string;
      color: string;
      border: string;
      opacity: number;
    };
  }>;
  sizes: Record<ComponentSize, {
    padding: string;
    fontSize: string;
    borderRadius: string;
    minHeight: string;
  }>;
  animations: {
    hover: AnimationConfig;
    active: AnimationConfig;
    focus: AnimationConfig;
  };
}

export interface CardTheme {
  background: string;
  border: string;
  borderRadius: string;
  shadow: string;
  padding: string;
  hover: {
    background: string;
    border: string;
    shadow: string;
    transform: string;
  };
}

export interface ModalTheme {
  backdrop: string;
  background: string;
  border: string;
  borderRadius: string;
  shadow: string;
  padding: string;
  animations: {
    enter: AnimationConfig;
    exit: AnimationConfig;
  };
}

export interface InputTheme {
  background: string;
  border: string;
  borderRadius: string;
  color: string;
  placeholder: string;
  focus: {
    background: string;
    border: string;
    shadow: string;
  };
  error: {
    border: string;
    color: string;
  };
}

// Ambient background configuration
export interface AmbientConfig {
  shapes: {
    count: number;
    types: string[];
    size: {
      min: number;
      max: number;
    };
    opacity: {
      min: number;
      max: number;
    };
    blur: number;
  };
  animations: {
    duration: number;
    timing: AnimationTiming;
    variations: string[];
  };
  colors: string[];
}

// Complete chain theme structure
export interface ChainTheme {
  id: ChainId;
  name: string;
  displayName: string;
  description: string;
  
  // Core design tokens
  palette: ColorPalette;
  typography: TypographyConfig;
  spacing: SpacingConfig;
  borderRadius: BorderRadiusConfig;
  shadows: ShadowConfig;
  
  // Component themes
  components: {
    button: ButtonTheme;
    card: CardTheme;
    modal: ModalTheme;
    input: InputTheme;
  };
  
  // Ambient background
  ambient: AmbientConfig;
  
  // Global animations
  animations: {
    pageTransition: AnimationConfig;
    modalTransition: AnimationConfig;
    hoverTransition: AnimationConfig;
    focusTransition: AnimationConfig;
  };
  
  // Chain-specific metadata
  metadata: {
    brandColor: string;
    logoUrl: string;
    networkType: "mainnet" | "testnet";
    chainId: number;
    rpcUrl: string;
    blockExplorer: string;
  };
}

// Theme context types
export interface ThemeContextValue {
  currentTheme: ChainTheme;
  setTheme: (chainId: ChainId) => void;
  isLoading: boolean;
  isHydrated: boolean;
  themeOptions: ThemeOptions;
  updateThemeOptions: (options: Partial<ThemeOptions>) => void;
  
  // Utility functions
  getColor: (path: string) => string;
  getSpacing: (size: keyof SpacingConfig) => string;
  getRadius: (size: keyof BorderRadiusConfig) => string;
  getShadow: (type: keyof ShadowConfig) => string;
  
  // Component theme getters
  getButtonTheme: (variant: ComponentVariant, size: ComponentSize) => {
    variant: ButtonTheme['variants'][ComponentVariant];
    size: ButtonTheme['sizes'][ComponentSize];
    animations: ButtonTheme['animations'];
  };
  getCardTheme: () => CardTheme;
  getModalTheme: () => ModalTheme;
  getInputTheme: () => InputTheme;
  
  // CSS Properties
  currentProperties: CSSCustomProperties;
  generateProperties: () => CSSCustomProperties;
  
  // Theme validation
  validateTheme: () => ThemeValidationResult;
  
  // Available themes
  availableThemes: ChainId[];
  
  // Theme utilities
  utils: {
    generateCSSCustomProperties: (theme: ChainTheme) => CSSCustomProperties;
    applyCSSCustomProperties: (properties: CSSCustomProperties) => void;
    removeCSSCustomProperties: (properties: CSSCustomProperties) => void;
    hexToRgb: (hex: string) => { r: number; g: number; b: number } | null;
    rgbToHex: (r: number, g: number, b: number) => string;
    adjustOpacity: (color: string, opacity: number) => string;
    lightenColor: (color: string, amount: number) => string;
    darkenColor: (color: string, amount: number) => string;
    validateTheme: (theme: DeepPartial<ChainTheme>) => ThemeValidationResult;
    mergeThemes: (baseTheme: ChainTheme, overrides: DeepPartial<ChainTheme>) => ChainTheme;
    getThemeColor: (theme: ChainTheme, path: string) => string;
    getThemeSpacing: (theme: ChainTheme, size: keyof SpacingConfig) => string;
    getThemeRadius: (theme: ChainTheme, size: keyof BorderRadiusConfig) => string;
    getThemeShadow: (theme: ChainTheme, type: keyof ShadowConfig) => string;
    getButtonTheme: (theme: ChainTheme, variant?: ComponentVariant, size?: ComponentSize) => {
      variant: ButtonTheme['variants'][ComponentVariant];
      size: ButtonTheme['sizes'][ComponentSize];
      animations: ButtonTheme['animations'];
    };
    getCardTheme: (theme: ChainTheme) => CardTheme;
    getModalTheme: (theme: ChainTheme) => ModalTheme;
    getInputTheme: (theme: ChainTheme) => InputTheme;
    createThemeTransition: (duration?: number) => string;
    getContrastRatio: (color1: string, color2: string) => number;
    isAccessibleContrast: (color1: string, color2: string, level?: 'AA' | 'AAA') => boolean;
    debounce: <T extends (...args: unknown[]) => unknown>(func: T, wait: number) => ((...args: Parameters<T>) => void);
    throttle: <T extends (...args: unknown[]) => unknown>(func: T, limit: number) => ((...args: Parameters<T>) => void);
  };
}

// Theme configuration options
export interface ThemeOptions {
  enableAnimations: boolean;
  enableAmbientBackground: boolean;
  enableTransitions: boolean;
  respectReducedMotion: boolean;
  enableHighContrast: boolean;
  customOverrides?: Partial<ChainTheme>;
}

// Theme validation types
export interface ThemeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// CSS custom properties mapping
export interface CSSCustomProperties {
  [key: string]: string;
}

// Export utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ThemeKey = keyof ChainTheme;
export type PaletteKey = keyof ColorPalette;
export type ComponentThemeKey = keyof ChainTheme['components'];

// Re-export NetworkType for compatibility
export type { NetworkType } from './score';