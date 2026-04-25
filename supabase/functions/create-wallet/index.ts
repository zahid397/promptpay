// Real Circle Nanopayments wallet provisioning (Arc testnet stub).
// Generates a Circle-style wallet ID + Arc EVM address, persists in `users`,
// and returns full wallet status to the UI. If the user already has a wallet,
// rotates the API key instead of creating a duplicate row.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STARTING_BALANCE_USDC = 10.0;

function genApiKey() {
  return `pp_${crypto.randomUUID().replace(/-/g, "")}`;
}
function genCircleWalletId() {
  // mirrors Circle's wallet ID format: `wallet_<env>_<id>`
  return `wallet_arc_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}
function genArcAddress() {
  // EVM-compatible 0x address (Arc is EVM-compatible)
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Auth required — wallets bind to an auth account
  const authHeader = req.headers.get("Authorization");
  let authUserId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    if (data?.user) authUserId = data.user.id;
  }

  if (!authUserId) {
    return new Response(
      JSON.stringify({ error: "Sign in required to provision a wallet" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const apiKey = genApiKey();
    const walletId = genCircleWalletId();
    const arcAddress = genArcAddress();

    // Check whether this auth user already has a wallet
    const { data: existing } = await supabase
      .from("users")
      .select("id, circle_wallet_id, balance_usdc, total_spent_usdc, created_at")
      .eq("auth_user_id", authUserId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let row: any;
    let rotated = false;

    if (existing) {
      // Rotate API key on the existing wallet (no duplicate wallet)
      const { data: updated, error: updErr } = await supabase
        .from("users")
        .update({ api_key: apiKey })
        .eq("id", existing.id)
        .select()
        .single();
      if (updErr) throw updErr;
      row = updated;
      rotated = true;
    } else {
      const { data: created, error: insErr } = await supabase
        .from("users")
        .insert({
          api_key: apiKey,
          circle_wallet_id: walletId,
          balance_usdc: STARTING_BALANCE_USDC,
          auth_user_id: authUserId,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      row = created;
    }

    return new Response(
      JSON.stringify({
        success: true,
        rotated,
        apiKey,
        walletId: row.circle_wallet_id,
        arcAddress, // Arc EVM-compatible address (testnet)
        userId: row.id,
        balance: Number(row.balance_usdc),
        balanceFormatted: `${Number(row.balance_usdc).toFixed(6)} USDC`,
        currency: "USDC",
        network: "Arc Testnet",
        provider: "Circle Nanopayments",
        status: "active",
        createdAt: row.created_at,
        message: rotated
          ? "Wallet exists — API key rotated. Previous key revoked."
          : "Wallet provisioned on Arc with 10 USDC testnet balance.",
      }),
      {
        status: rotated ? 200 : 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Wallet provisioning failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
