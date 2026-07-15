import React from 'react';
import { AccessibleDialog } from '@/components/ui';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import CoachPersonalitySelector from '@/components/coach/CoachPersonalitySelector';
import { useFadeTransition } from '@/hooks';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoFs: boolean;
  setAutoFs: (v: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, autoFs, setAutoFs }) => {
  const { isVisible, className: transitionClass } = useFadeTransition(isOpen, 300);

  const handleToggle = (checked: boolean) => {
    setAutoFs(checked);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('prefAutoFullscreen', checked ? 'true' : 'false');
    }
  };

  if (!isVisible) return null;

  return (
    <AccessibleDialog isOpen={isOpen} onClose={onClose} title="Settings" variant="settings">
      <div className={`p-6 min-w-[260px] max-w-[340px] ${transitionClass}`}>
        <div className="flex flex-col gap-6">
          <ToggleSwitch
            checked={autoFs}
            onChange={handleToggle}
            label="Start workouts in fullscreen"
          />
          <div className="border-t border-white/10 pt-5">
            <CoachPersonalitySelector />
          </div>
          {/* Example row for orientation lock (not hooked up to logic) */}
          {/* <ToggleSwitch
            checked={false}
            onChange={() => {}}
            label="Lock orientation (beta)"
            disabled
          /> */}
        </div>
      </div>
    </AccessibleDialog>
  );
};

export default SettingsModal;
