"use client";

import React from "react";
import { useNetwork } from "@/contexts/NetworkContext";
import PolygonWalletButton from "./PolygonWalletButton";
import BaseWalletButton from "./BaseWalletButton";
import NetworkSelector from "./NetworkSelector";

/**
 * WalletButton component that conditionally renders the appropriate wallet button
 * based on the selected network, or shows the network selector if no network is selected
 */
export default function WalletButton() {
  const { network, isNetworkSelected } = useNetwork();

  // If no network is selected, show the network selector
  if (!isNetworkSelected) {
    return <NetworkSelector />;
  }

  // Render the appropriate wallet button based on the selected network
  if (network === "base") {
    return <BaseWalletButton />;
  }

  // Default to Polygon
  return <PolygonWalletButton />;
}
