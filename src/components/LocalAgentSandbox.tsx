import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Bot, Cpu, DollarSign, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface LocalDemoAgent {
  name: string;
  model: string;
  track: string;
  description: string;
  starterPrompt: string;
  quickPrompts: string[];
  microPrice: number;
}

interface Props {
  agent: LocalDemoAgent;
}

interface DemoMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function buildReply(agent: LocalDemoAgent, prompt: string) {
  const q = prompt.toLowerCase();
  const mentionsApi = q.includes("api") || q.includes("request");
  const mentionsMargin = q.includes("margin") || q.includes("gas") || q.includes("ethereum");
  const mentionsAgentLoop = q.includes("agent") || q.includes("machine");

  const actionPrice = agent.microPrice.toFixed(4);
  const l1Gas = 2.0;
  const arcGas = 0.000000001;
  const actionsPerDollar = Math.floor(1 / Math.max(agent.microPrice, 0.0001));

  const intro = `I am **${agent.name}** running in **local demo mode**. I can help shape your hackathon story before you switch to live settlement mode.`;

  const recommendation = mentionsApi
    ? `- Monetize each API call at **$${actionPrice} USDC** and settle each request independently instead of batching.`
    : mentionsAgentLoop
      ? `- Use two agents: a **buyer agent** that requests a task and a **seller agent** that gets paid the moment it returns value.`
      : `- Position this as **${agent.track}** with per-action pricing and an auditable settlement trail.`;

  const marginLine = mentionsMargin
    ? `- On Ethereum L1, even one transaction can cost about **$${l1Gas.toFixed(2)}**, which kills sub-cent pricing. On Arc, the modeled gas is about **$${arcGas.toFixed(9)}** per settlement, so the business keeps margin.`
    : `- At **$${actionPrice}** per action, one dollar buys roughly **${actionsPerDollar}** micro-actions. That is viable only because Arc settlement cost is far below the action price.`;

  return [
    intro,
    "",
    `**How this helps your demo**`,
    recommendation,
    `- Show a live runner that streams output and charges **≤ $0.01** for each completed action.`,
    marginLine,
    `- Add a proof panel with **50+ settlement target**, total transactions, total USDC, and Arc vs Ethereum L1 economics.`,
    "",
    `**Suggested next step**`,
    `Use the **Live Runner** tab to generate real settlements with **${agent.model}**, or keep iterating here in local mode for a safer demo.`
  ].join("\n");
}

export function LocalAgentSandbox({ agent }: Props) {
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [input, setInput] = useState(agent.starterPrompt);
  const [running, setRunning] = useState(false);
  const [simulatedActions, setSimulatedActions] = useState(0);
  const [simulatedCost, setSimulatedCost] = useState(0);

  useEffect(() => {
    setInput(agent.starterPrompt);
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `**${agent.name}** is ready in local demo mode.\n\nAsk for pricing logic, margin proof, architecture, or your submission story.`,
      },
    ]);
  }, [agent]);

  const helperStats = useMemo(
    () => [
      { label: "Track", value: agent.track, icon: Sparkles },
      { label: "Local price", value: `$${agent.microPrice.toFixed(4)}`, icon: DollarSign },
      { label: "Model plan", value: agent.model, icon: Cpu },
    ],
    [agent]
  );

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || running) return;

    const userMessage: DemoMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setRunning(true);

    const reply = buildReply(agent, trimmed);

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
        },
      ]);
      setSimulatedActions((prev) => prev + 1);
      setSimulatedCost((prev) => prev + agent.microPrice);
      setRunning(false);
      toast.success("Local agent replied", {
        description: "Switch to Live Runner when you want real micropayments.",
      });
    }, 550);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {helperStats.map((item) => (
          <div key={item.label} className="rounded-lg border border-soft bg-surface px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{item.label}</div>
                <div className="mt-2 font-mono text-[12px] text-foreground break-words">{item.value}</div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-purple">
                <item.icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-soft bg-surface">
        <div className="border-b border-soft px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-display text-2xl font-extrabold text-foreground">Local Mock Agent</div>
              <p className="mt-1 font-mono text-[12px] text-muted">
                Instant hackathon help without network cost. Great for story, pricing and margin explanation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-purple px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-purple">
                No live spend
              </span>
              <span className="rounded-full border border-soft px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                {simulatedActions} local actions
              </span>
              <span className="rounded-full border border-soft px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                ${simulatedCost.toFixed(4)} simulated
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {agent.quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setInput(prompt);
                  void send(prompt);
                }}
                className="rounded-md border border-soft bg-surface-2 px-3 py-2 text-left font-mono text-[11px] text-muted transition hover:border-purple hover:text-foreground"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 px-4 py-4">
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`rounded-lg border px-4 py-3 ${isUser ? "border-purple bg-surface-2" : "border-soft bg-background/40"}`}
              >
                <div className={`mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider ${isUser ? "text-purple" : "text-green"}`}>
                  <Bot className="h-3.5 w-3.5" />
                  {isUser ? "You" : `${agent.name} · local`}
                </div>
                <div className="whitespace-pre-wrap font-mono text-[12px] leading-6 text-foreground">
                  {message.content}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-soft px-4 py-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
            Ask this local agent for demo copy, pricing logic, proof metrics or margin explanation.
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={running}
              className="h-24 flex-1 resize-none rounded-lg border border-soft bg-surface-2 px-3 py-2 font-mono text-[13px] text-foreground focus:border-purple focus:outline-none disabled:opacity-60"
              placeholder="Ask for your Arc hackathon narrative…"
            />
            <button
              onClick={() => void send(input)}
              disabled={running || !input.trim()}
              className="h-24 rounded-lg bg-gradient-purple px-5 font-mono text-[11px] uppercase tracking-wider text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
            >
              {running ? "Thinking…" : "Ask local"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
