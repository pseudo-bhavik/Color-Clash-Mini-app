import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import { base } from '@wagmi/core/chains';
import { useAuth } from './useAuth';
import { neynarService } from '../services/neynarService';
import { getFarcasterContext } from '../lib/farcasterSdk';

interface FarcasterUser {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

export const useWallet = () => {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
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
      const isFarcasterEnv = typeof window !== 'undefined' &&
        ((window as any).sdk || window.farcaster || window.parent !== window);

      const sdk = (window as any).sdk;
      console.log('Environment check:', {
        isFarcasterEnv,
        hasSdkObject: !!sdk,
        hasUserData: !!sdk?.context?.user,
        userData: sdk?.context?.user,
        legacyFarcaster: !!window.farcaster,
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

      if (chainId && chainId !== base.id) {
        console.log(`Wrong network detected. Current: ${chainId}, Expected: ${base.id}`);
        if (typeof window !== 'undefined' && window.ethereum) {
          try {
            console.log('Requesting network switch to Base...');
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${base.id.toString(16)}` }],
            });
            console.log('Network switch successful');
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              console.log('Adding Base network to wallet...');
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${base.id.toString(16)}`,
                  chainName: base.name,
                  nativeCurrency: base.nativeCurrency,
                  rpcUrls: ['https://mainnet.base.org'],
                  blockExplorerUrls: ['https://basescan.org/'],
                }],
              });
              console.log('Base network added successfully');
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

      const fcUser = getFarcasterContext() as FarcasterUser | null;
      console.log('Farcaster context user data:', fcUser);

      if (fcUser) {
        farcasterFid = fcUser.fid ? String(fcUser.fid) : undefined;
        username = fcUser.username || fcUser.displayName || undefined;

        console.log('Farcaster user data detected:', {
          fid: farcasterFid,
          username,
          rawData: fcUser
        });

        if (farcasterFid && !username) {
          console.log('Username not available from SDK, attempting Neynar API fallback...');
          console.log('Using FID for Neynar lookup:', farcasterFid);
          try {
            const neynarData = await neynarService.getUserByFid(Number(farcasterFid));
            console.log('Neynar API response:', neynarData);
            if (neynarData) {
              username = neynarData.username || neynarData.displayName;
              console.log('Successfully fetched username from Neynar:', username);
            }
          } catch (error) {
            console.error('Failed to fetch username from Neynar:', error);
          }
        }
      } else {
        console.log('No Farcaster context detected. This may be a regular wallet connection.');
        console.warn('Farcaster user context (FID/username) is not available from the SDK. This usually happens when the app is not running inside a Farcaster frame.');
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
