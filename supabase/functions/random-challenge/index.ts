// GET /random-challenge — issues a $0.001 USDC payment challenge persisted in DB.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const ARC_MODE = Deno.env.get("ARC_MODE") || "mock";
const PRICE = 0.001;
const RECIPIENT = "arc1qdemo000randompaywallet0000000000000000";
const TTL_MS = 60_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET")
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const paymentId = "pay_" + crypto.randomUUID().replace(/-/g, "");
  const now = Date.now();
  const expiresAt = new Date(now + TTL_MS);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await supabase.from("random_challenges").insert({
    payment_id: paymentId,
    amount: PRICE,
    recipient: RECIPIENT,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Best-effort cleanup of old expired rows
  await supabase
    .from("random_challenges")
    .delete()
    .lt("expires_at", new Date(now - 5 * 60_000).toISOString());

  return new Response(
    JSON.stringify({
      paymentId,
      amount: PRICE,
      currency: "USDC",
      recipient: RECIPIENT,
      network: ARC_MODE === "real" ? "arc-testnet" : "arc-testnet-mock",
      expiresAt: expiresAt.toISOString(),
      mock: ARC_MODE !== "real",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
