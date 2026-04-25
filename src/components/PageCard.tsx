import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: "purple" | "cyan" | "green" | "orange";
}

const accentMap = {
  purple: "bg-[hsl(270_95%_65%_/_0.15)] text-purple",
  cyan: "bg-[hsl(190_100%_55%_/_0.15)] text-cyan",
  green: "bg-[hsl(152_100%_50%_/_0.15)] text-green",
  orange: "bg-[hsl(16_100%_60%_/_0.15)] text-orange",
};

export function StatCardLg({ label, value, sub, icon, accent = "purple" }: StatCardProps) {
  return (
    <div className="bg-surface border border-soft rounded-lg p-4 md:p-5 relative overflow-hidden hover:border-purple transition group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {label}
          </div>
          <div className="font-display font-extrabold text-2xl md:text-3xl text-foreground mt-2 tabular-nums">
            {value}
          </div>
          {sub && <div className="font-mono text-[11px] text-muted mt-1">{sub}</div>}
        </div>
        {icon && (
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${accentMap[accent]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function Panel({
  title,
  children,
  action,
  className = "",
}: {
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-surface border border-soft rounded-lg ${className}`}>
      {title && (
        <header className="px-4 md:px-5 py-3 md:py-4 border-b border-soft flex items-center justify-between gap-3">
          <h2 className="font-display font-bold text-lg text-foreground">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}
