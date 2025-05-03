"use client";

import React from "react";

interface VisuallyHiddenProps {
  children: React.ReactNode;
}

/**
 * VisuallyHidden component that hides content visually but keeps it accessible to screen readers.
 * This is a fallback in case the Radix UI VisuallyHidden component is not available.
 */
const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({ children }) => {
  return (
    <div
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        borderWidth: 0,
      }}
    >
      {children}
    </div>
  );
};

export default VisuallyHidden;
