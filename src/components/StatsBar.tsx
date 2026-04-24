import { StatCard } from "./StatCard";

interface Props {
  totalTx: number;
  totalUsdc: number;
  totalTokens: number;
  sessionUsdc: number;
}

export function StatsBar({ totalTx, totalUsdc, totalTokens, sessionUsdc }: Props) {
  return (
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
  );
}
