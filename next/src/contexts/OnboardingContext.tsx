import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const ONBOARDING_KEY = "imf_seenOnboarding_v1";
const INTRO_DIALOG_KEY = "skipIntroDialog";

interface OnboardingContextType {
  hasSeen: boolean;
  markSeen: () => void;
  shouldShowTour: boolean;
  setShouldShowTour: (show: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextType>({
  hasSeen: false,
  markSeen: () => {},
  shouldShowTour: false,
  setShouldShowTour: () => {},
});

export const useOnboarding = () => useContext(OnboardingContext);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasSeen, setHasSeen] = useState<boolean>(false);
  const [shouldShowTour, setShouldShowTour] = useState<boolean>(false);

  // Read from localStorage on mount
  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY) === "1";
    const introSkipped = localStorage.getItem(INTRO_DIALOG_KEY) === "1";
    
    setHasSeen(seen);
    
    // Show tour if onboarding hasn't been seen AND intro dialog has been handled
    setShouldShowTour(!seen && introSkipped);
    
    // Listen for storage event (sync across tabs)
    const handler = (e: StorageEvent) => {
      if (e.key === ONBOARDING_KEY) {
        const newSeen = e.newValue === "1";
        setHasSeen(newSeen);
        // Update tour visibility based on both conditions
        const introSkipped = localStorage.getItem(INTRO_DIALOG_KEY) === "1";
        setShouldShowTour(!newSeen && introSkipped);
      } else if (e.key === INTRO_DIALOG_KEY) {
        const newIntroSkipped = e.newValue === "1";
        const seen = localStorage.getItem(ONBOARDING_KEY) === "1";
        setShouldShowTour(!seen && newIntroSkipped);
      }
    };
    
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const markSeen = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setHasSeen(true);
    setShouldShowTour(false);
    // fire storage event for same-tab updates where needed (simulates)
    window.dispatchEvent(new StorageEvent("storage", { key: ONBOARDING_KEY, newValue: "1" }));
  }, []);

  return (
    <OnboardingContext.Provider value={{ hasSeen, markSeen, shouldShowTour, setShouldShowTour }}>
      {children}
    </OnboardingContext.Provider>
  );
};