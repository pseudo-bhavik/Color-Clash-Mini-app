import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, usePublicClient, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import { arbitrum } from '@wagmi/core/chains';
import { useAuth } from './useAuth';

export const useWallet = () => {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const { authenticateWithWallet, isAuthenticated: isAuthAuthenticated } = useAuth();

  // Update provider and signer when wallet client changes
  useEffect(() => {
    const updateProviderAndSigner = async () => {
      if (walletClient && isConnected) {
        try {
          // Create ethers provider from wagmi client
          const ethersProvider = new ethers.BrowserProvider(walletClient.transport as any);
          setProvider(ethersProvider);

          // Get signer
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
      // Signal Farcaster SDK ready immediately when connection is attempted
      if (typeof window !== 'undefined' && window.farcaster?.sdk?.ready) {
        console.log('Calling Farcaster SDK ready...');
        window.farcaster.sdk.ready();
      }

      // Check if we're in a Farcaster environment
      const isFarcasterEnv = typeof window !== 'undefined' && 
        (window.farcaster || window.parent !== window);
      
      console.log('Environment check:', {
        isFarcasterEnv,
        hasFarcasterObject: !!window.farcaster,
        isInFrame: window.parent !== window,
        userAgent: navigator.userAgent
      });

      // Try Farcaster MiniApp connector first
      const farcasterConnector = connectors.find(c => c.id === 'farcasterMiniApp');
      const injectedConnector = connectors.find(c => c.id === 'injected');
      
      console.log('Available connectors:', connectors.map(c => c.id));
      console.log('Farcaster connector available:', !!farcasterConnector);
      
      // Prioritize Farcaster connector in Farcaster environments
      if (farcasterConnector && isFarcasterEnv) {
        try {
          console.log('Attempting Farcaster connection...');
          await connect({ connector: farcasterConnector });
          console.log('Farcaster connection successful!');
          return;
        } catch (farcasterError) {
          console.log('Farcaster connection failed, trying injected wallet:', farcasterError);
          // Don't throw here, fall through to injected wallet
        }
      }
      
      // Fallback to injected wallet (MetaMask, etc.)
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
        // If we have farcaster connector but it failed and no injected, try farcaster again
        console.log('Retrying Farcaster connection as last resort...');
        await connect({ connector: farcasterConnector });
      }
      
      // Check if we're on the correct network (Arbitrum)
      if (chainId && chainId !== arbitrum.id) {
        console.log(`Wrong network detected. Current: ${chainId}, Expected: ${arbitrum.id}`);
        // Request network switch
        if (typeof window !== 'undefined' && window.ethereum) {
          try {
            console.log('Requesting network switch to Arbitrum...');
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${arbitrum.id.toString(16)}` }],
            });
            console.log('Network switch successful');
          } catch (switchError: any) {
            // If the chain hasn't been added to the wallet, add it
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
      // Try to get Farcaster context if available
      const farcasterFid = (window as any).farcaster?.user?.fid;
      const username = (window as any).farcaster?.user?.username;
      
      await authenticateWithWallet(address, signer, farcasterFid, username);
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