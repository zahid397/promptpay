const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;
export const CHAT_URL = `${FUNCTIONS_BASE}/chat`;
export const CREATE_WALLET_URL = `${FUNCTIONS_BASE}/create-wallet`;

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
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to create wallet: ${txt}`);
  }
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
      "Content-Type": "application/json",
      "X-API-Key": opts.apiKey,
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({ messages: opts.messages }),
    signal: opts.signal,
  });
}
