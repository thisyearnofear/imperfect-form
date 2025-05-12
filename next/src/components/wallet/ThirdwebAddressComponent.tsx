"use client";

import { useEffect } from "react";
import { useAddress } from "@thirdweb-dev/react";

interface ThirdwebAddressComponentProps {
  onAddressUpdate: (address: string | undefined) => void;
}

/**
 * A component that safely uses the ThirdWeb useAddress hook
 * and passes the address up to the parent component.
 * 
 * This component must be rendered within a ThirdwebProvider context.
 */
export default function ThirdwebAddressComponent({ 
  onAddressUpdate
}: ThirdwebAddressComponentProps) {
  // We can safely use the ThirdWeb hook here because this component
  // will only be rendered when the appropriate provider is active
  const address = useAddress();
  
  // Pass the address up to the parent component
  useEffect(() => {
    onAddressUpdate(address);
  }, [address, onAddressUpdate]);
  
  // This component doesn't render anything visible
  return null;
}