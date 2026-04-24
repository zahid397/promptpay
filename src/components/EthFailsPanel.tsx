import { useEffect, useMemo, useState } from "react";
import { fetchStatsSnapshot, type StatsSnapshot } from "@/lib/api";
import { fmtNum, fmtUsdc } from "@/lib/format";

/**
 * Live "Why Ethereum L1 fails" panel.
 * Estimates gas/fees vs Arc micro-payments based on real token usage,
 * pulled from the global_stats snapshot and refreshed every 10s.
 */

// Economic assumptions (kept as constants so they're easy to tune)
const PRICE_PER_TOKEN_USDC = 0.0001;     // $0.0001 / token
const TOKENS_PER_SETTLEMENT = 50;         // settle every 50 tokens
const GAS_USD_ETH_L1 = 2.0;               // ~$2 per tx on Ethereum L1
const GAS_USD_ARC = 0.000000001;          // ~$1e-9 per tx on Arc

interface Props {
  /** Live total tokens processed in current chat session (optional) */
  sessionTokens?: number;
}

export function EthFailsPanel({ sessionTokens = 0 }: Props) {
  const [snap, setSnap] = useState<StatsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const s = await fetchStatsSnapshot();
      setSnap(s);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    } catch {
      /* silent — surfaced by HealthDot */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, []);

  // Refresh when session tokens cross a settlement boundary
  useEffect(() => {
    if (sessionTokens > 0 && sessionTokens % TOKENS_PER_SETTLEMENT === 0) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(sessionTokens / TOKENS_PER_SETTLEMENT)]);

  const calc = useMemo(() => {
    const liveTx = snap?.totalTx ?? 0;
    const liveTokens = snap?.totalTokens ?? 0;
    const liveRevenue = snap?.totalUsdc ?? 0;

    // Combined view = global + current session projection
    const projectedSessionSettlements = Math.floor(sessionTokens / TOKENS_PER_SETTLEMENT);
    const totalTx = liveTx + projectedSessionSettlements;
    const totalTokens = liveTokens + sessionTokens;
    const totalRevenue =
      liveRevenue + projectedSessionSettlements * TOKENS_PER_SETTLEMENT * PRICE_PER_TOKEN_USDC;

    const gasEth = totalTx * GAS_USD_ETH_L1;
    const gasArc = totalTx * GAS_USD_ARC;
    const profitEth = totalRevenue - gasEth;
    const profitArc = totalRevenue - gasArc;

    // Per-settlement economics
    const revenuePerSettlement = TOKENS_PER_SETTLEMENT * PRICE_PER_TOKEN_USDC; // $0.005
    const marginEthPct =
      revenuePerSettlement > 0
        ? ((revenuePerSettlement - GAS_USD_ETH_L1) / revenuePerSettlement) * 100
        : 0;
    const marginArcPct =
      revenuePerSettlement > 0
        ? ((revenuePerSettlement - GAS_USD_ARC) / revenuePerSettlement) * 100
        : 0;

    // Break-even: tokens needed before Eth L1 gas pays for itself
    const breakEvenTokensEth = Math.ceil(GAS_USD_ETH_L1 / PRICE_PER_TOKEN_USDC); // 20,000

    return {
      totalTx,
      totalTokens,
      totalRevenue,
      gasEth,
      gasArc,
      profitEth,
      profitArc,
      marginEthPct,
      marginArcPct,
      breakEvenTokensEth,
      lossMultiplier: gasEth > 0 && totalRevenue > 0 ? gasEth / totalRevenue : 0,
    };
  }, [snap, sessionTokens]);

  const Row = ({
    label,
    eth,
    arc,
  }: {
    label: string;
    eth: string;
    arc: string;
  }) => (
    <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center py-1.5 font-mono text-[12px] border-b border-soft/40 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-red font-bold tabular-nums text-right min-w-[88px]">{eth}</span>
      <span className="text-green font-bold tabular-nums text-right min-w-[88px]">{arc}</span>
    </div>
  );

  return (
    <div className="bg-surface border border-red/60 rounded-md overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-soft flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-red font-bold">
            ✕ Why Ethereum L1 fails
          </div>
          <div className="font-display font-extrabold text-lg mt-0.5">
            Live gas-vs-revenue, recalculated each settlement
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border border-red/60 text-red hover:bg-red hover:text-background transition disabled:opacity-50"
        >
          {loading ? "…" : "↻ Live"}
        </button>
      </div>

      {/* Live ticker */}
      <div
        className={`px-4 py-2 border-b border-soft flex items-center justify-between font-mono text-[11px] transition-colors ${
          pulse ? "bg-cyan/10" : ""
        }`}
      >
        <span className="text-muted uppercase tracking-wider">
          {fmtNum(calc.totalTokens)} tokens · {fmtNum(calc.totalTx)} settlements
          {sessionTokens > 0 && (
            <span className="text-cyan"> · +{sessionTokens} live</span>
          )}
        </span>
        <span className="text-muted">
          {snap ? new Date(snap.timestamp).toLocaleTimeString() : "—"}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 pt-3 pb-1 font-mono text-[10px] uppercase tracking-wider text-muted">
        <span></span>
        <span className="text-red text-right min-w-[88px]">Ethereum L1</span>
        <span className="text-green text-right min-w-[88px]">Arc</span>
      </div>

      <div className="px-4 pb-3">
        <Row
          label="Gas per settlement"
          eth={fmtUsdc(GAS_USD_ETH_L1, 2)}
          arc="< $0.000001"
        />
        <Row
          label="Revenue per settlement"
          eth={fmtUsdc(0.005, 6)}
          arc={fmtUsdc(0.005, 6)}
        />
        <Row
          label="Margin per settlement"
          eth={`${calc.marginEthPct.toFixed(0)}%`}
          arc={`${calc.marginArcPct.toFixed(2)}%`}
        />
        <Row
          label="Total gas burned"
          eth={fmtUsdc(calc.gasEth, 2)}
          arc={fmtUsdc(calc.gasArc, 10)}
        />
        <Row
          label="Total revenue earned"
          eth={fmtUsdc(calc.totalRevenue, 6)}
          arc={fmtUsdc(calc.totalRevenue, 6)}
        />
        <Row
          label="Net profit / (loss)"
          eth={fmtUsdc(calc.profitEth, 2)}
          arc={fmtUsdc(calc.profitArc, 6)}
        />
      </div>

      {/* Break-even callout */}
      <div className="px-4 py-2 bg-background/40 border-t border-soft font-mono text-[11px] text-muted">
        Break-even on Ethereum L1 needs{" "}
        <span className="text-red font-bold">
          {fmtNum(calc.breakEvenTokensEth)} tokens
        </span>{" "}
        per settlement (currently {TOKENS_PER_SETTLEMENT}).
      </div>

      {/* Verdict */}
      <div className="bg-red text-background px-4 py-2.5 font-mono text-[11px] font-bold text-center">
        {calc.totalTx > 0 ? (
          <>
            On Ethereum L1, these {fmtNum(calc.totalTx)} settlements would burn{" "}
            {fmtUsdc(calc.gasEth, 2)} in gas to earn{" "}
            {fmtUsdc(calc.totalRevenue, 6)} —{" "}
            {calc.lossMultiplier > 0 && (
              <>a {fmtNum(Math.round(calc.lossMultiplier))}× loss.</>
            )}
          </>
        ) : (
          <>Ethereum L1 gas alone is 400× the revenue per settlement.</>
        )}
      </div>
    </div>
  );
}
