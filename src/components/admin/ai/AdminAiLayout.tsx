import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Sparkles,
  LayoutDashboard,
  Layers,
  Cpu,
  PlayCircle,
  Activity,
  Settings,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const aiNavItems = [
  {
    title: "Visão Geral",
    url: "/admin/ia",
    icon: LayoutDashboard,
    end: true,
    description: "Métricas reais de consumo e catálogo",
  },
  {
    title: "Skills",
    url: "/admin/ia/skills",
    icon: Layers,
    description: "Catálogo e versionamento global",
  },
  {
    title: "Modelos",
    url: "/admin/ia/modelos",
    icon: Cpu,
    description: "Perfis e configurações OpenAI",
  },
  {
    title: "Playground",
    url: "/admin/ia/playground",
    icon: PlayCircle,
    description: "Testes com contexto dinâmico",
  },
  {
    title: "Execuções",
    url: "/admin/ia/execucoes",
    icon: Activity,
    description: "Logs, tokens e rastreabilidade",
  },
  {
    title: "Configurações",
    url: "/admin/ia/configuracoes",
    icon: Settings,
    description: "Credencial única Criafy & status",
  },
];

export function AdminAiLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex-1 flex overflow-hidden min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Subsidebar Contextual de IA */}
      <aside className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-foreground">Motor de IA</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200">
                  OpenAI
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Skills Globais da Criafy</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {aiNavItems.map((item) => (
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
                    <item.icon className={`h-4 w-4 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                    <div className="text-left">
                      <div className="leading-none">{item.title}</div>
                      <div className={`text-[11px] font-normal mt-0.5 ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isActive ? "opacity-100 translate-x-0.5" : "opacity-0 group-hover:opacity-40"}`} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t bg-muted/40">
          <div className="rounded-lg border bg-card p-3 text-xs space-y-1.5">
            <div className="font-medium text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Credencial Criafy Única
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Todas as empresas geram conteúdo consumindo as Skills globais via backend seguro, sem expor chaves aos clientes.
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
