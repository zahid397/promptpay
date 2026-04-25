// /margin — Why $0.001 per-call API only works on Arc.
// Live tx count + saved-gas counter pull from existing useStats hook.

import { DashboardLayout } from "@/components/DashboardLayout";
import { Panel } from "@/components/PageCard";
import { useRealtimeTx } from "@/hooks/useRealtimeTx";
import { useStats } from "@/hooks/useStats";
import { Activity, AlertTriangle, DollarSign, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";

const SCENARIO_CALLS = 1_000_000;
const PRICE = 0.001;
const ETH_GAS = 0.5;
const ARC_GAS = 0.0001;

const Margin = () => {
  const { transactions } = useRealtimeTx(200);
  const stats = useStats(transactions);

  const revenue = SCENARIO_CALLS * PRICE;            // 1,000
  const ethCost = SCENARIO_CALLS * ETH_GAS;          // 500,000
  const arcCost = SCENARIO_CALLS * ARC_GAS;          // 100
  const ethProfit = revenue - ethCost;               // -499,000
  const arcProfit = revenue - arcCost;               // 900

  const max = Math.max(Math.abs(ethProfit), arcProfit);
  const ethBarPct = (Math.abs(ethProfit) / max) * 100;
  const arcBarPct = (arcProfit / max) * 100;

  // Live counter — saved gas vs Ethereum for the user's actual on-chain calls
  const liveTx = stats.totalTx;
  const liveSavedGas = liveTx * (ETH_GAS - ARC_GAS);

  return (
    <DashboardLayout
      title="Why Traditional Gas Kills API Monetization"
      subtitle="Per-call $0.001 USDC pricing is profitable on Arc — and a guaranteed loss on Ethereum L1."
    >
      {/* Stat row */}
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-soft bg-surface p-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            <Activity className="h-4 w-4 text-purple" /> Your on-chain tx (live)
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold tabular-nums text-foreground">
            {liveTx.toLocaleString()}
          </div>
          <div className="font-mono text-[11px] text-muted">Streamed from Arc</div>
        </div>
        <div className="rounded-lg border border-soft bg-surface p-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            <ShieldCheck className="h-4 w-4 text-green" /> Saved gas vs Ethereum
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold tabular-nums text-green">
            ${liveSavedGas.toFixed(2)}
          </div>
          <div className="font-mono text-[11px] text-muted">
            ${ETH_GAS.toFixed(2)} avg L1 − ${ARC_GAS.toFixed(4)} Arc
          </div>
        </div>
        <div className="rounded-lg border border-soft bg-surface p-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            <DollarSign className="h-4 w-4 text-cyan" /> Revenue this session
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold tabular-nums text-cyan">
            ${stats.totalUsdc.toFixed(4)}
          </div>
          <div className="font-mono text-[11px] text-muted">USDC settled on Arc</div>
        </div>
      </div>

      {/* Comparison table */}
      <Panel title="Per-transaction Economics" className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-[12px]">
            <thead>
              <tr className="border-b border-soft text-left uppercase tracking-[0.16em] text-[10px] text-muted">
                <th className="py-2 pr-4">Network</th>
                <th className="py-2 pr-4">Avg gas / tx</th>
                <th className="py-2 pr-4">$0.001 fee viable?</th>
                <th className="py-2 pr-4">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              <tr>
                <td className="py-3 pr-4 text-foreground">Ethereum L1</td>
                <td className="py-3 pr-4 tabular-nums text-red">$0.10 – $5.00 (avg ${ETH_GAS.toFixed(2)})</td>
                <td className="py-3 pr-4 text-red">No — gas {500}× the revenue</td>
                <td className="py-3 pr-4 text-red">Business model dies</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 text-foreground">Arc Nanopayments</td>
                <td className="py-3 pr-4 tabular-nums text-green">&lt; ${ARC_GAS.toFixed(4)}</td>
                <td className="py-3 pr-4 text-green">Yes — 10× margin per call</td>
                <td className="py-3 pr-4 text-green">Profitable at any scale</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Scenario + bars */}
      <Panel title={`Scenario · ${SCENARIO_CALLS.toLocaleString()} API calls × $${PRICE.toFixed(3)} = $${revenue.toLocaleString()} revenue`} className="mb-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Ethereum bar */}
          <div className="rounded-lg border border-red bg-[hsl(0_100%_64%_/_0.05)] p-4">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
              <span className="flex items-center gap-2 text-red">
                <TrendingDown className="h-4 w-4" /> Ethereum L1
              </span>
              <span className="text-muted">gas ${ETH_GAS.toFixed(2)}/tx</span>
            </div>
            <div className="mt-3 font-mono text-[11px] text-muted">
              Cost: <span className="tabular-nums text-foreground">${ethCost.toLocaleString()}</span>
            </div>
            <div className="mt-1 font-display text-3xl font-extrabold tabular-nums text-red">
              −${Math.abs(ethProfit).toLocaleString()}
            </div>
            <div className="font-mono text-[10px] uppercase text-red">net loss</div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-red"
                style={{ width: `${ethBarPct}%`, minWidth: "8%" }}
              />
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-md border border-soft bg-surface p-2 font-mono text-[11px] text-muted">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red" />
              <span>
                A single $0.50 gas fee is <span className="text-foreground">500×</span> bigger than the
                $0.001 you charge. Every call burns money.
              </span>
            </div>
          </div>

          {/* Arc bar */}
          <div className="rounded-lg border border-green bg-[hsl(152_100%_50%_/_0.06)] p-4">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
              <span className="flex items-center gap-2 text-green">
                <TrendingUp className="h-4 w-4" /> Arc Nanopayments
              </span>
              <span className="text-muted">gas &lt;${ARC_GAS.toFixed(4)}/tx</span>
            </div>
            <div className="mt-3 font-mono text-[11px] text-muted">
              Cost: <span className="tabular-nums text-foreground">${arcCost.toLocaleString()}</span>
            </div>
            <div className="mt-1 font-display text-3xl font-extrabold tabular-nums text-green">
              +${arcProfit.toLocaleString()}
            </div>
            <div className="font-mono text-[10px] uppercase text-green">net profit</div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-green"
                style={{ width: `${arcBarPct}%`, minWidth: "4%" }}
              />
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-md border border-soft bg-surface p-2 font-mono text-[11px] text-muted">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" />
              <span>
                Sub-cent gas means a 10× margin on every $0.001 call. Per-API monetization is
                economically viable at any volume.
              </span>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Bottom line">
        <p className="font-mono text-[12px] leading-7 text-muted">
          The Agentic Economy is built from millions of sub-cent transactions — autonomous agents
          calling APIs, buying data, paying for compute. On any traditional L1, gas alone destroys
          the business model before it begins. Arc collapses settlement cost below the price of the
          service itself, which is the only way <span className="text-foreground">per-API</span>{" "}
          monetization can exist at all.
        </p>
      </Panel>
    </DashboardLayout>
  );
};

export default Margin;
