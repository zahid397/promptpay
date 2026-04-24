import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("global_stats")
    .select("*")
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const totalTx = Number(data?.total_transactions ?? 0);
  const totalUsdc = Number(data?.total_usdc_settled ?? 0);
  const highest = Number(data?.highest_settlement_number ?? 0);

  // Live economic proof using actual settlement count
  const gasArc = totalTx * 0.000000001;
  const gasEth = totalTx * 2;

  return new Response(
    JSON.stringify({
      totalTx,
      totalUsdc,
      totalTokens: Number(data?.total_tokens_processed ?? 0),
      totalUsers: Number(data?.total_users ?? 0),
      totalSessions: Number(data?.total_sessions ?? 0),
      highestSettlementNumber: highest,
      economicProof: {
        gasCostOnArc: gasArc,
        gasCostOnEthL1: gasEth,
        revenueUsdc: totalUsdc,
        profitOnArc: totalUsdc - gasArc,
        profitOnEthL1: totalUsdc - gasEth,
        verdict:
          totalTx > 0
            ? `${totalTx.toLocaleString()} settlements would cost $${gasEth.toFixed(2)} in gas on Ethereum L1 — to earn $${totalUsdc.toFixed(6)}.`
            : "No settlements recorded yet.",
      },
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
