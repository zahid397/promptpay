import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Moon } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function DashboardLayout({ children, title, subtitle, actions }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/auth");
  };

  const initial = user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-14 border-b border-soft bg-background/60 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-4 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="text-muted hover:text-foreground" />
            </div>
            <div className="flex items-center gap-3">
              <button
                className="h-8 w-8 rounded-md border border-soft flex items-center justify-center text-muted hover:text-foreground hover:border-purple transition"
                title="Theme"
              >
                <Moon className="h-4 w-4" />
              </button>
              {user && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-soft bg-surface">
                  <div className="h-6 w-6 rounded-full bg-gradient-purple flex items-center justify-center text-white text-[11px] font-bold">
                    {initial}
                  </div>
                  <span className="font-mono text-[11px] text-foreground hidden sm:inline truncate max-w-[140px]">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-muted hover:text-red transition"
                    title="Logout"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-display font-extrabold text-3xl md:text-4xl text-foreground">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-muted font-mono text-[12px] mt-1.5">{subtitle}</p>
                )}
              </div>
              {actions}
            </div>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
