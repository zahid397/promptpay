import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated", { description: "Please sign in." });
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (e: any) {
      toast.error("Reset failed", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handle} className="w-full max-w-md bg-surface border border-soft rounded-md p-6 space-y-4">
        <div className="font-display font-extrabold text-2xl">Set new password</div>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className="w-full bg-surface-2 border border-soft rounded-sm px-3 py-2 font-mono text-[12px] focus:outline-none focus:border-cyan"
        />
        <button
          disabled={loading}
          className="w-full font-display font-extrabold text-sm uppercase tracking-wider py-3 rounded-sm text-primary-foreground disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(190 100% 65%))" }}
        >
          {loading ? "…" : "Update password"}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
