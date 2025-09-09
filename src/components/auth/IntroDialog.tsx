import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';

const ACCENT = 'var(--accent)';

interface IntroDialogProps {
  open?: boolean; // allow controlled or auto
  onOpenChange?: (open: boolean) => void;
  onFarcaster: () => void;
  onWallet: () => void;
  onSkip: () => void;
}

const OPTIONS = [
  {
    key: 'farcaster',
    label: 'Login with Farcaster',
    desc: 'Sign in with your social identity.',
    onClickProp: 'onFarcaster',
  },
  {
    key: 'wallet',
    label: 'Connect Wallet',
    desc: 'Coinbase Smart Wallet supports passkeys (no seed phrase).',
    onClickProp: 'onWallet',
  },
  {
    key: 'demo',
    label: 'Demo Mode',
    desc: 'Try without signing in.',
    onClickProp: 'onSkip',
  },
];

export default function IntroDialog(props: IntroDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    // Add a small delay to prevent flash and ensure proper initialization
    const timer = setTimeout(() => {
      if (props.open !== undefined) {
        setOpen(props.open);
      } else {
        const shouldShow = !window.localStorage.getItem('imf_skipWalletIntro');
        setOpen(shouldShow);
      }
      setIsInitialized(true);
    }, 200); // Increased delay to ensure proper initialization

    return () => clearTimeout(timer);
  }, [props.open]);

  // Don't render anything until we're properly initialized
  if (!isInitialized && props.open === undefined) {
    return null;
  }

  const handleOption = (key: string) => {
    const handler =
      props[
        OPTIONS.find((o) => o.key === key)!.onClickProp as 'onFarcaster' | 'onWallet' | 'onSkip'
      ];
    if (handler) handler();
    setOpen(false);
    if (key === 'demo') {
      window.localStorage.setItem('imf_skipWalletIntro', '1');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={props.onOpenChange || setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-[2000]" />
        <Dialog.Content
          style={{
            zIndex: 2010,
            background: '#000',
            color: '#fff',
            border: `3px solid ${ACCENT}`,
            borderRadius: 20,
            padding: 40,
            minWidth: 340,
            maxWidth: 380,
            margin: '8vh auto',
            fontFamily: "'PressStart2P', monospace",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 28,
            boxShadow: `0 0 30px ${ACCENT}40, inset 0 0 20px rgba(0,0,0,0.8)`,
          }}
        >
          <Dialog.Title className="text-[var(--accent)] mb-2 font-press">Welcome</Dialog.Title>
          {/* Privacy explainer: camera stays on-device; no new UI surfaces */}
          <p
            style={{
              fontSize: 12,
              lineHeight: 1.4,
              color: '#d1d5db',
              textAlign: 'center',
              marginTop: -8,
            }}
          >
            We use your camera locally for pose detection. No video leaves your device.
          </p>
          <div
            style={{
              display: 'grid',
              gap: 20,
              width: '100%',
              marginTop: 8,
            }}
          >
            {OPTIONS.map((opt) => (
              <button
                key={opt.key}
                style={{
                  background: '#000',
                  color: ACCENT,
                  border: `3px solid ${ACCENT}`,
                  borderRadius: 12,
                  fontFamily: "'PressStart2P', monospace",
                  padding: '24px 0 12px 0',
                  width: '100%',
                  fontSize: 18,
                  marginBottom: 4,
                  position: 'relative',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: `0 0 15px ${ACCENT}30`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = `0 0 25px ${ACCENT}50`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = `0 0 15px ${ACCENT}30`;
                }}
                onClick={() => handleOption(opt.key)}
              >
                <span className="block">{opt.label}</span>
                <span className="block text-white/70 text-xs mt-1">{opt.desc}</span>
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
