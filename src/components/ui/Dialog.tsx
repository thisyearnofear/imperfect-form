'use client';

import React from 'react';
import AccessibleDialog from './AccessibleDialog';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
  showTitle?: boolean;
  preventClose?: boolean;
  variant?: 'default' | 'wallet' | 'settings';
}

/**
 * Dialog component that uses AccessibleDialog to ensure proper accessibility.
 * This is a backward-compatible wrapper around AccessibleDialog.
 */
const Dialog: React.FC<DialogProps> = ({
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
  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth={maxWidth}
      showTitle={showTitle}
      preventClose={preventClose}
      variant={variant}
    >
      {children}
    </AccessibleDialog>
  );
};

export default Dialog;
