const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface RecordScoreRequest {
  walletAddress: string;
  score: number;
  contractAddress: string;
  playerName: string;
}

export interface RecordScoreResponse {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
  details?: string;
}

export interface DistributeRewardRequest {
  walletAddress: string;
  rewardAmount: number;
  contractAddress: string;
  playerName?: string;
}

export interface DistributeRewardResponse {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  contractBalance?: string;
  playerName?: string;
  error?: string;
  details?: string;
}

export async function recordScoreOnChain(
  request: RecordScoreRequest
): Promise<RecordScoreResponse> {
  try {
    const apiUrl = `${SUPABASE_URL}/functions/v1/record-score`;

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
    console.error('Error calling record-score function:', error);
    return {
      success: false,
      error: 'Failed to call record-score function',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function distributeReward(
  request: DistributeRewardRequest
): Promise<DistributeRewardResponse> {
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
    console.error('Error calling distribute-reward function:', error);
    return {
      success: false,
      error: 'Failed to call distribute-reward function',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
