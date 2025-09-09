import React from 'react';
import { Dialog } from '@/components/ui';
import ToggleSwitch from '@/components/ui/ToggleSwitch';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoFs: boolean;
  setAutoFs: (v: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, autoFs, setAutoFs }) => {
  const handleToggle = (checked: boolean) => {
    setAutoFs(checked);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('prefAutoFullscreen', checked ? 'true' : 'false');
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="p-6 min-w-[260px] max-w-[340px]">
        <div className="flex flex-col gap-6">
          <ToggleSwitch
            checked={autoFs}
            onChange={handleToggle}
            label="Start workouts in fullscreen"
          />
          {/* Example row for orientation lock (not hooked up to logic) */}
          {/* <ToggleSwitch
            checked={false}
            onChange={() => {}}
            label="Lock orientation (beta)"
            disabled
          /> */}
        </div>
      </div>
    </Dialog>
  );
};

export default SettingsModal;
