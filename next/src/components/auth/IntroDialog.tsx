import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";

const ACCENT = "var(--accent)";

interface IntroDialogProps {
  open?: boolean; // allow controlled or auto
  onOpenChange?: (open: boolean) => void;
  onFarcaster: () => void;
  onWallet: () => void;
  onSkip: () => void;
}

const OPTIONS = [
  {
    key: "farcaster",
    label: "Login with Farcaster",
    desc: "Sign in with your social identity.",
    onClickProp: "onFarcaster",
  },
  {
    key: "wallet",
    label: "Connect Wallet",
    desc: "Connect your crypto wallet.",
    onClickProp: "onWallet",
  },
  {
    key: "demo",
    label: "Demo Mode",
    desc: "Try without signing in.",
    onClickProp: "onSkip",
  },
];

export default function IntroDialog(props: IntroDialogProps) {
  const [open, setOpen] = React.useState(
    props.open ??
      (!window.localStorage.getItem("imf_skipWalletIntro") ? true : false)
  );

  React.useEffect(() => {
    if (props.open !== undefined) setOpen(props.open);
  }, [props.open]);

  const handleOption = (key: string) => {
    const handler = props[OPTIONS.find((o) => o.key === key)!.onClickProp as 'onFarcaster' | 'onWallet' | 'onSkip'];
    if (handler) handler();
    setOpen(false);
    if (key === "demo") {
      window.localStorage.setItem("imf_skipWalletIntro", "1");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={props.onOpenChange || setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            background: "rgba(0,0,0,0.7)",
            zIndex: 2000,
            position: "fixed",
            inset: 0,
          }}
        />
        <Dialog.Content
          style={{
            zIndex: 2010,
            background: "#18181b",
            color: "#fff",
            border: `2px solid ${ACCENT}`,
            borderRadius: 16,
            padding: 32,
            minWidth: 320,
            maxWidth: 360,
            margin: "10vh auto",
            fontFamily: "'PressStart2P', monospace",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          <Dialog.Title
            style={{
              color: ACCENT,
              marginBottom: 8,
              fontFamily: "'PressStart2P', monospace",
            }}
          >
            Welcome
          </Dialog.Title>
          <div
            style={{
              display: "grid",
              gap: 20,
              width: "100%",
              marginTop: 8,
            }}
          >
            {OPTIONS.map((opt) => (
              <button
                key={opt.key}
                style={{
                  background: "#000",
                  color: ACCENT,
                  border: `2px solid ${ACCENT}`,
                  borderRadius: 10,
                  fontFamily: "'PressStart2P', monospace",
                  padding: "20px 0 8px 0",
                  width: "100%",
                  fontSize: 16,
                  marginBottom: 2,
                  position: "relative",
                  cursor: "pointer",
                  outline: "none",
                }}
                onClick={() => handleOption(opt.key)}
              >
                <span style={{ display: "block" }}>{opt.label}</span>
                <span
                  style={{
                    fontSize: 11,
                    color: "#fff",
                    opacity: 0.7,
                    marginTop: 2,
                    display: "block",
                  }}
                >
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}