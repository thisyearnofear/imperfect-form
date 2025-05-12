"use client";

import React, { useEffect, useState } from "react";
import { useNetwork } from "@/contexts/NetworkContext";

/**
 * A component that listens for network changes and forces re-renders
 * This helps ensure UI stays in sync with the selected network
 */
export default function NetworkListener() {
  const { network } = useNetwork();
  const [networkKey, setNetworkKey] = useState(Date.now());
  
  // Listen for network changes
  useEffect(() => {
    // Update key to force re-renders of components that depend on this
    setNetworkKey(Date.now());
    
    // Also listen for localStorage changes
    const handleStorageChange = () => {
      setNetworkKey(Date.now());
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    // Custom interval to check for network changes
    const checkInterval = setInterval(() => {
      const lastChange = localStorage.getItem("lastNetworkChange");
      if (lastChange && parseInt(lastChange) > networkKey) {
        setNetworkKey(parseInt(lastChange));
      }
    }, 500);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(checkInterval);
    };
  }, [network, networkKey]);
  
  // Invisible component that forces re-renders
  return <div id="network-listener" data-network={network} data-key={networkKey} style={{ display: "none" }} />;
}