import { useEffect, useRef, useState } from "react";
import CountUp from "react-countup";

interface Props {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  color?: "cyan" | "green" | "white" | "orange";
  subtitle?: string;
}

const colorClass = {
  cyan: "text-cyan",
  green: "text-green",
  orange: "text-orange",
  white: "text-foreground",
};

export function StatCard({ label, value, decimals = 0, prefix = "", suffix = "", color = "white", subtitle }: Props) {
  const prev = useRef(value);
  const [sweepKey, setSweepKey] = useState(0);

  useEffect(() => {
    if (prev.current !== value) {
      setSweepKey((k) => k + 1);
      prev.current = value;
    }
  }, [value]);

  return (
    <div className="relative overflow-hidden bg-surface border border-soft rounded-md px-5 py-4">
      {sweepKey > 0 && <span key={sweepKey} className="sweep-line" />}
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        {label}
      </div>
      <div className={`font-display font-extrabold text-3xl mt-1.5 ${colorClass[color]}`}>
        <CountUp
          end={value}
          decimals={decimals}
          duration={0.6}
          preserveValue
          separator=","
          prefix={prefix}
          suffix={suffix}
        />
      </div>
      {subtitle && (
        <div className="font-mono text-[10px] text-muted mt-1">{subtitle}</div>
      )}
    </div>
  );
}
