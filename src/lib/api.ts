import { supabase } from "@/integrations/supabase/client";
import { fetchWithRetry, jsonFetch } from "./fetcher";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;
export const CHAT_URL = `${FUNCTIONS_BASE}/chat`;
export const CREATE_WALLET_URL = `${FUNCTIONS_BASE}/create-wallet`;
export const VERIFY_KEY_URL = `${FUNCTIONS_BASE}/verify-key`;
export const END_SESSION_URL = `${FUNCTIONS_BASE}/end-session`;
export const STATS_URL = `${FUNCTIONS_BASE}/stats-snapshot`;
export const HEALTH_URL = `${FUNCTIONS_BASE}/health`;
export const REVOKE_KEY_URL = `${FUNCTIONS_BASE}/revoke-key`;
export const ADD_FUNDS_URL = `${FUNCTIONS_BASE}/add-funds`;
export const M2M_TRADE_URL = `${FUNCTIONS_BASE}/m2m-trade`;
export const RANDOM_CHALLENGE_URL = `${FUNCTIONS_BASE}/random-challenge`;
export const RANDOM_PAY_URL = `${FUNCTIONS_BASE}/random-pay`;

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token ?? SUPABASE_ANON;
  return {
    apikey: SUPABASE_ANON,
    Authorization: `Bearer ${jwt}`,
  };
}

export interface CreateWalletResponse {
  success: boolean;
  rotated?: boolean;
  apiKey: string;
  walletId: string;
  arcAddress?: string;
  userId: string;
  balance: number | string;
  balanceFormatted?: string;
  currency?: string;
  network?: string;
  provider?: string;
  status?: string;
  createdAt?: string;
  message: string;
}

export async function createWallet(): Promise<CreateWalletResponse> {
  return jsonFetch<CreateWalletResponse>(
    CREATE_WALLET_URL,
    {
      method: "POST",
      headers: { ...(await authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
    { toastLabel: "Create wallet" }
  );
}

export interface VerifyKeyResponse {
  valid: boolean;
  userId?: string;
  walletId?: string;
  balance?: number;
  spent?: number;
  createdAt?: string;
  error?: string;
}

export async function verifyKey(apiKey: string): Promise<VerifyKeyResponse> {
  return jsonFetch<VerifyKeyResponse>(
    VERIFY_KEY_URL,
    {
      method: "POST",
      headers: {
        ...(await authHeaders()),
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
    },
    { toastLabel: "Verify key" }
  );
}

export async function endSession(apiKey: string): Promise<{ success: boolean; closed: number }> {
  return jsonFetch(
    END_SESSION_URL,
    {
      method: "POST",
      headers: {
        ...(await authHeaders()),
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
    },
    { toastLabel: "End session" }
  );
}

export async function revokeKey(keyId: string): Promise<{ success: boolean }> {
  return jsonFetch(
    REVOKE_KEY_URL,
    {
      method: "POST",
      headers: { ...(await authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify({ keyId }),
    },
    { toastLabel: "Revoke key" }
  );
}

export async function addFunds(walletId: string, amount: number): Promise<{ success: boolean; balance: number; amount: number }> {
  return jsonFetch(
    ADD_FUNDS_URL,
    {
      method: "POST",
      headers: { ...(await authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify({ walletId, amount }),
    },
    { toastLabel: "Add funds" }
  );
}

export interface StatsSnapshot {
  totalTx: number;
  totalUsdc: number;
  totalTokens: number;
  totalUsers: number;
  totalSessions: number;
  highestSettlementNumber: number;
  economicProof: {
    gasCostOnArc: number;
    gasCostOnEthL1: number;
    revenueUsdc: number;
    profitOnArc: number;
    profitOnEthL1: number;
    verdict: string;
  };
  timestamp: string;
}

export async function fetchStatsSnapshot(): Promise<StatsSnapshot> {
  return jsonFetch<StatsSnapshot>(
    STATS_URL,
    { method: "GET", headers: await authHeaders() },
    { toastLabel: "Refresh stats" }
  );
}

export interface HealthResponse {
  ok: boolean;
  status: "healthy" | "degraded" | "down";
  version: string;
  uptimeMs: number;
  latencyMs: number;
  checks: {
    database: { status: "up" | "down"; latencyMs: number };
    ai_gateway: { status: "up" | "down" };
    realtime: { status: "up" | "down" };
  };
  timestamp: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetchWithRetry(
    HEALTH_URL,
    { method: "GET", headers: await authHeaders() },
    { retries: 1, baseDelayMs: 300 }
  );
  return res.json();
}

export interface M2MTrade {
  ok: boolean;
  round: number;
  seller?: string;
  price?: number;
  buyerRequest?: string;
  sellerResponse?: string;
  tokens?: number;
  arcTxHash?: string;
  settlementNumber?: number;
  timestamp?: string;
  error?: string;
}

export interface M2MResponse {
  success: boolean;
  service: string;
  rounds: number;
  newBalance: number;
  trades: M2MTrade[];
}

export async function runM2MTrade(opts: {
  apiKey: string;
  service: "weather" | "stock" | "translate" | "summarize";
  rounds: number;
}): Promise<M2MResponse> {
  return jsonFetch<M2MResponse>(
    M2M_TRADE_URL,
    {
      method: "POST",
      headers: {
        ...(await authHeaders()),
        "Content-Type": "application/json",
        "X-API-Key": opts.apiKey,
      },
      body: JSON.stringify({ service: opts.service, rounds: opts.rounds }),
    },
    { toastLabel: "M2M trade" }
  );
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function streamChat(opts: {
  apiKey: string;
  gatewayUrl?: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
  sessionId?: string;
  resume?: boolean;
  model?: string;
}): Promise<Response> {
  const url = opts.gatewayUrl || CHAT_URL;
  return fetch(url, {
    method: "POST",
    headers: {
      ...(await authHeaders()),
      "Content-Type": "application/json",
      "X-API-Key": opts.apiKey,
    },
    body: JSON.stringify({
      messages: opts.messages,
      sessionId: opts.sessionId,
      resume: opts.resume,
      model: opts.model,
    }),
    signal: opts.signal,
  });
}

// ───── Paid Random Number API (Per-API Monetization track) ─────

export interface RandomChallenge {
  paymentId: string;
  amount: number;
  currency: string;
  recipient: string;
  network: string;
  expiresAt: string;
  mock: boolean;
}

export interface RandomPayResponse {
  ok: boolean;
  random: number;
  txHash: string;
  paymentId: string;
  amountPaid: number;
  newBalance: number;
  settlementNumber: number;
  mock: boolean;
}

export async function fetchRandomChallenge(): Promise<RandomChallenge> {
  return jsonFetch<RandomChallenge>(
    RANDOM_CHALLENGE_URL,
    { method: "GET", headers: await authHeaders() },
    { toastLabel: "Get challenge" }
  );
}

/** Mock arc SDK — `arcSDK.createPayment` simulated finality (1s in real edge fn). */
export async function arcCreatePayment(challenge: RandomChallenge): Promise<{ confirmed: boolean }> {
  // In real mode this would call @arc-payments/sdk createPayment().
  // Here we just resolve immediately — actual Arc verification happens in /random-pay.
  return { confirmed: true };
}

export async function payAndGetRandom(opts: {
  apiKey: string;
  paymentId: string;
}): Promise<RandomPayResponse> {
  return jsonFetch<RandomPayResponse>(
    RANDOM_PAY_URL,
    {
      method: "POST",
      headers: {
        ...(await authHeaders()),
        "Content-Type": "application/json",
        "X-API-Key": opts.apiKey,
      },
      body: JSON.stringify({ paymentId: opts.paymentId }),
    },
    { toastLabel: "Random pay" }
  );
}

/** Convenience: full 3-step flow → challenge → mock arc create → /random-pay.
 *  Auto-retries once with a fresh challenge if the paymentId was already
 *  consumed (HTTP 409) — happens on rapid double-clicks / StrictMode replays. */
export async function callPaidRandom(apiKey: string): Promise<RandomPayResponse> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const challenge = await fetchRandomChallenge();
    await arcCreatePayment(challenge);
    try {
      return await payAndGetRandom({ apiKey, paymentId: challenge.paymentId });
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (attempt === 0 && /already consumed|409/i.test(msg)) continue;
      throw e;
    }
  }
  throw new Error("callPaidRandom: exhausted retries");
}
