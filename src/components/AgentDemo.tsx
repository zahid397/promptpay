import { useState } from "react";
import { toast } from "sonner";
import { streamChat } from "@/lib/api";

interface Props {
  apiKey: string;
}

const PROMPTS = [
  "Summarize the Arc blockchain in 3 sentences.",
  "List 5 use cases for sub-cent USDC payments.",
  "Why are stablecoin micropayments important for AI agents?",
];

export function AgentDemo({ apiKey }: Props) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [target, setTarget] = useState(0);

  const runAgent = async () => {
    if (!apiKey) {
      toast.error("Need an API key", { description: "Create or paste a key first." });
      return;
    }
    setRunning(true);
    setTarget(PROMPTS.length);
    setProgress(0);
    try {
      for (let i = 0; i < PROMPTS.length; i++) {
        const res = await streamChat({
          apiKey,
          messages: [{ role: "user", content: PROMPTS[i] }],
        });
        // drain stream
        if (res.body) {
          const reader = res.body.getReader();
          while (true) {
            const { done } = await reader.read();
            if (done) break;
          }
        }
        setProgress(i + 1);
      }
      toast.success(`Agent run complete · ${PROMPTS.length} prompts settled`, {
        description: "Watch the settlement feed for new on-chain tx.",
      });
    } catch (e: any) {
      toast.error("Agent run failed", { description: e?.message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-surface border border-soft rounded-md px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan font-bold">
          🤖 Agent-to-Agent demo
        </div>
        <div className="font-mono text-[11px] text-muted mt-1 truncate">
          {running
            ? `Running prompt ${progress + 1}/${target}…`
            : `Run ${PROMPTS.length} synthetic agent prompts back-to-back.`}
        </div>
      </div>
      <button
        onClick={runAgent}
        disabled={running || !apiKey}
        className="shrink-0 font-mono text-[11px] uppercase tracking-wider px-3 py-2 rounded-sm border border-cyan text-cyan hover:bg-primary hover:text-primary-foreground transition disabled:opacity-40"
      >
        {running ? `… ${progress}/${target}` : "Run agent →"}
      </button>
    </div>
  );
}
