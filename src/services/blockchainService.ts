import { ethers } from 'ethers';
import { CONTRACT_ABIS } from '../config/gameConfig';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface RecordScoreRequest {
  walletAddress: string;
  score: number;
  contractAddress: string;
  playerName: string;
  signer: ethers.JsonRpcSigner;
}

export interface RecordScoreResponse {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
  details?: string;
}

export interface GetClaimSignatureRequest {
  walletAddress: string;
  rewardAmount: number;
  playerName?: string;
}

export interface GetClaimSignatureResponse {
  success: boolean;
  walletAddress?: string;
  playerName?: string;
  rewardAmount?: string;
  nonce?: string;
  signature?: string;
  messageHash?: string;
  error?: string;
  details?: string;
}

export interface ClaimRewardRequest {
  signer: ethers.JsonRpcSigner;
  recipient: string;
  amount: number;
  nonce: string;
  signature: string;
  contractAddress: string;
}

export interface ClaimRewardResponse {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
  details?: string;
}

// Helper function to detect if we're using Farcaster wallet
function isFarcasterWallet(signer: any): boolean {
  try {
    const provider = signer?.provider;

    // Check multiple indicators
    const checks = {
      // Check window/global context
      hasSdk: typeof window !== 'undefined' && !!(window as any).sdk,
      hasFarcasterGlobal: typeof window !== 'undefined' && !!window.farcaster,
      isInFrame: typeof window !== 'undefined' && window.parent !== window,

      // Check provider properties
      providerType: provider?.constructor?.name || '',

      // Check transport/connection details
      transport: provider?._transport || provider?.transport,
    };

    // Get transport info
    const transport = checks.transport;
    const transportString = transport?.toString() || '';
    const transportType = transport?.type || '';

    // Farcaster wallet indicators
    const isFarcaster =
      checks.hasSdk ||
      checks.hasFarcasterGlobal ||
      checks.isInFrame ||
      transportString.includes('farcaster') ||
      transportType.includes('farcaster');

    console.log('Farcaster wallet detection:', {
      isFarcaster,
      ...checks,
      transportString,
      transportType
    });

    return isFarcaster;
  } catch (e) {
    console.warn('Error detecting Farcaster wallet, assuming yes for safety:', e);
    // If in doubt, assume it's Farcaster to avoid eth_call errors
    return true;
  }
}

export async function recordScoreOnChain(
  request: RecordScoreRequest
): Promise<RecordScoreResponse> {
  try {
    const { walletAddress, score, contractAddress, playerName, signer } = request;

    // Validate inputs
    if (!walletAddress || score === undefined || !contractAddress || !playerName || !signer) {
      return {
        success: false,
        error: 'Missing required fields: walletAddress, score, contractAddress, playerName, signer'
      };
    }

    if (score < 0 || score > 100) {
      return {
        success: false,
        error: 'Score must be between 0 and 100'
      };
    }

    // Validate contract address format
    if (!ethers.isAddress(contractAddress)) {
      return {
        success: false,
        error: 'Invalid contract address format'
      };
    }

    // Verify signer address matches the provided wallet address
    const signerAddress = await signer.getAddress();
    if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return {
        success: false,
        error: 'Signer address does not match wallet address'
      };
    }

    console.log('Recording score on-chain:', {
      walletAddress: signerAddress,
      score,
      contractAddress,
      playerName
    });

    // Detect if we're using Farcaster wallet BEFORE making any calls
    const isFarcaster = isFarcasterWallet(signer);
    console.log('Using Farcaster wallet:', isFarcaster);

    // Create contract instance with user's signer
    const contract = new ethers.Contract(
      contractAddress,
      CONTRACT_ABIS.SCORE_RECORDER,
      signer
    );

    // Fetch current recording fee from contract (skip for Farcaster)
    let feeInWei: bigint;
    if (isFarcaster) {
      console.log('Farcaster wallet detected - using default fee of 0.0001 ETH');
      feeInWei = ethers.parseEther('0.0001');
    } else {
      try {
        feeInWei = await contract.getRecordingFee();
        console.log('Recording fee from contract:', ethers.formatEther(feeInWei), 'ETH');
      } catch (feeError: any) {
        console.error('Failed to fetch recording fee:', feeError);

        // Fallback to default if any error occurs
        console.log('Using default fee of 0.0001 ETH as fallback');
        feeInWei = ethers.parseEther('0.0001');
      }
    }

    // Skip gas estimation for Farcaster wallet
    if (!isFarcaster) {
      try {
        const gasEstimate = await contract.recordScore.estimateGas(score, playerName, { value: feeInWei });
        console.log('Estimated gas:', gasEstimate.toString());
      } catch (estimateError: any) {
        console.error('Gas estimation failed:', estimateError?.message);
        // For non-Farcaster wallets, this might indicate a real problem
        return {
          success: false,
          error: 'Transaction would fail - contract may not be deployed or configured correctly',
          details: estimateError instanceof Error ? estimateError.message : String(estimateError)
        };
      }
    } else {
      console.log('Skipping gas estimation for Farcaster wallet');
    }

    // Send transaction with ETH fee (user pays gas + fee)
    // For Farcaster wallet, we provide explicit gas parameters
    const txParams: any = {
      value: feeInWei
    };

    if (isFarcaster) {
      console.log('Adding explicit gas parameters for Farcaster wallet');
      txParams.gasLimit = 200000; // Reasonable default for recordScore transaction
    }

    const tx = await contract.recordScore(score, playerName, txParams);
    console.log('Transaction sent:', tx.hash, 'with fee:', ethers.formatEther(feeInWei), 'ETH');

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash, 'Block:', receipt.blockNumber);

    return {
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };

  } catch (error) {
    console.error('Error recording score on-chain:', error);

    let errorMessage = 'Failed to record score on-chain';

    if (error instanceof Error) {
      if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas fees';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error - please check your connection';
      }
    }

    return {
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function getClaimSignature(
  request: GetClaimSignatureRequest
): Promise<GetClaimSignatureResponse> {
  try {
    const apiUrl = `${SUPABASE_URL}/functions/v1/distribute-reward`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting claim signature:', error);

    let errorMessage = 'Failed to get claim signature';
    if (error instanceof Error && error.name === 'AbortError') {
      errorMessage = 'Request timeout - please try again';
    }

    return {
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function claimRewardOnChain(
  request: ClaimRewardRequest
): Promise<ClaimRewardResponse> {
  try {
    const { signer, recipient, amount, nonce, signature, contractAddress } = request;

    // Validate inputs
    if (!signer || !recipient || !amount || !nonce || !signature || !contractAddress) {
      return {
        success: false,
        error: 'Missing required fields: signer, recipient, amount, nonce, signature, contractAddress'
      };
    }

    // Detect if we're using Farcaster wallet BEFORE making any calls
    const isFarcaster = isFarcasterWallet(signer);
    console.log('Using Farcaster wallet for claim:', isFarcaster);

    // Create contract instance with user's signer
    const contract = new ethers.Contract(
      contractAddress,
      CONTRACT_ABIS.REWARD_DISTRIBUTOR,
      signer
    );

    // Check if nonce is already used (skip for Farcaster wallet)
    if (!isFarcaster) {
      try {
        const isUsed = await contract.isNonceUsed(recipient, amount, nonce);
        if (isUsed) {
          return {
            success: false,
            error: 'This reward has already been claimed'
          };
        }
      } catch (nonceError: any) {
        console.error('Could not check nonce:', nonceError?.message);
        // Let the transaction proceed and let the contract revert if needed
      }
    } else {
      console.log('Skipping nonce check for Farcaster wallet');
    }

    // Estimate gas for claim transaction (skip for Farcaster)
    if (!isFarcaster) {
      try {
        const gasEstimate = await contract.claimRewardWithSignature.estimateGas(recipient, amount, nonce, signature);
        console.log('Estimated gas for claim:', gasEstimate.toString());
      } catch (estimateError: any) {
        console.error('Gas estimation failed for claim:', estimateError?.message);
        // Let it proceed anyway
      }
    } else {
      console.log('Skipping gas estimation for Farcaster wallet claim');
    }

    // Send transaction (user pays gas)
    const txParams: any = {};

    if (isFarcaster) {
      console.log('Adding explicit gas parameters for Farcaster wallet claim');
      txParams.gasLimit = 250000; // Reasonable default for claim transaction
    }

    const tx = await contract.claimRewardWithSignature(recipient, amount, nonce, signature, txParams);
    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };

  } catch (error) {
    console.error('Error claiming reward on-chain:', error);
    
    let errorMessage = 'Failed to claim reward on-chain';
    
    if (error instanceof Error) {
      if (error.message.includes('Nonce already used')) {
        errorMessage = 'This reward has already been claimed';
      } else if (error.message.includes('Invalid signature')) {
        errorMessage = 'Invalid claim signature';
      } else if (error.message.includes('Insufficient contract balance')) {
        errorMessage = 'Insufficient tokens in reward pool';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was rejected by user';
      }
    }

    return {
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

// Legacy function - kept for backward compatibility but not used
export async function distributeReward(request: any): Promise<any> {
  console.warn('distributeReward is deprecated. Use getClaimSignature + claimRewardOnChain instead.');
  return getClaimSignature(request);
}