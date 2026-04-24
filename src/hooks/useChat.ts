import { useCallback, useRef, useState } from "react";
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

export function useChat(opts: UseChatOptions = {}) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [currentTokens, setCurrentTokens] = useState(0);
  const [sessionUsdcPaid, setSessionUsdcPaid] = useState(0);
  const [sessionSettlements, setSessionSettlements] = useState(0);
  const [latestSettlement, setLatestSettlement] = useState<SettlementEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (
      userText: string,
      ctx: { apiKey: string; gatewayUrl?: string }
    ) => {
      if (!userText.trim() || streaming) return;
      if (!ctx.apiKey) {
        setError("Add an API key first (or click Create Account)");
        return;
      }

      setError(null);
      setCurrentTokens(0);
      setSessionUsdcPaid(0);
      setSessionSettlements(0);
      setLatestSettlement(null);

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

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setStreaming(true);

      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await streamChat({
          apiKey: ctx.apiKey,
          gatewayUrl: ctx.gatewayUrl,
          messages: history,
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx = buffer.indexOf("\n\n");
          while (idx !== -1) {
            const event = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            idx = buffer.indexOf("\n\n");

            const dataLine = event
              .split("\n")
              .find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            const json = dataLine.slice(6);
            try {
              const evt = JSON.parse(json);
              handleEvent(evt, aiMsg.id);
            } catch {
              /* ignore */
            }
          }
        }
      } catch (e: any) {
        if (e.name === "AbortError") return;
        const msg = e?.message || "Stream failed";
        setError(msg);
        opts.onError?.(msg);
      } finally {
        setStreaming(false);
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsg.id ? { ...m, streaming: false } : m))
        );
        abortRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, streaming]
  );

  const handleEvent = (evt: any, aiMsgId: string) => {
    if (evt.type === "token") {
      setCurrentTokens(evt.totalTokens);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, content: m.content + evt.text } : m
        )
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
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, settlements: [...m.settlements, s] } : m
        )
      );
      opts.onSettlement?.(s);
    } else if (evt.type === "done") {
      // no-op; finally{} will set streaming false
    } else if (evt.type === "error") {
      setError(evt.message);
      opts.onError?.(evt.message);
    }
  };

  const reset = () => {
    setMessages([]);
    setError(null);
    setCurrentTokens(0);
    setSessionUsdcPaid(0);
    setSessionSettlements(0);
    setLatestSettlement(null);
  };

  return {
    messages,
    streaming,
    currentTokens,
    sessionUsdcPaid,
    sessionSettlements,
    latestSettlement,
    error,
    send,
    reset,
  };
}
