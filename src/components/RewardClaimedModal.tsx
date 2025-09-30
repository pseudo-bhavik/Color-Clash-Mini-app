import React, { useState } from 'react';
import { X, Share2, Coins } from 'lucide-react';
import { useModeration } from '../hooks/useModeration';
import { getClaimSignature, claimRewardOnChain } from '../services/blockchainService';
import { CONTRACT_ADDRESSES } from '../config/gameConfig';
import { useWallet } from '../hooks/useWallet';

interface RewardClaimedModalProps {
  reward: {amount: number; label: string; type: string};
  onClose: () => void;
  walletAddress?: string;
}

const RewardClaimedModal: React.FC<RewardClaimedModalProps> = ({
  reward,
  onClose,
  walletAddress
}) => {
  const { moderateContent } = useModeration();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const { signer } = useWallet();

  const handleShareOnFarcaster = async () => {
    const text = `I just won ${reward.amount} $CC playing Color Clash! 🎨 Try it out and win big! #ColorClash #Web3Gaming`;
    
    try {
      // Moderate the content before sharing
      const moderationResult = await moderateContent(text, 'share_text');
      
      if (!moderationResult.safe) {
        alert(`Cannot share: ${moderationResult.reason || 'Content not allowed'}`);
        return;
      }
      
      const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Share moderation failed:', error);
      // Allow sharing if moderation fails (fail-safe)
      const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  };

  const handleClaim = async () => {
    if (reward.type !== 'onChainToken') {
      return;
    }

    if (!walletAddress || !signer) {
      alert('Please connect and authenticate your wallet first');
      return;
    }

    setIsClaiming(true);
    try {
      const playerName = walletAddress.slice(0, 8);
      
      // Get signature from backend
      const signatureResponse = await getClaimSignature({
        walletAddress,
        rewardAmount: reward.amount,
        playerName
      });

      if (!signatureResponse.success) {
        throw new Error(signatureResponse.error || 'Failed to get claim authorization');
      }

      // Claim on-chain with user's wallet
      const claimResponse = await claimRewardOnChain({
        signer,
        recipient: walletAddress,
        amount: reward.amount,
        nonce: signatureResponse.nonce!,
        signature: signatureResponse.signature!,
        contractAddress: CONTRACT_ADDRESSES.REWARD_DISTRIBUTOR
      });

      if (claimResponse.success) {
        setClaimed(true);
        alert(`Successfully claimed ${reward.amount} $CC tokens!\nTransaction: ${claimResponse.transactionHash}`);
        setTimeout(() => onClose(), 2000);
      } else {
        alert(`Failed to claim reward: ${claimResponse.error}`);
      }
    } catch (error) {
      console.error('Failed to claim reward:', error);
      alert(`Failed to claim reward: ${(error as Error).message}`);
    } finally {
      setIsClaiming(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-[#D8CFAF] rounded-2xl border-4 border-[#333333] shadow-2xl 
                     max-w-sm w-full p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full 
                     border-2 border-[#333333] flex items-center justify-center"
        >
          <X size={16} color="#333333" />
        </button>

        {/* Celebration Animation */}
        <div className="text-center mb-6">
          <div className="relative mb-4">
            <div className="text-6xl animate-bounce">🎉</div>
            <div className="absolute -top-2 -right-2">
              <Coins size={32} color="#FFD700" className="animate-spin" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-[#333333] mb-2">
            CONGRATULATIONS!
          </h2>
          <p className="text-xl text-[#E86A5D] font-black mb-2">
            You won {reward.label}!
          </p>
          {reward.type === 'onChainToken' && (
            <p className="text-sm text-[#333333] opacity-70">
              {claimed ? 'Tokens claimed!' : 'Click "Claim Tokens" to add them to your wallet'}
            </p>
          )}
          {reward.type === 'inGameCurrency' && (
            <p className="text-sm text-[#333333] opacity-70">
              Keys added to your account!
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {reward.type === 'onChainToken' && walletAddress && !claimed && (
            <button
              onClick={handleClaim}
              disabled={isClaiming}
              className="w-full bg-green-600 text-white text-lg font-black py-3 px-6
                         rounded-xl border-3 border-[#333333] shadow-lg hover:bg-green-700
                         active:transform active:scale-95 transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center space-x-2"
            >
              <Coins size={20} />
              <span>{isClaiming ? 'Claiming...' : 'Claim Tokens'}</span>
            </button>
          )}
          
          {reward.type === 'onChainToken' && (
            <button
              onClick={handleShareOnFarcaster}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white text-lg font-black py-3 px-6
                         rounded-xl border-3 border-[#333333] shadow-lg hover:from-blue-700 hover:to-blue-800
                         active:transform active:scale-95 transition-all duration-200
                         flex items-center justify-center space-x-2"
            >
              <Share2 size={20} />
              <span>Share on Farcaster</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full bg-white text-[#333333] text-lg font-black py-3 px-6 
                       rounded-xl border-3 border-[#333333] shadow-lg hover:bg-gray-100
                       active:transform active:scale-95 transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewardClaimedModal;