import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TxRow } from "./useRealtimeTx";

export interface GlobalStats {
  totalTx: number;
  totalUsdc: number;
  totalTokens: number;
  totalUsers: number;
}

const ZERO: GlobalStats = { totalTx: 0, totalUsdc: 0, totalTokens: 0, totalUsers: 0 };

export function useStats(transactions: TxRow[]) {
  const [stats, setStats] = useState<GlobalStats>(ZERO);

  const refetch = async () => {
    const { data } = await (supabase as any).from("global_stats").select("*").maybeSingle();
    if (data) {
      setStats({
        totalTx: Number(data.total_transactions || 0),
        totalUsdc: Number(data.total_usdc_settled || 0),
        totalTokens: Number(data.total_tokens_processed || 0),
        totalUsers: Number(data.total_users || 0),
      });
    }
  };

  useEffect(() => {
    refetch();
    const id = setInterval(refetch, 10000);
    return () => clearInterval(id);
  }, []);

  // Optimistic update from realtime tx feed
  useEffect(() => {
    if (transactions.length === 0) return;
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.length]);

  return stats;
}
