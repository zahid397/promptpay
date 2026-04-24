import { useHealth } from "@/hooks/useHealth";
import { toast } from "sonner";

export function HealthDot() {
  const { data, loading, lastChecked, recheck } = useHealth(15000);
  const status = data?.status ?? (loading ? "healthy" : "down");
  const color =
    status === "healthy" ? "bg-success" : status === "degraded" ? "bg-warning" : "bg-danger";
  const textColor =
    status === "healthy" ? "text-green" : status === "degraded" ? "text-orange" : "text-red";

  const handleClick = async () => {
    await recheck();
    if (data?.ok) toast.success("All systems operational");
    else
      toast.warning("Backend degraded", {
        description: `DB: ${data?.checks.database.status} · AI: ${data?.checks.ai_gateway.status}`,
      });
  };

  return (
    <button
      onClick={handleClick}
      title={
        data
          ? `Status: ${status}\nDB: ${data.checks.database.status} (${data.checks.database.latencyMs}ms)\nAI: ${data.checks.ai_gateway.status}\nLast checked: ${lastChecked?.toLocaleTimeString() ?? "—"}`
          : "Checking…"
      }
      className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider hover:opacity-80"
    >
      <span className={`h-2 w-2 rounded-full ${color} pulse-dot`} />
      <span className={textColor}>
        {status === "healthy" ? "All systems" : status === "degraded" ? "Degraded" : "Backend down"}
      </span>
      {data && status === "healthy" && (
        <span className="text-muted">· {data.latencyMs}ms</span>
      )}
    </button>
  );
}
