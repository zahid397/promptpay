import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Eye, EyeOff, Copy, Trash2, Key as KeyIcon } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCardLg, Panel } from "@/components/PageCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { createWallet, revokeKey } from "@/lib/api";
import { truncMid } from "@/lib/format";

interface KRow {
  id: string;
  api_key: string;
  circle_wallet_id: string;
  balance_usdc: number | string;
  total_spent_usdc: number | string;
  created_at: string;
  revoked_at: string | null;
}

const Keys = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<KRow[]>([]);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);

  const refetch = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("users").select("*").eq("auth_user_id", user.id).order("created_at", { ascending: false });
    if (data) setRows(data);
  };
  useEffect(() => { refetch(); /* eslint-disable-next-line */ }, [user?.id]);

  const handleCreate = async () => {
    setCreating(true);
    try { await createWallet(); toast.success("Key generated · 10 USDC funded"); await refetch(); }
    catch (e: any) { toast.error("Failed", { description: e?.message }); }
    finally { setCreating(false); }
  };
  const handleRevoke = async (id: string) => {
    try { await revokeKey(id); toast.success("Key revoked"); await refetch(); }
    catch (e: any) { toast.error("Revoke failed", { description: e?.message }); }
  };

  const active = rows.filter(r => !r.revoked_at).length;
  const totalSpent = rows.reduce((s, r) => s + Number(r.total_spent_usdc), 0);

  return (
    <DashboardLayout title="API Keys" subtitle="Manage API keys for your AI agents."
      actions={
        <button onClick={handleCreate} disabled={creating}
          className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-wider px-4 py-2.5 rounded-lg bg-gradient-purple text-white glow-purple hover:opacity-90 transition disabled:opacity-50">
          <Plus className="h-4 w-4" /> {creating ? "…" : "Generate API Key"}
        </button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCardLg label="Total Keys" value={rows.length} accent="purple" icon={<KeyIcon className="h-5 w-5" />} />
        <StatCardLg label="Active Keys" value={active} accent="green" icon={<KeyIcon className="h-5 w-5" />} />
        <StatCardLg label="Revoked" value={rows.length - active} accent="orange" icon={<KeyIcon className="h-5 w-5" />} />
        <StatCardLg label="Total Spent" value={`$${totalSpent.toFixed(4)}`} sub="USDC" accent="cyan" icon={<KeyIcon className="h-5 w-5" />} />
      </div>

      <Panel title="Your API Keys">
        <div className="space-y-2">
          {rows.length === 0 && (
            <div className="font-mono text-[12px] text-muted text-center py-10">No API keys yet. Click Generate API Key.</div>
          )}
          {rows.map((r) => {
            const shown = reveal[r.id];
            const masked = "sk_live_" + "•".repeat(24);
            return (
              <div key={r.id} className="p-4 rounded-md bg-surface-2 border border-soft hover:border-purple transition">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-md bg-gradient-purple flex items-center justify-center shrink-0">
                      <KeyIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[12px] text-foreground truncate">{shown ? r.api_key : masked}</div>
                      <div className="font-mono text-[10px] text-muted mt-0.5">
                        Wallet {truncMid(r.circle_wallet_id, 6, 4)} · Created {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-mono text-[9px] uppercase px-2 py-0.5 rounded-sm ${
                      r.revoked_at ? "bg-[hsl(0_100%_64%_/_0.15)] text-red" : "bg-[hsl(152_100%_50%_/_0.15)] text-green"
                    }`}>{r.revoked_at ? "Revoked" : "Active"}</span>
                    <button onClick={() => setReveal((p) => ({ ...p, [r.id]: !p[r.id] }))}
                      className="p-1.5 rounded-md text-muted hover:text-purple hover:bg-surface transition" title={shown ? "Hide" : "Reveal"}>
                      {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(r.api_key); toast.success("Copied"); }}
                      className="p-1.5 rounded-md text-muted hover:text-purple hover:bg-surface transition" title="Copy">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {!r.revoked_at && (
                      <button onClick={() => handleRevoke(r.id)}
                        className="p-1.5 rounded-md text-muted hover:text-red hover:bg-surface transition" title="Revoke">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </DashboardLayout>
  );
};

export default Keys;
