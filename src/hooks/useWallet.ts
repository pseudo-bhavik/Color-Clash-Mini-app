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
      if (window.farcaster?.sdk?.ready) {
        console.log('Calling Farcaster SDK ready...');
        window.farcaster.sdk.ready();
      }

      // Try Farcaster MiniApp connector first
      const farcasterConnector = connectors.find(c => c.id === 'farcasterMiniApp');
      const injectedConnector = connectors.find(c => c.id === 'injected');
      
      console.log('Available connectors:', connectors.map(c => c.id));
      console.log('Farcaster environment detected:', !!window.farcaster);
      
      if (farcasterConnector) {
        try {
          console.log('Attempting Farcaster connection...');
          await connect({ connector: farcasterConnector });
          console.log('Farcaster connection successful!');
          return;
        } catch (farcasterError) {
          console.log('Farcaster connection failed, trying injected wallet:', farcasterError);
        }
      }
      
      // Fallback to injected wallet (MetaMask, etc.)
      if (injectedConnector) {
        console.log('Attempting injected wallet connection...');
        await connect({ connector: injectedConnector });
      } else {
        throw new Error('No wallet connector available');
      }
      
      // Check if we're on the correct network (Arbitrum)
      if (chainId && chainId !== arbitrum.id) {
        // Request network switch
        if (window.ethereum) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${arbitrum.id.toString(16)}` }],
            });
          } catch (switchError: any) {
            // If the chain hasn't been added to the wallet, add it
            if (switchError.code === 4902) {
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