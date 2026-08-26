'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
  type Connector,
} from 'wagmi';

/**
 * Minimal connector surface exposed to PlatformContext. Kept structural (not
 * `import type { Connector }`) so PlatformContext never needs a wagmi import
 * at all — that is what lets the wallet runtime defer off the first load.
 */
export type WagmiConnectorRef = Pick<Connector, 'id' | 'name'>;

export interface WagmiBridgeApi {
  connectors: readonly WagmiConnectorRef[];
  address: string | undefined;
  isConnected: boolean;
  chainId: number;
  isConnecting: boolean;
  /** Wagmi mutates are fire-and-forget (state arrives via hooks); the async
      wrapper keeps PlatformContext's `await` call sites valid. */
  connect: (args: { connector: WagmiConnectorRef }) => Promise<void>;
  disconnect: () => void;
  switchChain: (args: { chainId: number }) => Promise<void>;
}

interface WagmiBridgeProps {
  onReady: (api: WagmiBridgeApi) => void;
}

/**
 * Thin adapter that owns every wagmi runtime hook and reports the primitives
 * back to PlatformContext via `onReady`. It is dynamically imported by
 * PlatformContext and only ever mounts inside WagmiProvider, so the entire
 * wagmi/viem runtime loads with the deferred provider tree instead of riding
 * the first-load chunks. PlatformContext itself stays wagmi-free.
 */
export default function WagmiBridge({ onReady }: WagmiBridgeProps) {
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const api = useMemo<WagmiBridgeApi>(
    () => ({
      connectors,
      address,
      isConnected,
      chainId,
      isConnecting: isPending,
      // The connector objects handed back through `connectors` are the real
      // wagmi Connector instances; the cast restores the full type at the
      // wagmi boundary (WagmiConnectorRef only narrows it for consumers).
      connect: async (args) => {
        connect({ connector: args.connector as Connector });
      },
      disconnect,
      switchChain: async (args) => {
        switchChain(args);
      },
    }),
    [connectors, address, isConnected, chainId, isPending, connect, disconnect, switchChain]
  );

  useEffect(() => {
    onReadyRef.current(api);
  }, [api]);

  return null;
}
