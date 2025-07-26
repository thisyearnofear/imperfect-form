"use client";

import React, { useState, useEffect } from "react";
import { getUniversalLink } from "@selfxyz/core";
import {
  SelfQRcodeWrapper,
  SelfAppBuilder,
  type SelfApp,
} from "@selfxyz/qrcode";
// import { ethers } from "ethers"; // Removed unused import
import { Dialog } from "@/components/ui";
// import { useEnhancedChainTheme } from "@/contexts/ChainThemeContext"; // Unused import
import { usePlatform } from "@/contexts/PlatformContext";

interface SelfVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: unknown) => void;
  userAddress: string;
}

const SelfVerificationModal: React.FC<SelfVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  userAddress,
}) => {
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [universalLink, setUniversalLink] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // const { currentTheme } = useEnhancedChainTheme(); // Removed unused
  const { platform } = usePlatform();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 ||
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          )
      );
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Initialize Self app configuration
  useEffect(() => {
    if (!userAddress || !isOpen) return;

    try {
      const app = new SelfAppBuilder({
        version: 2,
        appName: "Imperfect Form",
        scope: "imperfect-form-fitness",
        endpoint: process.env.NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT || "",
        logoBase64: "https://imperfectform.fun/favicon.ico",
        userId: userAddress,
        endpointType: "staging_celo", // Use Celo testnet
        userIdType: "hex",
        userDefinedData: JSON.stringify({
          platform: platform,
          timestamp: Date.now(),
          action: "fitness_verification",
        }),
        disclosures: {
          // Verification requirements (must match contract)
          minimumAge: 16,
          excludedCountries: [],
          ofac: false,

          // Optional disclosures (what users can choose to reveal)
          nationality: false, // Don't request by default
          gender: false, // Don't request by default
        },
      }).build();

      setSelfApp(app);
      setUniversalLink(getUniversalLink(app));
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to initialize Self app:", error);
      onError(error);
      setIsLoading(false);
    }
  }, [userAddress, isOpen, platform, onError]);

  const handleSuccessfulVerification = () => {
    console.log("✅ Self verification successful!");
    onSuccess();
  };

  const handleVerificationError = (error: unknown) => {
    console.error("❌ Self verification failed:", error);
    onError(error);
  };

  const openSelfApp = () => {
    if (universalLink) {
      window.open(universalLink, "_blank");
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Verify as Human"
      description="Get verified to earn your human badge and join the verified leaderboard!"
      maxWidth="500px"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-4xl">🏆</div>
          <h3 className="text-lg font-bold text-white">Verify as Human</h3>
          <p className="text-gray-300 text-sm">
            Get your verified badge with Self Protocol
          </p>
        </div>

        {/* Verification Interface */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Setting up verification...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile: Show deep link button */}
            {isMobile ? (
              <div className="text-center space-y-4">
                <p className="text-gray-300 text-sm">
                  Tap the button below to open the Self app and verify your
                  identity:
                </p>
                <button
                  onClick={openSelfApp}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  📱 Open Self App
                </button>
                <p className="text-xs text-gray-400">
                  Don&apos;t have the Self app?{" "}
                  <a
                    href="https://self.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Download here
                  </a>
                </p>
              </div>
            ) : (
              /* Desktop: Show QR code */
              <div className="text-center space-y-4">
                <p className="text-gray-300 text-sm">
                  Scan this QR code with the Self mobile app:
                </p>
                {selfApp && (
                  <div className="flex justify-center">
                    <SelfQRcodeWrapper
                      selfApp={selfApp}
                      onSuccess={handleSuccessfulVerification}
                      onError={handleVerificationError}
                      size={250}
                      darkMode={true}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Need the Self app?{" "}
                  <a
                    href="https://self.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Download for iOS/Android
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Privacy Notice */}
        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
          <p className="text-xs text-gray-400">
            🔒 <strong>Privacy First:</strong> Self Protocol only verifies
            you&apos;re 16+ years old. No personal information is stored or
            shared. Verification happens entirely on-chain.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
          >
            Maybe Later
          </button>
          {!isMobile && universalLink && (
            <button
              onClick={openSelfApp}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors"
            >
              📱 Mobile Link
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default SelfVerificationModal;
