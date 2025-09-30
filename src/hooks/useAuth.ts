import { useState, useEffect, useCallback } from 'react';
import { supabase, UserProfile, AuthSession } from '../lib/supabase';
import { ethers } from 'ethers';

export const useAuth = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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
          setAuthError(null);
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
    signedMessage: string,
    farcasterFid?: string,
    username?: string
  ) => {
    try {
      setLoading(true);
      setAuthError(null);

      // Step 3: Request to Backend Authentication Service
      const authResponse = await authenticateWithBackend(walletAddress, signedMessage, farcasterFid, username);

      if (authResponse.success) {
        // Step 5: Client-Side Session Management
        const { sessionToken, userProfile } = authResponse;
        
        // Store session token securely
        localStorage.setItem('colorclash_session_token', sessionToken);
        
        // Update user state
        setUser(userProfile);
        setSession({
          user: {
            id: userProfile.id,
            wallet_address: userProfile.wallet_address
          },
          access_token: sessionToken,
          refresh_token: sessionToken
        });
        setIsAuthenticated(true);
        
        return { success: true, user: userProfile };
      } else {
        throw new Error(authResponse.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Wallet authentication error:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Step 4: Backend Authentication Service Processing
  const authenticateWithBackend = async (
    walletAddress: string,
    signedMessage: string,
    farcasterFid?: string,
    username?: string
  ) => {
    try {
      // Create a valid email format for Supabase
      const cleanAddress = walletAddress.toLowerCase().replace('0x', '');
      const email = `wallet_${cleanAddress}@colorclash.app`;

      // Hash the signed message to create a consistent password
      const hashedPassword = await hashMessage(signedMessage);

      // Authenticate with Supabase using the signed message
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: hashedPassword
      });

      if (error && error.message.includes('Invalid login credentials')) {
        // Step 4b: New User - Create account
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email,
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
          console.error('Sign up error:', signUpError);
          return { success: false, error: signUpError.message };
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
            return { success: false, error: 'Failed to create user profile' };
          }
          
          // Return success with new user data
          const newProfile = {
            id: signUpData.user.id,
            wallet_address: walletAddress.toLowerCase(),
            farcaster_fid: farcasterFid,
            username: username,
            total_games: 0,
            total_wins: 0,
            total_tokens_won: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          return {
            success: true,
            sessionToken: signUpData.session?.access_token || '',
            userProfile: newProfile
          };
        }
      } else if (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
      } else if (data.user) {
        // Step 4a: Existing User - Retrieve profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        if (profileError) {
          console.error('Profile fetch error:', profileError);
          return { success: false, error: 'Failed to fetch user profile' };
        }
        
        return {
          success: true,
          sessionToken: data.session?.access_token || '',
          userProfile: profile
        };
      }

      return { success: false, error: 'Unknown authentication error' };
    } catch (error) {
      console.error('Backend authentication error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication service error' 
      };
    }
  };

  // Helper function to hash messages consistently
  const hashMessage = async (message: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

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
      localStorage.removeItem('colorclash_session_token');
      await supabase.auth.signOut();
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