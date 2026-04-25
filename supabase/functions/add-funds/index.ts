import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userRes, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authUserId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const walletId = String(body.walletId ?? "").trim();
    const amount = Number(body.amount);

    if (!walletId || !Number.isFinite(amount) || amount <= 0 || amount > 10000) {
      return new Response(
        JSON.stringify({ error: "Invalid walletId or amount (must be 0–10000)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find wallet owned by this auth user
    const { data: wallet, error: wErr } = await supabase
      .from("users")
      .select("id, balance_usdc, auth_user_id, revoked_at")
      .eq("circle_wallet_id", walletId)
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (wErr || !wallet) {
      return new Response(JSON.stringify({ error: "Wallet not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (wallet.revoked_at) {
      return new Response(JSON.stringify({ error: "Wallet revoked" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newBalance = Number(wallet.balance_usdc ?? 0) + amount;
    const { error: uErr } = await supabase
      .from("users")
      .update({ balance_usdc: newBalance })
      .eq("id", wallet.id);

    if (uErr) {
      return new Response(JSON.stringify({ error: uErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, balance: newBalance, amount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
