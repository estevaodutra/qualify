import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  CreditCard,
  Gauge,
  Coins,
  Gift,
  Timer,
  Link2,
  Receipt,
  History,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const planNavItems = [
  {
    title: "Plano",
    url: "/admin/planos",
    icon: CreditCard,
    end: true,
    description: "Plano único Qualify R$ 197/mês",
  },
  {
    title: "Limites",
    url: "/admin/planos/limites",
    icon: Gauge,
    description: "Matriz visual de recursos e franquias",
  },
  {
    title: "Créditos",
    url: "/admin/planos/creditos",
    icon: Coins,
    description: "Taxas por recurso e carteiras",
  },
  {
    title: "Bônus",
    url: "/admin/planos/bonus",
    icon: Gift,
    description: "Boas-vindas e concessões manuais",
  },
  {
    title: "Trial",
    url: "/admin/planos/trial",
    icon: Timer,
    description: "Período gratuito e regras de expiração",
  },
  {
    title: "Links de Cadastro",
    url: "/admin/planos/links",
    icon: Link2,
    description: "URLs com token seguro & campanhas",
  },
  {
    title: "Assinaturas",
    url: "/admin/planos/assinaturas",
    icon: Receipt,
    description: "Visão consolidada por empresa",
  },
  {
    title: "Histórico",
    url: "/admin/planos/historico",
    icon: History,
    description: "Ledger de créditos e auditoria",
  },
];

export function AdminPlansLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex-1 flex overflow-hidden min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Subsidebar Contextual de Planos & Assinaturas */}
      <aside className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-foreground">Planos &amp; Billing</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200">
                  Planos &amp; Trial
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Planos, Trial &amp; Créditos</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {planNavItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.end}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`h-4 w-4 ${
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    />
                    <div className="text-left">
                      <div className="leading-none">{item.title}</div>
                      <div
                        className={`text-[11px] font-normal mt-0.5 ${
                          isActive
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${
                      isActive
                        ? "opacity-100 translate-x-0.5"
                        : "opacity-0 group-hover:opacity-40"
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t bg-muted/40">
          <div className="rounded-lg border bg-card p-3 text-xs space-y-1.5">
            <div className="font-medium text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Modelo Comercial Seguro
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Disparos, conversas e contatos ilimitados por padrão. Recursos variáveis tarifados via carteira com bônus não-sacáveis.
            </p>
          </div>
        </div>
      </aside>

      {/* Área Principal de Conteúdo */}
      <main className="flex-1 overflow-y-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}
export default AdminPlansLayout;
