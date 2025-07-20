/**
 * Comprehensive Chain Theme Configurations
 * 
 * This module contains the complete theme definitions for each supported blockchain.
 * Each theme includes colors, typography, spacing, components, animations, and metadata.
 */

import type { ChainTheme, ChainId, AnimationConfig } from '@/types/theme';

// Common animation configurations
const commonAnimations = {
  pageTransition: {
    duration: 300,
    timing: 'ease-in-out' as const,
    delay: 0,
  },
  modalTransition: {
    duration: 200,
    timing: 'ease-out' as const,
    delay: 0,
  },
  hoverTransition: {
    duration: 150,
    timing: 'ease-out' as const,
    delay: 0,
  },
  focusTransition: {
    duration: 100,
    timing: 'ease-out' as const,
    delay: 0,
  },
} satisfies Record<string, AnimationConfig>;

// Advanced animation configurations for enhanced interactions
export const advancedAnimations = {
  // Micro-interactions
  microBounce: {
    duration: 200,
    timing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    delay: 0,
    iterations: 1
  },
  
  microPulse: {
    duration: 300,
    timing: 'ease-in-out',
    delay: 0,
    iterations: 1
  },
  
  // Page transitions
  slideInRight: {
    duration: 400,
    timing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    delay: 0,
    iterations: 1
  },
  
  slideInLeft: {
    duration: 400,
    timing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    delay: 0,
    iterations: 1
  },
  
  fadeInUp: {
    duration: 500,
    timing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    delay: 0,
    iterations: 1
  },
  
  // Modal animations
  scaleIn: {
    duration: 300,
    timing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    delay: 0,
    iterations: 1
  },
  
  scaleOut: {
    duration: 200,
    timing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
    delay: 0,
    iterations: 1
  },
  
  // Loading animations
  spin: {
    duration: 1000,
    timing: 'linear',
    delay: 0,
    iterations: 'infinite'
  },
  
  pulse: {
    duration: 2000,
    timing: 'ease-in-out',
    delay: 0,
    iterations: 'infinite'
  },
  
  // Chain-specific animations
  baseGlow: {
    duration: 3000,
    timing: 'ease-in-out',
    delay: 0,
    iterations: 'infinite'
  },
  
  polygonShimmer: {
    duration: 2500,
    timing: 'linear',
    delay: 0,
    iterations: 'infinite'
  },
  
  celoWave: {
    duration: 4000,
    timing: 'ease-in-out',
    delay: 0,
    iterations: 'infinite'
  },
  
  monadFlicker: {
    duration: 1500,
    timing: 'steps(5, end)',
    delay: 0,
    iterations: 'infinite'
  }
} satisfies Record<string, AnimationConfig>;

// Common typography configuration
const commonTypography = {
  fontFamily: '"Press Start 2P", cursive',
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
  },
};

// Common spacing configuration
const commonSpacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
  '4xl': '6rem',
};

// Common border radius configuration
const commonBorderRadius = {
  none: '0',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  full: '9999px',
};

// Base Chain Theme
const baseTheme: ChainTheme = {
  id: 'base',
  name: 'Base',
  displayName: 'Base Mainnet',
  description: 'Professional, clean, and tech-focused design inspired by Base\'s blue branding',
  
  palette: {
    // Primary colors - Base blue
    primary: '#0052ff',
    primaryLight: '#3b82f6',
    primaryDark: '#1e40af',
    
    // Secondary colors - Complementary blues
    secondary: '#0ea5e9',
    secondaryLight: '#38bdf8',
    secondaryDark: '#0284c7',
    
    // Accent colors - Bright highlights
    accent: '#00d4ff',
    accentLight: '#7dd3fc',
    accentDark: '#0891b2',
    
    // Background colors - Deep blue tones
    background: '#001a4d',
    backgroundLight: '#002966',
    backgroundDark: '#000d26',
    
    // Surface colors - Cards and modals
    surface: '#003580',
    surfaceLight: '#0047a3',
    surfaceDark: '#00235c',
    
    // Text colors
    text: '#ffffff',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    
    // State colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    // Interactive states
    hover: '#1d4ed8',
    active: '#1e3a8a',
    focus: '#3b82f6',
    disabled: '#64748b',
    
    // Gradients
    gradientPrimary: 'linear-gradient(135deg, #0052ff 0%, #3b82f6 100%)',
    gradientSecondary: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
    gradientAccent: 'linear-gradient(135deg, #00d4ff 0%, #7dd3fc 100%)',
  },
  
  typography: commonTypography,
  spacing: commonSpacing,
  borderRadius: commonBorderRadius,
  
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(0, 82, 255, 0.3)',
    colored: '0 4px 14px 0 rgba(0, 82, 255, 0.2)',
  },
  
  components: {
    button: {
      variants: {
        primary: {
          background: '#0052ff',
          color: '#ffffff',
          border: '2px solid #0052ff',
          hover: {
            background: '#1d4ed8',
            color: '#ffffff',
            border: '2px solid #1d4ed8',
            transform: 'translateY(-2px)',
          },
          active: {
            background: '#1e3a8a',
            color: '#ffffff',
            border: '2px solid #1e3a8a',
            transform: 'translateY(0)',
          },
          disabled: {
            background: '#64748b',
            color: '#94a3b8',
            border: '2px solid #64748b',
            opacity: 0.6,
          },
        },
        secondary: {
          background: 'transparent',
          color: '#0052ff',
          border: '2px solid #0052ff',
          hover: {
            background: '#0052ff',
            color: '#ffffff',
            border: '2px solid #0052ff',
            transform: 'translateY(-2px)',
          },
          active: {
            background: '#1e3a8a',
            color: '#ffffff',
            border: '2px solid #1e3a8a',
            transform: 'translateY(0)',
          },
          disabled: {
            background: 'transparent',
            color: '#64748b',
            border: '2px solid #64748b',
            opacity: 0.6,
          },
        },
        accent: {
          background: '#00d4ff',
          color: '#001a4d',
          border: '2px solid #00d4ff',
          hover: {
            background: '#7dd3fc',
            color: '#001a4d',
            border: '2px solid #7dd3fc',
            transform: 'translateY(-2px)',
          },
          active: {
            background: '#0891b2',
            color: '#ffffff',
            border: '2px solid #0891b2',
            transform: 'translateY(0)',
          },
          disabled: {
            background: '#64748b',
            color: '#94a3b8',
            border: '2px solid #64748b',
            opacity: 0.6,
          },
        },
        ghost: {
          background: 'transparent',
          color: '#ffffff',
          border: '2px solid transparent',
          hover: {
            background: 'rgba(0, 82, 255, 0.1)',
            color: '#ffffff',
            border: '2px solid rgba(0, 82, 255, 0.3)',
            transform: 'translateY(-1px)',
          },
          active: {
            background: 'rgba(0, 82, 255, 0.2)',
            color: '#ffffff',
            border: '2px solid rgba(0, 82, 255, 0.5)',
            transform: 'translateY(0)',
          },
          disabled: {
            background: 'transparent',
            color: '#64748b',
            border: '2px solid transparent',
            opacity: 0.6,
          },
        },
        outline: {
          background: 'transparent',
          color: '#e2e8f0',
          border: '2px solid #475569',
          hover: {
            background: 'rgba(226, 232, 240, 0.1)',
            color: '#ffffff',
            border: '2px solid #e2e8f0',
            transform: 'translateY(-1px)',
          },
          active: {
            background: 'rgba(226, 232, 240, 0.2)',
            color: '#ffffff',
            border: '2px solid #ffffff',
            transform: 'translateY(0)',
          },
          disabled: {
            background: 'transparent',
            color: '#64748b',
            border: '2px solid #64748b',
            opacity: 0.6,
          },
        },
      },
      sizes: {
        xs: {
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          borderRadius: '0.25rem',
          minHeight: '1.5rem',
        },
        sm: {
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          borderRadius: '0.375rem',
          minHeight: '2rem',
        },
        md: {
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          borderRadius: '0.5rem',
          minHeight: '2.5rem',
        },
        lg: {
          padding: '1rem 2rem',
          fontSize: '1.125rem',
          borderRadius: '0.5rem',
          minHeight: '3rem',
        },
        xl: {
          padding: '1.25rem 2.5rem',
          fontSize: '1.25rem',
          borderRadius: '0.75rem',
          minHeight: '3.5rem',
        },
      },
      animations: {
        hover: {
          duration: 150,
          timing: 'ease-out',
          delay: 0,
        },
        active: {
          duration: 100,
          timing: 'ease-in',
          delay: 0,
        },
        focus: {
          duration: 100,
          timing: 'ease-out',
          delay: 0,
        },
      },
    },
    card: {
      background: '#003580',
      border: '2px solid #0052ff',
      borderRadius: '0.75rem',
      shadow: '0 4px 14px 0 rgba(0, 82, 255, 0.2)',
      padding: '1.5rem',
      hover: {
        background: '#0047a3',
        border: '2px solid #3b82f6',
        shadow: '0 8px 25px 0 rgba(0, 82, 255, 0.3)',
        transform: 'translateY(-4px)',
      },
    },
    modal: {
      backdrop: 'rgba(0, 26, 77, 0.8)',
      background: '#001a4d',
      border: '2px solid #0052ff',
      borderRadius: '1rem',
      shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
      padding: '2rem',
      animations: {
        enter: {
          duration: 200,
          timing: 'ease-out',
          delay: 0,
        },
        exit: {
          duration: 150,
          timing: 'ease-in',
          delay: 0,
        },
      },
    },
    input: {
      background: '#002966',
      border: '2px solid #475569',
      borderRadius: '0.5rem',
      color: '#ffffff',
      placeholder: '#94a3b8',
      focus: {
        background: '#003580',
        border: '2px solid #0052ff',
        shadow: '0 0 0 3px rgba(0, 82, 255, 0.1)',
      },
      error: {
        border: '2px solid #ef4444',
        color: '#fecaca',
      },
    },
  },
  
  ambient: {
    shapes: {
      count: 6,
      types: ['square', 'circle'],
      size: {
        min: 60,
        max: 120,
      },
      opacity: {
        min: 0.08,
        max: 0.15,
      },
      blur: 2,
    },
    animations: {
      duration: 20,
      timing: 'linear',
      variations: ['float-square', 'float-circle'],
    },
    colors: ['#0052ff', '#3b82f6', '#00d4ff'],
  },
  
  animations: commonAnimations,
  
  metadata: {
    brandColor: '#0052ff',
    logoUrl: '/base-logo.svg',
    networkType: 'mainnet',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
  },
};

// Celo Chain Theme
const celoTheme: ChainTheme = {
  id: 'celo',
  name: 'Celo',
  displayName: 'Celo Mainnet',
  description: 'Warm, organic, and community-focused design with yellow and green accents',
  
  palette: {
    // Primary colors - Bright, distinctive yellow
    primary: '#ffeb3b',
    primaryLight: '#fff176',
    primaryDark: '#fbc02d',
    
    // Secondary colors - Celo green
    secondary: '#4caf50',
    secondaryLight: '#81c784',
    secondaryDark: '#388e3c',
    
    // Accent colors - Electric yellow highlights
    accent: '#ffff00',
    accentLight: '#ffff8d',
    accentDark: '#f57f17',
    
    // Background colors - Pure black for maximum contrast
    background: '#000000',
    backgroundLight: '#1a1a1a',
    backgroundDark: '#000000',
    
    // Surface colors - Dark with yellow accents
    surface: '#1a1a1a',
    surfaceLight: '#2d2d2d',
    surfaceDark: '#0d0d0d',
    
    // Text colors
    text: '#ffffff',
    textSecondary: '#fef3c7',
    textMuted: '#d4d4aa',
    
    // State colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#eab308',
    
    // Interactive states
    hover: '#fff176',
    active: '#fbc02d',
    focus: '#ffeb3b',
    disabled: '#666666',
    
    // Gradients
    gradientPrimary: 'linear-gradient(135deg, #ffeb3b 0%, #fff176 100%)',
    gradientSecondary: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
    gradientAccent: 'linear-gradient(135deg, #ffff00 0%, #ffff8d 100%)',
  },
  
  typography: commonTypography,
  spacing: commonSpacing,
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(255, 235, 59, 0.6)',
    colored: '0 4px 14px 0 rgba(255, 235, 59, 0.4)',
  },
  
  components: {
    button: {
      variants: {
        primary: {
          background: '#ffeb3b',
          color: '#000000',
          border: '2px solid #ffeb3b',
          hover: {
            background: '#fff176',
            color: '#000000',
            border: '2px solid #fff176',
            transform: 'translateY(-2px) scale(1.02)',
          },
          active: {
            background: '#fbc02d',
            color: '#000000',
            border: '2px solid #fbc02d',
            transform: 'translateY(0) scale(1)',
          },
          disabled: {
            background: '#78716c',
            color: '#d4d4aa',
            border: '2px solid #78716c',
            opacity: 0.6,
          },
        },
        secondary: {
          background: '#4caf50',
          color: '#ffffff',
          border: '2px solid #4caf50',
          hover: {
            background: '#81c784',
            color: '#000000',
            border: '2px solid #81c784',
            transform: 'translateY(-2px) scale(1.02)',
          },
          active: {
            background: '#388e3c',
            color: '#ffffff',
            border: '2px solid #388e3c',
            transform: 'translateY(0) scale(1)',
          },
          disabled: {
            background: '#78716c',
            color: '#d4d4aa',
            border: '2px solid #78716c',
            opacity: 0.6,
          },
        },
        accent: {
          background: '#ffff00',
          color: '#000000',
          border: '2px solid #ffff00',
          hover: {
            background: '#ffff8d',
            color: '#000000',
            border: '2px solid #ffff8d',
            transform: 'translateY(-2px) scale(1.02)',
          },
          active: {
            background: '#f57f17',
            color: '#ffffff',
            border: '2px solid #f57f17',
            transform: 'translateY(0) scale(1)',
          },
          disabled: {
            background: '#78716c',
            color: '#d4d4aa',
            border: '2px solid #78716c',
            opacity: 0.6,
          },
        },
        ghost: {
          background: 'transparent',
          color: '#ffeb3b',
          border: '2px solid transparent',
          hover: {
            background: 'rgba(255, 235, 59, 0.1)',
            color: '#fff176',
            border: '2px solid rgba(255, 235, 59, 0.3)',
            transform: 'translateY(-1px)',
          },
          active: {
            background: 'rgba(255, 235, 59, 0.2)',
            color: '#ffeb3b',
            border: '2px solid rgba(255, 235, 59, 0.5)',
            transform: 'translateY(0)',
          },
          disabled: {
            background: 'transparent',
            color: '#78716c',
            border: '2px solid transparent',
            opacity: 0.6,
          },
        },
        outline: {
          background: 'transparent',
          color: '#ffeb3b',
          border: '2px solid #666666',
          hover: {
            background: 'rgba(255, 235, 59, 0.1)',
            color: '#ffffff',
            border: '2px solid #ffeb3b',
            transform: 'translateY(-1px)',
          },
          active: {
            background: 'rgba(255, 235, 59, 0.2)',
            color: '#ffffff',
            border: '2px solid #ffffff',
            transform: 'translateY(0)',
          },
          disabled: {
            background: 'transparent',
            color: '#666666',
            border: '2px solid #666666',
            opacity: 0.6,
          },
        },
      },
      sizes: {
        xs: {
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          borderRadius: '0.375rem',
          minHeight: '1.5rem',
        },
        sm: {
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          borderRadius: '0.5rem',
          minHeight: '2rem',
        },
        md: {
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          borderRadius: '0.75rem',
          minHeight: '2.5rem',
        },
        lg: {
          padding: '1rem 2rem',
          fontSize: '1.125rem',
          borderRadius: '0.75rem',
          minHeight: '3rem',
        },
        xl: {
          padding: '1.25rem 2.5rem',
          fontSize: '1.25rem',
          borderRadius: '1rem',
          minHeight: '3.5rem',
        },
      },
      animations: {
        hover: {
          duration: 200,
          timing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          delay: 0,
        },
        active: {
          duration: 150,
          timing: 'ease-in',
          delay: 0,
        },
        focus: {
          duration: 100,
          timing: 'ease-out',
          delay: 0,
        },
      },
    },
    card: {
      background: '#1a1a1a',
      border: '2px solid #ffeb3b',
      borderRadius: '1rem',
      shadow: '0 4px 14px 0 rgba(255, 235, 59, 0.4)',
      padding: '1.5rem',
      hover: {
        background: '#2d2d2d',
        border: '2px solid #fff176',
        shadow: '0 8px 25px 0 rgba(255, 235, 59, 0.6)',
        transform: 'translateY(-4px) rotate(0.5deg)',
      },
    },
    modal: {
      backdrop: 'rgba(0, 0, 0, 0.9)',
      background: '#000000',
      border: '2px solid #ffeb3b',
      borderRadius: '1rem',
      shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      padding: '2rem',
      animations: {
        enter: {
          duration: 250,
          timing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          delay: 0,
        },
        exit: {
          duration: 200,
          timing: 'ease-in',
          delay: 0,
        },
      },
    },
    input: {
      background: '#1a1a1a',
      border: '2px solid #666666',
      borderRadius: '0.75rem',
      color: '#ffffff',
      placeholder: '#cccccc',
      focus: {
        background: '#2d2d2d',
        border: '2px solid #ffeb3b',
        shadow: '0 0 0 3px rgba(255, 235, 59, 0.2)',
      },
      error: {
        border: '2px solid #ef4444',
        color: '#fecaca',
      },
    },
  },
  
  ambient: {
    shapes: {
      count: 8,
      types: ['circle', 'circle', 'circle'],
      size: {
        min: 70,
        max: 140,
      },
      opacity: {
        min: 0.1,
        max: 0.18,
      },
      blur: 2.5,
    },
    animations: {
      duration: 25,
      timing: 'ease-in-out',
      variations: ['float-circle'],
    },
    colors: ['#ffeb3b', '#4caf50', '#ffff00'],
  },
  
  animations: {
    pageTransition: {
      duration: 350,
      timing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      delay: 0,
    },
    modalTransition: {
      duration: 250,
      timing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      delay: 0,
    },
    hoverTransition: {
      duration: 200,
      timing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      delay: 0,
    },
    focusTransition: {
      duration: 150,
      timing: 'ease-out',
      delay: 0,
    },
  },
  
  metadata: {
    brandColor: '#ffeb3b',
    logoUrl: '/celo-logo.svg',
    networkType: 'mainnet',
    chainId: 42220,
    rpcUrl: 'https://forno.celo.org',
    blockExplorer: 'https://celoscan.io',
  },
};

// Polygon Chain Theme
const polygonTheme: ChainTheme = {
  id: 'polygon',
  name: 'Polygon',
  displayName: 'Polygon Mainnet',
  description: 'Gaming-inspired design with sharp angles, purple gradients, and geometric patterns',
  
  palette: {
    // Primary colors - Polygon purple/pink
    primary: '#e879f9',
    primaryLight: '#f0abfc',
    primaryDark: '#c026d3',
    
    // Secondary colors - Deep purple
    secondary: '#8247e5',
    secondaryLight: '#a855f7',
    secondaryDark: '#6d28d9',
    
    // Accent colors - Bright pink
    accent: '#f472b6',
    accentLight: '#f9a8d4',
    accentDark: '#ec4899',
    
    // Background colors - Deep purple tones
    background: '#2d1b4d',
    backgroundLight: '#3d2966',
    backgroundDark: '#1a0f33',
    
    // Surface colors
    surface: '#4c3680',
    surfaceLight: '#6b46c1',
    surfaceDark: '#362459',
    
    // Text colors
    text: '#ffffff',
    textSecondary: '#f3e8ff',
    textMuted: '#c4b5fd',
    
    // State colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#8b5cf6',
    
    // Interactive states
    hover: '#f0abfc',
    active: '#c026d3',
    focus: '#e879f9',
    disabled: '#6b7280',
    
    // Gradients
    gradientPrimary: 'linear-gradient(135deg, #e879f9 0%, #f0abfc 100%)',
    gradientSecondary: 'linear-gradient(135deg, #8247e5 0%, #a855f7 100%)',
    gradientAccent: 'linear-gradient(135deg, #f472b6 0%, #f9a8d4 100%)',
  },
  
  typography: commonTypography,
  spacing: commonSpacing,
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.375rem',
    xl: '0.5rem',
    full: '9999px',
  },
  
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(232, 121, 249, 0.4)',
    colored: '0 4px 14px 0 rgba(232, 121, 249, 0.3)',
  },
  
  components: {
    button: {
      variants: {
        primary: {
          background: 'linear-gradient(135deg, #e879f9 0%, #f0abfc 100%)',
          color: '#1a0f33',
          border: '2px solid #e879f9',
          hover: {
            background: 'linear-gradient(135deg, #f0abfc 0%, #fbbf24 100%)',
            color: '#1a0f33',
            border: '2px solid #f0abfc',
            transform: 'translateY(-3px) skewX(-2deg)',
          },
          active: {
            background: 'linear-gradient(135deg, #c026d3 0%, #e879f9 100%)',
            color: '#ffffff',
            border: '2px solid #c026d3',
            transform: 'translateY(0) skewX(0deg)',
          },
          disabled: {
            background: '#6b7280',
            color: '#c4b5fd',
            border: '2px solid #6b7280',
            opacity: 0.6,
          },
        },
        secondary: {
          background: 'linear-gradient(135deg, #8247e5 0%, #a855f7 100%)',
          color: '#ffffff',
          border: '2px solid #8247e5',
          hover: {
            background: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)',
            color: '#ffffff',
            border: '2px solid #a855f7',
            transform: 'translateY(-3px) skewX(-2deg)',
          },
          active: {
            background: 'linear-gradient(135deg, #6d28d9 0%, #8247e5 100%)',
            color: '#ffffff',
            border: '2px solid #6d28d9',
            transform: 'translateY(0) skewX(0deg)',
          },
          disabled: {
            background: '#6b7280',
            color: '#c4b5fd',
            border: '2px solid #6b7280',
            opacity: 0.6,
          },
        },
        accent: {
          background: 'linear-gradient(135deg, #f472b6 0%, #f9a8d4 100%)',
          color: '#1a0f33',
          border: '2px solid #f472b6',
          hover: {
            background: 'linear-gradient(135deg, #f9a8d4 0%, #fbcfe8 100%)',
            color: '#1a0f33',
            border: '2px solid #f9a8d4',
            transform: 'translateY(-3px) skewX(-2deg)',
          },
          active: {
            background: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
            color: '#ffffff',
            border: '2px solid #ec4899',
            transform: 'translateY(0) skewX(0deg)',
          },
          disabled: {
            background: '#6b7280',
            color: '#c4b5fd',
            border: '2px solid #6b7280',
            opacity: 0.6,
          },
        },
        ghost: {
          background: 'transparent',
          color: '#f3e8ff',
          border: '2px solid transparent',
          hover: {
            background: 'rgba(232, 121, 249, 0.1)',
            color: '#f0abfc',
            border: '2px solid rgba(232, 121, 249, 0.3)',
            transform: 'translateY(-2px) skewX(-1deg)',
          },
          active: {
            background: 'rgba(232, 121, 249, 0.2)',
            color: '#e879f9',
            border: '2px solid rgba(232, 121, 249, 0.5)',
            transform: 'translateY(0) skewX(0deg)',
          },
          disabled: {
            background: 'transparent',
            color: '#6b7280',
            border: '2px solid transparent',
            opacity: 0.6,
          },
        },
        outline: {
          background: 'transparent',
          color: '#f3e8ff',
          border: '2px solid #6b7280',
          hover: {
            background: 'rgba(243, 232, 255, 0.1)',
            color: '#ffffff',
            border: '2px solid #f3e8ff',
            transform: 'translateY(-2px) skewX(-1deg)',
          },
          active: {
            background: 'rgba(243, 232, 255, 0.2)',
            color: '#ffffff',
            border: '2px solid #ffffff',
            transform: 'translateY(0) skewX(0deg)',
          },
          disabled: {
            background: 'transparent',
            color: '#6b7280',
            border: '2px solid #6b7280',
            opacity: 0.6,
          },
        },
      },
      sizes: {
        xs: {
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          borderRadius: '0.25rem',
          minHeight: '1.5rem',
        },
        sm: {
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          borderRadius: '0.25rem',
          minHeight: '2rem',
        },
        md: {
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          borderRadius: '0.375rem',
          minHeight: '2.5rem',
        },
        lg: {
          padding: '1rem 2rem',
          fontSize: '1.125rem',
          borderRadius: '0.375rem',
          minHeight: '3rem',
        },
        xl: {
          padding: '1.25rem 2.5rem',
          fontSize: '1.25rem',
          borderRadius: '0.5rem',
          minHeight: '3.5rem',
        },
      },
      animations: {
        hover: {
          duration: 200,
          timing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          delay: 0,
        },
        active: {
          duration: 100,
          timing: 'ease-in',
          delay: 0,
        },
        focus: {
          duration: 100,
          timing: 'ease-out',
          delay: 0,
        },
      },
    },
    card: {
      background: '#4c3680',
      border: '2px solid #e879f9',
      borderRadius: '0.5rem',
      shadow: '0 4px 14px 0 rgba(232, 121, 249, 0.3)',
      padding: '1.5rem',
      hover: {
        background: '#6b46c1',
        border: '2px solid #f0abfc',
        shadow: '0 8px 25px 0 rgba(232, 121, 249, 0.4)',
        transform: 'translateY(-4px) skewX(-1deg)',
      },
    },
    modal: {
      backdrop: 'rgba(45, 27, 77, 0.8)',
      background: '#2d1b4d',
      border: '2px solid #e879f9',
      borderRadius: '0.75rem',
      shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
      padding: '2rem',
      animations: {
        enter: {
          duration: 200,
          timing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          delay: 0,
        },
        exit: {
          duration: 150,
          timing: 'ease-in',
          delay: 0,
        },
      },
    },
    input: {
      background: '#3d2966',
      border: '2px solid #6b7280',
      borderRadius: '0.375rem',
      color: '#ffffff',
      placeholder: '#c4b5fd',
      focus: {
        background: '#4c3680',
        border: '2px solid #e879f9',
        shadow: '0 0 0 3px rgba(232, 121, 249, 0.1)',
      },
      error: {
        border: '2px solid #ef4444',
        color: '#fecaca',
      },
    },
  },
  
  ambient: {
    shapes: {
      count: 7,
      types: ['hexagon'],
      size: {
        min: 80,
        max: 160,
      },
      opacity: {
        min: 0.12,
        max: 0.18,
      },
      blur: 2,
    },
    animations: {
      duration: 20,
      timing: 'linear',
      variations: ['float-hexagon'],
    },
    colors: ['#e879f9', '#8247e5', '#f472b6'],
  },
  
  animations: {
    pageTransition: {
      duration: 250,
      timing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      delay: 0,
    },
    modalTransition: {
      duration: 200,
      timing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      delay: 0,
    },
    hoverTransition: {
      duration: 200,
      timing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      delay: 0,
    },
    focusTransition: {
      duration: 100,
      timing: 'ease-out',
      delay: 0,
    },
  },
  
  metadata: {
    brandColor: '#e879f9',
    logoUrl: '/polygon-logo.svg',
    networkType: 'mainnet',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
  },
};

// Monad Chain Theme
const monadTheme: ChainTheme = {
  id: 'monad',
  name: 'Monad',
  displayName: 'Monad Testnet',
  description: 'Ultra-minimal, monochrome, developer-focused design with sharp edges and clean lines',
  
  palette: {
    // Primary colors - Monochrome grays
    primary: '#555555',
    primaryLight: '#737373',
    primaryDark: '#404040',
    
    // Secondary colors - Lighter grays
    secondary: '#a3a3a3',
    secondaryLight: '#d4d4d4',
    secondaryDark: '#737373',
    
    // Accent colors - White highlights
    accent: '#ffffff',
    accentLight: '#f5f5f5',
    accentDark: '#e5e5e5',
    
    // Background colors - Deep blacks
    background: '#000000',
    backgroundLight: '#171717',
    backgroundDark: '#000000',
    
    // Surface colors
    surface: '#262626',
    surfaceLight: '#404040',
    surfaceDark: '#171717',
    
    // Text colors
    text: '#ffffff',
    textSecondary: '#d4d4d4',
    textMuted: '#a3a3a3',
    
    // State colors
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    info: '#a3a3a3',
    
    // Interactive states
    hover: '#737373',
    active: '#404040',
    focus: '#555555',
    disabled: '#525252',
    
    // Gradients
    gradientPrimary: 'linear-gradient(135deg, #555555 0%, #737373 100%)',
    gradientSecondary: 'linear-gradient(135deg, #a3a3a3 0%, #d4d4d4 100%)',
    gradientAccent: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
  },
  
  typography: commonTypography,
  spacing: commonSpacing,
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.375rem',
    xl: '0.5rem',
    full: '9999px',
  },
  
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(255, 255, 255, 0.1)',
    colored: '0 4px 14px 0 rgba(85, 85, 85, 0.2)',
  },
  
  components: {
    button: {
      variants: {
        primary: {
          background: '#555555',
          color: '#ffffff',
          border: '2px solid #555555',
          hover: {
            background: '#737373',
            color: '#ffffff',
            border: '2px solid #737373',
            transform: 'translateY(-1px)',
          },
          active: {
            background: '#404040',
            color: '#ffffff',
            border: '2px solid #404040',
            transform: 'translateY(0)',
          },
          disabled: {
            background: '#525252',
            color: '#a3a3a3',
            border: '2px solid #525252',
            opacity: 0.6,
          },
        },
        secondary: {
          background: 'transparent',
          color: '#555555',
          border: '2px solid #555555',
          hover: {
            background: '#555555',
            color: '#ffffff',
            border: '2px solid #555555',
            transform: 'translateY(-1px)',
          },
          active: {
            background: '#404040',
            color: '#ffffff',
            border: '2px solid #404040',
            transform: 'translateY(0)',
          },
          disabled: {
            background: 'transparent',
            color: '#525252',
            border: '2px solid #525252',
            opacity: 0.6,
          },
        },
        accent: {
          background: '#ffffff',
          color: '#000000',
          border: '2px solid #ffffff',
          hover: {
            background: '#f5f5f5',
            color: '#000000',
            border: '2px solid #f5f5f5',
            transform: 'translateY(-1px)',
          },
          active: {
            background: '#e5e5e5',
            color: '#000000',
            border: '2px solid #e5e5e5',
            transform: 'translateY(0)',
          },
          disabled: {
            background: '#525252',
            color: '#a3a3a3',
            border: '2px solid #525252',
            opacity: 0.6,
          },
        },
        ghost: {
          background: 'transparent',
          color: '#ffffff',
          border: '2px solid transparent',
          hover: {
            background: 'rgba(85, 85, 85, 0.1)',
            color: '#ffffff',
            border: '2px solid rgba(85, 85, 85, 0.3)',
            transform: 'translateY(-1px)',
          },
          active: {
            background: 'rgba(85, 85, 85, 0.2)',
            color: '#ffffff',
            border: '2px solid rgba(85, 85, 85, 0.5)',
            transform: 'translateY(0)',
          },
          disabled: {
            background: 'transparent',
            color: '#525252',
            border: '2px solid transparent',
            opacity: 0.6,
          },
        },
        outline: {
          background: 'transparent',
          color: '#d4d4d4',
          border: '2px solid #525252',
          hover: {
            background: 'rgba(212, 212, 212, 0.1)',
            color: '#ffffff',
            border: '2px solid #d4d4d4',
            transform: 'translateY(-1px)',
          },
          active: {
            background: 'rgba(212, 212, 212, 0.2)',
            color: '#ffffff',
            border: '2px solid #ffffff',
            transform: 'translateY(0)',
          },
          disabled: {
            background: 'transparent',
            color: '#525252',
            border: '2px solid #525252',
            opacity: 0.6,
          },
        },
      },
      sizes: {
        xs: {
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          borderRadius: '0.125rem',
          minHeight: '1.5rem',
        },
        sm: {
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          borderRadius: '0.25rem',
          minHeight: '2rem',
        },
        md: {
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          borderRadius: '0.25rem',
          minHeight: '2.5rem',
        },
        lg: {
          padding: '1rem 2rem',
          fontSize: '1.125rem',
          borderRadius: '0.375rem',
          minHeight: '3rem',
        },
        xl: {
          padding: '1.25rem 2.5rem',
          fontSize: '1.25rem',
          borderRadius: '0.375rem',
          minHeight: '3.5rem',
        },
      },
      animations: {
        hover: {
          duration: 100,
          timing: 'ease-out',
          delay: 0,
        },
        active: {
          duration: 50,
          timing: 'ease-in',
          delay: 0,
        },
        focus: {
          duration: 100,
          timing: 'ease-out',
          delay: 0,
        },
      },
    },
    card: {
      background: '#262626',
      border: '2px solid #555555',
      borderRadius: '0.375rem',
      shadow: '0 4px 14px 0 rgba(85, 85, 85, 0.2)',
      padding: '1.5rem',
      hover: {
        background: '#404040',
        border: '2px solid #737373',
        shadow: '0 8px 25px 0 rgba(85, 85, 85, 0.3)',
        transform: 'translateY(-2px)',
      },
    },
    modal: {
      backdrop: 'rgba(0, 0, 0, 0.9)',
      background: '#000000',
      border: '2px solid #555555',
      borderRadius: '0.5rem',
      shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      padding: '2rem',
      animations: {
        enter: {
          duration: 150,
          timing: 'ease-out',
          delay: 0,
        },
        exit: {
          duration: 100,
          timing: 'ease-in',
          delay: 0,
        },
      },
    },
    input: {
      background: '#171717',
      border: '2px solid #525252',
      borderRadius: '0.25rem',
      color: '#ffffff',
      placeholder: '#a3a3a3',
      focus: {
        background: '#262626',
        border: '2px solid #555555',
        shadow: '0 0 0 3px rgba(85, 85, 85, 0.1)',
      },
      error: {
        border: '2px solid #ef4444',
        color: '#fecaca',
      },
    },
  },
  
  ambient: {
    shapes: {
      count: 8,
      types: ['diamond'],
      size: {
        min: 60,
        max: 120,
      },
      opacity: {
        min: 0.05,
        max: 0.12,
      },
      blur: 1.5,
    },
    animations: {
      duration: 30,
      timing: 'linear',
      variations: ['float-diamond'],
    },
    colors: ['#555555', '#737373', '#a3a3a3'],
  },
  
  animations: commonAnimations,
  
  metadata: {
    brandColor: '#555555',
    logoUrl: '/monad-logo.svg',
    networkType: 'testnet',
    chainId: 10143,
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    blockExplorer: 'https://testnet-explorer.monad.xyz',
  },
};

// Export all themes
export const CHAIN_THEMES: Record<ChainId, ChainTheme> = {
  base: baseTheme,
  celo: celoTheme,
  polygon: polygonTheme,
  monad: monadTheme,
};

// Export individual themes
export { baseTheme, celoTheme, polygonTheme, monadTheme };

// Default theme
export const DEFAULT_THEME = celoTheme;

// Theme validation helper
export const isValidChainId = (id: string): id is ChainId => {
  return id in CHAIN_THEMES;
};

// Get theme by chain ID with fallback
export const getThemeByChainId = (chainId: string): ChainTheme => {
  if (isValidChainId(chainId)) {
    return CHAIN_THEMES[chainId];
  }
  return DEFAULT_THEME;
};