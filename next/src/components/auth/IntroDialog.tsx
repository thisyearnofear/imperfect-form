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
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-[2000]" />
        <Dialog.Content
          className="z-[2010] bg-neutral-900 text-white border-2 rounded-2xl p-8 min-w-[320px] max-w-[360px] mx-auto mt-[10vh] flex flex-col items-center gap-6 font-press"
          style={{ borderColor: ACCENT }}
        >
          <Dialog.Title className="text-[var(--accent)] mb-2 font-press">
            Welcome
          </Dialog.Title>
          <div className="grid gap-5 w-full mt-2">
            {OPTIONS.map((opt) => (
              <button
                key={opt.key}
                className="bg-black text-[var(--accent)] border-2 rounded-lg font-press py-5 w-full text-base mb-0.5 relative cursor-pointer focus:outline-none"
                style={{ borderColor: ACCENT }}
                onClick={() => handleOption(opt.key)}
              >
                <span className="block">{opt.label}</span>
                <span className="block text-white/70 text-xs mt-1">
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