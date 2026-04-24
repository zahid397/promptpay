import { useState } from "react";
import { toast } from "sonner";
import { fetchStatsSnapshot, type StatsSnapshot } from "@/lib/api";

export function EconomicProof() {
  const [live, setLive] = useState<StatsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRecalculate = async () => {
    setLoading(true);
    try {
      const snap = await fetchStatsSnapshot();
      setLive(snap);
      toast.success("Recalculated from live data", {
        description: `${snap.totalTx.toLocaleString()} on-chain settlements analyzed.`,
      });
    } catch (e: any) {
      toast.error("Recalculate failed", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const Row = ({
    label,
    value,
    valueClass = "text-foreground",
  }: {
    label: string;
    value: string;
    valueClass?: string;
  }) => (
    <div className="flex items-center justify-between py-1.5 font-mono text-[12px]">
      <span className="text-muted">{label}</span>
      <span className={`font-bold ${valueClass}`}>{value}</span>
    </div>
  );
  const Sep = () => <div className="my-1.5 border-t border-soft" />;

  return (
    <div className="bg-surface border border-orange rounded-md overflow-hidden">
      <div className="px-4 py-3 border-b border-soft flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-orange font-bold">
            ⚠ Economic Proof
          </div>
          <div className="font-display font-extrabold text-lg mt-0.5">
            Why this only works on Arc
          </div>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={loading}
          className="shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border border-orange text-orange hover:bg-warning hover:text-warning-foreground transition disabled:opacity-50"
        >
          {loading ? "…" : "↻ Recalc"}
        </button>
      </div>

      <div className="px-4 py-3">
        <Row label="Price per token" value="$0.000100 USDC" />
        <Row label="Settle every N tokens" value="50 tokens" />
        <Row label="Revenue per settlement" value="$0.005000 USDC" valueClass="text-green" />
        <Sep />
        <Row label="Gas on Ethereum L1" value="~$2.00" valueClass="text-red" />
        <Row label="Gas on Arc" value="< $0.000001" valueClass="text-green" />
        <Sep />
        <Row label="Margin on Eth L1" value="−39,900%" valueClass="text-red" />
        <Row label="Margin on Arc" value="~99.98%" valueClass="text-green" />

        {live && (
          <>
            <Sep />
            <div className="font-mono text-[10px] uppercase tracking-wider text-cyan mt-1 mb-1.5">
              Live data · {new Date(live.timestamp).toLocaleTimeString()}
            </div>
            <Row label="Total settlements" value={live.totalTx.toLocaleString()} valueClass="text-cyan" />
            <Row label="Revenue earned" value={`$${live.totalUsdc.toFixed(6)}`} valueClass="text-green" />
            <Row label="Gas would cost (Eth L1)" value={`$${live.economicProof.gasCostOnEthL1.toFixed(2)}`} valueClass="text-red" />
            <Row label="Gas cost (Arc)" value={`$${live.economicProof.gasCostOnArc.toFixed(10)}`} valueClass="text-green" />
          </>
        )}
      </div>

      <div className="bg-warning text-warning-foreground px-4 py-2.5 font-mono text-[11px] font-bold text-center">
        {live?.economicProof.verdict ||
          "This business model is economically impossible on any other chain"}
      </div>
    </div>
  );
}
