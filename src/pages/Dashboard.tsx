import { Link, useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { StatsBar } from "@/components/StatsBar";
import { ChatPanel } from "@/components/ChatPanel";
import { SettlementFeed } from "@/components/SettlementFeed";
import { EconomicProof } from "@/components/EconomicProof";
import { EthFailsPanel } from "@/components/EthFailsPanel";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { HealthDot } from "@/components/HealthDot";
import { MyKeys } from "@/components/MyKeys";
import { AgentDemo } from "@/components/AgentDemo";
import { Leaderboard } from "@/components/Leaderboard";
import { BackendStatusPanel } from "@/components/BackendStatusPanel";
import { SessionTrace } from "@/components/SessionTrace";
import { useRealtimeTx } from "@/hooks/useRealtimeTx";
import { useStats } from "@/hooks/useStats";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { SettlementEvent } from "@/hooks/useChat";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { transactions, isConnected } = useRealtimeTx(50);
  const stats = useStats(transactions);
  const [session, setSession] = useState({ settlements: 0, usdc: 0, tokens: 0 });
  const [activeKey, setActiveKey] = useState<string>("");
  const [chatState, setChatState] = useState<{
    streaming: boolean;
    reconnecting: boolean;
    tokens: number;
    settlements: SettlementEvent[];
    lastSettlementAt: string | null;
  }>({ streaming: false, reconnecting: false, tokens: 0, settlements: [], lastSettlementAt: null });

  const handleSession = useCallback(
    (s: { settlements: number; usdc: number; tokens: number }) => setSession(s),
    []
  );

  const handleChatState = useCallback(
    (s: typeof chatState) => setChatState(s),
    []
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-soft bg-surface/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between py-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-sm flex items-center justify-center font-display font-extrabold text-primary-foreground shrink-0"
                 style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--success)))" }}>
              P
            </div>
            <div className="min-w-0">
              <div className="font-display font-extrabold text-lg leading-none">
                PromptPay
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mt-0.5 truncate">
                Pay-Per-Token · USDC · Arc
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-4 flex-wrap justify-end">
            <HealthDot />
            <ConnectionStatus isConnected={isConnected} />
            <Link
              to="/docs"
              className="font-mono text-[11px] uppercase tracking-wider text-muted hover:text-cyan"
            >
              API Docs →
            </Link>
            {user && (
              <>
                <span className="font-mono text-[11px] text-muted hidden md:inline truncate max-w-[160px]">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-sm border border-soft text-muted hover:text-red hover:border-red transition"
                >
                  Logout
                </button>
              </>
            )}
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
        <div className="space-y-4">
          <ChatPanel
            onSessionStats={handleSession}
            apiKey={activeKey}
            onApiKeyChange={setActiveKey}
          />
          <AgentDemo apiKey={activeKey} />
        </div>
        <div className="space-y-4">
          <MyKeys onUseKey={setActiveKey} />
          <EthFailsPanel sessionTokens={session.tokens} />
          <EconomicProof />
          <SettlementFeed transactions={transactions} />
          <Leaderboard />
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
