"use client";

import { useState, useEffect } from "react";

/**
 * Hook to prevent hydration mismatches by ensuring content only renders on client
 * Returns true only after component has mounted on the client side
 */
export function useClientOnly(): boolean {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}

/**
 * Component wrapper that only renders children on client side
 * Prevents hydration mismatches for dynamic content
 */
export function ClientOnly({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) {
  const hasMounted = useClientOnly();

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default useClientOnly;