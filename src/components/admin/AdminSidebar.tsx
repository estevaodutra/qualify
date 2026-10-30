import { useState, useEffect } from "react";
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
  Search,
  Bell,
  HelpCircle,
  LogOut,
  ExternalLink,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useToast } from "@/hooks/use-toast";
import { NotificationsPopover } from "../notifications/NotificationsPopover";
import { AdminGlobalSearchModal } from "./AdminGlobalSearchModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const { user, signOut } = useAuth();
  const { unreadCount } = useAlerts();
  const { toast } = useToast();

  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Estados de acordeão dos grupos da sidebar
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sections.forEach((sec) => {
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

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: "Não foi possível encerrar a sessão.",
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  const isProduction = import.meta.env.PROD;
  const userName = user?.user_metadata?.full_name || "Super Admin";
  const userEmail = user?.email || "";
  const initials = (userName || userEmail || "SA")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const linkClass = (active: boolean) =>
    `group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
      active
        ? "bg-[#EEF0FD] text-[#5856d6] font-semibold shadow-xs"
        : "text-[#334155] hover:bg-slate-100/70 hover:text-slate-900"
    }`;

  return (
    <>
      <div className="w-64 border-r border-slate-200/80 bg-[#FBFBFD] flex flex-col h-full shrink-0 select-none overflow-hidden text-slate-800">
        {/* ============================================================ */}
        {/* 1. HEADER DA SIDEBAR (Logo Oficial Qualify + Busca Global) */}
        {/* ============================================================ */}
        <div className="p-4 border-b border-slate-200/80 shrink-0 bg-[#FBFBFD] space-y-3">
          {/* Logo Oficial Qualify */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/logo_sidebar_open.png"
                alt="Qualify"
                className="h-6 w-auto object-contain"
              />
              <Badge
                variant="destructive"
                className="text-[9px] font-bold px-1.5 py-0 uppercase tracking-wider h-4"
              >
                Super Admin
              </Badge>
            </div>

            <Badge
              variant="outline"
              className={`text-[9px] font-mono px-1 py-0 h-4 ${
                isProduction
                  ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                  : "border-amber-500/30 text-amber-600 bg-amber-500/10"
              }`}
            >
              {isProduction ? "PROD" : "DEV"}
            </Badge>
          </div>

          {/* Barra de Busca Global (⌘K) migrada da Topbar */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full h-8 flex items-center justify-between px-2.5 text-xs rounded-lg border border-slate-200/90 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-xs cursor-pointer"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px]">Buscar...</span>
            </span>
            <kbd className="inline-flex h-4 items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[9px] font-semibold text-slate-500">
              <span>⌘</span>K
            </kbd>
          </button>
        </div>

        {/* ============================================================ */}
        {/* 2. BODY DA SIDEBAR (Scroll Exclusivo na Navegação) */}
        {/* ============================================================ */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 overscroll-contain">
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
                    className={`w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors rounded ${
                      isSectionActive
                        ? "text-[#5856d6]"
                        : "text-slate-400 hover:text-slate-600"
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
                                isActive ? "text-[#5856d6]" : "text-slate-500 group-hover:text-slate-800"
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

        {/* ============================================================ */}
        {/* 3. FOOTER DA SIDEBAR (Notificações, Ajuda, Voltar & Perfil) */}
        {/* ============================================================ */}
        <div className="p-3 border-t border-slate-200/80 shrink-0 bg-[#FBFBFD] space-y-2">
          {/* Opção: Notificações com Popover */}
          <NotificationsPopover>
            <button
              type="button"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition-colors w-full cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Bell className="h-3.5 w-3.5 text-slate-500" />
                <span>Notificações</span>
              </div>
              {unreadCount > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-[#5856d6] text-white text-[10px] font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </NotificationsPopover>

          {/* Opção: Central de Ajuda */}
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition-colors w-full text-left cursor-pointer"
          >
            <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
            <span>Ajuda &amp; Suporte</span>
          </button>

          {/* Opção: Voltar ao App Qualify */}
          <button
            type="button"
            onClick={() => {
              if (onNavigate) onNavigate();
              navigate("/");
            }}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition-colors w-full text-left cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
            <span>Voltar ao App Qualify</span>
          </button>

          {/* Card de Perfil do Usuário com Logout */}
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white border border-slate-200/80 shadow-xs mt-1">
            <div className="flex items-center gap-2 min-w-0 flex-1 pl-1">
              <Avatar className="h-7 w-7 rounded-lg shrink-0 shadow-xs">
                <AvatarFallback className="rounded-lg bg-gradient-to-br from-[#6366f1] to-[#7c3aed] text-white text-[10px] font-bold uppercase">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1 leading-tight">
                <span className="text-[11px] font-bold text-slate-800 truncate">{userName}</span>
                <span className="text-[9px] text-slate-400 font-medium truncate">{userEmail}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              title="Encerrar Sessão"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Busca Global (Spotlight) */}
      <AdminGlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Modal de Ajuda */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 text-slate-800 rounded-2xl p-6 shadow-2xl z-[9999]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <HelpCircle className="h-4 w-4 text-[#5856d6]" /> Central de Ajuda do Super Admin
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Documentação e suporte operacional da plataforma Qualify.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs text-slate-600">
            <p>
              Consulte a documentação técnica para endpoints de integração, webhooks e parâmetros de IA.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <a
                href="/webhook-docs"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-[#EEF0FD] hover:text-[#5856d6] transition-colors text-slate-700 font-semibold"
              >
                <span>Documentação de Webhooks &amp; APIs</span>
                <ExternalLink className="h-3.5 w-3.5 text-[#5856d6]" />
              </a>
              <button
                type="button"
                onClick={() => {
                  setHelpOpen(false);
                  navigate("/admin/sistema/erros");
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-slate-700 font-semibold text-left"
              >
                <span>Central de Diagnóstico de Erros</span>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
