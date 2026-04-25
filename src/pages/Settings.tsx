import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, Bell, Globe, Shield, Save } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Panel } from "@/components/PageCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [notify, setNotify] = useState(true);
  const [network, setNetwork] = useState("Arc Mainnet");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
      if (data?.display_name) setDisplayName(data.display_name);
    })();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("Save failed", { description: error.message });
    else toast.success("Settings saved");
  };

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account, preferences, and security.">
      <div className="grid lg:grid-cols-[240px_1fr] gap-6">
        <nav className="space-y-1">
          {[
            { icon: User, label: "Profile", active: true },
            { icon: Bell, label: "Notifications" },
            { icon: Globe, label: "Network" },
            { icon: Shield, label: "Security" },
          ].map((it) => (
            <button key={it.label}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md font-mono text-[12px] transition ${
                it.active ? "bg-gradient-purple text-white glow-purple" : "text-muted hover:text-foreground hover:bg-surface"
              }`}>
              <it.icon className="h-4 w-4" /> {it.label}
            </button>
          ))}
        </nav>

        <div className="space-y-4">
          <Panel title="Profile">
            <div className="space-y-4 max-w-md">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-purple flex items-center justify-center text-white text-2xl font-display font-bold glow-purple">
                  {(displayName || user?.email || "U")[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-display font-bold">{displayName || "Anonymous"}</div>
                  <div className="font-mono text-[11px] text-muted">{user?.email}</div>
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted">Display Name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full mt-1.5 bg-surface-2 border border-soft rounded-md px-3 py-2.5 font-mono text-[12px] focus:outline-none focus:border-purple" />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted">Email</label>
                <input readOnly value={user?.email ?? ""}
                  className="w-full mt-1.5 bg-surface-2 border border-soft rounded-md px-3 py-2.5 font-mono text-[12px] text-muted" />
              </div>
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-md bg-gradient-purple text-white glow-purple hover:opacity-90 transition disabled:opacity-50">
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </Panel>

          <Panel title="Preferences">
            <div className="space-y-4 max-w-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[12px] text-foreground">Settlement Notifications</div>
                  <div className="font-mono text-[10px] text-muted">Get notified for each on-chain settlement.</div>
                </div>
                <button onClick={() => setNotify((v) => !v)}
                  className={`h-6 w-11 rounded-full transition relative ${notify ? "bg-gradient-purple" : "bg-surface-2 border border-soft"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${notify ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted">Default Network</label>
                <select value={network} onChange={(e) => setNetwork(e.target.value)}
                  className="w-full mt-1.5 bg-surface-2 border border-soft rounded-md px-3 py-2.5 font-mono text-[12px] focus:outline-none focus:border-purple">
                  <option>Arc Mainnet</option>
                  <option>Arc Testnet</option>
                </select>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
