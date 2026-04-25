import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Wallet as WalletIcon, Copy, DollarSign, Send, Activity, BarChart3 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCardLg, Panel } from "@/components/PageCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { createWallet, addFunds } from "@/lib/api";
import { truncMid } from "@/lib/format";

interface Row {
  id: string;
  api_key: string;
  circle_wallet_id: string;
  balance_usdc: number | string;
  total_spent_usdc: number | string;
  created_at: string;
  revoked_at: string | null;
}

const Wallets = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [funding, setFunding] = useState(false);

  const refetch = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("users")
      .select("*")
      .eq("auth_user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setRows(data);
      if (!selected && data[0]) setSelected(data[0]);
    }
  };

  useEffect(() => { refetch(); /* eslint-disable-next-line */ }, [user?.id]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createWallet();
      toast.success("Wallet created · 10 USDC funded");
      await refetch();
    } catch (e: any) {
      toast.error("Create failed", { description: e?.message });
    } finally { setCreating(false); }
  };

  const handleAddFunds = async () => {
    if (!selected) return;
    setFunding(true);
    try {
      const r = await addFunds(selected.circle_wallet_id, 10);
      toast.success(`+10 USDC added · new balance $${r.balance.toFixed(2)}`);
      await refetch();
    } catch (e: any) {
      toast.error("Add funds failed", { description: e?.message });
    } finally { setFunding(false); }
  };

  const totalBal = rows.reduce((s, r) => s + Number(r.balance_usdc), 0);
  const totalSpent = rows.reduce((s, r) => s + Number(r.total_spent_usdc), 0);

  return (
    <DashboardLayout
      title="Wallets"
      subtitle="Manage your wallets and API keys for AI agent payments."
      actions={
        <button onClick={handleCreate} disabled={creating}
          className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-wider px-4 py-2.5 rounded-lg bg-gradient-purple text-white glow-purple hover:opacity-90 transition disabled:opacity-50">
          <Plus className="h-4 w-4" /> {creating ? "Creating…" : "Create Wallet"}
        </button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCardLg label="Total Wallets" value={rows.length} sub="Active wallets" accent="purple" icon={<WalletIcon className="h-5 w-5" />} />
        <StatCardLg label="Total Balance" value={`${totalBal.toFixed(2)}`} sub="USDC" accent="cyan" icon={<DollarSign className="h-5 w-5" />} />
        <StatCardLg label="Total Spent" value={`${totalSpent.toFixed(2)}`} sub="USDC" accent="green" icon={<BarChart3 className="h-5 w-5" />} />
        <StatCardLg label="Status" value={rows.filter(r => !r.revoked_at).length} sub="Active" accent="orange" icon={<Activity className="h-5 w-5" />} />
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
        <Panel title="Your Wallets">
          <div className="space-y-2">
            {rows.length === 0 && (
              <div className="font-mono text-[12px] text-muted text-center py-10">No wallets yet. Click Create Wallet to get started.</div>
            )}
            {rows.map((r) => {
              const active = selected?.id === r.id;
              return (
                <button key={r.id} onClick={() => setSelected(r)}
                  className={`w-full text-left p-3 rounded-md border transition ${active ? "border-purple bg-[hsl(270_95%_65%_/_0.06)] glow-purple" : "border-soft bg-surface-2 hover:border-purple"}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-md bg-gradient-purple flex items-center justify-center shrink-0">
                        <WalletIcon className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-[12px] text-foreground truncate">{truncMid(r.circle_wallet_id, 8, 6)}</div>
                        <div className="font-mono text-[10px] text-muted">Created {new Date(r.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[13px] text-foreground tabular-nums">{Number(r.balance_usdc).toFixed(2)} USDC</div>
                      <span className={`inline-block mt-0.5 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-sm ${
                        r.revoked_at ? "bg-[hsl(0_100%_64%_/_0.15)] text-red" : "bg-[hsl(152_100%_50%_/_0.15)] text-green"
                      }`}>{r.revoked_at ? "Inactive" : "Active"}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title="Wallet Details">
          {!selected ? (
            <div className="font-mono text-[12px] text-muted py-8 text-center">Select a wallet to view details.</div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-purple rounded-lg p-4 text-white relative overflow-hidden glow-purple">
                <div className="font-mono text-[10px] uppercase tracking-wider opacity-80">Balance</div>
                <div className="font-display font-extrabold text-3xl tabular-nums mt-1">{Number(selected.balance_usdc).toFixed(2)} <span className="text-sm opacity-75">USDC</span></div>
                <div className="font-mono text-[11px] opacity-75 mt-1">≈ ${Number(selected.balance_usdc).toFixed(2)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleAddFunds} disabled={funding}
                  className="font-mono text-[11px] uppercase tracking-wider px-3 py-2.5 rounded-md bg-purple text-white hover:opacity-90 transition disabled:opacity-50 bg-gradient-purple">
                  {funding ? "…" : "Add Funds"}
                </button>
                <button className="font-mono text-[11px] uppercase tracking-wider px-3 py-2.5 rounded-md border border-soft text-foreground hover:border-purple transition flex items-center justify-center gap-1.5">
                  <Send className="h-3.5 w-3.5" /> Send
                </button>
              </div>
              <div className="space-y-2 text-[12px] font-mono">
                {[
                  ["Network", "Arc Mainnet"],
                  ["Created", new Date(selected.created_at).toLocaleDateString()],
                  ["Total Spent", `${Number(selected.total_spent_usdc).toFixed(4)} USDC`],
                  ["Wallet ID", truncMid(selected.circle_wallet_id, 10, 8)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-soft last:border-0">
                    <span className="text-muted">{k}</span><span className="text-foreground">{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1.5">API Key</div>
                <div className="flex gap-2">
                  <input readOnly value={selected.api_key} className="flex-1 bg-surface-2 border border-soft rounded-md px-3 py-2 font-mono text-[11px] text-foreground" />
                  <button onClick={() => { navigator.clipboard.writeText(selected.api_key); toast.success("Copied"); }}
                    className="px-3 rounded-md border border-soft hover:border-purple text-muted hover:text-purple transition">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </DashboardLayout>
  );
};

export default Wallets;
