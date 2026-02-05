'use client';

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { designTokens } from '@/lib/designTokens';

type DialogVariant = 'default' | 'wallet' | 'settings';

interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
  showTitle?: boolean;
  preventClose?: boolean;
  variant?: DialogVariant;
}

// Variant-specific styles
const variantStyles: Record<
  DialogVariant,
  {
    overlay: React.CSSProperties;
    content: string;
    contentStyle: React.CSSProperties;
    title: React.CSSProperties;
    description: React.CSSProperties;
    closeButton: React.CSSProperties;
  }
> = {
  default: {
    overlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: designTokens.colors.background.overlay,
      zIndex: designTokens.zIndex.modalBackdrop,
      animation: 'fadeIn 300ms ease-in-out',
    },
    content:
      'imf-modal-content fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] overflow-y-auto overflow-x-hidden text-center focus:outline-none',
    contentStyle: {
      backgroundColor: designTokens.colors.background.primary,
      color: designTokens.colors.text.primary,
      zIndex: designTokens.zIndex.modal,
      borderRadius: designTokens.borderRadius.lg,
      border: `4px solid ${designTokens.colors.border.strong}`,
      padding: designTokens.spacing.lg,
      boxShadow: designTokens.shadows.primaryLg,
      maxHeight: '90vh',
      width: '90vw',
      boxSizing: 'border-box',
      animation: 'scaleIn 300ms ease-in-out',
    },
    title: {
      fontSize: designTokens.typography.fontSize['2xl'],
      fontWeight: designTokens.typography.fontWeight.bold,
      color: designTokens.colors.primary,
      marginBottom: designTokens.spacing.md,
      fontFamily: designTokens.typography.fontFamily.display,
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.9)',
    },
    description: {
      fontSize: designTokens.typography.fontSize.sm,
      color: designTokens.colors.primary,
      marginBottom: designTokens.spacing.md,
      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
    },
    closeButton: {
      position: 'absolute',
      right: designTokens.spacing.sm,
      top: designTokens.spacing.sm,
      color: designTokens.colors.primary,
      fontSize: '2rem',
      fontWeight: 'bold',
      cursor: 'pointer',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: designTokens.borderRadius.full,
      width: '2rem',
      height: '2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1px solid ${designTokens.colors.border.strong}`,
      transition: designTokens.transitions.button.hover,
      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
      lineHeight: '1',
      zIndex: 10,
    } as React.CSSProperties,
  },
  wallet: {
    overlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      zIndex: 2000,
      animation: 'fadeIn 300ms ease-in-out',
    },
    content:
      'fixed left-[50%] top-[20%] sm:top-[20%] z-[2001] max-h-[90vh] sm:max-h-[85vh] w-[95vw] sm:w-[90vw] translate-x-[-50%] translate-y-[-50%] sm:translate-y-[-50%] rounded-md focus:outline-none overflow-auto text-center',
    contentStyle: {
      backgroundColor: '#000000',
      color: '#ffffff',
      borderRadius: '0.375rem',
      border: '2px solid #1f2937',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      padding: '1rem',
      maxHeight: '90vh',
      width: '95vw',
      animation: 'scaleIn 300ms ease-in-out',
    } as React.CSSProperties,
    title: {
      fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
      fontWeight: 'bold',
      color: '#facc15',
      marginBottom: '0.25rem',
    } as React.CSSProperties,
    description: {
      fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)',
      color: '#d1d5db',
      marginBottom: '0.75rem',
    } as React.CSSProperties,
    closeButton: {
      position: 'absolute',
      right: '0.25rem',
      top: '0.25rem',
      color: '#9ca3af',
      fontSize: 'clamp(0.75rem, 2vw, 1rem)',
      fontWeight: 'bold',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      borderRadius: '0.375rem',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0.25rem',
      transition: 'color 200ms ease-in-out',
      zIndex: 10,
    } as React.CSSProperties,
  },
  settings: {
    overlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: designTokens.colors.background.overlay,
      zIndex: designTokens.zIndex.modalBackdrop,
      animation: 'fadeIn 300ms ease-in-out',
    },
    content:
      'imf-modal-content fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] overflow-y-auto overflow-x-hidden text-center focus:outline-none',
    contentStyle: {
      backgroundColor: designTokens.colors.background.primary,
      color: designTokens.colors.text.primary,
      zIndex: designTokens.zIndex.modal,
      borderRadius: designTokens.borderRadius.lg,
      border: `2px solid ${designTokens.colors.border.strong}`,
      padding: designTokens.spacing.lg,
      boxShadow: designTokens.shadows.primaryLg,
      maxHeight: '90vh',
      width: '90vw',
      maxWidth: '600px',
      boxSizing: 'border-box',
      animation: 'scaleIn 300ms ease-in-out',
    } as React.CSSProperties,
    title: {
      fontSize: designTokens.typography.fontSize.xl,
      fontWeight: designTokens.typography.fontWeight.bold,
      color: designTokens.colors.primary,
      marginBottom: designTokens.spacing.md,
      fontFamily: designTokens.typography.fontFamily.display,
    } as React.CSSProperties,
    description: {
      fontSize: designTokens.typography.fontSize.sm,
      color: designTokens.colors.text.secondary,
      marginBottom: designTokens.spacing.md,
    } as React.CSSProperties,
    closeButton: {
      position: 'absolute',
      right: designTokens.spacing.md,
      top: designTokens.spacing.md,
      color: designTokens.colors.primary,
      fontSize: '1.5rem',
      fontWeight: 'bold',
      cursor: 'pointer',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: designTokens.borderRadius.full,
      width: '2rem',
      height: '2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1px solid ${designTokens.colors.border.strong}`,
      transition: designTokens.transitions.button.hover,
      lineHeight: '1',
      zIndex: 10,
    } as React.CSSProperties,
  },
};

/**
 * AccessibleDialog: A polymorphic dialog component with support for multiple variants.
 * Ensures all dialogs have proper titles for accessibility, even when visually hidden.
 *
 * Variants:
 * - default: Standard modal with large title styling
 * - wallet: Compact wallet selector with small text, yellow title
 * - settings: Settings dialog with border styling
 */
const AccessibleDialog: React.FC<AccessibleDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = '500px',
  showTitle = true,
  preventClose = false,
  variant = 'default',
}) => {
  const styles = variantStyles[variant];

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={preventClose ? undefined : onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay style={styles.overlay} />
        <DialogPrimitive.Content
          className={styles.content}
          onEscapeKeyDown={preventClose ? undefined : onClose}
          style={{
            ...styles.contentStyle,
            maxWidth: maxWidth,
          }}
        >
          {/* Title is always present for accessibility, but can be visually hidden */}
          {showTitle ? (
            <DialogPrimitive.Title style={styles.title}>{title}</DialogPrimitive.Title>
          ) : (
            <VisuallyHidden asChild>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            </VisuallyHidden>
          )}

          {description && (
            <DialogPrimitive.Description style={styles.description}>
              {description}
            </DialogPrimitive.Description>
          )}

          <div style={{ marginBottom: designTokens.spacing.lg }}>{children}</div>

          {!preventClose && (
            <DialogPrimitive.Close
              style={styles.closeButton}
              onMouseEnter={(e) => {
                if (variant === 'wallet') {
                  e.currentTarget.style.color = '#ffffff';
                } else {
                  e.currentTarget.style.color = designTokens.colors.text.primary;
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                }
              }}
              onMouseLeave={(e) => {
                if (variant === 'wallet') {
                  e.currentTarget.style.color = '#9ca3af';
                } else {
                  e.currentTarget.style.color = designTokens.colors.primary;
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                }
              }}
              aria-label="Close dialog"
            >
              {variant === 'wallet' ? '✕' : '×'}
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default AccessibleDialog;
