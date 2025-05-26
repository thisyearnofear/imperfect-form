"use client";

import React, { useState, useEffect } from "react";
import useDeviceDetect from "@/hooks/useDeviceDetect";

interface MobileFastLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Mobile-optimized loader that shows a fast loading screen on mobile
 * while heavy components load in the background
 */
export default function MobileFastLoader({
  children,
  fallback,
}: MobileFastLoaderProps) {
  const { isMobile } = useDeviceDetect();
  const [isLoaded, setIsLoaded] = useState(!isMobile); // Desktop loads immediately
  const [showContent, setShowContent] = useState(!isMobile);

  useEffect(() => {
    if (isMobile && !isLoaded) {
      // On mobile, show loading screen first, then load content
      const timer = setTimeout(() => {
        setIsLoaded(true);
        // Small delay to ensure smooth transition
        setTimeout(() => setShowContent(true), 100);
      }, 500); // Minimal delay to show loading state

      return () => clearTimeout(timer);
    }
  }, [isMobile, isLoaded]);

  if (isMobile && !showContent) {
    return (
      fallback || (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-yellow-400 mb-4 animate-pulse">
              IMPERFECT FORM
            </h1>
            <div className="flex items-center justify-center space-x-1">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-200"></div>
            </div>
            <p className="text-sm text-gray-400 mt-4">Loading...</p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
