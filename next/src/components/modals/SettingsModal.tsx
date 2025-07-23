import React from "react";
import { Dialog } from "@/components/ui";
import ToggleSwitch from "@/components/ui/ToggleSwitch";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoFs: boolean;
  setAutoFs: (v: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  autoFs,
  setAutoFs,
}) => {
  const handleToggle = (checked: boolean) => {
    setAutoFs(checked);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("prefAutoFullscreen", checked ? "true" : "false");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open ? onClose() : undefined}>
      <div className="p-6 min-w-[260px] max-w-[340px]">
        <h2 className="text-lg font-bold mb-4">Settings</h2>
        <div className="flex flex-col gap-6">
          <ToggleSwitch
            checked={autoFs}
            onChange={handleToggle}
            label="Start workouts in fullscreen"
          />
        </div>
      </div>
    </Dialog>
  );
};

export default SettingsModal;