import { Home, MessageCircle, Kanban, Menu } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const { openMobile, setOpenMobile } = useSidebar();
  const { pathname } = useLocation();
  const items = [
    { to: "/", label: "Home", icon: Home },
    { to: "/chat", label: "Chat", icon: MessageCircle },
    { to: "/pipelines", label: "Pipelines", icon: Kanban },
  ];

  return (
    <nav aria-label="Navegação principal" className="absolute inset-x-0 bottom-0 z-40 flex h-[calc(64px+env(safe-area-inset-bottom))] items-start border-t border-border/60 bg-background/95 px-2 pt-1 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === "/"} onClick={() => setOpenMobile(false)}
          className={({ isActive }) => cn("flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold text-muted-foreground", isActive && "bg-primary/10 text-primary")}
          aria-label={label}>
          <Icon className="h-5 w-5" aria-hidden="true" />{label}
        </NavLink>
      ))}
      <button type="button" aria-label="Menu" aria-expanded={openMobile} onClick={() => setOpenMobile(!openMobile)}
        className={cn("flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold text-muted-foreground", (openMobile || !["/", "/chat", "/pipelines"].includes(pathname)) && "text-primary")}>
        <Menu className="h-5 w-5" aria-hidden="true" />Menu
      </button>
    </nav>
  );
}
