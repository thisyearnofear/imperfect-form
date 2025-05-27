"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useFarcasterContext } from "@/hooks/useFarcasterContext";
import { createRemoteLogger } from "@/utils/remoteLogger";

const logger = createRemoteLogger("MiniAppContext");

interface MiniAppFeatures {
  // Core Mini App features
  isInMiniApp: boolean;
  user: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
  } | null;

  // Enhanced features for Mini Apps
  canSendNotifications: boolean;
  canAccessWallet: boolean;
  canShareContent: boolean;

  // Mini App specific actions
  sendNotification: (title: string, body: string) => Promise<boolean>;
  shareWorkout: (
    reps: number,
    exerciseMode: string,
    timeSpent: string
  ) => Promise<boolean>;
  addMiniApp: () => Promise<boolean>;
  openInBrowser: () => void;
}

interface MiniAppContextType extends MiniAppFeatures {
  isLoading: boolean;
  error: string | null;
}

const MiniAppContext = createContext<MiniAppContextType | null>(null);

interface MiniAppProviderProps {
  children: ReactNode;
}

export function MiniAppProvider({ children }: MiniAppProviderProps) {
  const farcasterContext = useFarcasterContext();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [miniAppSDK, setMiniAppSDK] = useState<unknown>(null);

  // Initialize Mini App SDK
  useEffect(() => {
    const initializeMiniApp = async () => {
      if (!farcasterContext.isInMiniApp) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Import and initialize the Mini App SDK
        const { sdk } = await import("@farcaster/frame-sdk");
        setMiniAppSDK(sdk);

        // Initialize SDK if needed
        if (sdk.actions?.ready) {
          await sdk.actions.ready();
        }

        logger.info("🎯 Mini App SDK initialized successfully");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to initialize Mini App";
        setError(errorMessage);
        logger.error("Failed to initialize Mini App SDK", err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMiniApp();
  }, [farcasterContext.isInMiniApp]);

  // Send notification function
  const sendNotification = async (
    title: string,
    body: string
  ): Promise<boolean> => {
    if (!farcasterContext.isInMiniApp || !miniAppSDK) {
      logger.warn("Cannot send notification: not in Mini App context");
      return false;
    }

    try {
      // Use Mini App SDK to send notification
      const sdk = miniAppSDK as {
        actions?: {
          sendNotification?: (params: {
            title: string;
            body: string;
          }) => Promise<void>;
        };
      };
      if (sdk.actions?.sendNotification) {
        await sdk.actions.sendNotification({ title, body });
        logger.info("🎯 Notification sent successfully", { title, body });
        return true;
      } else {
        logger.warn("Notification API not available in this Mini App context");
        return false;
      }
    } catch (err) {
      logger.error("Failed to send notification", err);
      return false;
    }
  };

  // Share workout function
  const shareWorkout = async (
    reps: number,
    exerciseMode: string,
    timeSpent: string
  ): Promise<boolean> => {
    if (!farcasterContext.isInMiniApp || !miniAppSDK) {
      logger.warn("Cannot share workout: not in Mini App context");
      return false;
    }

    try {
      // Create share content
      const shareText = `I just completed ${reps} ${exerciseMode} in ${timeSpent} on Imperfect Form! 💪\n\nJoin the Onchain Olympics at https://imperfectform.fun`;
      const imageUrl = `https://imperfectform.fun/api/frames/workout/image?reps=${reps}&exerciseMode=${exerciseMode}&timeSpent=${timeSpent}`;

      // Use Mini App SDK to share
      const sdk = miniAppSDK as {
        actions?: {
          share?: (params: {
            text: string;
            embeds: { url: string }[];
          }) => Promise<void>;
        };
      };
      if (sdk.actions?.share) {
        await sdk.actions.share({
          text: shareText,
          embeds: [{ url: imageUrl }],
        });
        logger.info("🎯 Workout shared successfully via Mini App", {
          reps,
          exerciseMode,
          timeSpent,
        });
        return true;
      } else {
        // Fallback to opening share URL
        const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(
          shareText
        )}&embeds[]=${encodeURIComponent(imageUrl)}`;
        window.open(shareUrl, "_blank");
        return true;
      }
    } catch (err) {
      logger.error("Failed to share workout via Mini App", err);
      return false;
    }
  };

  // Add Mini App function
  const addMiniApp = async (): Promise<boolean> => {
    if (!farcasterContext.isInMiniApp || !miniAppSDK) {
      logger.warn("Cannot add Mini App: not in Mini App context");
      return false;
    }

    try {
      const sdk = miniAppSDK as {
        actions?: {
          addMiniApp?: () => Promise<void>;
        };
      };

      if (sdk.actions?.addMiniApp) {
        await sdk.actions.addMiniApp();
        logger.info("🎯 Mini App add prompt shown successfully");
        return true;
      } else {
        logger.warn("Add Mini App API not available in this context");
        return false;
      }
    } catch (err) {
      logger.error("Failed to show add Mini App prompt", err);
      return false;
    }
  };

  // Open in browser function
  const openInBrowser = () => {
    if (farcasterContext.isInMiniApp) {
      // Open the full web app in browser
      window.open("https://imperfectform.fun", "_blank");
      logger.info("🎯 Opened full app in browser from Mini App");
    }
  };

  const contextValue: MiniAppContextType = {
    // Core features
    isInMiniApp: farcasterContext.isInMiniApp,
    user: farcasterContext.user,
    isLoading: isLoading || farcasterContext.isLoading,
    error: error || farcasterContext.error,

    // Enhanced features
    canSendNotifications:
      farcasterContext.isInMiniApp &&
      !!(miniAppSDK as { actions?: { sendNotification?: unknown } })?.actions
        ?.sendNotification,
    canAccessWallet:
      farcasterContext.isInMiniApp && !!farcasterContext.walletAddress,
    canShareContent: farcasterContext.isInMiniApp && !!miniAppSDK,

    // Actions
    sendNotification,
    shareWorkout,
    addMiniApp,
    openInBrowser,
  };

  return (
    <MiniAppContext.Provider value={contextValue}>
      {children}
    </MiniAppContext.Provider>
  );
}

// Hook to use Mini App context
export function useMiniApp(): MiniAppContextType {
  const context = useContext(MiniAppContext);

  if (!context) {
    // Return default values if not in provider
    return {
      isInMiniApp: false,
      user: null,
      isLoading: false,
      error: null,
      canSendNotifications: false,
      canAccessWallet: false,
      canShareContent: false,
      sendNotification: async () => false,
      shareWorkout: async () => false,
      addMiniApp: async () => false,
      openInBrowser: () => {},
    };
  }

  return context;
}

// Higher-order component for Mini App features
export function withMiniApp<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <MiniAppProvider>
      <Component {...props} />
    </MiniAppProvider>
  );

  WrappedComponent.displayName = `withMiniApp(${
    Component.displayName || Component.name
  })`;
  return WrappedComponent;
}
