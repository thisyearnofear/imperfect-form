import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const ONBOARDING_KEY = "imf_seenOnboarding_v1";

interface OnboardingContextType {
  hasSeen: boolean;
  markSeen: () => void;
}

const OnboardingContext = createContext<OnboardingContextType>({
  hasSeen: false,
  markSeen: () => {},
});

export const useOnboarding = () => useContext(OnboardingContext);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasSeen, setHasSeen] = useState<boolean>(false);

  // Read from localStorage on mount
  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY) === "1";
    setHasSeen(seen);
    // Listen for storage event (sync across tabs)
    const handler = (e: StorageEvent) => {
      if (e.key === ONBOARDING_KEY) {
        setHasSeen(e.newValue === "1");
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const markSeen = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setHasSeen(true);
    // fire storage event for same-tab updates where needed (simulates)
    window.dispatchEvent(new StorageEvent("storage", { key: ONBOARDING_KEY, newValue: "1" }));
  }, []);

  return (
    <OnboardingContext.Provider value={{ hasSeen, markSeen }}>
      {children}
    </OnboardingContext.Provider>
  );
};