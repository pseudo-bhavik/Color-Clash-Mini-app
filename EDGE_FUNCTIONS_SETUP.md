# Edge Functions Setup Guide

## Overview

Two edge functions have been created to handle blockchain interactions:

1. **record-score** - Records player scores on-chain via ScoreRecorder contract
2. **distribute-reward** - Distributes $CC token rewards via RewardDistributor contract

## Prerequisites

Before deploying, ensure you have:

1. **Deployed Smart Contracts on Arbitrum**:
   - ScoreRecorder contract
   - RewardDistributor contract
   - $CC ERC20 token contract

2. **Environment Variables** (set in Supabase dashboard):
   - `ARBITRUM_RPC_URL` - Arbitrum RPC endpoint (default: https://arb1.arbitrum.io/rpc)
   - `ADMIN_PRIVATE_KEY` - Private key of wallet that owns the RewardDistributor contract

## Setting Environment Variables

1. Go to your Supabase project dashboard
2. Navigate to Settings → Edge Functions
3. Add the following secrets:
   ```
   ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
   ADMIN_PRIVATE_KEY=your_private_key_here
   ```

⚠️ **IMPORTANT**: Keep your private key secure! Never commit it to git or share it.

## Deployment Instructions

The edge functions are located in:
- `/supabase/functions/record-score/index.ts`
- `/supabase/functions/distribute-reward/index.ts`

To deploy these functions, you have two options:

### Option 1: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy record-score
supabase functions deploy distribute-reward
```

### Option 2: Manual Deployment via Dashboard

Contact support or use the Supabase dashboard's function deployment feature.

## Function Usage

### 1. Record Score Function

**Endpoint**: `https://your-project.supabase.co/functions/v1/record-score`

**Request Body**:
```json
{
  "walletAddress": "0x...",
  "score": 75,
  "contractAddress": "0x..."
}
```

**Response**:
```json
{
  "success": true,
  "transactionHash": "0x...",
  "blockNumber": 12345,
  "gasUsed": "123456",
  "walletAddress": "0x...",
  "score": 75
}
```

**Frontend Integration**:
The function is already integrated in `PostGameScreen.tsx` via the "RECORD SCORE" button.

### 2. Distribute Reward Function

**Endpoint**: `https://your-project.supabase.co/functions/v1/distribute-reward`

**Request Body**:
```json
{
  "walletAddress": "0x...",
  "rewardAmount": 5000,
  "contractAddress": "0x..."
}
```

**Response**:
```json
{
  "success": true,
  "transactionHash": "0x...",
  "blockNumber": 12345,
  "gasUsed": "123456",
  "walletAddress": "0x...",
  "rewardAmount": "5000",
  "contractBalance": "1000000"
}
```

**Frontend Integration**:
The function is already integrated in `RewardClaimedModal.tsx` via the "Claim Tokens" button.

## Security Considerations

### Private Key Management
- The `ADMIN_PRIVATE_KEY` must be the owner of the RewardDistributor contract
- Never expose this key in client-side code
- Use a dedicated wallet for automated distributions
- Keep sufficient ETH in the wallet for gas fees

### Contract Balance
- Ensure the RewardDistributor contract has sufficient $CC tokens
- Monitor the contract balance regularly
- Set up alerts for low balance

### Rate Limiting
Consider implementing rate limiting to prevent abuse:
- Limit score recordings per wallet per day
- Limit reward claims per wallet
- Add cooldown periods between claims

## Error Handling

Both functions return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

Common errors:
- `"Missing required fields"` - Invalid request body
- `"Insufficient contract balance"` - RewardDistributor needs more tokens
- `"Server configuration error"` - Missing environment variables
- Transaction failures - Check gas fees and network status

## Monitoring

### Logs
View function logs in Supabase dashboard:
1. Go to Edge Functions
2. Select the function
3. View Logs tab

### Transaction Tracking
All successful operations return transaction hashes. Use these to:
- Verify transactions on Arbiscan
- Track gas usage
- Monitor confirmation times

## Cost Considerations

### Gas Costs
- Recording scores: ~50,000-70,000 gas
- Distributing rewards: ~80,000-100,000 gas
- Keep wallet funded with ETH for gas

### Scaling
For high-volume operations:
- Implement batch processing
- Use transaction queues
- Consider Layer 2 solutions

## Testing

Test the functions locally before deploying:

```bash
# Test record-score
curl -X POST https://your-project.supabase.co/functions/v1/record-score \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x...","score":75,"contractAddress":"0x..."}'

# Test distribute-reward
curl -X POST https://your-project.supabase.co/functions/v1/distribute-reward \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x...","rewardAmount":5000,"contractAddress":"0x..."}'
```

## Troubleshooting

### Function Not Found
- Verify deployment was successful
- Check function name matches exactly
- Ensure project is linked correctly

### Transaction Failures
- Check wallet has sufficient ETH for gas
- Verify contract addresses are correct
- Ensure admin wallet is the contract owner
- Check network connectivity to Arbitrum

### Balance Issues
- Fund the RewardDistributor contract with $CC tokens
- Verify token approval is set correctly
- Check contract balance before distributions

## Next Steps

After deploying the edge functions:

1. ✅ Update contract addresses in `src/config/gameConfig.ts`
2. ✅ Test score recording with a game
3. ✅ Test reward distribution with roulette
4. ✅ Monitor gas usage and costs
5. ✅ Set up alerts for errors and low balances
6. ✅ Implement additional security measures as needed

## Support

For issues or questions:
- Check Supabase Edge Functions documentation
- Review function logs in dashboard
- Verify environment variables are set
- Test with smaller amounts first
