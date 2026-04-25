import { useState } from "react";
import { Search, ArrowLeftRight, Activity, DollarSign, ShieldCheck, Bot, Copy } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCardLg, Panel } from "@/components/PageCard";
import { useRealtimeTx } from "@/hooks/useRealtimeTx";
import { fmtTime, truncMid } from "@/lib/format";

const Transactions = () => {
  const { transactions } = useRealtimeTx(50);
  const [filter, setFilter] = useState<"all" | "complete" | "pending" | "failed">("all");
  const [q, setQ] = useState("");

  const filtered = transactions
    .filter((t) => filter === "all" || t.status === filter)
    .filter((t) => !q || t.id.includes(q) || (t.circle_transfer_id ?? "").includes(q));

  const totalVol = transactions.reduce((s, t) => s + Number(t.usdc_amount), 0);
  const successRate = transactions.length
    ? (transactions.filter((t) => t.status === "complete").length / transactions.length) * 100
    : 0;
  const avgCost = transactions.length ? totalVol / transactions.length : 0;

  return (
    <DashboardLayout title="Transactions" subtitle="Track every AI payment and settlement in real time.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCardLg label="Total Transactions" value={transactions.length} sub="↑ 23.5%" accent="purple" icon={<ArrowLeftRight className="h-5 w-5" />} />
        <StatCardLg label="Total Volume" value={`${totalVol.toFixed(2)}`} sub="USDC" accent="cyan" icon={<DollarSign className="h-5 w-5" />} />
        <StatCardLg label="Success Rate" value={`${successRate.toFixed(1)}%`} sub="↑ 0.6%" accent="green" icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCardLg label="Avg Cost" value={`$${avgCost.toFixed(5)}`} sub="per request" accent="orange" icon={<Activity className="h-5 w-5" />} />
      </div>

      <Panel
        title=""
        action={
          <div className="flex gap-2 w-full md:w-auto flex-wrap">
            <div className="relative flex-1 md:w-60">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hash..."
                className="w-full pl-8 pr-3 py-2 bg-surface-2 border border-soft rounded-md font-mono text-[12px] focus:outline-none focus:border-purple" />
            </div>
          </div>
        }
      >
        <div className="flex gap-2 mb-4 flex-wrap">
          {(["all", "complete", "pending", "failed"] as const).map((f) => {
            const count = f === "all" ? transactions.length : transactions.filter((t) => t.status === f).length;
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-md transition ${
                  filter === f ? "bg-gradient-purple text-white glow-purple" : "border border-soft text-muted hover:text-foreground hover:border-purple"
                }`}>
                {f} <span className="ml-1 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto -mx-4 md:-mx-5">
          <table className="w-full text-[12px] font-mono">
            <thead>
              <tr className="text-muted text-[10px] uppercase tracking-wider border-b border-soft">
                <th className="text-left px-4 py-2">Time</th>
                <th className="text-left px-4 py-2">Settlement</th>
                <th className="text-right px-4 py-2">Tokens</th>
                <th className="text-right px-4 py-2">Cost (USDC)</th>
                <th className="text-left px-4 py-2 hidden md:table-cell">Tx Hash</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-muted">No transactions yet.</td></tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-soft/50 hover:bg-surface-2 transition">
                  <td className="px-4 py-2.5 text-muted">{fmtTime(t.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-gradient-purple flex items-center justify-center shrink-0">
                        <Bot className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-foreground">#{t.settlement_number}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-foreground tabular-nums">{t.tokens}</td>
                  <td className="px-4 py-2.5 text-right text-foreground tabular-nums">-{Number(t.usdc_amount).toFixed(5)}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <button onClick={() => { navigator.clipboard.writeText(t.circle_transfer_id ?? t.id); toast.success("Copied"); }}
                      className="text-cyan hover:underline inline-flex items-center gap-1">
                      {truncMid(t.circle_transfer_id ?? t.id, 6, 4)} <Copy className="h-3 w-3" />
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm ${
                      t.status === "complete" ? "bg-[hsl(152_100%_50%_/_0.15)] text-green" :
                      t.status === "pending" ? "bg-[hsl(16_100%_60%_/_0.15)] text-orange" :
                      "bg-[hsl(0_100%_64%_/_0.15)] text-red"
                    }`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </DashboardLayout>
  );
};

export default Transactions;
