'use client';

import React from 'react';
import AccessibleDialog from './AccessibleDialog';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string; // Optional custom max width
  showTitle?: boolean; // Option to visually hide the title
  preventClose?: boolean; // Option to prevent closing the dialog
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
  maxWidth = '500px', // Default max width
  showTitle = true, // By default, show the title
  preventClose = false, // By default, allow closing
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
    >
      {children}
    </AccessibleDialog>
  );
};

export default Dialog;
