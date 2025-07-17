import React from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useOnboarding } from "../../contexts/OnboardingContext";

const steps: Step[] = [
  {
    target: "#modeSwitch",
    content: "Toggle between Push-ups & Squats.",
    disableBeacon: true,
  },
  {
    target: "#startButton",
    content: "Start your workout.",
    disableBeacon: true,
  },
  {
    target: "#submit-score-btn",
    content: "Submit on-chain.",
    disableBeacon: true,
  },
  {
    target: "#wallet-connection",
    content: "Connect once, then you’re set.",
    disableBeacon: true,
  },
];

// Accent color from theme variable
const accent = "var(--accent)";
const primaryButtonStyle = {
  background: "black",
  color: accent,
  border: `2px solid ${accent}`,
  borderRadius: "8px",
  boxShadow: `0 0 0 2px ${accent}`,
  fontFamily: "'PressStart2P', monospace",
};

const styles = {
  options: {
    zIndex: 9999,
    arrowColor: "#222",
    backgroundColor: "#18181b",
    overlayColor: "rgba(0,0,0,0.6)",
    primaryColor: accent,
    textColor: "#fff",
    width: 320,
  },
  buttonNext: primaryButtonStyle,
  buttonBack: { ...primaryButtonStyle, background: "transparent", color: "#fff" },
  buttonSkip: primaryButtonStyle,
  buttonClose: { display: "none" },
  tooltip: {
    border: `2px solid ${accent}`,
    background: "#18181b",
    color: "#fff",
    borderRadius: 12,
    padding: 12,
    fontFamily: "'PressStart2P', monospace",
  },
  // (other style overrides as needed)
};

export default function Tour() {
  const { markSeen } = useOnboarding();

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      markSeen();
    }
  };

  return (
    <Joyride
      steps={steps}
      continuous
      showProgress
      showSkipButton
      disableScrolling
      styles={styles}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip",
      }}
      callback={handleJoyrideCallback}
    />
  );
}