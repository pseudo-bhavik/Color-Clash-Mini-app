# Complete Vercel Deployment Guide for Color Clash

## 🚀 Prerequisites

Before deploying to Vercel, ensure you have:

1. **Deployed Smart Contracts on Arbitrum**:
   - Updated `RewardDistributor.sol` with signature-based claiming
   - `ScoreRecorder.sol` contract
   - $CC ERC20 token contract

2. **Supabase Project Setup**:
   - Database with migrations applied
   - Edge function `distribute-reward` deployed
   - Environment variables configured

3. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)

## 📋 Step-by-Step Deployment

### 1. Prepare Your Repository

```bash
# Ensure your code is committed and pushed to GitHub
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository containing your Color Clash code

### 3. Configure Build Settings

Vercel should auto-detect your React/Vite project. Verify these settings:

- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 4. Environment Variables Setup

In your Vercel project dashboard, go to **Settings → Environment Variables** and add:

#### Required Environment Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Smart Contract Addresses (Arbitrum)
VITE_CC_TOKEN_ADDRESS=0x1234567890123456789012345678901234567890
VITE_REWARD_DISTRIBUTOR_ADDRESS=0x2345678901234567890123456789012345678901
VITE_SCORE_RECORDER_ADDRESS=0x3456789012345678901234567890123456789012

# App Configuration
VITE_APP_URL=https://your-app-name.vercel.app
```

#### Environment Variable Details

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |
| `VITE_CC_TOKEN_ADDRESS` | Deployed $CC token contract address | From your Arbitrum deployment |
| `VITE_REWARD_DISTRIBUTOR_ADDRESS` | Deployed RewardDistributor contract | From your Arbitrum deployment |
| `VITE_SCORE_RECORDER_ADDRESS` | Deployed ScoreRecorder contract | From your Arbitrum deployment |
| `VITE_APP_URL` | Your Vercel app URL | Will be provided after deployment |

### 5. Deploy

1. Click **"Deploy"** in Vercel
2. Wait for the build to complete (usually 2-3 minutes)
3. Your app will be available at `https://your-app-name.vercel.app`

## 🔧 Supabase Edge Functions Setup

### Environment Variables for Supabase

In your Supabase project dashboard, go to **Settings → Edge Functions → Environment Variables**:

```env
# Arbitrum Network Configuration
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Admin Wallet (CRITICAL SECURITY)
ADMIN_PRIVATE_KEY=your_admin_wallet_private_key_here
```

### Deploy Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the distribute-reward function
supabase functions deploy distribute-reward
```

## 🔐 Security Configuration

### Admin Wallet Setup

1. **Create a dedicated admin wallet**:
   - Generate a new wallet specifically for this application
   - This wallet will be the owner of the `RewardDistributor` contract
   - Fund it with sufficient ETH for gas fees

2. **Deploy contracts with admin wallet**:
   - Deploy `RewardDistributor.sol` using the admin wallet
   - The deploying wallet automatically becomes the owner

3. **Fund the RewardDistributor contract**:
   ```solidity
   // Transfer $CC tokens to the RewardDistributor contract
   ccToken.transfer(rewardDistributorAddress, amount);
   ```

### Security Best Practices

- **Never commit private keys to git**
- **Use environment variables for all sensitive data**
- **Regularly rotate the admin private key**
- **Monitor contract balances and gas usage**
- **Set up alerts for low balances**

## 🎯 Domain Configuration

### Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings → Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. Update `VITE_APP_URL` environment variable

### Farcaster Frame Configuration

Update your `index.html` meta tags with your actual domain:

```html
<meta property="fc:frame:image" content="https://your-domain.com/og-image.png" />
<meta property="fc:frame:button:1:target" content="https://your-domain.com" />
<meta property="og:url" content="https://your-domain.com" />
```

## 📊 Monitoring & Analytics

### Vercel Analytics

1. Go to your Vercel project dashboard
2. Navigate to **Analytics** tab
3. Enable Web Analytics for user insights

### Error Monitoring

1. Check **Functions** tab for edge function logs
2. Monitor **Deployments** for build issues
3. Use browser dev tools for client-side errors

## 🔄 Continuous Deployment

Vercel automatically deploys when you push to your main branch:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main
# Vercel automatically deploys
```

## 🧪 Testing Your Deployment

### Pre-Launch Checklist

- [ ] App loads without errors
- [ ] Wallet connection works (both Farcaster and MetaMask)
- [ ] Game mechanics function properly
- [ ] Score recording works (user pays gas)
- [ ] Roulette rewards work
- [ ] Token claiming works (user pays gas)
- [ ] Leaderboard displays correctly
- [ ] Farcaster sharing works
- [ ] Mobile responsiveness

### Test Transactions

1. **Test Score Recording**:
   - Play a game and win/draw
   - Click "Record Score On-Chain"
   - Confirm transaction in wallet
   - Verify on Arbiscan

2. **Test Token Claiming**:
   - Spin roulette and win tokens
   - Click "Claim Tokens"
   - Confirm transaction in wallet
   - Check token balance in wallet

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check environment variables are set
   - Verify all dependencies are in package.json
   - Check for TypeScript errors

2. **Contract Interaction Errors**:
   - Verify contract addresses are correct
   - Ensure contracts are deployed on Arbitrum
   - Check wallet is connected to Arbitrum network

3. **Edge Function Errors**:
   - Verify Supabase environment variables
   - Check function deployment status
   - Review function logs in Supabase dashboard

### Debug Commands

```bash
# Local development
npm run dev

# Build locally to test
npm run build
npm run preview

# Check Supabase functions
supabase functions list
supabase functions logs distribute-reward
```

## 📈 Performance Optimization

### Vercel Optimizations

1. **Enable Edge Functions** for better performance
2. **Configure caching** for static assets
3. **Use Vercel Image Optimization** for images
4. **Enable compression** in build settings

### Code Optimizations

1. **Lazy load components** not needed immediately
2. **Optimize bundle size** by removing unused dependencies
3. **Use React.memo** for expensive components
4. **Implement proper error boundaries**

## 🎉 Go Live!

Once everything is tested and working:

1. **Update social media links** with your live URL
2. **Share on Farcaster** to announce launch
3. **Monitor initial user activity**
4. **Be ready to respond to user feedback**

## 📞 Support Resources

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **Arbitrum Documentation**: [docs.arbitrum.io](https://docs.arbitrum.io)
- **Wagmi Documentation**: [wagmi.sh](https://wagmi.sh)

---

## 🔑 Quick Reference: All Environment Variables

### Vercel Environment Variables
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_CC_TOKEN_ADDRESS=0x1234567890123456789012345678901234567890
VITE_REWARD_DISTRIBUTOR_ADDRESS=0x2345678901234567890123456789012345678901
VITE_SCORE_RECORDER_ADDRESS=0x3456789012345678901234567890123456789012
VITE_APP_URL=https://your-app-name.vercel.app
```

### Supabase Edge Function Environment Variables
```env
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ADMIN_PRIVATE_KEY=your_admin_wallet_private_key_here
```

Your Color Clash game is now ready for production deployment! 🎨🚀