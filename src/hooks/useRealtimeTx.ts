import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TxRow {
  id: string;
  session_id: string | null;
  user_id: string | null;
  settlement_number: number;
  tokens: number;
  usdc_amount: string | number;
  circle_transfer_id: string | null;
  status: "pending" | "complete" | "failed";
  gas_cost_arc: string | number;
  gas_cost_eth_l1: string | number;
  created_at: string;
}

export function useRealtimeTx(limit = 50) {
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await (supabase as any)
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!cancelled && data) setTransactions(data as TxRow[]);
    })();

    const channel = supabase
      .channel("transactions-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions" },
        (payload) => {
          const row = payload.new as TxRow;
          setTransactions((prev) => [row, ...prev].slice(0, limit));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions" },
        (payload) => {
          const row = payload.new as TxRow;
          setTransactions((prev) =>
            prev.map((t) => (t.id === row.id ? { ...t, ...row } : t))
          );
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [limit]);

  return { transactions, isConnected };
}
