import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { revokeKey, createWallet } from "@/lib/api";
import { truncMid } from "@/lib/format";

interface KeyRow {
  id: string;
  api_key: string;
  circle_wallet_id: string;
  balance_usdc: number | string;
  total_spent_usdc: number | string;
  created_at: string;
  revoked_at: string | null;
}

interface Props {
  onUseKey?: (apiKey: string) => void;
}

export function MyKeys({ onUseKey }: Props) {
  const { user } = useAuth();
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const refetch = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("users")
      .select("id, api_key, circle_wallet_id, balance_usdc, total_spent_usdc, created_at, revoked_at")
      .eq("auth_user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load keys", { description: error.message });
    else setKeys(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const r = await createWallet();
      toast.success("Key created · 10 USDC funded", {
        action: {
          label: "Copy",
          onClick: () => {
            navigator.clipboard.writeText(r.apiKey);
            toast.success("Copied");
          },
        },
      });
      await refetch();
      onUseKey?.(r.apiKey);
    } catch (e: any) {
      toast.error("Create failed", { description: e?.message });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeKey(id);
      toast.success("Key revoked");
      await refetch();
    } catch (e: any) {
      toast.error("Revoke failed", { description: e?.message });
    }
  };

  const handleCopy = async (k: string) => {
    await navigator.clipboard.writeText(k);
    toast.success("Key copied");
  };

  return (
    <div className="bg-surface border border-soft rounded-md overflow-hidden">
      <div className="px-4 py-3 border-b border-soft flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan font-bold">
            My API Keys
          </div>
          <div className="font-display font-extrabold text-lg mt-0.5">
            {keys.filter((k) => !k.revoked_at).length} active · {keys.length} total
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-sm border border-cyan text-cyan hover:bg-primary hover:text-primary-foreground transition disabled:opacity-50"
        >
          {creating ? "…" : "+ New key"}
        </button>
      </div>
      <div className="px-3 py-3 space-y-2 max-h-[260px] overflow-y-auto scrollbar-thin">
        {loading && keys.length === 0 && (
          <div className="font-mono text-[12px] text-muted text-center py-6">Loading…</div>
        )}
        {!loading && keys.length === 0 && (
          <div className="font-mono text-[12px] text-muted text-center py-6">
            No keys yet. Click + New key to fund your first wallet.
          </div>
        )}
        {keys.map((k) => {
          const revoked = !!k.revoked_at;
          return (
            <div
              key={k.id}
              className={`bg-surface-2 border border-soft rounded-sm px-3 py-2 ${revoked ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => handleCopy(k.api_key)}
                  className="font-mono text-[11px] text-cyan hover:underline truncate text-left"
                  title="Copy"
                >
                  {truncMid(k.api_key, 14, 8)}
                </button>
                <div className="flex gap-2 shrink-0">
                  {!revoked && (
                    <>
                      <button
                        onClick={() => onUseKey?.(k.api_key)}
                        className="font-mono text-[10px] uppercase tracking-wider text-cyan hover:underline"
                      >
                        Use
                      </button>
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="font-mono text-[10px] uppercase tracking-wider text-red hover:underline"
                      >
                        Revoke
                      </button>
                    </>
                  )}
                  {revoked && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                      Revoked
                    </span>
                  )}
                </div>
              </div>
              <div className="font-mono text-[10px] text-muted mt-1">
                Bal ${Number(k.balance_usdc).toFixed(6)} · Spent ${Number(k.total_spent_usdc).toFixed(6)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
