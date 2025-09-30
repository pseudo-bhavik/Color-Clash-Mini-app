# Authentication System Migration

## Overview
This document describes the migration from email-based authentication to a secure wallet-based authentication system using Supabase Edge Functions.

## Problem Fixed
The previous authentication system had critical issues:
- Created invalid email addresses from wallet addresses
- Caused spam loops with authentication errors
- Attempted to use Supabase's email/password system for Web3 wallets
- Auto-triggered authentication causing race conditions
- Poor user experience with confusing error messages

## New Authentication Flow

### 1. User Connects Wallet
- User clicks "CONNECT WALLET" button
- Wallet connection happens via wagmi (MetaMask, Farcaster wallet, etc.)
- No authentication happens automatically

### 2. User Signs In
- After wallet is connected, a "SIGN IN" button appears
- User clicks "SIGN IN" to start authentication
- Client requests a message signature from the wallet
- Message includes wallet address and timestamp (expires in 5 minutes)

### 3. Edge Function Verification
- Signed message is sent to `/functions/v1/authenticate-wallet`
- Edge Function verifies the signature server-side using ethers.js
- Validates that the signature matches the wallet address
- Checks that the timestamp is recent (within 5 minutes)

### 4. User Profile Management
- If user exists: Updates last login and optional metadata
- If new user: Creates new profile with wallet address
- Returns secure session token with 7-day expiration

### 5. Session Storage
- Session token stored in localStorage
- Token contains user ID, wallet address, and expiration
- Client-side validates token on page load
- Expired tokens are automatically removed

## Files Changed

### Edge Functions
- `supabase/functions/authenticate-wallet/index.ts` - New authentication endpoint

### Database Migrations
- `supabase/migrations/20250930222500_update_auth_schema_wallet_only.sql`
  - Removes dependency on Supabase auth.users table
  - Creates auth_sessions table for session management
  - Updates RLS policies for wallet-based authentication

### Client-Side
- `src/hooks/useAuth.ts` - Refactored to use Edge Function
- `src/hooks/useWallet.ts` - Removed auto-authentication
- `src/App.tsx` - Removed authentication loop
- `src/components/HomeScreen.tsx` - Added explicit Sign In button

## Security Improvements

1. **Server-Side Signature Verification**
   - Signatures are verified on the Edge Function using ethers.js
   - Prevents client-side tampering

2. **Time-Based Expiration**
   - Signatures must be recent (5 minute window)
   - Prevents replay attacks

3. **Session Management**
   - Sessions tracked in database
   - 7-day expiration with automatic cleanup
   - Can be invalidated server-side

4. **No Email Dependency**
   - Completely removes email/password authentication
   - No invalid email addresses generated
   - No email confirmation required

## User Experience Improvements

1. **Clear Two-Step Process**
   - Step 1: Connect Wallet
   - Step 2: Sign In (explicit button)

2. **Better Error Handling**
   - No spam errors
   - Clear feedback at each step
   - Graceful handling of user cancellation

3. **Visual Feedback**
   - Loading states during authentication
   - Animated sign-in button
   - Clear status messages

4. **No Auto-Authentication**
   - User controls when to authenticate
   - Prevents race conditions
   - More predictable behavior

## Database Schema

### auth_sessions Table
```sql
CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id),
  session_token text UNIQUE NOT NULL,
  wallet_address text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### Updated RLS Policies
- Policies now validate sessions via auth_sessions table
- No dependency on auth.uid()
- Works with wallet addresses directly

## Next Steps

1. **Deploy Edge Function**
   - The Edge Function needs to be deployed to Supabase
   - Run: Deploy via Supabase Dashboard or CLI

2. **Run Migration**
   - Apply the database migration
   - This will create the auth_sessions table and update policies

3. **Test Authentication**
   - Connect wallet
   - Click Sign In
   - Verify no spam errors
   - Check session persistence

## Monitoring

To verify the fix is working:
1. Check browser console - should see no authentication spam
2. Network tab should show single auth request per sign-in
3. No invalid email errors in Supabase logs
4. auth_sessions table should populate correctly

## Rollback Plan

If issues occur:
1. Previous migrations are still in place
2. Can revert client-side code to previous commits
3. auth_sessions table can be dropped if needed
