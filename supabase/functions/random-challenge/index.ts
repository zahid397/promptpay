// GET /random-challenge — issues a $0.001 USDC nanopayment challenge.
// Mock-mode by default; ARC_MODE=real flips to live verification path.
// Challenges live in an in-memory Map (per warm instance) and expire in 60s.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ARC_MODE = Deno.env.get("ARC_MODE") || "mock";
const DEMO_RECIPIENT = "arc1qdemo000randompaywallet0000000000000000";
const PRICE = 0.001;
const TTL_MS = 60_000;

// Shared in-memory store across this isolate
// (also accessible from random-pay via globalThis)
interface Challenge {
  paymentId: string;
  amount: number;
  recipient: string;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
}

// @ts-ignore — attach to globalThis so other functions in same isolate can read
const store: Map<string, Challenge> =
  (globalThis as any).__pp_challenges ||
  ((globalThis as any).__pp_challenges = new Map<string, Challenge>());

function gc() {
  const now = Date.now();
  for (const [k, v] of store) if (v.expiresAt < now) store.delete(k);
}

Deno.serve((req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  gc();
  const paymentId = `pay_${crypto.randomUUID().replace(/-/g, "")}`;
  const now = Date.now();
  const challenge: Challenge = {
    paymentId,
    amount: PRICE,
    recipient: DEMO_RECIPIENT,
    createdAt: now,
    expiresAt: now + TTL_MS,
    consumed: false,
  };
  store.set(paymentId, challenge);

  return new Response(
    JSON.stringify({
      paymentId,
      amount: PRICE,
      currency: "USDC",
      recipient: DEMO_RECIPIENT,
      network: ARC_MODE === "real" ? "arc-testnet" : "arc-testnet-mock",
      expiresAt: new Date(challenge.expiresAt).toISOString(),
      mock: ARC_MODE !== "real",
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
