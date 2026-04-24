import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LeaderRow {
  auth_user_id: string;
  display_name: string | null;
  total_usdc_spent: number | string;
  total_tokens: number | string;
  total_settlements: number | string;
}

export function Leaderboard() {
  const [rows, setRows] = useState<LeaderRow[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("leaderboard")
        .select("*")
        .limit(5);
      if (data) setRows(data);
    };
    fetch();
    const id = setInterval(fetch, 15000);
    return () => clearInterval(id);
  }, []);

  if (rows.length === 0) return null;

  return (
    <div className="bg-surface border border-soft rounded-md overflow-hidden">
      <div className="px-4 py-3 border-b border-soft">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan font-bold">
          🏆 Top spenders
        </div>
      </div>
      <div className="divide-y divide-soft">
        {rows.map((r, i) => (
          <div key={r.auth_user_id} className="px-4 py-2 flex items-center justify-between font-mono text-[12px]">
            <span className="flex items-center gap-3">
              <span className="text-muted w-4 text-right">{i + 1}</span>
              <span className="text-foreground truncate max-w-[160px]">
                {r.display_name || "anon"}
              </span>
            </span>
            <span className="text-green font-bold">
              ${Number(r.total_usdc_spent).toFixed(6)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
