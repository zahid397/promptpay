import { Link } from "react-router-dom";
import { useCallback, useState } from "react";
import { StatsBar } from "@/components/StatsBar";
import { ChatPanel } from "@/components/ChatPanel";
import { SettlementFeed } from "@/components/SettlementFeed";
import { EconomicProof } from "@/components/EconomicProof";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { useRealtimeTx } from "@/hooks/useRealtimeTx";
import { useStats } from "@/hooks/useStats";

const Dashboard = () => {
  const { transactions, isConnected } = useRealtimeTx(50);
  const stats = useStats(transactions);
  const [session, setSession] = useState({ settlements: 0, usdc: 0 });

  const handleSession = useCallback(
    (s: { settlements: number; usdc: number }) => setSession(s),
    []
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-soft bg-surface/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-sm flex items-center justify-center font-display font-extrabold text-primary-foreground"
                 style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--success)))" }}>
              P
            </div>
            <div>
              <div className="font-display font-extrabold text-lg leading-none">
                PromptPay
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mt-0.5">
                Pay-Per-Token · USDC · Arc
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-5">
            <ConnectionStatus isConnected={isConnected} />
            <Link
              to="/docs"
              className="font-mono text-[11px] uppercase tracking-wider text-muted hover:text-cyan"
            >
              API Docs →
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero strip */}
      <section className="container py-6">
        <h1 className="font-display font-extrabold text-3xl md:text-4xl leading-tight">
          Stream LLM tokens. <span className="text-cyan">Settle USDC</span> every <span className="text-green">50 tokens</span> on Arc.
        </h1>
        <p className="text-muted font-mono text-[12px] mt-2 max-w-2xl">
          A live Pay-Per-Token gateway demonstrating Circle Nanopayments on Arc. Each settlement is a real on-chain micropayment recorded in our database in real time.
        </p>
      </section>

      {/* Stats */}
      <section className="container">
        <StatsBar
          totalTx={stats.totalTx}
          totalUsdc={stats.totalUsdc}
          totalTokens={stats.totalTokens}
          sessionUsdc={session.usdc}
          onRefresh={stats.refresh}
        />
      </section>

      {/* Main grid */}
      <section className="container py-6 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4 flex-1">
        <ChatPanel onSessionStats={handleSession} />
        <div className="space-y-4">
          <EconomicProof />
          <SettlementFeed transactions={transactions} />
        </div>
      </section>

      <footer className="container py-6 font-mono text-[10px] text-muted flex items-center justify-between">
        <span>PromptPay · Built on Lovable Cloud · Agentic Economy on Arc</span>
        <span>{stats.totalTokens.toLocaleString()} tokens · ${stats.totalUsdc.toFixed(6)} settled</span>
      </footer>
    </div>
  );
};

export default Dashboard;
