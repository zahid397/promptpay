import { Home, Wallet, ArrowLeftRight, Bot, Key, BarChart3, Settings, Zap } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "Wallets", url: "/wallets", icon: Wallet },
  { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
  { title: "AI Agents", url: "/agents", icon: Bot },
  { title: "API Keys", url: "/keys", icon: Key },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-soft">
      <SidebarContent className="bg-sidebar">
        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-purple glow-purple">
            <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-display font-extrabold text-lg leading-none text-foreground">
                PromptPay
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted mt-1">
                Pay-per-token
              </div>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {items.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink
                        to={item.url}
                        end
                        className={
                          active
                            ? "bg-gradient-purple text-white font-medium glow-purple"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="font-mono text-[12px]">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
