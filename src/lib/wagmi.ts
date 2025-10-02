import { createConfig, http } from '@wagmi/core';
import { arbitrum  } from '@wagmi/core/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { injected } from '@wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [arbitrum ],
  connectors: [
    farcasterMiniApp(),
    injected()
  ],
  transports: {
    [arbitrum .id]: http()
  },
});