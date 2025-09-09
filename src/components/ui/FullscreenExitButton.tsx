import React from 'react';

interface FullscreenExitButtonProps {
  isFullscreen: boolean;
  onExit: () => void;
}

const isMobile = () =>
  typeof window !== 'undefined'
    ? /Mobi|Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent)
    : false;

export const FullscreenExitButton: React.FC<FullscreenExitButtonProps> = ({
  isFullscreen,
  onExit,
}) => {
  if (!isFullscreen) return null;

  const positionStyles: React.CSSProperties = isMobile()
    ? {
        top: 16,
        left: 16,
        right: 'auto',
      }
    : {
        top: 24,
        right: 24,
        left: 'auto',
      };

  return (
    <button
      aria-label="Exit Fullscreen"
      onClick={onExit}
      style={{
        position: 'fixed',
        zIndex: 1002,
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.48)',
        border: 'none',
        color: '#fff',
        fontSize: 22,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        cursor: 'pointer',
        transition: 'background 0.2s',
        ...positionStyles,
      }}
      tabIndex={0}
    >
      <span style={{ fontWeight: 700, fontSize: 22, lineHeight: 1 }}>&#10005;</span>
    </button>
  );
};

export default FullscreenExitButton;
