import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { ethers } from "npm:ethers@6.15.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AuthRequest {
  walletAddress: string;
  signedMessage: string;
  message: string;
  timestamp: number;
  farcasterFid?: string;
  username?: string;
}

interface AuthResponse {
  success: boolean;
  sessionToken?: string;
  userProfile?: any;
  error?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { walletAddress, signedMessage, message, timestamp, farcasterFid, username }: AuthRequest = await req.json();

    if (!walletAddress || !signedMessage || !message || !timestamp) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();

    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    if (Math.abs(now - timestamp) > fiveMinutes) {
      return new Response(
        JSON.stringify({ success: false, error: "Signature expired. Please try again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const recoveredAddress = ethers.verifyMessage(message, signedMessage);
      if (recoveredAddress.toLowerCase() !== normalizedAddress) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (error) {
      console.error("Signature verification failed:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Signature verification failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingUser, error: fetchError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("wallet_address", normalizedAddress)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Database error:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userProfile;

    if (existingUser) {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (farcasterFid && !existingUser.farcaster_fid) {
        updateData.farcaster_fid = farcasterFid;
      }
      if (username && !existingUser.username) {
        updateData.username = username;
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from("user_profiles")
        .update(updateData)
        .eq("id", existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error("Profile update error:", updateError);
        userProfile = existingUser;
      } else {
        userProfile = updatedUser;
      }
    } else {
      const { data: newUser, error: insertError } = await supabase
        .from("user_profiles")
        .insert({
          wallet_address: normalizedAddress,
          farcaster_fid: farcasterFid,
          username: username,
          total_games: 0,
          total_wins: 0,
          total_tokens_won: 0,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Profile creation error:", insertError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create user profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userProfile = newUser;
    }

    const sessionData = {
      userId: userProfile.id,
      walletAddress: normalizedAddress,
      timestamp: now,
      expiresAt: now + (7 * 24 * 60 * 60 * 1000),
    };

    const sessionToken = btoa(JSON.stringify(sessionData));

    await supabase
      .from("auth_sessions")
      .insert({
        user_id: userProfile.id,
        session_token: sessionToken,
        wallet_address: normalizedAddress,
        expires_at: new Date(sessionData.expiresAt).toISOString(),
      });

    const response: AuthResponse = {
      success: true,
      sessionToken,
      userProfile,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Authentication error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
