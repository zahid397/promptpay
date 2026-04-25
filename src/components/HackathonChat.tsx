import { useRef, useState, type KeyboardEvent } from "react";
import { Bot, Send, Sparkles, Zap, DollarSign, Trophy } from "lucide-react";
import { toast } from "sonner";

interface Msg { role: "user" | "assistant"; content: string; }

const DEMO_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/demo-chat`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const QUICK = [
  "Pitch my Arc hackathon project in 3 lines",
  "Why does sub-cent USDC fail on Ethereum L1?",
  "Design an agent-to-agent payment loop",
  "How do I hit 50+ on-chain transactions?",
];

export function HackathonChat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "**Welcome to PromptPay** — your Arc + USDC Nanopayments hackathon co-pilot. Ask me about per-API monetization, agent-to-agent commerce, usage billing or margin proof. I stream live from Lovable AI — no API key needed here.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const resp = await fetch(DEMO_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON,
          Authorization: `Bearer ${ANON}`,
        },
        body: JSON.stringify({ messages: next }),
        signal: ac.signal,
      });

      if (resp.status === 429) { toast.error("Rate limit — try again in a moment"); throw new Error("rate"); }
      if (resp.status === 402) { toast.error("AI credits exhausted"); throw new Error("credits"); }
      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let done = false;

      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              acc += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "⚠️ Stream failed. Please try again.",
          };
          return copy;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <section className="rounded-2xl border border-purple bg-surface p-5 md:p-6 glow-purple overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-purple bg-[hsl(270_95%_65%_/_0.1)] border border-purple rounded-full px-3 py-1.5">
            <Trophy className="h-3 w-3" /> Arc Hackathon Co-Pilot
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold mt-3">
            Live LLM, <span className="bg-gradient-purple-cyan bg-clip-text text-transparent">no setup.</span>
          </h2>
          <p className="font-mono text-[12px] text-muted mt-2 max-w-xl leading-relaxed">
            Streamed from Lovable AI · Gemini 2.5 Flash. Ask anything about USDC nanopayments, per-action pricing, or your hackathon submission.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-soft px-2.5 py-1 font-mono text-[10px] uppercase text-muted">
            <Zap className="h-3 w-3 text-green" /> Streaming
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-soft px-2.5 py-1 font-mono text-[10px] uppercase text-muted">
            <DollarSign className="h-3 w-3 text-cyan" /> ≤ $0.01/action
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK.map((q) => (
          <button
            key={q}
            disabled={streaming}
            onClick={() => void send(q)}
            className="rounded-md border border-soft bg-surface-2 px-3 py-1.5 font-mono text-[11px] text-muted transition hover:border-purple hover:text-foreground disabled:opacity-40"
          >
            <Sparkles className="inline h-3 w-3 mr-1 text-purple" />
            {q}
          </button>
        ))}
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto rounded-lg border border-soft bg-background/40 p-3 mb-3">
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div
              key={i}
              className={`rounded-lg border px-3 py-2.5 ${isUser ? "border-purple bg-surface-2" : "border-soft bg-surface"}`}
            >
              <div className={`mb-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider ${isUser ? "text-purple" : "text-green"}`}>
                <Bot className="h-3 w-3" />
                {isUser ? "You" : "PromptPay AI"}
              </div>
              <div className="whitespace-pre-wrap font-mono text-[12px] leading-6 text-foreground">
                {m.content || (streaming && i === messages.length - 1 ? "▍" : "")}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={streaming}
          rows={2}
          placeholder="Ask the live AI… (Enter to send, Shift+Enter for newline)"
          className="flex-1 resize-none rounded-lg border border-soft bg-surface-2 px-3 py-2 font-mono text-[13px] text-foreground focus:border-purple focus:outline-none disabled:opacity-60"
        />
        <button
          onClick={() => void send(input)}
          disabled={streaming || !input.trim()}
          className="h-[60px] rounded-lg bg-gradient-purple px-5 font-mono text-[11px] uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {streaming ? "…" : <><Send className="inline h-4 w-4 mr-1" /> Send</>}
        </button>
      </div>
    </section>
  );
}
