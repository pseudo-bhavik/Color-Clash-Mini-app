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

    // Create contract instance with user's signer
    const contract = new ethers.Contract(
      contractAddress,
      CONTRACT_ABIS.SCORE_RECORDER,
      signer
    );

    // Fetch current recording fee from contract
    let feeInWei: bigint;
    try {
      feeInWei = await contract.getRecordingFee();
      console.log('Recording fee from contract:', ethers.formatEther(feeInWei), 'ETH');
    } catch (feeError) {
      console.error('Failed to fetch recording fee:', feeError);
      return {
        success: false,
        error: 'Failed to fetch recording fee from contract',
        details: feeError instanceof Error ? feeError.message : String(feeError)
      };
    }

    // Estimate gas before sending transaction
    try {
      const gasEstimate = await contract.recordScore.estimateGas(score, playerName, { value: feeInWei });
      console.log('Estimated gas:', gasEstimate.toString());
    } catch (estimateError) {
      console.error('Gas estimation failed:', estimateError);
      return {
        success: false,
        error: 'Transaction would fail - contract may not be deployed or configured correctly',
        details: estimateError instanceof Error ? estimateError.message : String(estimateError)
      };
    }

    // Send transaction with ETH fee (user pays gas + fee)
    const tx = await contract.recordScore(score, playerName, {
      value: feeInWei
    });
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