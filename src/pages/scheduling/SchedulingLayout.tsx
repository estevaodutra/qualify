import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/agendamentos/calendarios", label: "Calendários", enabled: true },
  { to: "/agendamentos/lista", label: "Agendamentos", enabled: true },
  { to: "/agendamentos/atendentes", label: "Atendentes", enabled: true },
  { to: "/agendamentos/analytics", label: "Analytics", enabled: true },
  { to: "/agendamentos/configuracoes", label: "Configurações", enabled: true },
];

export default function SchedulingLayout() {
  const location = useLocation();

  return (
    <div className="space-y-6">
      <nav className="border-b border-border flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = location.pathname.startsWith(t.to);
          return t.enabled ? (
            <NavLink
              key={t.to}
              to={t.to}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </NavLink>
          ) : (
            <span
              key={t.to}
              className="px-4 py-2.5 text-sm font-medium text-muted-foreground/50 cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {t.label}
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Em breve</span>
            </span>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
