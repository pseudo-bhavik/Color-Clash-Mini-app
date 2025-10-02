# Token Decimal Precision Fix

## Problem

Users were receiving extremely small token amounts (e.g., 0.000000000005 instead of 5000 tokens) when claiming rewards from the roulette wheel.

## Root Cause

The issue was in the `distribute-reward` edge function. The function was signing transaction messages using raw token amounts (e.g., 5000) instead of converting them to wei (the smallest unit with 18 decimals).

### ERC20 Token Standard

- ERC20 tokens use 18 decimals by default
- 1 token = 10^18 wei
- Example: 5000 tokens = 5000 * 10^18 = 5000000000000000000000 wei

### What Was Happening

1. Edge function signed with amount: `5000` (raw number)
2. Smart contract expected amount: `5000000000000000000000` (wei)
3. User received: `5000 / 10^18 = 0.000000000005` tokens

## Solution

Updated the `distribute-reward` edge function to convert reward amounts to wei before signing:

```typescript
// Convert reward amount to wei (18 decimals for ERC20 tokens)
const rewardAmountInWei = ethers.parseUnits(rewardAmount.toString(), 18);

// Use wei amount for signing the message
const messageHash = ethers.solidityPackedKeccak256(
  ["address", "uint256", "uint256"],
  [walletAddress, rewardAmountInWei, nonce]
);
```

## Files Modified

- `supabase/functions/distribute-reward/index.ts` - Added proper decimal conversion

## Testing

After this fix:
- 1K reward = 1,000 tokens
- 5K reward = 5,000 tokens
- 10K reward = 10,000 tokens
- 50K reward = 50,000 tokens

## Deployment

The edge function needs to be redeployed with the updated code for the fix to take effect.
