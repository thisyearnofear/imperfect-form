'use client';

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

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
        {/* Triple-layered backdrop for maximum opacity */}
        <div className="fixed inset-0 bg-black z-[1997]" />
        <div className="fixed inset-0 bg-black z-[1998]" />
        <div className="fixed inset-0 bg-black z-[1999]" />
        {/* Regular overlay with slightly increased z-index */}
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black z-[2000]" />
        <DialogPrimitive.Content
          className={`fixed left-[50%] top-[50%] z-[2001] max-h-[90vh] w-[90vw] translate-x-[-50%] translate-y-[-50%] rounded-[10px] bg-black border-4 border-[#fcb131] p-6 shadow-[0_0_25px_rgba(252,177,49,0.5)] focus:outline-none overflow-y-auto text-center`}
          onEscapeKeyDown={preventClose ? undefined : onClose}
          style={{
            maxWidth: maxWidth,
            backgroundColor: '#000000', // ENHANCEMENT: Solid black background for maximum contrast
            color: '#ffffff', // ENHANCEMENT: Ensure text is white for maximum contrast
          }}
        >
          {/* Title is always present for accessibility, but can be visually hidden */}
          {showTitle ? (
            <DialogPrimitive.Title
              className="text-xl font-bold text-[#fcb131] mb-4 font-['Press_Start_2P',cursive]"
              style={{
                // ENHANCEMENT: Add text shadow for better readability against any background
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.9)',
                color: '#fcb131',
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
              className="text-sm text-[#fcb131] mb-4"
              style={{
                color: '#fcb131',
                // ENHANCEMENT: Add text shadow for better readability
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
              }}
            >
              {description}
            </DialogPrimitive.Description>
          )}

          {children}

          {!preventClose && (
            <DialogPrimitive.Close
              className="absolute right-3 top-3 text-[#fcb131] hover:text-white text-2xl font-bold cursor-pointer bg-black/50 hover:bg-black/80 rounded-full w-8 h-8 flex items-center justify-center border border-[#fcb131] hover:border-white transition-all duration-200 z-10"
              aria-label="Close dialog"
              style={{
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                lineHeight: '1',
              }}
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
