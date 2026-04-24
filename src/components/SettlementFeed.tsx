import type { TxRow } from "@/hooks/useRealtimeTx";
import { fmtTime, truncMid } from "@/lib/format";

interface Props {
  transactions: TxRow[];
}

export function SettlementFeed({ transactions }: Props) {
  return (
    <div className="bg-surface border border-soft rounded-md overflow-hidden flex flex-col h-[520px]">
      <div className="px-4 py-3 border-b border-soft flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan font-bold">
            Live Settlement Feed
          </div>
          <div className="font-display font-extrabold text-lg mt-0.5">
            On-chain micropayments
          </div>
        </div>
        <div className="font-mono text-[10px] text-muted">
          {transactions.length} shown
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-2">
        {transactions.length === 0 && (
          <div className="h-full flex items-center justify-center text-center px-6">
            <div className="text-muted font-mono text-[12px] leading-relaxed">
              Send a message to watch USDC settle on Arc in real time.
            </div>
          </div>
        )}

        {transactions.map((tx) => {
          const amt = Number(tx.usdc_amount).toFixed(6);
          const isComplete = tx.status === "complete";
          return (
            <div
              key={tx.id}
              className={`animate-slide-down bg-surface-2 border-l-2 ${
                isComplete ? "border-l-success" : "border-l-warning"
              } border-y border-r border-soft rounded-sm px-3 py-2.5`}
            >
              <div className="flex items-center justify-between">
                <div className="font-mono text-green font-bold text-sm">
                  +{amt} USDC
                </div>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                    isComplete
                      ? "text-green border border-green"
                      : "text-orange border border-orange"
                  }`}
                >
                  {isComplete ? "Confirmed" : "Pending"}
                </span>
              </div>
              <div className="font-mono text-[11px] text-muted mt-1">
                {tx.tokens} tokens · Settlement #{tx.settlement_number} · {fmtTime(tx.created_at)}
              </div>
              {tx.circle_transfer_id && (
                <div className="font-mono text-[10px] text-muted mt-1 truncate">
                  TX: <span className="text-cyan">{truncMid(tx.circle_transfer_id, 14, 6)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
