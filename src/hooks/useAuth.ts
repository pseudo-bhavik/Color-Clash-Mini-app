import { useState, useEffect, useCallback } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { ethers } from 'ethers';

interface AuthSession {
  userId: string;
  walletAddress: string;
  sessionToken: string;
  expiresAt: number;
}

export const useAuth = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionToken = localStorage.getItem('colorclash_session_token');

        if (sessionToken) {
          const sessionData = JSON.parse(atob(sessionToken));

          if (sessionData.expiresAt > Date.now()) {
            const { data: profile, error } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', sessionData.userId)
              .maybeSingle();

            if (!error && profile) {
              setUser(profile);
              setSession({
                userId: sessionData.userId,
                walletAddress: sessionData.walletAddress,
                sessionToken,
                expiresAt: sessionData.expiresAt
              });
              setIsAuthenticated(true);
            } else {
              localStorage.removeItem('colorclash_session_token');
            }
          } else {
            localStorage.removeItem('colorclash_session_token');
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
        localStorage.removeItem('colorclash_session_token');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const authenticateWithWallet = useCallback(async (
    walletAddress: string,
    signer: ethers.JsonRpcSigner,
    farcasterFid?: string,
    username?: string
  ) => {
    try {
      setLoading(true);
      setAuthError(null);

      const timestamp = Date.now();
      const message = `Sign this message to authenticate with Color Clash.\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\n\nThis signature will not trigger any blockchain transaction or cost any gas fees.`;

      const signedMessage = await signer.signMessage(message);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/authenticate-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          walletAddress,
          signedMessage,
          message,
          timestamp,
          farcasterFid,
          username,
        }),
      });

      const result = await response.json();

      if (result.success && result.sessionToken && result.userProfile) {
        localStorage.setItem('colorclash_session_token', result.sessionToken);

        const sessionData = JSON.parse(atob(result.sessionToken));
        setUser(result.userProfile);
        setSession({
          userId: result.userProfile.id,
          walletAddress: result.userProfile.wallet_address,
          sessionToken: result.sessionToken,
          expiresAt: sessionData.expiresAt
        });
        setIsAuthenticated(true);

        return { success: true, user: result.userProfile };
      } else {
        throw new Error(result.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Wallet authentication error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setAuthError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserStats = useCallback(async (
    gamesPlayed: number,
    wins: number,
    tokensWon: number
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          total_games: user.total_games + gamesPlayed,
          total_wins: user.total_wins + wins,
          total_tokens_won: user.total_tokens_won + tokensWon,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Stats update error:', error);
        return;
      }

      setUser(prev => prev ? {
        ...prev,
        total_games: prev.total_games + gamesPlayed,
        total_wins: prev.total_wins + wins,
        total_tokens_won: prev.total_tokens_won + tokensWon,
        updated_at: new Date().toISOString()
      } : null);
    } catch (error) {
      console.error('Update user stats error:', error);
    }
  }, [user]);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem('colorclash_session_token');
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      setAuthError(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  return {
    user,
    session,
    loading,
    authError,
    isAuthenticated,
    authenticateWithWallet,
    updateUserStats,
    signOut
  };
};
