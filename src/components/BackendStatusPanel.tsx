import { useEffect, useState } from "react";
import { useHealth } from "@/hooks/useHealth";
import { CHAT_URL } from "@/lib/api";

export interface ChatProbe {
  ts: number;
  ok: boolean;
  latencyMs: number;
  status: number | null;
  note?: string;
}

interface Props {
  /** Most recent /chat stream events observed by useChat (for live signal) */
  isStreaming: boolean;
  reconnecting: boolean;
  tokensThisRun: number;
  lastSettlementAt?: string | null;
}

export function BackendStatusPanel({
  isStreaming,
  reconnecting,
  tokensThisRun,
  lastSettlementAt,
}: Props) {
  const { data, loading, lastChecked, recheck } = useHealth(15000);
  const [probes, setProbes] = useState<ChatProbe[]>([]);
  const [probing, setProbing] = useState(false);

  // Quick OPTIONS preflight to /chat to verify reachability without spending tokens
  const probe = async () => {
    setProbing(true);
    const t0 = performance.now();
    try {
      const res = await fetch(CHAT_URL, { method: "OPTIONS" });
      const dt = Math.round(performance.now() - t0);
      setProbes((p) =>
        [{ ts: Date.now(), ok: res.ok, latencyMs: dt, status: res.status }, ...p].slice(0, 8)
      );
    } catch (e: any) {
      const dt = Math.round(performance.now() - t0);
      setProbes((p) =>
        [
          { ts: Date.now(), ok: false, latencyMs: dt, status: null, note: e?.message },
          ...p,
        ].slice(0, 8)
      );
    } finally {
      setProbing(false);
    }
  };

  useEffect(() => {
    probe();
    const id = setInterval(probe, 30000);
    return () => clearInterval(id);
  }, []);

  const status = data?.status ?? "down";
  const dot =
    status === "healthy"
      ? "bg-success"
      : status === "degraded"
      ? "bg-warning"
      : "bg-danger";

  const aiUp = data?.checks.ai_gateway.status === "up";
  const dbUp = data?.checks.database.status === "up";
  const okProbes = probes.filter((p) => p.ok).length;
  const probeRate = probes.length ? Math.round((okProbes / probes.length) * 100) : 0;

  return (
    <div className="bg-surface border border-soft rounded-md p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan font-bold">
            Live Backend Status
          </div>
          <div className="font-display font-extrabold text-base mt-0.5 truncate">
            Gemini stream · /chat health
          </div>
        </div>
        <button
          onClick={() => {
            recheck();
            probe();
          }}
          disabled={loading || probing}
          className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border border-soft text-muted hover:text-cyan hover:border-cyan transition disabled:opacity-30"
        >
          {loading || probing ? "…" : "Refresh"}
        </button>
      </div>

      {/* Top status grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatusTile
          label="Overall"
          value={status.toUpperCase()}
          dotClass={dot}
          sub={data ? `${data.latencyMs}ms` : "—"}
        />
        <StatusTile
          label="AI Gateway"
          value={aiUp ? "UP" : "DOWN"}
          dotClass={aiUp ? "bg-success" : "bg-danger"}
          sub="Gemini 2.5"
        />
        <StatusTile
          label="Database"
          value={dbUp ? "UP" : "DOWN"}
          dotClass={dbUp ? "bg-success" : "bg-danger"}
          sub={data ? `${data.checks.database.latencyMs}ms` : "—"}
        />
      </div>

      {/* Live stream signal */}
      <div className="bg-surface-2 border border-soft rounded-sm px-3 py-2 mb-3">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Stream
          </div>
          <span
            className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
              isStreaming
                ? "border border-cyan text-cyan bg-[hsl(190_100%_55%_/_0.08)]"
                : reconnecting
                ? "border border-orange text-orange"
                : "border border-soft text-muted"
            }`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle ${
                isStreaming ? "bg-cyan pulse-dot" : reconnecting ? "bg-orange" : "bg-muted-foreground"
              }`}
            />
            {isStreaming ? "Streaming" : reconnecting ? "Reconnecting" : "Idle"}
          </span>
        </div>
        <div className="font-mono text-[11px] mt-1 flex justify-between text-muted">
          <span>
            Tokens this run: <span className="text-foreground">{tokensThisRun}</span>
          </span>
          {lastSettlementAt && (
            <span>
              Last settle:{" "}
              <span className="text-green">
                {new Date(lastSettlementAt).toLocaleTimeString()}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* /chat probe history */}
      <div className="bg-surface-2 border border-soft rounded-sm px-3 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
            /chat probes ({probes.length})
          </div>
          <div className="font-mono text-[10px] text-muted">
            success <span className={probeRate >= 80 ? "text-green" : "text-orange"}>{probeRate}%</span>
          </div>
        </div>
        {probes.length === 0 ? (
          <div className="font-mono text-[11px] text-muted">Probing…</div>
        ) : (
          <div className="space-y-1 max-h-[120px] overflow-y-auto scrollbar-thin">
            {probes.map((p, i) => (
              <div
                key={p.ts + ":" + i}
                className="flex items-center justify-between font-mono text-[10px]"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      p.ok ? "bg-success" : "bg-danger"
                    }`}
                  />
                  <span className={p.ok ? "text-green" : "text-red"}>
                    {p.ok ? "OK" : "FAIL"}
                  </span>
                  <span className="text-muted">{p.status ?? "—"}</span>
                </span>
                <span className="text-muted">
                  {p.latencyMs}ms · {new Date(p.ts).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {lastChecked && (
        <div className="mt-2 font-mono text-[9px] text-muted text-right">
          Last health: {lastChecked.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

function StatusTile({
  label,
  value,
  dotClass,
  sub,
}: {
  label: string;
  value: string;
  dotClass: string;
  sub: string;
}) {
  return (
    <div className="bg-surface-2 border border-soft rounded-sm px-2 py-2">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass} pulse-dot`} />
        <span className="font-mono text-[11px] font-bold">{value}</span>
      </div>
      <div className="font-mono text-[9px] text-muted mt-0.5">{sub}</div>
    </div>
  );
}
