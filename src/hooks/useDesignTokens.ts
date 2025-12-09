/**
 * useDesignTokens Hook
 * Provides type-safe access to design tokens throughout the app
 *
 * Usage:
 * const tokens = useDesignTokens();
 * style={{ color: tokens.colors.primary, padding: tokens.spacing.md }}
 */

import { designTokens, type DesignTokens } from '@/lib/designTokens';

export function useDesignTokens(): DesignTokens {
  return designTokens;
}

/**
 * Utility function to compose className with design tokens
 * Helps generate consistent component styles
 */
export function getComponentStyle(
  component: 'button' | 'card' | 'modal' | 'input',
  variant: 'primary' | 'secondary' | 'ghost' = 'primary',
  size: 'xs' | 'sm' | 'base' | 'lg' = 'base'
): Record<string, string> {
  const { colors, spacing, typography, borderRadius, shadows } = designTokens;

  const baseStyles: Record<string, Record<string, Record<string, string>>> = {
    button: {
      primary: {
        xs: `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: ${designTokens.sizes.button.xs.height};
          padding: 0 ${spacing.xs};
          background-color: ${colors.primary};
          color: ${colors.text.inverse};
          font-size: ${typography.fontSize.xs};
          font-weight: ${typography.fontWeight.semibold};
          border-radius: ${borderRadius.md};
          cursor: pointer;
          transition: ${designTokens.transitions.button.hover};
          border: none;
        `,
        sm: `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: ${designTokens.sizes.button.sm.height};
          padding: 0 ${spacing.sm};
          background-color: ${colors.primary};
          color: ${colors.text.inverse};
          font-size: ${typography.fontSize.sm};
          font-weight: ${typography.fontWeight.semibold};
          border-radius: ${borderRadius.md};
          cursor: pointer;
          transition: ${designTokens.transitions.button.hover};
          border: none;
        `,
        base: `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: ${designTokens.sizes.button.base.height};
          padding: 0 ${spacing.sm};
          background-color: ${colors.primary};
          color: ${colors.text.inverse};
          font-size: ${typography.fontSize.base};
          font-weight: ${typography.fontWeight.semibold};
          border-radius: ${borderRadius.md};
          cursor: pointer;
          transition: ${designTokens.transitions.button.hover};
          border: none;
          box-shadow: ${shadows.primary};
        `,
        lg: `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: ${designTokens.sizes.button.lg.height};
          padding: 0 ${spacing.md};
          background-color: ${colors.primary};
          color: ${colors.text.inverse};
          font-size: ${typography.fontSize.lg};
          font-weight: ${typography.fontWeight.semibold};
          border-radius: ${borderRadius.lg};
          cursor: pointer;
          transition: ${designTokens.transitions.button.hover};
          border: none;
          box-shadow: ${shadows.primary};
        `,
      },
      secondary: {
        xs: `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: ${designTokens.sizes.button.xs.height};
          padding: 0 ${spacing.xs};
          background-color: transparent;
          color: ${colors.primary};
          font-size: ${typography.fontSize.xs};
          font-weight: ${typography.fontWeight.semibold};
          border: 1px solid ${colors.primary};
          border-radius: ${borderRadius.md};
          cursor: pointer;
          transition: ${designTokens.transitions.button.hover};
        `,
        sm: `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: ${designTokens.sizes.button.sm.height};
          padding: 0 ${spacing.xs};
          background-color: transparent;
          color: ${colors.primary};
          font-size: ${typography.fontSize.sm};
          font-weight: ${typography.fontWeight.semibold};
          border: 1px solid ${colors.primary};
          border-radius: ${borderRadius.md};
          cursor: pointer;
          transition: ${designTokens.transitions.button.hover};
        `,
        base: `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: ${designTokens.sizes.button.base.height};
          padding: 0 ${spacing.sm};
          background-color: transparent;
          color: ${colors.primary};
          font-size: ${typography.fontSize.base};
          font-weight: ${typography.fontWeight.semibold};
          border: 1px solid ${colors.primary};
          border-radius: ${borderRadius.md};
          cursor: pointer;
          transition: ${designTokens.transitions.button.hover};
        `,
        lg: `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: ${designTokens.sizes.button.lg.height};
          padding: 0 ${spacing.md};
          background-color: transparent;
          color: ${colors.primary};
          font-size: ${typography.fontSize.lg};
          font-weight: ${typography.fontWeight.semibold};
          border: 2px solid ${colors.primary};
          border-radius: ${borderRadius.lg};
          cursor: pointer;
          transition: ${designTokens.transitions.button.hover};
        `,
      },
      ghost: {
        xs: `color: ${colors.primary}; font-size: ${typography.fontSize.xs}; cursor: pointer;`,
        sm: `color: ${colors.primary}; font-size: ${typography.fontSize.sm}; cursor: pointer;`,
        base: `color: ${colors.primary}; font-size: ${typography.fontSize.base}; cursor: pointer;`,
        lg: `color: ${colors.primary}; font-size: ${typography.fontSize.lg}; cursor: pointer;`,
      },
    },
    card: {
      primary: {
        xs: `background-color: ${colors.neutral[800]}; border-radius: ${borderRadius.lg}; padding: ${spacing.sm};`,
        sm: `background-color: ${colors.neutral[800]}; border-radius: ${borderRadius.lg}; padding: ${spacing.md};`,
        base: `background-color: ${colors.neutral[800]}; border-radius: ${borderRadius.lg}; padding: ${spacing.lg}; border: 1px solid ${colors.border.light};`,
        lg: `background-color: ${colors.neutral[800]}; border-radius: ${borderRadius.xl}; padding: ${spacing.xl}; border: 1px solid ${colors.border.light}; box-shadow: ${shadows.lg};`,
      },
      secondary: {
        xs: `background-color: ${colors.neutral[900]}; border-radius: ${borderRadius.md}; padding: ${spacing.sm};`,
        sm: `background-color: ${colors.neutral[900]}; border-radius: ${borderRadius.md}; padding: ${spacing.md};`,
        base: `background-color: ${colors.neutral[900]}; border-radius: ${borderRadius.lg}; padding: ${spacing.lg};`,
        lg: `background-color: ${colors.neutral[900]}; border-radius: ${borderRadius.lg}; padding: ${spacing.xl};`,
      },
      ghost: {
        xs: `background-color: transparent; border-radius: ${borderRadius.md};`,
        sm: `background-color: transparent; border-radius: ${borderRadius.md};`,
        base: `background-color: transparent; border-radius: ${borderRadius.lg};`,
        lg: `background-color: transparent; border-radius: ${borderRadius.lg};`,
      },
    },
    modal: {
      primary: {
        xs: `max-width: ${designTokens.sizes.modal.xs}; background-color: ${colors.background.primary}; border-radius: ${borderRadius.lg}; padding: ${spacing.md};`,
        sm: `max-width: ${designTokens.sizes.modal.sm}; background-color: ${colors.background.primary}; border-radius: ${borderRadius.lg}; padding: ${spacing.lg};`,
        base: `max-width: ${designTokens.sizes.modal.base}; background-color: ${colors.background.primary}; border-radius: ${borderRadius.xl}; padding: ${spacing.xl}; box-shadow: ${shadows.xl};`,
        lg: `max-width: ${designTokens.sizes.modal.lg}; background-color: ${colors.background.primary}; border-radius: ${borderRadius.xl}; padding: ${spacing.xl}; box-shadow: ${shadows.xl}; border: 1px solid ${colors.border.medium};`,
      },
      secondary: {
        xs: `max-width: ${designTokens.sizes.modal.xs}; background-color: ${colors.neutral[900]}; border-radius: ${borderRadius.lg}; padding: ${spacing.md};`,
        sm: `max-width: ${designTokens.sizes.modal.sm}; background-color: ${colors.neutral[900]}; border-radius: ${borderRadius.lg}; padding: ${spacing.lg};`,
        base: `max-width: ${designTokens.sizes.modal.base}; background-color: ${colors.neutral[900]}; border-radius: ${borderRadius.xl}; padding: ${spacing.xl};`,
        lg: `max-width: ${designTokens.sizes.modal.lg}; background-color: ${colors.neutral[900]}; border-radius: ${borderRadius.xl}; padding: ${spacing.xl};`,
      },
      ghost: {
        xs: `max-width: ${designTokens.sizes.modal.xs}; border-radius: ${borderRadius.lg};`,
        sm: `max-width: ${designTokens.sizes.modal.sm}; border-radius: ${borderRadius.lg};`,
        base: `max-width: ${designTokens.sizes.modal.base}; border-radius: ${borderRadius.xl};`,
        lg: `max-width: ${designTokens.sizes.modal.lg}; border-radius: ${borderRadius.xl};`,
      },
    },
    input: {
      primary: {
        xs: `height: ${designTokens.sizes.input.sm.height}; padding: 0 ${spacing.xs}; background-color: ${colors.neutral[800]}; color: ${colors.text.primary}; border: 1px solid ${colors.border.medium}; border-radius: ${borderRadius.md};`,
        sm: `height: ${designTokens.sizes.input.sm.height}; padding: 0 ${spacing.sm}; background-color: ${colors.neutral[800]}; color: ${colors.text.primary}; border: 1px solid ${colors.border.medium}; border-radius: ${borderRadius.md};`,
        base: `height: ${designTokens.sizes.input.base.height}; padding: 0 ${spacing.sm}; background-color: ${colors.neutral[800]}; color: ${colors.text.primary}; border: 1px solid ${colors.border.medium}; border-radius: ${borderRadius.md};`,
        lg: `height: ${designTokens.sizes.input.lg.height}; padding: 0 ${spacing.md}; background-color: ${colors.neutral[800]}; color: ${colors.text.primary}; border: 1px solid ${colors.border.medium}; border-radius: ${borderRadius.lg};`,
      },
      secondary: {
        xs: `height: ${designTokens.sizes.input.sm.height}; padding: 0 ${spacing.xs}; background-color: ${colors.neutral[700]}; color: ${colors.text.primary}; border: 1px solid ${colors.border.strong}; border-radius: ${borderRadius.md};`,
        sm: `height: ${designTokens.sizes.input.sm.height}; padding: 0 ${spacing.sm}; background-color: ${colors.neutral[700]}; color: ${colors.text.primary}; border: 1px solid ${colors.border.strong}; border-radius: ${borderRadius.md};`,
        base: `height: ${designTokens.sizes.input.base.height}; padding: 0 ${spacing.sm}; background-color: ${colors.neutral[700]}; color: ${colors.text.primary}; border: 1px solid ${colors.border.strong}; border-radius: ${borderRadius.md};`,
        lg: `height: ${designTokens.sizes.input.lg.height}; padding: 0 ${spacing.md}; background-color: ${colors.neutral[700]}; color: ${colors.text.primary}; border: 1px solid ${colors.border.strong}; border-radius: ${borderRadius.lg};`,
      },
      ghost: {
        xs: `height: ${designTokens.sizes.input.sm.height}; padding: 0 ${spacing.xs}; background-color: transparent; color: ${colors.text.primary}; border: none; border-bottom: 1px solid ${colors.border.light};`,
        sm: `height: ${designTokens.sizes.input.sm.height}; padding: 0 ${spacing.sm}; background-color: transparent; color: ${colors.text.primary}; border: none; border-bottom: 1px solid ${colors.border.light};`,
        base: `height: ${designTokens.sizes.input.base.height}; padding: 0 ${spacing.sm}; background-color: transparent; color: ${colors.text.primary}; border: none; border-bottom: 1px solid ${colors.border.light};`,
        lg: `height: ${designTokens.sizes.input.lg.height}; padding: 0 ${spacing.md}; background-color: transparent; color: ${colors.text.primary}; border: none; border-bottom: 1px solid ${colors.border.light};`,
      },
    },
  };

  return baseStyles[component][variant][size] as Record<string, string>;
}
