import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created", { description: "You're signed in." });
        navigate("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate("/");
      }
    } catch (e: any) {
      toast.error(mode === "signup" ? "Sign up failed" : "Sign in failed", {
        description: e?.message,
      });
    } finally {
      setLoading(false);
    }
  };



  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      toast.success("Signed in with Google");
      navigate("/");
    } catch (e: any) {
      toast.error("Google sign-in failed", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Reset email sent", { description: "Check your inbox." });
    } catch (e: any) {
      toast.error("Reset failed", { description: e?.message });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface border border-soft rounded-md p-6">
        <Link to="/" className="font-display font-extrabold text-2xl">
          PromptPay
        </Link>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
          {mode === "signin" ? "Sign in to your account" : "Create your account"}
        </div>

        <div className="flex gap-2 mt-5 mb-4">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 font-mono text-[11px] uppercase tracking-wider py-2 rounded-sm border transition ${
                mode === m
                  ? "border-cyan text-cyan bg-[hsl(190_100%_50%_/_0.07)]"
                  : "border-soft text-muted hover:text-foreground"
              }`}
            >
              {m === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Display name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full mt-1 bg-surface-2 border border-soft rounded-sm px-3 py-2 font-mono text-[12px] focus:outline-none focus:border-cyan"
              />
            </div>
          )}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-muted">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 bg-surface-2 border border-soft rounded-sm px-3 py-2 font-mono text-[12px] focus:outline-none focus:border-cyan"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-muted flex items-center justify-between">
              <span>Password</span>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={handleForgot}
                  className="text-cyan hover:underline normal-case tracking-normal"
                >
                  Forgot?
                </button>
              )}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 bg-surface-2 border border-soft rounded-sm px-3 py-2 font-mono text-[12px] focus:outline-none focus:border-cyan"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full font-display font-extrabold text-sm uppercase tracking-wider py-3 rounded-sm text-primary-foreground disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(190 100% 65%) 100%)",
              boxShadow: "var(--shadow-glow-cyan)",
            }}
          >
            {loading ? "…" : mode === "signin" ? "Sign In →" : "Create Account →"}
          </button>
        </form>

        <div className="mt-5 px-3 py-2 rounded-sm border border-soft bg-surface-2 font-mono text-[10px] text-muted leading-relaxed">
          Local email/password sign-in only · No third-party OAuth · Your account stays on Lovable Cloud.
        </div>

        <div className="mt-6 text-center font-mono text-[10px] text-muted">
          By continuing you accept usage of Lovable Cloud · USDC settled on Arc
        </div>
      </div>
    </div>
  );
};

export default Auth;
