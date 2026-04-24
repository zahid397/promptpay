const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;
export const CHAT_URL = `${FUNCTIONS_BASE}/chat`;
export const CREATE_WALLET_URL = `${FUNCTIONS_BASE}/create-wallet`;
export const VERIFY_KEY_URL = `${FUNCTIONS_BASE}/verify-key`;
export const END_SESSION_URL = `${FUNCTIONS_BASE}/end-session`;
export const STATS_URL = `${FUNCTIONS_BASE}/stats-snapshot`;

const baseHeaders = {
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${SUPABASE_ANON}`,
};

export interface CreateWalletResponse {
  success: boolean;
  apiKey: string;
  walletId: string;
  userId: string;
  balance: string;
  message: string;
}

export async function createWallet(): Promise<CreateWalletResponse> {
  const res = await fetch(CREATE_WALLET_URL, {
    method: "POST",
    headers: { ...baseHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Failed to create wallet: ${await res.text()}`);
  return res.json();
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
  const res = await fetch(VERIFY_KEY_URL, {
    method: "POST",
    headers: { ...baseHeaders, "Content-Type": "application/json", "X-API-Key": apiKey },
  });
  return res.json();
}

export async function endSession(apiKey: string): Promise<{ success: boolean; closed: number }> {
  const res = await fetch(END_SESSION_URL, {
    method: "POST",
    headers: { ...baseHeaders, "Content-Type": "application/json", "X-API-Key": apiKey },
  });
  if (!res.ok) throw new Error(`end-session: ${await res.text()}`);
  return res.json();
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
  const res = await fetch(STATS_URL, {
    method: "GET",
    headers: { ...baseHeaders },
  });
  if (!res.ok) throw new Error(`stats-snapshot: ${await res.text()}`);
  return res.json();
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
}): Promise<Response> {
  const url = opts.gatewayUrl || CHAT_URL;
  return fetch(url, {
    method: "POST",
    headers: {
      ...baseHeaders,
      "Content-Type": "application/json",
      "X-API-Key": opts.apiKey,
    },
    body: JSON.stringify({ messages: opts.messages }),
    signal: opts.signal,
  });
}
