import { useState } from "react";
import { toast } from "sonner";
import { StatCard } from "./StatCard";

interface Props {
  totalTx: number;
  totalUsdc: number;
  totalTokens: number;
  sessionUsdc: number;
  onRefresh?: () => Promise<void> | void;
}

export function StatsBar({ totalTx, totalUsdc, totalTokens, sessionUsdc, onRefresh }: Props) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
      toast.success("Stats refreshed");
    } catch (e: any) {
      toast.error("Refresh failed", { description: e?.message });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Live Network Metrics
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || !onRefresh}
          className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border border-soft text-muted hover:text-cyan hover:border-cyan transition disabled:opacity-30"
        >
          {refreshing ? "↻ Refreshing…" : "↻ Refresh"}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="On-Chain Settlements"
          value={totalTx}
          color="cyan"
          subtitle="Total micro-payments on Arc"
        />
        <StatCard
          label="Total USDC Settled"
          value={totalUsdc}
          decimals={6}
          prefix="$"
          color="green"
          subtitle="Cumulative across all users"
        />
        <StatCard
          label="Tokens Processed"
          value={totalTokens}
          color="white"
          subtitle="LLM tokens streamed"
        />
        <StatCard
          label="Session USDC Paid"
          value={sessionUsdc}
          decimals={6}
          prefix="$"
          color="orange"
          subtitle="Resets per chat"
        />
      </div>
    </div>
  );
}
