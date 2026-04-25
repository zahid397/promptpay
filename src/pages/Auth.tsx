import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

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

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-soft" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">or</span>
          <div className="h-px flex-1 bg-soft" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 font-mono text-[12px] py-2.5 rounded-sm border border-soft bg-surface-2 hover:border-cyan transition disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="mt-6 text-center font-mono text-[10px] text-muted">
          By continuing you accept usage of Lovable Cloud · USDC settled on Arc
        </div>
      </div>
    </div>
  );
};

export default Auth;
