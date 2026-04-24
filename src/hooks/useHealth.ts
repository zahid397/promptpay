import { useCallback, useEffect, useState } from "react";
import { fetchHealth, type HealthResponse } from "@/lib/api";

export interface HealthState {
  data: HealthResponse | null;
  loading: boolean;
  lastChecked: Date | null;
  recheck: () => Promise<void>;
}

export function useHealth(intervalMs = 15000): HealthState {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const recheck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchHealth();
      setData(res);
    } catch {
      setData({
        ok: false,
        status: "down",
        version: "?",
        uptimeMs: 0,
        latencyMs: -1,
        checks: {
          database: { status: "down", latencyMs: -1 },
          ai_gateway: { status: "down" },
          realtime: { status: "down" },
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    recheck();
    const id = setInterval(recheck, intervalMs);
    return () => clearInterval(id);
  }, [recheck, intervalMs]);

  return { data, loading, lastChecked, recheck };
}
