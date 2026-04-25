import { useMemo, useRef, useState } from "react";
import {
  Activity,
  Bot,
  DollarSign,
  Pause,
  Play,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AgentDemo } from "@/components/AgentDemo";
import { LocalAgentSandbox } from "@/components/LocalAgentSandbox";
import { StatCardLg, Panel } from "@/components/PageCard";
import { ChatPanel } from "@/components/ChatPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtimeTx } from "@/hooks/useRealtimeTx";
import { useStats } from "@/hooks/useStats";

interface Agent {
  id: string;
  name: string;
  model: string;
  track: string;
  status: "active" | "idle" | "paused";
  tokens: number;
  cost: number;
  microPrice: number;
  lastRun: string;
  description: string;
  starterPrompt: string;
  quickPrompts: string[];
}

const initialAgents: Agent[] = [
  {
    id: "1",
    name: "Per-API Meter",
    model: "google/gemini-2.5-flash",
    track: "Per-API Monetization Engine",
    status: "active",
    tokens: 180,
    cost: 0.003,
    microPrice: 0.001,
    lastRun: "2 min ago",
    description: "Charges each API request in USDC and proves sub-cent billing works on Arc.",
    starterPrompt: "Design a per-request USDC pricing model for an API with Arc nanopayments.",
    quickPrompts: [
      "How do I explain per-request pricing?",
      "Show margin proof vs Ethereum L1",
      "What demo flow should I show judges?",
    ],
  },
  {
    id: "2",
    name: "Agent Commerce Loop",
    model: "google/gemini-3-flash-preview",
    track: "Agent-to-Agent Payment Loop",
    status: "idle",
    tokens: 140,
    cost: 0.0024,
    microPrice: 0.0008,
    lastRun: "8 min ago",
    description: "Buyer and seller agents exchange value autonomously with real-time settlement.",
    starterPrompt: "Create an agent-to-agent commerce demo using USDC micropayments.",
    quickPrompts: [
      "How should two agents pay each other?",
      "What should the buyer agent do?",
      "How do I pitch machine-to-machine commerce?",
    ],
  },
  {
    id: "3",
    name: "Usage Billing Analyst",
    model: "google/gemini-2.5-pro",
    track: "Usage-Based Compute Billing",
    status: "active",
    tokens: 120,
    cost: 0.005,
    microPrice: 0.0015,
    lastRun: "11 min ago",
    description: "Maps tokens and compute to live billing so customers pay only for actual usage.",
    starterPrompt: "Turn token consumption into a realtime compute billing dashboard.",
    quickPrompts: [
      "Map compute units to price",
      "What should the proof dashboard show?",
      "How do I hit 50+ transactions?",
    ],
  },
  {
    id: "4",
    name: "Feedback Bounty Agent",
    model: "google/gemini-2.5-flash-lite",
    track: "Product Feedback Incentive",
    status: "paused",
    tokens: 90,
    cost: 0.00021,
    microPrice: 0.0005,
    lastRun: "1 day ago",
    description: "Pays small USDC incentives for product feedback events and records each payout.",
    starterPrompt: "Design a micro-incentive app that rewards product feedback with USDC.",
    quickPrompts: [
      "How can feedback rewards work?",
      "How do I explain incentive design?",
      "What should users see in the demo?",
    ],
  },
];

const Agents = () => {
  const [agents, setAgents] = useState(initialAgents);
  const [activeKey, setActiveKey] = useState("");
  const [runnerMode, setRunnerMode] = useState<"live" | "local">("local");
  const [selectedAgentId, setSelectedAgentId] = useState(initialAgents[0].id);
  const runnerRef = useRef<HTMLElement | null>(null);
  const { transactions } = useRealtimeTx(20);
  const stats = useStats(transactions);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? agents[0],
    [agents, selectedAgentId]
  );

  const focusRunner = () => {
    window.setTimeout(() => {
      runnerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const runAgent = (id: string) => {
    setSelectedAgentId(id);
    setRunnerMode("live");
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === id
          ? { ...agent, status: "active", lastRun: "just now" }
          : agent
      )
    );
    toast.success("Agent ready", {
      description: "Live runner opened. Paste your API key and send a prompt.",
    });
    focusRunner();
  };

  const pauseAgent = (id: string) => {
    setSelectedAgentId(id);
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === id ? { ...agent, status: "paused" } : agent
      )
    );
    toast.success("Agent paused", {
      description: "You can switch to local mode and keep planning the demo.",
    });
  };

  const openHelper = (id: string) => {
    setSelectedAgentId(id);
    setRunnerMode("local");
    toast.success("Agent helper opened", {
      description: "This mode helps with hackathon copy, pricing and margin proof.",
    });
    focusRunner();
  };

  const addAgent = () => {
    const nextAgent: Agent = {
      id: crypto.randomUUID(),
      name: `New Arc Agent ${agents.length + 1}`,
      model: "google/gemini-2.5-flash-lite",
      track: "Real-Time Micro-Commerce Flow",
      status: "idle",
      tokens: 0,
      cost: 0,
      microPrice: 0.0007,
      lastRun: "not started",
      description: "A new buyer-seller flow for machine-triggered commerce on Arc.",
      starterPrompt: "Create a micro-commerce flow with USDC per interaction.",
      quickPrompts: [
        "How does micro-commerce work?",
        "Give me a judge-friendly pitch",
        "What should I demo first?",
      ],
    };

    setAgents((prev) => [nextAgent, ...prev]);
    setSelectedAgentId(nextAgent.id);
    setRunnerMode("local");
    toast.success("New agent created", {
      description: "Customize the flow in local helper mode, then switch to live.",
    });
    focusRunner();
  };

  const totalSpend = agents.reduce((sum, agent) => sum + agent.cost, 0);
  const activeCount = agents.filter((agent) => agent.status === "active").length;
  const proofProgress = Math.min(100, (stats.totalTx / 50) * 100);

  return (
    <DashboardLayout
      title="Agentic Economy Lab"
      subtitle="Build the Agentic Economy on Arc with programmable USDC, sub-cent pricing, and visible margin proof."
      actions={
        <button
          onClick={() => openHelper(selectedAgent.id)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-purple px-4 py-2.5 font-mono text-[12px] uppercase tracking-wider text-white transition hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" /> Open Agent Helper
        </button>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCardLg label="Total Agents" value={agents.length} sub="Hackathon-ready" accent="purple" icon={<Bot className="h-5 w-5" />} />
        <StatCardLg label="Active Agents" value={activeCount} sub="Runnable now" accent="green" icon={<Activity className="h-5 w-5" />} />
        <StatCardLg label="Recent Spend" value={`$${totalSpend.toFixed(4)}`} sub="USDC" accent="cyan" icon={<DollarSign className="h-5 w-5" />} />
        <StatCardLg label="Onchain Proof" value={`${stats.totalTx}`} sub="target 50+ tx" accent="orange" icon={<Target className="h-5 w-5" />} />
      </div>

      <Panel ref={runnerRef} className="mb-6 overflow-hidden" title="Selected Agent Runner">
        <div className="mb-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-purple bg-surface-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-2xl font-extrabold text-foreground">{selectedAgent.name}</div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-purple">
                  {selectedAgent.track}
                </div>
                <p className="mt-3 max-w-2xl font-mono text-[12px] leading-6 text-muted">
                  {selectedAgent.description}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-purple text-white glow-purple">
                <Bot className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-soft bg-surface p-4">
            <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              <span>Hackathon proof</span>
              <span>{stats.totalTx}/50</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-gradient-purple-cyan" style={{ width: `${proofProgress}%` }} />
            </div>
            <div className="mt-4 space-y-2 font-mono text-[12px] text-muted">
              <div className="flex items-center justify-between gap-3"><span>Per-action price</span><span className="text-foreground">${selectedAgent.microPrice.toFixed(4)}</span></div>
              <div className="flex items-center justify-between gap-3"><span>Total settled</span><span className="text-foreground">${stats.totalUsdc.toFixed(4)} USDC</span></div>
              <div className="flex items-center justify-between gap-3"><span>Why Arc wins</span><span className="text-foreground">L1 gas kills sub-cent billing</span></div>
            </div>
          </div>
        </div>

        <Tabs value={runnerMode} onValueChange={(value) => setRunnerMode(value as "live" | "local")}>
          <TabsList className="mb-4 grid w-full grid-cols-2 bg-surface-2">
            <TabsTrigger value="local" className="font-mono text-[11px] uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:text-purple">
              Local helper
            </TabsTrigger>
            <TabsTrigger value="live" className="font-mono text-[11px] uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:text-purple">
              Live runner
            </TabsTrigger>
          </TabsList>

          <TabsContent value="local">
            <LocalAgentSandbox agent={selectedAgent} />
          </TabsContent>

          <TabsContent value="live" className="space-y-4">
            <div className="rounded-lg border border-soft bg-surface px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Live settlement mode</div>
                  <div className="mt-1 font-mono text-[12px] text-foreground">
                    Use your API key to stream replies and settle real micropayments on Arc.
                  </div>
                </div>
                <div className="rounded-full border border-soft px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                  {selectedAgent.model}
                </div>
              </div>
            </div>
            <AgentDemo apiKey={activeKey} />
            <ChatPanel onSessionStats={() => {}} apiKey={activeKey} onApiKeyChange={setActiveKey} />
          </TabsContent>
        </Tabs>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const selected = agent.id === selectedAgent.id;
          return (
            <div
              key={agent.id}
              className={`relative overflow-hidden rounded-lg border p-5 transition ${selected ? "border-purple glow-purple" : "border-soft hover:border-purple"} bg-surface`}
            >
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-purple opacity-10 transition group-hover:opacity-20" />
              <div className="relative mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-base font-bold text-foreground">{agent.name}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted">{agent.model}</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-purple text-white glow-purple">
                  <Bot className="h-5 w-5" />
                </div>
              </div>

              <span className={`mb-3 inline-block rounded-sm px-2 py-0.5 font-mono text-[9px] uppercase ${
                agent.status === "active"
                  ? "bg-[hsl(152_100%_50%_/_0.15)] text-green"
                  : agent.status === "idle"
                    ? "bg-[hsl(16_100%_60%_/_0.15)] text-orange"
                    : "bg-[hsl(0_100%_64%_/_0.15)] text-red"
              }`}>
                {agent.status}
              </span>

              <div className="mb-3 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between"><span className="text-muted">Track</span><span className="text-foreground">{agent.track}</span></div>
                <div className="flex justify-between"><span className="text-muted">Tokens used</span><span className="tabular-nums text-foreground">{agent.tokens}</span></div>
                <div className="flex justify-between"><span className="text-muted">Cost</span><span className="tabular-nums text-foreground">${agent.cost.toFixed(5)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Last run</span><span className="text-foreground">{agent.lastRun}</span></div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => runAgent(agent.id)}
                  className="flex items-center justify-center gap-1 rounded-md bg-gradient-purple px-2 py-2 font-mono text-[10px] uppercase text-white transition hover:opacity-90"
                >
                  <Play className="h-3 w-3" /> Run
                </button>
                <button
                  onClick={() => pauseAgent(agent.id)}
                  className="flex items-center justify-center gap-1 rounded-md border border-soft px-2 py-2 font-mono text-[10px] uppercase text-muted transition hover:border-purple hover:text-foreground"
                >
                  <Pause className="h-3 w-3" /> Pause
                </button>
                <button
                  onClick={() => openHelper(agent.id)}
                  className="flex items-center justify-center gap-1 rounded-md border border-soft px-2 py-2 font-mono text-[10px] uppercase text-muted transition hover:border-purple hover:text-foreground"
                >
                  <SettingsIcon className="h-3 w-3" /> Help
                </button>
              </div>
            </div>
          );
        })}

        <button
          onClick={addAgent}
          className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-soft bg-surface p-5 transition hover:border-purple"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(270_95%_65%_/_0.15)] text-purple">
            <Plus className="h-5 w-5" />
          </div>
          <span className="font-mono text-[12px] text-purple">New Agent</span>
          <span className="font-mono text-[10px] text-muted">Create another Arc economy flow</span>
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-soft bg-surface p-4">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            <DollarSign className="h-4 w-4 text-purple" /> Per-action pricing
          </div>
          <p className="font-mono text-[12px] leading-6 text-muted">
            Every agent action is priced at or below one cent, so the demo proves a viable micro-transaction model rather than a subscription mockup.
          </p>
        </div>
        <div className="rounded-lg border border-soft bg-surface p-4">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            <Wallet className="h-4 w-4 text-purple" /> 50+ settlement proof
          </div>
          <p className="font-mono text-[12px] leading-6 text-muted">
            The runner and transaction feed are built to show high-frequency settlement data, which is required for the Arc hackathon judging criteria.
          </p>
        </div>
        <div className="rounded-lg border border-soft bg-surface p-4">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            <Target className="h-4 w-4 text-purple" /> Margin explanation
          </div>
          <p className="font-mono text-[12px] leading-6 text-muted">
            The UI now explicitly explains why this model fails on traditional gas-heavy chains and why Arc makes sub-cent USDC settlement economically possible.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Agents;
