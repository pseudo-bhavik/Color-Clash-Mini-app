import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { ethers } from "npm:ethers@6.15.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};
const SCORE_RECORDER_ABI = [
  "function recordScore(uint256 score, string memory playerName) external",
  "event ScoreRecorded(address indexed player, string playerName, uint256 score, uint256 timestamp, uint256 gameNumber)"
];
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    const { walletAddress, score, contractAddress, playerName } = await req.json();
    if (!walletAddress || score === undefined || !contractAddress || !playerName) {
      return new Response(JSON.stringify({
        success: false,
        error: "Missing required fields: walletAddress, score, contractAddress, playerName"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (score < 0 || score > 100) {
      return new Response(JSON.stringify({
        success: false,
        error: "Score must be between 0 and 100"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const rpcUrl = Deno.env.get("ARBITRUM_RPC_URL") || "https://arb1.arbitrum.io/rpc";
    const adminPrivateKey = Deno.env.get("ADMIN_PRIVATE_KEY");
    if (!adminPrivateKey) {
      return new Response(JSON.stringify({
        success: false,
        error: "Server configuration error: missing private key"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(adminPrivateKey, provider);
    const contract = new ethers.Contract(contractAddress, SCORE_RECORDER_ABI, wallet);
    const tx = await contract.recordScore(score, playerName);
    const receipt = await tx.wait();
    return new Response(JSON.stringify({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      walletAddress,
      playerName,
      score
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error recording score:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Failed to record score on-chain",
      details: error.toString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
