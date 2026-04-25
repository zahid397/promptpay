// POST /random-pay — verifies a paid challenge and returns a secure random number.
// Body: { paymentId }   Header: x-api-key
// Mock mode (default): simulates 1s Arc finality, then debits the wallet,
// inserts a transaction row (auto-streams via existing realtime feed),
// and returns { random, txHash, settlementNumber }.
// Real mode: replace verifyOnArc() with @arc-payments/sdk verifyPayment().

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ARC_MODE = Deno.env.get("ARC_MODE") || "mock";
const PRICE = 0.001;

function bad(status: number, error: string, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok: false, error, ...extra }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyOnArc(paymentId: string): Promise<{ ok: boolean; txHash: string }> {
  if (ARC_MODE === "real") {
    // TODO: import { verifyPayment } from "npm:@arc-payments/sdk"
    // const r = await verifyPayment({ paymentId, expected: PRICE });
    // return { ok: r.confirmed, txHash: r.txHash };
    throw new Error("ARC_MODE=real not configured. Set ARC_API_KEY secret and wire @arc-payments/sdk.");
  }
  // Mock 1s Arc finality
  await new Promise((r) => setTimeout(r, 1000));
  const txHash = "0x" + Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { ok: true, txHash };
}

function secureRandomU32(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad(405, "Method not allowed");

  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return bad(401, "Missing X-API-Key");

  let body: { paymentId?: string };
  try {
    body = await req.json();
  } catch {
    return bad(400, "Invalid JSON body");
  }
  const paymentId = (body.paymentId || "").trim();
  if (!paymentId) return bad(400, "paymentId required");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: challenge, error: chErr } = await supabase
    .from("random_challenges")
    .select("payment_id, amount, recipient, expires_at, consumed_at")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (chErr || !challenge) return bad(404, "Unknown or expired paymentId");
  if (challenge.consumed_at) return bad(409, "Challenge already consumed");
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    await supabase.from("random_challenges").delete().eq("payment_id", paymentId);
    return bad(410, "Challenge expired");
  }

  // 1. Validate API key + balance
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("id, balance_usdc, total_spent_usdc, revoked_at")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (userErr || !user) return bad(401, "Invalid API key");
  if (user.revoked_at) return bad(403, "API key revoked");
  const balance = Number(user.balance_usdc);
  if (balance < PRICE) return bad(402, "Insufficient USDC balance", { balance });

  // 2. Verify Arc payment (mock 1s)
  const arc = await verifyOnArc(paymentId);
  if (!arc.ok) return bad(402, "Arc payment not confirmed");

  // Mark consumed BEFORE side-effects to prevent replay
  await supabase
    .from("random_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("payment_id", paymentId);

  // 3. Debit wallet
  const newBalance = +(balance - PRICE).toFixed(6);
  const newSpent = +((Number(user.total_spent_usdc) || 0) + PRICE).toFixed(6);
  await supabase
    .from("users")
    .update({ balance_usdc: newBalance, total_spent_usdc: newSpent })
    .eq("id", user.id);

  // 4. Insert transaction (auto-streams to existing realtime feed)
  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true });
  const settlementNumber = (count ?? 0) + 1;

  await supabase.from("transactions").insert({
    user_id: user.id,
    settlement_number: settlementNumber,
    tokens: 1,
    usdc_amount: PRICE,
    circle_transfer_id: arc.txHash,
    gas_cost_arc: 0.000000001,
    gas_cost_eth_l1: 0.5,
    status: "settled",
  });

  // 5. Return the protected resource
  return new Response(
    JSON.stringify({
      ok: true,
      random: secureRandomU32(),
      txHash: arc.txHash,
      paymentId,
      amountPaid: PRICE,
      newBalance,
      settlementNumber,
      mock: ARC_MODE !== "real",
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
