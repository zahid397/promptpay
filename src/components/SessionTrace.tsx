import type { SettlementEvent } from "@/hooks/useChat";

interface Props {
  tokensStreamed: number;
  settlements: SettlementEvent[];
  settleEvery?: number;
  pricePerToken?: number;
}

/**
 * In-dashboard trace view: shows tokens streamed in the current session and
 * the exact moment each N-token micro-settlement was created on Arc with
 * the corresponding USDC amount.
 */
export function SessionTrace({
  tokensStreamed,
  settlements,
  settleEvery = 50,
  pricePerToken = 0.0001,
}: Props) {
  const nextSettleAt =
    Math.floor(tokensStreamed / settleEvery) * settleEvery + settleEvery;
  const tokensIntoChunk = tokensStreamed % settleEvery;
  const progressPct = Math.min(100, Math.round((tokensIntoChunk / settleEvery) * 100));
  const projectedUsd = (tokensStreamed * pricePerToken).toFixed(6);

  return (
    <div className="bg-surface border border-soft rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan font-bold">
            Session Trace
          </div>
          <div className="font-display font-extrabold text-base mt-0.5">
            Tokens → Micro-settlements
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Streamed
          </div>
          <div className="font-mono text-lg font-bold text-foreground">
            {tokensStreamed}
          </div>
        </div>
      </div>

      {/* Progress to next settlement */}
      <div className="bg-surface-2 border border-soft rounded-sm px-3 py-2 mb-3">
        <div className="flex justify-between font-mono text-[10px] text-muted mb-1">
          <span>
            Next settlement at <span className="text-cyan">{nextSettleAt}</span> tokens
          </span>
          <span>
            {tokensIntoChunk}/{settleEvery}
          </span>
        </div>
        <div className="h-2 bg-surface border border-soft rounded-sm overflow-hidden">
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${progressPct}%`,
              background:
                "linear-gradient(90deg, hsl(var(--accent-cyan)), hsl(var(--success)))",
              boxShadow: "var(--shadow-glow-cyan)",
            }}
          />
        </div>
        <div className="font-mono text-[10px] text-muted mt-1.5 flex justify-between">
          <span>
            Pricing: <span className="text-foreground">${pricePerToken.toFixed(6)}</span>/token
          </span>
          <span>
            Projected this run:{" "}
            <span className="text-green">${projectedUsd} USDC</span>
          </span>
        </div>
      </div>

      {/* Settlement timeline */}
      <div className="bg-surface-2 border border-soft rounded-sm">
        <div className="px-3 py-1.5 border-b border-soft flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
          <span>On-chain micro-settlements</span>
          <span>{settlements.length} events</span>
        </div>
        <div className="max-h-[180px] overflow-y-auto scrollbar-thin">
          {settlements.length === 0 ? (
            <div className="px-3 py-4 font-mono text-[11px] text-muted text-center">
              Stream a prompt — settlements appear here every {settleEvery} tokens.
            </div>
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]">
              {settlements.map((s) => (
                <div
                  key={s.settlementNumber}
                  className="animate-slide-down px-3 py-2 grid grid-cols-[auto_1fr_auto] gap-2 items-center"
                >
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm border border-cyan text-cyan bg-[hsl(190_100%_55%_/_0.08)]">
                    #{s.settlementNumber}
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-foreground truncate">
                      {s.tokens} tokens · {new Date(s.timestamp).toLocaleTimeString()}
                    </div>
                    <div
                      className="font-mono text-[10px] text-muted truncate"
                      title={s.transferId}
                    >
                      tx: <span className="text-cyan">{s.transferId.slice(0, 22)}…</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[12px] text-green font-bold">
                      +{s.usdcAmount}
                    </div>
                    <div className="font-mono text-[9px] text-muted">USDC · Arc</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
