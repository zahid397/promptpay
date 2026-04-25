import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { streamChat, type ChatMessage } from "@/lib/api";

export interface SettlementEvent {
  settlementNumber: number;
  tokens: number;
  usdcAmount: string;
  totalUsdcPaid: string;
  totalTokens: number;
  transferId: string;
  timestamp: string;
}

export interface UiMessage extends ChatMessage {
  id: string;
  settlements: SettlementEvent[];
  streaming?: boolean;
}

export interface UseChatOptions {
  onSettlement?: (s: SettlementEvent) => void;
  onError?: (msg: string) => void;
}

const MAX_RECONNECTS = 3;

export function useChat(opts: UseChatOptions = {}) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [currentTokens, setCurrentTokens] = useState(0);
  const [sessionUsdcPaid, setSessionUsdcPaid] = useState(0);
  const [sessionSettlements, setSessionSettlements] = useState(0);
  const [latestSettlement, setLatestSettlement] = useState<SettlementEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const lastCtxRef = useRef<{
    apiKey: string;
    gatewayUrl?: string;
    history: ChatMessage[];
    model?: string;
  } | null>(null);

  const handleEvent = (evt: any, aiMsgId: string) => {
    if (evt.type === "session") {
      sessionIdRef.current = evt.sessionId;
    } else if (evt.type === "token") {
      setCurrentTokens(evt.totalTokens);
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, content: m.content + evt.text } : m))
      );
    } else if (evt.type === "settlement") {
      const s: SettlementEvent = {
        settlementNumber: evt.settlementNumber,
        tokens: evt.tokens,
        usdcAmount: evt.usdcAmount,
        totalUsdcPaid: evt.totalUsdcPaid,
        totalTokens: evt.totalTokens,
        transferId: evt.transferId,
        timestamp: evt.timestamp,
      };
      setLatestSettlement(s);
      setSessionSettlements(s.settlementNumber);
      setSessionUsdcPaid(parseFloat(s.totalUsdcPaid));
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, settlements: [...m.settlements, s] } : m))
      );
      opts.onSettlement?.(s);
    } else if (evt.type === "error") {
      setError(evt.message);
      opts.onError?.(evt.message);
    }
  };

  const runStream = async (
    aiMsgId: string,
    ctx: { apiKey: string; gatewayUrl?: string; history: ChatMessage[]; model?: string },
    resume = false
  ): Promise<{ ok: boolean; userAborted: boolean }> => {
    const ac = new AbortController();
    abortRef.current = ac;

    const res = await streamChat({
      apiKey: ctx.apiKey,
      gatewayUrl: ctx.gatewayUrl,
      messages: ctx.history,
      signal: ac.signal,
      sessionId: sessionIdRef.current ?? undefined,
      resume,
      model: ctx.model,
    });

    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return { ok: true, userAborted: false };
        buffer += decoder.decode(value, { stream: true });

        let idx = buffer.indexOf("\n\n");
        while (idx !== -1) {
          const event = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          idx = buffer.indexOf("\n\n");

          const dataLine = event
            .split("\n")
            .find((line) => line.startsWith("data: "));
          if (!dataLine) continue;
          try {
            handleEvent(JSON.parse(dataLine.slice(6)), aiMsgId);
          } catch {
            /* ignore malformed chunk */
          }
        }
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return { ok: false, userAborted: true };
      throw e;
    }
  };

  const send = useCallback(
    async (userText: string, ctx: { apiKey: string; gatewayUrl?: string; model?: string }) => {
      if (!userText.trim() || streaming) return;
      if (!ctx.apiKey) {
        setError("Add an API key first");
        return;
      }

      setError(null);
      setCurrentTokens(0);
      setSessionUsdcPaid(0);
      setSessionSettlements(0);
      setLatestSettlement(null);
      sessionIdRef.current = null;

      const userMsg: UiMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: userText,
        settlements: [],
      };
      const aiMsg: UiMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        settlements: [],
        streaming: true,
      };

      const history: ChatMessage[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userText },
      ];

      lastCtxRef.current = { apiKey: ctx.apiKey, gatewayUrl: ctx.gatewayUrl, history, model: ctx.model };
      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setStreaming(true);

      let attempt = 0;
      let resume = false;
      while (true) {
        try {
          const result = await runStream(aiMsg.id, lastCtxRef.current!, resume);
          if (result.userAborted) break;
          break;
        } catch (e: any) {
          attempt++;
          if (attempt > MAX_RECONNECTS) {
            const msg = e?.message || "Stream failed";
            setError(msg);
            opts.onError?.(msg);
            toast.error("Stream failed", {
              description: msg,
              action: {
                label: "Retry",
                onClick: () => void send(userText, ctx),
              },
            });
            break;
          }
          const wait = Math.min(500 * 2 ** (attempt - 1), 4000);
          setReconnecting(true);
          toast.warning(`Reconnecting stream… (${attempt}/${MAX_RECONNECTS})`, {
            description: `Resuming session in ${Math.round(wait / 100) / 10}s`,
          });
          await new Promise((resolve) => setTimeout(resolve, wait));
          resume = !!sessionIdRef.current;
        }
      }

      setReconnecting(false);
      setStreaming(false);
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsg.id ? { ...m, streaming: false } : m))
      );
      abortRef.current = null;
    },
    [messages, streaming, opts]
  );

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setCurrentTokens(0);
    setSessionUsdcPaid(0);
    setSessionSettlements(0);
    setLatestSettlement(null);
    sessionIdRef.current = null;
  };

  return {
    messages,
    streaming,
    reconnecting,
    currentTokens,
    sessionUsdcPaid,
    sessionSettlements,
    latestSettlement,
    error,
    send,
    reset,
  };
}
