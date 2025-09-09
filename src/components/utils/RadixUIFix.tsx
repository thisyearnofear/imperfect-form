'use client';

import React, { useEffect } from 'react';

/**
 * This component fixes accessibility warnings for dialogs that might be missing titles.
 *
 * It specifically targets third-party components like ThirdWeb's modals that we don't
 * have direct control over, serving as a fallback to ensure all dialogs are accessible.
 *
 * Our own Dialog components already have proper titles, so this is mainly for
 * components we don't control directly.
 */
export const RadixUIFix: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // This effect handles dynamically added dialogs that might not be properly structured
  useEffect(() => {
    // Process the document immediately on mount
    const processExistingDialogs = () => {
      // Target third-party dialogs that might not have proper accessibility attributes
      // Specifically looking for ThirdWeb modals and any other dialogs without aria-labelledby
      const dialogContents = document.querySelectorAll(
        '.tw-connect-wallet-modal, [role="dialog"]:not([aria-labelledby]):not([id^="radix-"])'
      );

      dialogContents.forEach((dialog) => {
        // Check if it already has a title
        const hasTitle = dialog.querySelector('[id^="radix-:"], [role="heading"]');

        if (!hasTitle) {
          // Create a hidden title element
          const titleId = `dialog-title-${Math.random().toString(36).substring(2, 9)}`;
          const titleElement = document.createElement('h2');
          titleElement.setAttribute('id', titleId);
          titleElement.setAttribute(
            'style',
            'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; ' +
              'overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0;'
          );
          // Set a more descriptive title based on dialog type
          if (dialog.classList.contains('tw-connect-wallet-modal')) {
            titleElement.textContent = 'Connect Wallet Dialog';
          } else {
            // Try to infer a title from content or use a generic one
            const possibleTitle = dialog.querySelector(
              'h1, h2, h3, h4, h5, h6, [class*="title"], [class*="header"]'
            );
            titleElement.textContent = possibleTitle
              ? possibleTitle.textContent || 'Dialog'
              : 'Dialog';
          }

          // Add the title to the dialog
          dialog.prepend(titleElement);

          // Set aria-labelledby on the dialog
          dialog.setAttribute('aria-labelledby', titleId);
        }
      });
    };

    // Process existing dialogs on mount
    processExistingDialogs();

    // Set up observer for future dialogs
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;

      mutations.forEach((mutation) => {
        if (
          mutation.addedNodes.length ||
          (mutation.type === 'attributes' &&
            (mutation.attributeName === 'role' || mutation.attributeName === 'class'))
        ) {
          shouldProcess = true;
        }
      });

      if (shouldProcess) {
        processExistingDialogs();
      }
    });

    // Start observing with a comprehensive configuration
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'class', 'aria-labelledby'],
    });

    return () => observer.disconnect();
  }, []);

  // Simply return children without wrapping in Provider
  return <>{children}</>;
};

export default RadixUIFix;
