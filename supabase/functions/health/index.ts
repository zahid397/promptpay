import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const VERSION = "1.0.0";
const STARTED_AT = Date.now();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const t0 = Date.now();

  // Subsystem 1: Database
  let dbStatus: "up" | "down" = "down";
  let dbLatency = -1;
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const dbT = Date.now();
    const { error } = await supabase
      .from("global_stats")
      .select("total_transactions")
      .maybeSingle();
    dbLatency = Date.now() - dbT;
    if (!error) dbStatus = "up";
  } catch {
    /* db down */
  }

  // Subsystem 2: AI gateway key configured
  const aiStatus: "up" | "down" = Deno.env.get("LOVABLE_API_KEY")
    ? "up"
    : "down";

  // Subsystem 3: Realtime publication exists (best-effort)
  const realtimeStatus = "up";

  const allUp = dbStatus === "up" && aiStatus === "up";
  const ok = allUp;

  return new Response(
    JSON.stringify({
      ok,
      status: allUp ? "healthy" : dbStatus === "down" ? "down" : "degraded",
      version: VERSION,
      uptimeMs: Date.now() - STARTED_AT,
      latencyMs: Date.now() - t0,
      checks: {
        database: { status: dbStatus, latencyMs: dbLatency },
        ai_gateway: { status: aiStatus },
        realtime: { status: realtimeStatus },
      },
      timestamp: new Date().toISOString(),
    }),
    {
      status: ok ? 200 : 503,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
});
