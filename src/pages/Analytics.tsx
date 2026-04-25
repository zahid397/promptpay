import { DollarSign, Activity, Bot, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCardLg, Panel } from "@/components/PageCard";
import { useRealtimeTx } from "@/hooks/useRealtimeTx";
import { useStats } from "@/hooks/useStats";
import { fmtTime } from "@/lib/format";

const Analytics = () => {
  const { transactions } = useRealtimeTx(50);
  const stats = useStats(transactions);

  // Build sparkline points
  const buckets = 24;
  const now = Date.now();
  const series = Array.from({ length: buckets }, (_, i) => {
    const start = now - (buckets - i) * 3600 * 1000;
    const end = start + 3600 * 1000;
    const sum = transactions
      .filter((t) => { const ts = new Date(t.created_at).getTime(); return ts >= start && ts < end; })
      .reduce((s, t) => s + Number(t.usdc_amount), 0);
    return sum;
  });
  const maxV = Math.max(...series, 0.0001);
  const path = series.map((v, i) => `${(i / (buckets - 1)) * 100},${100 - (v / maxV) * 90 - 5}`).join(" ");

  // Model distribution
  const modelCounts: Record<string, number> = {};
  transactions.forEach((t) => { const k = `agent_${(t.user_id ?? "x").slice(0, 4)}`; modelCounts[k] = (modelCounts[k] ?? 0) + 1; });
  const modelEntries = Object.entries(modelCounts).slice(0, 5);
  const modelMax = Math.max(...modelEntries.map(([, v]) => v), 1);

  return (
    <DashboardLayout title="Analytics" subtitle="Monitor AI usage, costs, and performance in real time.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCardLg label="Total Spend" value={`$${stats.totalUsdc.toFixed(2)}`} sub="USDC ↑ 18.7%" accent="purple" icon={<DollarSign className="h-5 w-5" />} />
        <StatCardLg label="Total Requests" value={stats.totalTx.toLocaleString()} sub="↑ 23.5%" accent="cyan" icon={<Activity className="h-5 w-5" />} />
        <StatCardLg label="Avg Cost / Request" value={`$${(stats.totalTx ? stats.totalUsdc / stats.totalTx : 0).toFixed(5)}`} sub="USDC" accent="green" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCardLg label="Active Agents" value={Math.max(stats.totalUsers, 1)} sub="online" accent="orange" icon={<Bot className="h-5 w-5" />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Panel title="Spending Over Time">
          <div className="h-48 relative">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(270 95% 65%)" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="hsl(270 95% 65%)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline points={`${path} 100,100 0,100`} fill="url(#grad)" stroke="none" />
              <polyline points={path} fill="none" stroke="hsl(270 95% 65%)" strokeWidth="0.6" />
            </svg>
            <div className="absolute bottom-1 left-2 right-2 flex justify-between font-mono text-[9px] text-muted">
              <span>24h ago</span><span>12h</span><span>now</span>
            </div>
          </div>
        </Panel>

        <Panel title="Top Models by Spend">
          <div className="space-y-3">
            {["Gemini 3 Flash", "Gemini 2.5 Pro", "Gemini 2.5 Flash", "GPT-5", "GPT-5 Mini"].map((m, i) => {
              const pct = 80 - i * 14;
              return (
                <div key={m}>
                  <div className="flex justify-between font-mono text-[11px] mb-1">
                    <span className="text-foreground">{m}</span><span className="text-muted">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full bg-gradient-purple-cyan rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Cost Distribution">
          <div className="flex items-center gap-6">
            <div className="relative h-32 w-32 shrink-0">
              <div className="absolute inset-0 rounded-full"
                   style={{ background: "conic-gradient(hsl(270 95% 65%) 0% 56%, hsl(190 100% 55%) 56% 81%, hsl(280 90% 55%) 81% 100%)" }} />
              <div className="absolute inset-3 rounded-full bg-surface flex items-center justify-center">
                <span className="font-display font-extrabold text-lg">100%</span>
              </div>
            </div>
            <div className="space-y-2 text-[12px] font-mono flex-1">
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-purple" /><span className="flex-1">API calls</span><span className="text-muted">56%</span></div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-cyan" /><span className="flex-1">Tokens</span><span className="text-muted">25%</span></div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[hsl(280_90%_55%)]" /><span className="flex-1">Context</span><span className="text-muted">19%</span></div>
            </div>
          </div>
        </Panel>

        <Panel title="Recent Activity">
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {transactions.slice(0, 8).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 p-2.5 rounded-md hover:bg-surface-2 transition">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-2 w-2 rounded-full bg-purple shrink-0" />
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-foreground truncate">Settlement #{t.settlement_number} · {t.tokens} tokens</div>
                    <div className="font-mono text-[10px] text-muted">{fmtTime(t.created_at)}</div>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-foreground tabular-nums shrink-0">${Number(t.usdc_amount).toFixed(5)}</span>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="font-mono text-[12px] text-muted text-center py-6">No activity yet.</div>
            )}
          </div>
        </Panel>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
