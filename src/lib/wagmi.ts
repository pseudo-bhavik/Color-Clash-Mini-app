import { createConfig, http } from '@wagmi/core';
import { baseSepolia  } from '@wagmi/core/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { injected } from '@wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [baseSepolia ],
  connectors: [
    farcasterMiniApp(),
    injected()
  ],
  transports: {
    [baseSepolia .id]: http()
  },
});