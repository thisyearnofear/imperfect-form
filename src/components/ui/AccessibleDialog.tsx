'use client';

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { designTokens } from '@/lib/designTokens';

interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
  showTitle?: boolean;
  preventClose?: boolean;
}

/**
 * AccessibleDialog is a wrapper around Radix UI's Dialog component that ensures
 * all dialogs have proper titles for accessibility, even when the title is visually hidden.
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
}) => {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={preventClose ? undefined : onClose}>
      <DialogPrimitive.Portal>
        {/* Backdrop using z-index tokens with fade transition */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: designTokens.colors.background.overlay,
            zIndex: designTokens.zIndex.modalBackdrop - 3,
            transition: 'opacity 300ms ease-in-out',
            opacity: 1,
          }}
          data-state={isOpen ? 'open' : 'closed'}
        />
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: designTokens.colors.background.overlay,
            zIndex: designTokens.zIndex.modalBackdrop - 2,
            transition: 'opacity 300ms ease-in-out',
            opacity: 1,
          }}
          data-state={isOpen ? 'open' : 'closed'}
        />
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: designTokens.colors.background.overlay,
            zIndex: designTokens.zIndex.modalBackdrop - 1,
            transition: 'opacity 300ms ease-in-out',
            opacity: 1,
          }}
          data-state={isOpen ? 'open' : 'closed'}
        />
        {/* Overlay with modal z-index and fade transition */}
        <DialogPrimitive.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: designTokens.colors.background.overlay,
            zIndex: designTokens.zIndex.modalBackdrop,
            animation: isOpen ? 'fadeIn 300ms ease-in-out' : 'fadeOut 300ms ease-in-out',
          }}
        />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] overflow-y-auto text-center focus:outline-none"
          onEscapeKeyDown={preventClose ? undefined : onClose}
          style={{
            maxWidth: maxWidth,
            backgroundColor: designTokens.colors.background.primary,
            color: designTokens.colors.text.primary,
            zIndex: designTokens.zIndex.modal,
            borderRadius: designTokens.borderRadius.lg,
            border: `4px solid ${designTokens.colors.border.strong}`,
            padding: designTokens.spacing.lg,
            boxShadow: designTokens.shadows.primaryLg,
            maxHeight: '90vh',
            width: '90vw',
            animation: isOpen ? 'scaleIn 300ms ease-in-out' : 'scaleOut 300ms ease-in-out',
          }}
        >
          {/* Title is always present for accessibility, but can be visually hidden */}
          {showTitle ? (
            <DialogPrimitive.Title
              style={{
                fontSize: designTokens.typography.fontSize['2xl'],
                fontWeight: designTokens.typography.fontWeight.bold,
                color: designTokens.colors.primary,
                marginBottom: designTokens.spacing.md,
                fontFamily: designTokens.typography.fontFamily.display,
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.9)',
              }}
            >
              {title}
            </DialogPrimitive.Title>
          ) : (
            <VisuallyHidden asChild>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            </VisuallyHidden>
          )}

          {description && (
            <DialogPrimitive.Description
              style={{
                fontSize: designTokens.typography.fontSize.sm,
                color: designTokens.colors.primary,
                marginBottom: designTokens.spacing.md,
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
              }}
            >
              {description}
            </DialogPrimitive.Description>
          )}

          <div style={{ marginBottom: designTokens.spacing.lg }}>{children}</div>

          {!preventClose && (
            <DialogPrimitive.Close
              style={{
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
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = designTokens.colors.text.primary;
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = designTokens.colors.primary;
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
              }}
              aria-label="Close dialog"
            >
              ×
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default AccessibleDialog;
