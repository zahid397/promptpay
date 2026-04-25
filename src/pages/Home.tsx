import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Wallet, DollarSign, Bot, ShieldCheck, Send, Eye } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCardLg, Panel } from "@/components/PageCard";
import { HackathonChat } from "@/components/HackathonChat";
import { RandomApiPanel } from "@/components/RandomApiPanel";
import { useRealtimeTx } from "@/hooks/useRealtimeTx";
import { useStats } from "@/hooks/useStats";
import { createWallet } from "@/lib/api";
import { fmtNum, fmtTime } from "@/lib/format";
import heroImg from "@/assets/hero-cube.png";

const Home = () => {
  const navigate = useNavigate();
  const { transactions } = useRealtimeTx(8);
  const stats = useStats(transactions);
  const [creating, setCreating] = useState(false);

  const successRate = transactions.length
    ? (transactions.filter((t) => t.status === "complete").length / transactions.length) * 100
    : 99.8;

  const handleCreateWallet = async () => {
    setCreating(true);
    try {
      const res = await createWallet();
      toast.success(
        res.rotated ? "API key rotated" : `Wallet provisioned · ${res.balanceFormatted ?? "10 USDC"}`,
        {
          description: res.walletId,
          action: {
            label: "View",
            onClick: () => navigate("/wallets"),
          },
          duration: 6000,
        }
      );
    } catch (e: any) {
      toast.error("Wallet provisioning failed", { description: e?.message });
    } finally {
      setCreating(false);
    }
  };

  const handleTryAgent = () => {
    document.getElementById("hackathon-chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <DashboardLayout title="" subtitle="">
      {/* Hero */}
      <section className="relative bg-surface border border-purple rounded-2xl p-6 md:p-10 mb-6 overflow-hidden glow-purple">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
             style={{ background: "radial-gradient(ellipse at top right, hsl(270 95% 65% / 0.5), transparent 60%)" }} />
        <div className="grid md:grid-cols-[1.2fr_1fr] gap-6 items-center relative">
          <div>
            <span className="inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-purple bg-[hsl(270_95%_65%_/_0.1)] border border-purple rounded-full px-3 py-1.5">
              AI Agent Payments
            </span>
            <h1 className="font-display font-extrabold text-4xl md:text-6xl mt-4 leading-[1.05]">
              AI agents that <br />
              <span className="bg-gradient-purple-cyan bg-clip-text text-transparent">pay per token.</span>
            </h1>
            <p className="text-muted font-mono text-[13px] mt-4 max-w-md leading-relaxed">
              PromptPay enables sub-cent payments for AI agents using USDC on Arc with Circle's Nanopayments.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={handleTryAgent}
                className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-wider px-5 py-3 rounded-lg bg-gradient-purple text-white glow-purple hover:opacity-90 transition"
              >
                <Bot className="h-4 w-4" /> Try AI Chat
              </button>
              <button
                onClick={handleCreateWallet}
                disabled={creating}
                className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-wider px-5 py-3 rounded-lg border border-soft text-foreground hover:border-purple transition disabled:opacity-50"
              >
                <Wallet className="h-4 w-4" /> {creating ? "Provisioning…" : "Create Wallet"}
              </button>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <img src={heroImg} alt="PromptPay cube" className="max-w-full h-auto drop-shadow-[0_0_60px_hsl(270_95%_65%_/_0.6)]" />
          </div>
        </div>
      </section>

      {/* Live hackathon LLM chat */}
      <div id="hackathon-chat" className="mb-6 scroll-mt-20">
        <HackathonChat />
      </div>

      {/* Paid Random API widget — Per-API Monetization track */}
      <div id="random-widget" className="mb-6 scroll-mt-20">
        <RandomApiPanel compact />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCardLg label="Total Transactions" value={fmtNum(stats.totalTx)} sub="↑ 23.5%" accent="purple"
          icon={<Send className="h-5 w-5" />} />
        <StatCardLg label="Total Spent" value={`$${stats.totalUsdc.toFixed(2)}`} sub="USDC" accent="cyan"
          icon={<DollarSign className="h-5 w-5" />} />
        <StatCardLg label="Total Agents" value={fmtNum(Math.max(stats.totalUsers, 1))} sub="↑ active" accent="purple"
          icon={<Bot className="h-5 w-5" />} />
        <StatCardLg label="Success Rate" value={`${successRate.toFixed(1)}%`} sub="↑ 0.6%" accent="green"
          icon={<ShieldCheck className="h-5 w-5" />} />
      </div>

      {/* Live feed + quick actions */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Live Settlement Feed" action={<Link to="/transactions" className="font-mono text-[11px] text-purple hover:underline">View All →</Link>}>
          <div className="space-y-2">
            {transactions.length === 0 && (
              <div className="font-mono text-[12px] text-muted text-center py-8">
                Waiting for first settlement…
              </div>
            )}
            {transactions.slice(0, 6).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-surface-2 border border-soft hover:border-purple transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-md bg-gradient-purple flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[12px] text-foreground truncate">Settlement #{tx.settlement_number}</div>
                    <div className="font-mono text-[10px] text-muted">{tx.tokens} tokens · {fmtTime(tx.created_at)}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-[12px] text-foreground tabular-nums">-{Number(tx.usdc_amount).toFixed(4)} USDC</div>
                  <span className={`inline-block mt-0.5 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-sm ${
                    tx.status === "complete" ? "bg-[hsl(152_100%_50%_/_0.15)] text-green" :
                    tx.status === "pending" ? "bg-[hsl(16_100%_60%_/_0.15)] text-orange" :
                    "bg-[hsl(0_100%_64%_/_0.15)] text-red"
                  }`}>{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Quick Start">
          <div className="space-y-3">
            <Link to="/wallets" className="flex items-center justify-between gap-3 p-3 rounded-md bg-surface-2 border border-soft hover:border-purple transition group">
              <div className="flex items-center gap-3"><Wallet className="h-5 w-5 text-purple" /><span className="font-mono text-[12px]">Create or fund a wallet</span></div>
              <span className="text-purple opacity-0 group-hover:opacity-100">→</span>
            </Link>
            <Link to="/agents" className="flex items-center justify-between gap-3 p-3 rounded-md bg-surface-2 border border-soft hover:border-purple transition group">
              <div className="flex items-center gap-3"><Bot className="h-5 w-5 text-purple" /><span className="font-mono text-[12px]">Stream tokens with an AI agent</span></div>
              <span className="text-purple opacity-0 group-hover:opacity-100">→</span>
            </Link>
            <Link to="/keys" className="flex items-center justify-between gap-3 p-3 rounded-md bg-surface-2 border border-soft hover:border-purple transition group">
              <div className="flex items-center gap-3"><Eye className="h-5 w-5 text-purple" /><span className="font-mono text-[12px]">Manage your API keys</span></div>
              <span className="text-purple opacity-0 group-hover:opacity-100">→</span>
            </Link>
            <Link to="/analytics" className="flex items-center justify-between gap-3 p-3 rounded-md bg-surface-2 border border-soft hover:border-purple transition group">
              <div className="flex items-center gap-3"><DollarSign className="h-5 w-5 text-purple" /><span className="font-mono text-[12px]">Review usage & analytics</span></div>
              <span className="text-purple opacity-0 group-hover:opacity-100">→</span>
            </Link>
          </div>
        </Panel>
      </div>
    </DashboardLayout>
  );
};

export default Home;
