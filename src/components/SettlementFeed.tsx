import { toast } from "sonner";
import type { TxRow } from "@/hooks/useRealtimeTx";
import { fmtTime, truncMid } from "@/lib/format";

interface Props {
  transactions: TxRow[];
}

export function SettlementFeed({ transactions }: Props) {
  const handleCopyTx = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("TX hash copied", { description: id });
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleCopyAll = async () => {
    if (transactions.length === 0) return;
    const text = transactions
      .map(
        (t) =>
          `${t.created_at}\t#${t.settlement_number}\t${Number(t.usdc_amount).toFixed(6)} USDC\t${t.tokens} tok\t${t.circle_transfer_id ?? ""}`
      )
      .join("\n");
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${transactions.length} transactions`);
  };

  return (
    <div className="bg-surface border border-soft rounded-md overflow-hidden flex flex-col h-[520px]">
      <div className="px-4 py-3 border-b border-soft flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan font-bold">
            Live Settlement Feed
          </div>
          <div className="font-display font-extrabold text-lg mt-0.5 truncate">
            On-chain micropayments
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[10px] text-muted">{transactions.length} shown</span>
          <button
            onClick={handleCopyAll}
            disabled={transactions.length === 0}
            className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border border-soft text-muted hover:text-cyan hover:border-cyan transition disabled:opacity-30"
          >
            Copy all
          </button>
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
                <button
                  onClick={() => handleCopyTx(tx.circle_transfer_id!)}
                  className="font-mono text-[10px] text-muted mt-1 truncate hover:text-cyan w-full text-left"
                  title="Click to copy full TX hash"
                >
                  TX: <span className="text-cyan">{truncMid(tx.circle_transfer_id, 14, 6)}</span>{" "}
                  <span className="text-muted">· copy</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
