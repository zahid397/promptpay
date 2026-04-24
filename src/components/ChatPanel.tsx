import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CHAT_URL, createWallet, verifyKey, endSession } from "@/lib/api";
import { useChat, type SettlementEvent } from "@/hooks/useChat";

interface Props {
  onSessionStats: (s: { settlements: number; usdc: number; tokens: number }) => void;
  apiKey?: string;
  onApiKeyChange?: (k: string) => void;
}

const LS_KEY = "promptpay.apiKey";
const LS_URL = "promptpay.gatewayUrl";

export function ChatPanel({ onSessionStats, apiKey: extKey, onApiKeyChange }: Props) {
  const [apiKey, setApiKeyState] = useState("");
  const setApiKey = (k: string) => {
    setApiKeyState(k);
    onApiKeyChange?.(k);
  };
  const [gatewayUrl, setGatewayUrl] = useState(CHAT_URL);
  const [input, setInput] = useState("Explain pay-per-token billing in 4 sentences.");
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const k = localStorage.getItem(LS_KEY);
    const u = localStorage.getItem(LS_URL);
    if (k) setApiKeyState(k);
    if (u) setGatewayUrl(u);
  }, []);

  useEffect(() => {
    if (extKey && extKey !== apiKey) setApiKeyState(extKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extKey]);

  useEffect(() => {
    if (apiKey) localStorage.setItem(LS_KEY, apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (gatewayUrl) localStorage.setItem(LS_URL, gatewayUrl);
  }, [gatewayUrl]);

  const onSettlement = (s: SettlementEvent) => {
    toast.success(`⚡ Settlement #${s.settlementNumber}`, {
      description: `${s.usdcAmount} USDC settled on Arc · ${s.transferId.slice(0, 16)}…`,
      duration: 4000,
    });
  };

  const chat = useChat({
    onSettlement,
    onError: (m) => toast.error("Stream error", { description: m }),
  });

  useEffect(() => {
    onSessionStats({
      settlements: chat.sessionSettlements,
      usdc: chat.sessionUsdcPaid,
      tokens: chat.currentTokens,
    });
  }, [chat.sessionSettlements, chat.sessionUsdcPaid, chat.currentTokens, onSessionStats]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.messages]);

  const handleCreateAccount = async () => {
    setCreating(true);
    try {
      const res = await createWallet();
      setApiKey(res.apiKey);
      toast.success("Account created · 10 USDC funded", {
        description: "Key saved locally.",
        action: {
          label: "Copy key",
          onClick: () => {
            navigator.clipboard.writeText(res.apiKey);
            toast.success("API key copied");
          },
        },
        duration: 8000,
      });
    } catch (e: any) {
      toast.error("Failed to create account", { description: e?.message });
    } finally {
      setCreating(false);
    }
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Enter an API key first");
      return;
    }
    setTesting(true);
    try {
      const res = await verifyKey(apiKey.trim());
      if (res.valid) {
        toast.success("API key valid", {
          description: `Balance $${(res.balance ?? 0).toFixed(6)} · Spent $${(res.spent ?? 0).toFixed(6)}`,
        });
      } else {
        toast.error("Invalid API key", { description: res.error || "Not found" });
      }
    } catch (e: any) {
      toast.error("Verify failed", { description: e?.message });
    } finally {
      setTesting(false);
    }
  };

  const handleCopyKey = async () => {
    if (!apiKey.trim()) return;
    await navigator.clipboard.writeText(apiKey.trim());
    toast.success("API key copied");
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      if (apiKey.trim()) {
        const r = await endSession(apiKey.trim());
        if (r.closed > 0) {
          toast.success(`Closed ${r.closed} active session${r.closed > 1 ? "s" : ""}`);
        }
      }
    } catch (e: any) {
      toast.error("Could not close session", { description: e?.message });
    } finally {
      chat.reset();
      setResetting(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await chat.send(text, { apiKey, gatewayUrl });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-surface border border-soft rounded-md flex flex-col h-[640px] overflow-hidden">
      {/* Setup bar */}
      <div className="border-b border-soft px-4 py-3 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Gateway URL
          </label>
          <input
            value={gatewayUrl}
            onChange={(e) => setGatewayUrl(e.target.value)}
            className="w-full mt-1 bg-surface-2 border border-soft rounded-sm px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:border-cyan"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-wider text-muted flex items-center justify-between">
            <span>API Key</span>
            <span className="flex gap-2">
              <button
                onClick={handleTestKey}
                disabled={testing || !apiKey.trim()}
                className="text-cyan hover:underline disabled:opacity-30"
              >
                {testing ? "…" : "Test"}
              </button>
              <button
                onClick={handleCopyKey}
                disabled={!apiKey.trim()}
                className="text-muted hover:text-foreground disabled:opacity-30"
              >
                Copy
              </button>
            </span>
          </label>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="pp_your_api_key"
            className="w-full mt-1 bg-surface-2 border border-soft rounded-sm px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:border-cyan"
          />
        </div>
        <button
          onClick={handleCreateAccount}
          disabled={creating}
          className="font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-sm border border-cyan text-cyan hover:bg-primary hover:text-primary-foreground transition disabled:opacity-50"
        >
          {creating ? "…" : "+ Create Account"}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
        {chat.messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-center px-8">
            <div>
              <div className="font-display font-extrabold text-2xl text-foreground">
                Stream a prompt. Settle on Arc.
              </div>
              <div className="font-mono text-[12px] text-muted mt-2">
                Each 50 tokens triggers a USDC micropayment recorded on-chain.
              </div>
            </div>
          </div>
        )}

        {chat.messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`rounded-sm border-l-2 px-3 py-2.5 ${
                isUser
                  ? "border-l-primary bg-[hsl(190_100%_50%_/_0.05)]"
                  : "border-l-success bg-[hsl(152_100%_50%_/_0.05)]"
              }`}
            >
              <div className={`font-mono text-[10px] uppercase tracking-wider mb-1 ${isUser ? "text-cyan" : "text-green"}`}>
                {isUser ? "▸ You" : "◆ Gemini · Arc"}
              </div>
              <div
                className={`font-mono text-[13px] leading-[1.7] whitespace-pre-wrap break-words ${
                  m.streaming && !isUser ? "cursor-blink" : ""
                }`}
              >
                {m.content || (m.streaming ? "…" : "")}
              </div>

              {m.settlements.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.settlements.map((s) => (
                    <span
                      key={s.settlementNumber}
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm border border-green text-green bg-[hsl(152_100%_50%_/_0.07)]"
                    >
                      ⚡ Settlement #{s.settlementNumber} · {s.usdcAmount} USDC on Arc
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {chat.error && (
          <div className="rounded-sm border border-danger bg-[hsl(0_100%_64%_/_0.07)] px-3 py-2 font-mono text-[12px] text-red">
            {chat.error}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-soft px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <div className="font-mono text-[10px] text-muted">
            Tokens streamed: <span className="text-foreground">{chat.currentTokens}</span> · Session settlements:{" "}
            <span className="text-orange">{chat.sessionSettlements}</span> · Paid:{" "}
            <span className="text-green">${chat.sessionUsdcPaid.toFixed(6)}</span>
          </div>
          <button
            onClick={handleReset}
            disabled={chat.streaming || resetting || chat.messages.length === 0}
            className="font-mono text-[10px] uppercase tracking-wider text-muted hover:text-foreground disabled:opacity-30"
          >
            {resetting ? "Closing…" : "Reset"}
          </button>
        </div>
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={chat.streaming}
            placeholder="Ask anything… Ctrl+Enter to send."
            className="flex-1 h-[80px] resize-none bg-surface-2 border border-soft rounded-sm px-3 py-2 font-mono text-[13px] text-foreground focus:outline-none focus:border-cyan disabled:opacity-60"
          />
          <button
            onClick={handleSend}
            disabled={chat.streaming || !input.trim()}
            className="font-display font-extrabold text-sm uppercase tracking-wider px-5 h-[80px] rounded-sm text-primary-foreground disabled:opacity-40"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(190 100% 65%) 100%)",
              boxShadow: "var(--shadow-glow-cyan)",
            }}
          >
            {chat.streaming ? "…" : "Send →"}
          </button>
        </div>
      </div>
    </div>
  );
}
