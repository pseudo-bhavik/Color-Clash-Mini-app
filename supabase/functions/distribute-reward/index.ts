import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { ethers } from "npm:ethers@6.15.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const REWARD_DISTRIBUTOR_ABI = [
  "function distributeReward(address recipient, string memory playerName, uint256 amount) external",
  "function getContractBalance() external view returns (uint256)",
  "event RewardDistributed(address indexed recipient, string playerName, uint256 amount)"
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { walletAddress, rewardAmount, contractAddress, playerName } = await req.json();

    if (!walletAddress || !rewardAmount || !contractAddress) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: walletAddress, rewardAmount, contractAddress"
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

    const rpcUrl = Deno.env.get("ARBITRUM_RPC_URL") || "https://arb1.arbitrum.io/rpc";
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

    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(adminPrivateKey, provider);
    const contract = new ethers.Contract(contractAddress, REWARD_DISTRIBUTOR_ABI, wallet);

    // Check contract balance before attempting distribution
    const contractBalance = await contract.getContractBalance();
    if (contractBalance < BigInt(rewardAmount)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Insufficient contract balance",
          details: `Contract balance: ${contractBalance.toString()}, Required: ${rewardAmount}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use wallet address as player name if not provided
    const finalPlayerName = playerName || walletAddress.slice(0, 8);

    // Execute the reward distribution
    const tx = await contract.distributeReward(walletAddress, finalPlayerName, rewardAmount);
    const receipt = await tx.wait();

    // Get updated contract balance
    const updatedBalance = await contract.getContractBalance();

    return new Response(
      JSON.stringify({
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        walletAddress,
        playerName: finalPlayerName,
        rewardAmount: rewardAmount.toString(),
        contractBalance: updatedBalance.toString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error distributing reward:", error);

    // Handle specific error types
    let errorMessage = "Failed to distribute reward";
    let statusCode = 500;

    if (error.message?.includes("insufficient funds")) {
      errorMessage = "Insufficient funds for gas fees";
      statusCode = 400;
    } else if (error.message?.includes("execution reverted")) {
      errorMessage = "Transaction reverted - check contract conditions";
      statusCode = 400;
    } else if (error.message?.includes("nonce")) {
      errorMessage = "Transaction nonce error - please retry";
      statusCode = 429;
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error.message || error.toString()
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});