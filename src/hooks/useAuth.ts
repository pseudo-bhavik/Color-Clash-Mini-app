import { useState, useEffect, useCallback } from 'react';
import { supabase, UserProfile, AuthSession } from '../lib/supabase';
import { ethers, sha256, toUtf8Bytes } from 'ethers';

export const useAuth = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          await handleSessionUser(session);
        }
      } catch (error) {
        console.error('Session initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await handleSessionUser(session);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSessionUser = async (session: any) => {
    try {
      // Get user profile from our custom table
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Profile fetch error:', error);
        return;
      }

      if (!profile) {
        // Profile doesn't exist, create it from user metadata
        const metadata = session.user.user_metadata || {};
        const walletAddress = metadata.wallet_address;
        
        if (walletAddress) {
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: session.user.id,
              wallet_address: walletAddress.toLowerCase(),
              farcaster_fid: metadata.farcaster_fid,
              username: metadata.username,
              total_games: 0,
              total_wins: 0,
              total_tokens_won: 0
            })
            .select()
            .single();

          if (createError) {
            console.error('Profile creation error:', createError);
            return;
          }

          if (newProfile) {
            setUser(newProfile);
            setSession({
              user: {
                id: session.user.id,
                wallet_address: newProfile.wallet_address
              },
              access_token: session.access_token,
              refresh_token: session.refresh_token
            });
            setIsAuthenticated(true);
          }
        }
      } else {
        // Profile exists, use it
        setUser(profile);
        setSession({
          user: {
            id: session.user.id,
            wallet_address: profile.wallet_address
          },
          access_token: session.access_token,
          refresh_token: session.refresh_token
        });
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Handle session error:', error);
    }
  };

  const authenticateWithWallet = useCallback(async (
    walletAddress: string, 
    signer: ethers.JsonRpcSigner,
    farcasterFid?: string,
    username?: string
  ) => {
    try {
      setLoading(true);

      // Create a message to sign for authentication
      const message = `Sign this message to authenticate with Color Clash.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
      
      // Sign the message
      const signature = await signer.signMessage(message);

      // Hash the signature to ensure it fits within Supabase's 72-character password limit
      // Ethereum signatures are 130+ characters, but SHA256 hash is always 64 characters (+ 0x prefix = 66 total)
      const hashedPassword = sha256(toUtf8Bytes(signature));

      // Authenticate with Supabase using the signed message
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${walletAddress.toLowerCase()}@colorclash.app`,
        password: hashedPassword
      });

      if (error && error.message.includes('Invalid login credentials')) {
        // User doesn't exist, create account
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: `${walletAddress.toLowerCase()}@colorclash.app`,
          password: hashedPassword,
          options: {
            data: {
              wallet_address: walletAddress.toLowerCase(),
              farcaster_fid: farcasterFid,
              username: username
            }
          }
        });

        if (signUpError) {
          throw signUpError;
        }

        if (signUpData.user) {
          // Create user profile
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: signUpData.user.id,
              wallet_address: walletAddress.toLowerCase(),
              farcaster_fid: farcasterFid,
              username: username,
              total_games: 0,
              total_wins: 0,
              total_tokens_won: 0
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }
        }

        return signUpData;
      } else if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Wallet authentication error:', error);
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

      // Update local state
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
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  return {
    user,
    session,
    loading,
    isAuthenticated,
    authenticateWithWallet,
    updateUserStats,
    signOut
  };
};