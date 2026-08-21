import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Kanban,
  PhoneCall,
  Users,
  MessageSquare,
  GitBranch,
  Grid,
  Layers,
  Search,
  CalendarDays,
  Bell,
  HelpCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCompany } from "@/contexts/CompanyContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";
  const { companies, activeCompany, setActiveCompany } = useCompany();

  // Dialog state for Help
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  // Apps group active state and collapse state
  const isAppsRoute =
    location.pathname.startsWith("/quiz") ||
    location.pathname.startsWith("/prospeccao") ||
    location.pathname.startsWith("/agendamentos");

  const [appsOpen, setAppsOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar_apps_open");
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    if (isAppsRoute) setAppsOpen(true);
  }, [isAppsRoute]);

  const handleAppsOpenChange = (open: boolean) => {
    setAppsOpen(open);
    localStorage.setItem("sidebar_apps_open", String(open));
  };

  // Nav link styles
  const navLinkClasses = cn(
    "flex items-center gap-3.5 rounded-2xl px-4 py-3 text-white/80 transition-all duration-300",
    "hover:bg-white/10 hover:text-white group",
    isCollapsed && "justify-center px-0"
  );

  const activeClasses = "bg-white/10 text-white font-bold sidebar-active-item shadow-sm";

  const subNavLinkClasses = "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-all";

  // Primary Navigation items (TOP)
  const topNavItems = [
    { id: "dashboard", title: "Dashboard", url: "/", icon: LayoutDashboard },
    { id: "pipelines", title: "Pipelines", url: "/pipelines", icon: Kanban },
    { id: "call-panel", title: "Call Panel", url: "/painel-ligacoes", icon: PhoneCall },
    { id: "leads", title: "Leads", url: "/leads", icon: Users },
    { id: "chat", title: "Chat", url: "/chat", icon: MessageSquare },
    { id: "workflows", title: "Workflows", url: "/workflows", icon: GitBranch },
  ];

  // Apps sub items
  const appSubItems = [
    { id: "quiz", title: "Quiz", url: "/quiz", icon: Layers },
    { id: "prospeccao", title: "Prospecção", url: "/prospeccao", icon: Search },
    { id: "agendamentos", title: "Agendamentos", url: "/agendamentos/calendarios", icon: CalendarDays },
  ];

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/5 bg-[#0B0E14] backdrop-blur-3xl h-screen flex flex-col select-none"
    >
      {/* 1. HEAD (SidebarHeader): Logo + Organization Switcher */}
      <SidebarHeader className={cn("py-6 space-y-4 shrink-0", isCollapsed ? "px-2" : "px-5")}>
        {/* Logo */}
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "px-1")}>
          <div className="flex items-center justify-center shrink-0">
            <img
              src="/logo-fundo-transparente-branco.png"
              alt="Qualify Logo"
              className={cn("transition-all duration-300", isCollapsed ? "h-8 w-8" : "h-9 w-auto")}
            />
          </div>
        </div>

        {/* Organization Switcher */}
        {companies.length > 0 && (
          <div>
            {isCollapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors mx-auto">
                            <Building2 className="h-4 w-4 text-primary" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 rounded-2xl shadow-2xl border-white/10 bg-zinc-900/95 backdrop-blur-3xl p-2 z-[9999]">
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black px-3 py-2">
                            Organização
                          </DropdownMenuLabel>
                          {companies.map((company) => (
                            <DropdownMenuItem
                              key={company.id}
                              onClick={() => setActiveCompany(company.id)}
                              className="flex items-center justify-between rounded-xl px-3 py-2 text-white/70 focus:bg-primary/20 focus:text-white cursor-pointer"
                            >
                              <span className="truncate text-xs font-bold">{company.name}</span>
                              {company.id === activeCompany?.id && <Check className="h-3.5 w-3.5 text-primary" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs font-semibold">
                    {activeCompany?.name || "Organizações"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 w-full rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white hover:bg-white/10 transition-all duration-300 cursor-pointer">
                    <div className="h-6 w-6 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="truncate flex-1 text-left font-bold tracking-tight text-white/90">
                      {activeCompany?.name || "Selecionar Organização"}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-white/30 rotate-90 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 rounded-2xl shadow-2xl border-white/10 bg-zinc-900/95 backdrop-blur-3xl p-2 z-[9999]">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black px-3 py-2">
                    Organização Atual
                  </DropdownMenuLabel>
                  {companies.map((company) => (
                    <DropdownMenuItem
                      key={company.id}
                      onClick={() => setActiveCompany(company.id)}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-white/70 focus:bg-primary/20 focus:text-white cursor-pointer"
                    >
                      <span className="truncate text-xs font-bold">{company.name}</span>
                      {company.id === activeCompany?.id && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </SidebarHeader>

      {/* 2. BODY (SidebarContent): TOP Operational Navigation + BOTTOM Secondary Navigation */}
      <SidebarContent className="flex-1 flex flex-col justify-between py-2 overflow-y-auto scrollbar-hide px-3 min-h-0">
        {/* TOP OPERATIONAL NAVIGATION */}
        <div className="space-y-1">
          <SidebarMenu className="gap-1.5">
            {topNavItems.map((item) => {
              const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild tooltip={item.title} className="h-auto p-0">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={cn(navLinkClasses, isActive && activeClasses)}
                    >
                      <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110", isActive && "text-primary")} />
                      {!isCollapsed && <span className="text-[13px] font-bold tracking-tight">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}

            {/* Apps Group */}
            <SidebarMenuItem>
              {isCollapsed ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Apps"
                      className={cn(navLinkClasses, isAppsRoute && activeClasses)}
                    >
                      <Grid className={cn("h-5 w-5 flex-shrink-0", isAppsRoute && "text-primary")} />
                    </SidebarMenuButton>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-52 p-2 rounded-2xl shadow-2xl border-white/10 bg-[#0B0E14] backdrop-blur-xl z-[9999]">
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/40">Apps</div>
                    {appSubItems.map((sub) => (
                      <NavLink
                        key={sub.id}
                        to={sub.url}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all",
                          location.pathname.startsWith(sub.url) && "bg-white/10 text-white font-bold"
                        )}
                      >
                        <sub.icon className="h-4 w-4" />
                        <span>{sub.title}</span>
                      </NavLink>
                    ))}
                  </PopoverContent>
                </Popover>
              ) : (
                <Collapsible open={appsOpen} onOpenChange={handleAppsOpenChange} className="group/collapsible">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Apps"
                      className={cn(navLinkClasses, isAppsRoute && !appsOpen && activeClasses)}
                    >
                      <Grid className={cn("h-5 w-5 flex-shrink-0", isAppsRoute && "text-primary")} />
                      <span className="flex-1 text-[13px] font-bold tracking-tight">Apps</span>
                      <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-300 text-white/40", appsOpen && "rotate-90")} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 pr-1 pt-1 space-y-1">
                    <div className="border-l border-white/10 pl-2 space-y-1 my-1">
                      {appSubItems.map((sub) => (
                        <NavLink
                          key={sub.id}
                          to={sub.url}
                          className={cn(subNavLinkClasses, location.pathname.startsWith(sub.url) && "text-white font-bold bg-white/10")}
                        >
                          <sub.icon className="h-3.5 w-3.5" />
                          <span>{sub.title}</span>
                        </NavLink>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </div>

        {/* BOTTOM SECONDARY NAVIGATION (aligned to bottom via margin-top: auto) */}
        <div className="mt-auto pt-6 space-y-1">
          <SidebarMenu className="gap-1.5">
            {/* Notificações (Alerts) */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Notificações" className="h-auto p-0">
                <NavLink
                  to="/alerts"
                  className={cn(navLinkClasses, location.pathname.startsWith("/alerts") && activeClasses)}
                >
                  <Bell className={cn("h-5 w-5 flex-shrink-0", location.pathname.startsWith("/alerts") && "text-primary")} />
                  {!isCollapsed && <span className="text-[13px] font-bold tracking-tight">Notificações</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Ajuda */}
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Ajuda"
                onClick={() => setHelpDialogOpen(true)}
                className={navLinkClasses}
              >
                <HelpCircle className="h-5 w-5 flex-shrink-0 text-white/80" />
                {!isCollapsed && <span className="text-[13px] font-bold tracking-tight">Ajuda</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Configurações */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Configurações" className="h-auto p-0">
                <NavLink
                  to="/settings"
                  className={cn(
                    navLinkClasses,
                    (location.pathname.startsWith("/settings") ||
                      location.pathname.startsWith("/carteira") ||
                      location.pathname.startsWith("/billing") ||
                      location.pathname.startsWith("/configuracoes")) && activeClasses
                  )}
                >
                  <Settings className={cn("h-5 w-5 flex-shrink-0", location.pathname.startsWith("/settings") && "text-primary")} />
                  {!isCollapsed && <span className="text-[13px] font-bold tracking-tight">Configurações</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>

      {/* 3. FOOTER (SidebarFooter): Expand / Collapse Toggle Button */}
      <SidebarFooter className="p-3 border-t border-white/5 shrink-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="w-full h-10 rounded-xl flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all duration-300 cursor-pointer"
          title={isCollapsed ? "Expandir Sidebar" : "Recolher Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!isCollapsed && (
            <span className="ml-2 text-[11px] font-bold tracking-widest uppercase text-white/60">
              Recolher Sidebar
            </span>
          )}
        </button>
      </SidebarFooter>

      {/* Help Dialog */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#0B0E14] border border-white/10 text-white rounded-2xl p-6 shadow-2xl z-[9999]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" /> Central de Ajuda & Suporte
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Precisa de ajuda com a plataforma Qualify Intelligence?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3 text-xs text-white/80">
            <p>
              Consulte a nossa documentação oficial para guias de uso, APIs e tutoriais de configuração.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <a
                href="/webhook-docs"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white font-semibold"
              >
                <span>Documentação de Webhooks & API</span>
                <ExternalLink className="h-4 w-4 text-primary" />
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
