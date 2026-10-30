import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  ShieldCheck,
  Gauge,
  Sparkles,
  Layers,
  Cpu,
  PlayCircle,
  Activity,
  Settings,
  Workflow,
  Radio,
  Zap,
  Plug,
  FileText,
  Tag,
  Image,
  ShieldAlert,
  ScrollText,
  AlertTriangle,
  ListOrdered,
  FileCheck2,
  Flag,
  Sliders,
  ArrowLeft,
  ChevronDown,
  Shield,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: string;
}

interface NavSection {
  title: string;
  defaultOpen?: boolean;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: "VISÃO GERAL",
    defaultOpen: true,
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: "PLATAFORMA",
    defaultOpen: true,
    items: [
      { title: "Empresas", url: "/admin/empresas", icon: Building2 },
      { title: "Usuários", url: "/admin/usuarios", icon: Users },
      { title: "Planos & Assinaturas", url: "/admin/planos", icon: CreditCard },
      { title: "Permissões", url: "/admin/permissoes", icon: ShieldCheck },
      { title: "Uso & Limites", url: "/admin/uso", icon: Gauge },
    ],
  },
  {
    title: "IA",
    defaultOpen: true,
    items: [
      { title: "Visão Geral", url: "/admin/ia", icon: Sparkles, end: true },
      { title: "Skills", url: "/admin/ia/skills", icon: Layers },
      { title: "Modelos", url: "/admin/ia/modelos", icon: Cpu },
      { title: "Playground", url: "/admin/ia/playground", icon: PlayCircle },
      { title: "Execuções", url: "/admin/ia/execucoes", icon: Activity },
      { title: "Configurações", url: "/admin/ia/configuracoes", icon: Settings },
    ],
  },
  {
    title: "INTEGRAÇÕES",
    defaultOpen: true,
    items: [
      { title: "OpenAI", url: "/admin/integracoes/openai", icon: Sparkles },
      { title: "Meta / Instagram", url: "/admin/integracoes/meta", icon: Workflow },
      { title: "WhatsApp", url: "/admin/integracoes/whatsapp", icon: Radio },
      { title: "Webhooks", url: "/admin/integracoes/webhooks", icon: Zap },
      { title: "Outras Integrações", url: "/admin/integracoes/outras", icon: Plug },
    ],
  },
  {
    title: "CONTEÚDO & OPERAÇÃO",
    defaultOpen: false,
    items: [
      { title: "Templates Globais", url: "/admin/conteudo/templates", icon: FileText },
      { title: "Categorias", url: "/admin/conteudo/categorias", icon: Tag },
      { title: "Assets Globais", url: "/admin/conteudo/assets", icon: Image },
      { title: "Regras da Plataforma", url: "/admin/conteudo/regras", icon: ShieldAlert },
    ],
  },
  {
    title: "SISTEMA",
    defaultOpen: true,
    items: [
      { title: "Logs", url: "/admin/sistema/logs", icon: ScrollText },
      { title: "Erros", url: "/admin/sistema/erros", icon: AlertTriangle },
      { title: "Filas & Jobs", url: "/admin/sistema/jobs", icon: ListOrdered },
      { title: "Auditoria", url: "/admin/sistema/auditoria", icon: FileCheck2 },
      { title: "Feature Flags", url: "/admin/sistema/feature-flags", icon: Flag },
      { title: "Configurações", url: "/admin/sistema/configuracoes", icon: Sliders },
    ],
  },
];

interface AdminSidebarProps {
  onNavigate?: () => void;
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Estados de acordeão dos grupos da sidebar
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sections.forEach((sec) => {
      // Abre automaticamente a seção se uma rota filha dela estiver ativa
      const isChildActive = sec.items.some((item) =>
        item.end ? pathname === item.url : pathname.startsWith(item.url)
      );
      initial[sec.title] = isChildActive || (sec.defaultOpen ?? true);
    });
    return initial;
  });

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const linkClass = (active: boolean) =>
    `group flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
    }`;

  return (
    <div className="w-64 border-r bg-card flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-14 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center font-bold">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-foreground">SUPER ADMIN</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-none">Qualify / Criafy Hub</p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-3">
        {sections.map((sec) => {
          const isOpen = openSections[sec.title] ?? true;
          const isSectionActive = sec.items.some((item) =>
            item.end ? pathname === item.url : pathname.startsWith(item.url)
          );

          return (
            <Collapsible
              key={sec.title}
              open={isOpen}
              onOpenChange={() => toggleSection(sec.title)}
              className="space-y-1"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={`w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold tracking-wider transition-colors rounded ${
                    isSectionActive
                      ? "text-primary"
                      : "text-muted-foreground/80 hover:text-foreground"
                  }`}
                >
                  <span>{sec.title}</span>
                  <ChevronDown
                    className={`h-3 w-3 transition-transform duration-200 ${
                      isOpen ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-0.5 pt-0.5">
                {sec.items.map((item) => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) => linkClass(isActive)}
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <item.icon
                            className={`h-3.5 w-3.5 shrink-0 ${
                              isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          />
                          <span className="truncate">{item.title}</span>
                        </div>
                        {item.badge && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 h-4 ml-1"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>

      {/* Footer Back Button */}
      <div className="border-t p-3 bg-muted/10">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs h-8 text-muted-foreground hover:text-foreground"
          onClick={() => {
            if (onNavigate) onNavigate();
            navigate("/");
          }}
        >
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          Voltar ao App Qualify
        </Button>
      </div>
    </div>
  );
}
