import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, usePublicClient, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import { arbitrum } from '@wagmi/core/chains';
import { useAuth } from './useAuth';

interface FarcasterUser {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

const getFarcasterContext = (): FarcasterUser | null => {
  if (typeof window === 'undefined') return null;

  if (window.farcaster?.user) {
    return window.farcaster.user;
  }

  try {
    const frameContext = (window as any).sdk?.context;
    if (frameContext?.user) {
      return frameContext.user;
    }
  } catch (e) {
    console.log('Could not access frame context');
  }

  return null;
};

export const useWallet = () => {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const { authenticateWithWallet, isAuthenticated: isAuthAuthenticated } = useAuth();

  useEffect(() => {
    const updateProviderAndSigner = async () => {
      if (walletClient && isConnected) {
        try {
          const ethersProvider = new ethers.BrowserProvider(walletClient.transport as any);
          setProvider(ethersProvider);

          const ethSigner = await ethersProvider.getSigner();
          setSigner(ethSigner);
        } catch (error) {
          console.error('Failed to setup provider/signer:', error);
          setProvider(null);
          setSigner(null);
        }
      } else {
        setProvider(null);
        setSigner(null);
      }
    };

    updateProviderAndSigner();
  }, [walletClient, isConnected]);

  const connectWallet = async () => {
    try {
      if (typeof window !== 'undefined') {
        await new Promise(resolve => setTimeout(resolve, 500));

        if (window.farcaster?.sdk?.ready) {
          console.log('Calling Farcaster SDK ready...');
          window.farcaster.sdk.ready();

          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      const isFarcasterEnv = typeof window !== 'undefined' &&
        (window.farcaster || window.parent !== window);

      console.log('Environment check:', {
        isFarcasterEnv,
        hasFarcasterObject: !!window.farcaster,
        hasUserData: !!window.farcaster?.user,
        userData: window.farcaster?.user,
        isInFrame: window.parent !== window,
        userAgent: navigator.userAgent
      });

      const farcasterConnector = connectors.find(c => c.id === 'farcasterMiniApp');
      const injectedConnector = connectors.find(c => c.id === 'injected');

      console.log('Available connectors:', connectors.map(c => c.id));
      console.log('Farcaster connector available:', !!farcasterConnector);

      if (farcasterConnector && isFarcasterEnv) {
        try {
          console.log('Attempting Farcaster connection...');
          await connect({ connector: farcasterConnector });
          console.log('Farcaster connection successful!');
          return;
        } catch (farcasterError) {
          console.log('Farcaster connection failed, trying injected wallet:', farcasterError);
        }
      }

      if (injectedConnector) {
        console.log('Attempting injected wallet connection...');
        try {
          await connect({ connector: injectedConnector });
          console.log('Injected wallet connection successful!');
        } catch (injectedError) {
          console.error('Injected wallet connection failed:', injectedError);
          throw injectedError;
        }
      } else if (!farcasterConnector) {
        throw new Error('No wallet connector available');
      } else {
        console.log('Retrying Farcaster connection as last resort...');
        await connect({ connector: farcasterConnector });
      }

      if (chainId && chainId !== arbitrum.id) {
        console.log(`Wrong network detected. Current: ${chainId}, Expected: ${arbitrum.id}`);
        if (typeof window !== 'undefined' && window.ethereum) {
          try {
            console.log('Requesting network switch to Arbitrum...');
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${arbitrum.id.toString(16)}` }],
            });
            console.log('Network switch successful');
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              console.log('Adding Arbitrum network to wallet...');
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${arbitrum.id.toString(16)}`,
                  chainName: arbitrum.name,
                  nativeCurrency: arbitrum.nativeCurrency,
                  rpcUrls: ['https://arb1.arbitrum.io/rpc'],
                  blockExplorerUrls: ['https://arbiscan.io/'],
                }],
              });
              console.log('Arbitrum network added successfully');
            } else {
              console.error('Network switch failed:', switchError);
              throw switchError;
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const authenticateUser = async () => {
    if (!isConnected || !address || !signer) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('Starting authentication process...');

      let farcasterFid: string | undefined;
      let username: string | undefined;

      const fcUser = getFarcasterContext();

      if (fcUser) {
        farcasterFid = fcUser.fid ? String(fcUser.fid) : undefined;
        username = fcUser.username || fcUser.displayName || undefined;

        console.log('Farcaster user data detected:', {
          fid: farcasterFid,
          username,
          rawData: fcUser
        });
      } else {
        console.log('No Farcaster context detected. This may be a regular wallet connection.');
      }

      await authenticateWithWallet(address, signer, farcasterFid, username);

      console.log('Authentication completed successfully!', { farcasterFid, username });
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  };

  const disconnectWallet = () => {
    disconnect();
  };

  return {
    isConnected,
    isAuthenticated: isAuthAuthenticated,
    walletAddress: address,
    provider,
    signer,
    connectWallet,
    authenticateUser,
    disconnectWallet,
    chainId
  };
};
