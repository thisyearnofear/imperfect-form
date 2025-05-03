"use client";

import React, { useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

/**
 * This component fixes the Radix UI Dialog accessibility warning
 * by adding a hidden DialogTitle to any Radix Dialog that might be missing one.
 *
 * This improved version also handles ThirdWeb's modal dialogs.
 */
export const RadixUIFix: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  useEffect(() => {
    // Find all DialogContent elements that don't have a DialogTitle sibling
    const fixDialogs = () => {
      // Add a MutationObserver to watch for new Dialog elements
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach((node) => {
              if (node instanceof HTMLElement) {
                // Find any dialog content without titles
                // This selector catches both Radix UI dialogs and ThirdWeb modals
                const dialogContents = node.querySelectorAll(
                  '[role="dialog"], .tw-connect-wallet-modal'
                );

                dialogContents.forEach((dialog) => {
                  // Check if it already has a title
                  const hasTitle = dialog.querySelector(
                    '[id^="radix-:"], [role="heading"]'
                  );

                  if (!hasTitle) {
                    // Create a hidden title element with the DialogTitle component
                    const titleId = `dialog-title-${Math.random()
                      .toString(36)
                      .substr(2, 9)}`;
                    const titleElement = document.createElement("div");
                    titleElement.setAttribute("id", titleId);
                    titleElement.setAttribute("role", "heading");
                    titleElement.setAttribute("aria-level", "2");
                    titleElement.textContent = "Dialog Title"; // Provide a default title
                    titleElement.style.position = "absolute";
                    titleElement.style.width = "1px";
                    titleElement.style.height = "1px";
                    titleElement.style.padding = "0";
                    titleElement.style.margin = "-1px";
                    titleElement.style.overflow = "hidden";
                    titleElement.style.clip = "rect(0, 0, 0, 0)";
                    titleElement.style.whiteSpace = "nowrap";
                    titleElement.style.borderWidth = "0";

                    // Add the title to the dialog
                    dialog.prepend(titleElement);

                    // Set aria-labelledby on the dialog if it doesn't have it
                    if (!dialog.hasAttribute("aria-labelledby")) {
                      dialog.setAttribute("aria-labelledby", titleId);
                    }
                  }
                });
              }
            });
          }
        });
      });

      // Start observing the document with a more comprehensive configuration
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["role", "class"],
      });

      return () => observer.disconnect();
    };

    const cleanup = fixDialogs();
    return cleanup;
  }, []);

  return <>{children}</>;
};

export default RadixUIFix;
