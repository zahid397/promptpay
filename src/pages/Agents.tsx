import { useState } from "react";
import { Bot, Play, Pause, Settings as SettingsIcon, Activity, DollarSign, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCardLg, Panel } from "@/components/PageCard";
import { ChatPanel } from "@/components/ChatPanel";
import { useRealtimeTx } from "@/hooks/useRealtimeTx";

interface Agent {
  id: string;
  name: string;
  model: string;
  status: "active" | "idle" | "paused";
  tokens: number;
  cost: number;
  lastRun: string;
}

const initialAgents: Agent[] = [
  { id: "1", name: "Chat Assistant", model: "google/gemini-3-flash-preview", status: "active", tokens: 180, cost: 0.003, lastRun: "2 min ago" },
  { id: "2", name: "Code Generator", model: "google/gemini-2.5-pro", status: "idle", tokens: 0, cost: 0.003, lastRun: "8 min ago" },
  { id: "3", name: "Data Analyzer", model: "google/gemini-2.5-flash", status: "active", tokens: 120, cost: 0.005, lastRun: "8 min ago" },
  { id: "4", name: "Content Writer", model: "google/gemini-2.5-flash-lite", status: "paused", tokens: 90, cost: 0.00021, lastRun: "1 day ago" },
];

const Agents = () => {
  const [agents, setAgents] = useState(initialAgents);
  const [activeKey, setActiveKey] = useState("");
  const [showRunner, setShowRunner] = useState(true);
  const { transactions } = useRealtimeTx(20);

  const toggle = (id: string) => {
    setAgents((prev) => prev.map((a) => a.id === id ? { ...a, status: a.status === "active" ? "paused" : "active" } : a));
    toast.success("Agent updated");
  };

  const totalSpend = agents.reduce((s, a) => s + a.cost, 0);
  const activeCount = agents.filter((a) => a.status === "active").length;

  return (
    <DashboardLayout title="AI Agents" subtitle="Manage and monitor your AI agents with real-time payments."
      actions={
        <button onClick={() => setShowRunner((v) => !v)}
          className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-wider px-4 py-2.5 rounded-lg bg-gradient-purple text-white glow-purple hover:opacity-90 transition">
          <Sparkles className="h-4 w-4" /> {showRunner ? "Hide Runner" : "Run Live Agent"}
        </button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCardLg label="Total Agents" value={agents.length} sub="Configured" accent="purple" icon={<Bot className="h-5 w-5" />} />
        <StatCardLg label="Active Agents" value={activeCount} sub="Running now" accent="green" icon={<Activity className="h-5 w-5" />} />
        <StatCardLg label="Total Spend" value={`$${totalSpend.toFixed(4)}`} sub="USDC" accent="cyan" icon={<DollarSign className="h-5 w-5" />} />
        <StatCardLg label="Avg Cost" value={`$${(totalSpend / agents.length).toFixed(5)}`} sub="per task" accent="orange" icon={<Sparkles className="h-5 w-5" />} />
      </div>

      {showRunner && (
        <div className="mb-6">
          <ChatPanel onSessionStats={() => {}} apiKey={activeKey} onApiKeyChange={setActiveKey} />
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((a) => (
          <div key={a.id} className="bg-surface border border-soft rounded-lg p-5 hover:border-purple transition relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-purple opacity-10 group-hover:opacity-20 transition" />
            <div className="flex items-start justify-between gap-2 mb-3 relative">
              <div>
                <div className="font-display font-bold text-base text-foreground">{a.name}</div>
                <div className="font-mono text-[10px] text-muted mt-0.5">{a.model}</div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gradient-purple flex items-center justify-center glow-purple">
                <Bot className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className={`inline-block font-mono text-[9px] uppercase px-2 py-0.5 rounded-sm mb-3 ${
              a.status === "active" ? "bg-[hsl(152_100%_50%_/_0.15)] text-green" :
              a.status === "idle" ? "bg-[hsl(16_100%_60%_/_0.15)] text-orange" :
              "bg-[hsl(0_100%_64%_/_0.15)] text-red"
            }`}>{a.status}</span>

            <div className="space-y-1.5 font-mono text-[11px] mb-3">
              <div className="flex justify-between"><span className="text-muted">Tokens used</span><span className="text-foreground tabular-nums">{a.tokens}</span></div>
              <div className="flex justify-between"><span className="text-muted">Cost</span><span className="text-foreground tabular-nums">${a.cost.toFixed(5)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Last run</span><span className="text-foreground">{a.lastRun}</span></div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button onClick={() => toggle(a.id)} className="font-mono text-[10px] uppercase px-2 py-1.5 rounded-md bg-gradient-purple text-white hover:opacity-90 transition flex items-center justify-center gap-1">
                <Play className="h-3 w-3" /> Run
              </button>
              <button onClick={() => toggle(a.id)} className="font-mono text-[10px] uppercase px-2 py-1.5 rounded-md border border-soft text-muted hover:text-foreground hover:border-purple transition flex items-center justify-center gap-1">
                <Pause className="h-3 w-3" /> Pause
              </button>
              <button className="font-mono text-[10px] uppercase px-2 py-1.5 rounded-md border border-soft text-muted hover:text-foreground hover:border-purple transition flex items-center justify-center gap-1">
                <SettingsIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}

        <button onClick={() => toast.info("Coming soon")}
          className="bg-surface border-2 border-dashed border-soft rounded-lg p-5 hover:border-purple transition flex flex-col items-center justify-center gap-2 min-h-[260px]">
          <div className="h-12 w-12 rounded-full bg-[hsl(270_95%_65%_/_0.15)] flex items-center justify-center">
            <Plus className="h-5 w-5 text-purple" />
          </div>
          <span className="font-mono text-[12px] text-purple">New Agent</span>
        </button>
      </div>
    </DashboardLayout>
  );
};

export default Agents;
