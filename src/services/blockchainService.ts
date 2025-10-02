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

    // Create contract instance with user's signer
    const contract = new ethers.Contract(
      contractAddress,
      CONTRACT_ABIS.SCORE_RECORDER,
      signer
    );

    // Send transaction (user pays gas)
    const tx = await contract.recordScore(score, playerName);
    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };

  } catch (error) {
    console.error('Error recording score on-chain:', error);
    return {
      success: false,
      error: 'Failed to record score on-chain',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function getClaimSignature(
  request: GetClaimSignatureRequest
): Promise<GetClaimSignatureResponse> {
  try {
    const apiUrl = `${SUPABASE_URL}/functions/v1/distribute-reward`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting claim signature:', error);
    return {
      success: false,
      error: 'Failed to get claim signature',
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

    // Create contract instance with user's signer
    const contract = new ethers.Contract(
      contractAddress,
      CONTRACT_ABIS.REWARD_DISTRIBUTOR,
      signer
    );

    // Check if nonce is already used
    const isUsed = await contract.isNonceUsed(recipient, amount, nonce);
    if (isUsed) {
      return {
        success: false,
        error: 'This reward has already been claimed'
      };
    }

    // Send transaction (user pays gas)
    const tx = await contract.claimRewardWithSignature(recipient, amount, nonce, signature);
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