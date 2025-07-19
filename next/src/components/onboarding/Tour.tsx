import React from "react";
import { TourProvider, useTour } from "@reactour/tour";
import { useOnboarding } from "@/contexts/OnboardingContext";

const steps = [
  {
    selector: "#modeSwitch",
    content: "Toggle between Push-ups & Squats.",
  },
  {
    selector: "#startButton", 
    content: "Start your workout.",
  },
  {
    selector: "#submit-score-btn",
    content: "Submit on-chain.",
  },
  {
    selector: "#wallet-connection",
    content: "Connect once, then you're set.",
  },
];

// Accent color from theme variable
const accent = "var(--accent)";

const tourStyles = {
  popover: (base: Record<string, unknown>) => ({
    ...base,
    "--reactour-accent": accent,
    borderRadius: 12,
    backgroundColor: "#18181b",
    color: "#fff",
    border: `2px solid ${accent}`,
    fontFamily: "'PressStart2P', monospace",
  }),
  maskArea: (base: Record<string, unknown>) => ({ ...base, rx: 10 }),
  maskWrapper: (base: Record<string, unknown>) => ({ ...base, color: "rgba(0,0,0,0.6)" }),
  badge: (base: Record<string, unknown>) => ({ ...base, left: "auto", right: "-0.8125em" }),
  controls: (base: Record<string, unknown>) => ({ ...base, marginTop: 100 }),
  close: (base: Record<string, unknown>) => ({ ...base, right: 0, top: 0, transform: "translate(50%, -50%)" }),
};

function TourComponent() {
  const { setIsOpen } = useTour();

  // Auto-start tour when component mounts
  React.useEffect(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  return null; // The tour UI is handled by TourProvider
}

export default function Tour() {
  const { markSeen } = useOnboarding();

  return (
    <TourProvider
      steps={steps}
      styles={tourStyles}
      showBadge={true}
      showCloseButton={true}
      showNavigation={true}
      showDots={false}
      scrollSmooth={true}
      onClickClose={() => markSeen()}
      afterOpen={(target) => target?.scrollIntoView({ behavior: "smooth", block: "center" })}
    >
      <TourComponent />
    </TourProvider>
  );
}