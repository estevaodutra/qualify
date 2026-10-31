import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Sparkles,
  LayoutDashboard,
  Bot,
  Layers,
  Wrench,
  Workflow,
  Database,
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
    description: "Métricas de consumo e infraestrutura",
  },
  {
    title: "Agents",
    url: "/admin/ia/agents",
    icon: Bot,
    description: "Agentes especializados e permissões",
  },
  {
    title: "Skills",
    url: "/admin/ia/skills",
    icon: Layers,
    description: "Catálogo e versionamento de skills",
  },
  {
    title: "Tools",
    url: "/admin/ia/tools",
    icon: Wrench,
    description: "Funções executáveis e RBAC",
  },
  {
    title: "Workflows",
    url: "/admin/ia/workflows",
    icon: Workflow,
    description: "Orquestração com LangGraph",
  },
  {
    title: "Context Providers",
    url: "/admin/ia/context-providers",
    icon: Database,
    description: "Fontes de contexto multi-tenant",
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
    description: "Testes de Agents, Skills e Graphs",
  },
  {
    title: "Execuções",
    url: "/admin/ia/execucoes",
    icon: Activity,
    description: "Traces, tokens, custos e auditoria",
  },
  {
    title: "Configurações",
    url: "/admin/ia/configuracoes",
    icon: Settings,
    description: "Credenciais OpenAI e guardrails",
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
                <span className="font-semibold text-sm tracking-tight text-foreground">Central de IA</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200">
                  LangGraph
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">OpenAI + LangChain Core</p>
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
                `group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                    <div className="text-left truncate">
                      <div className="leading-tight truncate">{item.title}</div>
                      <div className={`text-[10px] font-normal truncate mt-0.5 ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Stack Agêntica</span>
            <span className="font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border">
              LangChain 0.3+
            </span>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
