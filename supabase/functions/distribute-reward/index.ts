import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { ethers } from "npm:ethers@6.15.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { walletAddress, rewardAmount, playerName } = await req.json();

    if (!walletAddress || !rewardAmount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: walletAddress, rewardAmount"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (rewardAmount <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Reward amount must be greater than 0"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate wallet address format
    if (!ethers.isAddress(walletAddress)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid wallet address format"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminPrivateKey = Deno.env.get("ADMIN_PRIVATE_KEY");

    if (!adminPrivateKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server configuration error: missing admin private key"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate a unique nonce (timestamp + random number)
    const nonce = Date.now() * 1000 + Math.floor(Math.random() * 1000);

    // Create the message hash that will be signed
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256"],
      [walletAddress, rewardAmount, nonce]
    );

    // Sign the message hash
    const wallet = new ethers.Wallet(adminPrivateKey);
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    return new Response(
      JSON.stringify({
        success: true,
        walletAddress,
        playerName: playerName || walletAddress.slice(0, 8),
        rewardAmount: rewardAmount.toString(),
        nonce: nonce.toString(),
        signature,
        messageHash
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error generating claim signature:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to generate claim signature",
        details: error.message || error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});