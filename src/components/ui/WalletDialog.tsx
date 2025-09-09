'use client';

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface WalletDialogProps {
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
 * WalletDialog is a specialized dialog for wallet-related UIs
 * Includes improved positioning and styling specifically for wallet selection
 */
const WalletDialog: React.FC<WalletDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = '350px',
  showTitle = true,
  preventClose = false,
}) => {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={preventClose ? undefined : onClose}>
      <DialogPrimitive.Portal>
        {/* Special backdrop for wallet dialogs - now with higher opacity */}
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[2000]" />

        <DialogPrimitive.Content
          className="fixed left-[50%] top-[20%] sm:top-[20%] z-[2001] max-h-[90vh] sm:max-h-[85vh] w-[95vw] sm:w-[90vw] max-w-[450px]
                   translate-x-[-50%] translate-y-[-50%] sm:translate-y-[-50%] rounded-md bg-black
                   border-2 border-gray-800 shadow-xl p-4 sm:p-5 focus:outline-none overflow-auto
                   text-center"
          onEscapeKeyDown={preventClose ? undefined : onClose}
          style={{
            maxWidth: maxWidth,
          }}
        >
          {/* Title is always present for accessibility, but can be visually hidden */}
          {showTitle ? (
            <DialogPrimitive.Title className="text-xs sm:text-sm font-bold text-yellow-400 mb-1 sm:mb-2">
              {title}
            </DialogPrimitive.Title>
          ) : (
            <VisuallyHidden asChild>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            </VisuallyHidden>
          )}

          {description && (
            <DialogPrimitive.Description className="text-[10px] sm:text-xs text-gray-300 mb-2 sm:mb-3">
              {description}
            </DialogPrimitive.Description>
          )}

          {children}

          {!preventClose && (
            <DialogPrimitive.Close
              className="absolute right-1 top-1 sm:right-2 sm:top-2 text-gray-400 hover:text-white text-xs sm:text-sm cursor-pointer
                        bg-transparent border-none"
              aria-label="Close"
            >
              ✕
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default WalletDialog;
