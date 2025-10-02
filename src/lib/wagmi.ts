import { createConfig, http } from '@wagmi/core';
import { base } from '@wagmi/core/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { injected } from '@wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    farcasterMiniApp(),
    injected()
  ],
  transports: {
    [base.id]: http()
  },
});