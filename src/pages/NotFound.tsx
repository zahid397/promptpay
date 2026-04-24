import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="font-display font-extrabold text-6xl text-cyan">404</div>
        <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.2em] text-muted">
          No route at <span className="text-foreground">{location.pathname}</span>
        </p>
        <p className="mt-4 font-display font-extrabold text-2xl">
          This URL hasn't settled on-chain yet.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="font-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded-sm text-primary-foreground"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(190 100% 65%))",
              boxShadow: "var(--shadow-glow-cyan)",
            }}
          >
            Go home →
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="font-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded-sm border border-soft text-muted hover:text-cyan hover:border-cyan"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
