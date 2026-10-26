import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  Bell,
  HelpCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  Box,
  Check,
  ExternalLink,
  LogOut,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCompany } from "@/contexts/CompanyContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { NotificationsPopover } from "../notifications/NotificationsPopover";
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

import { TOP_NAV_ITEMS, APP_SUB_ITEMS } from "@/config/navigationConfig";

export function AppSidebar() {
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isCollapsed = state === "collapsed" && !isMobile;
  const { companies, activeCompany, setActiveCompany } = useCompany();
  const { unreadCount } = useAlerts();
  const { user, signOut } = useAuth();

  // Helper to handle link click on mobile
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();

    if (error) {
      toast({
        title: "Erro ao sair",
        description: "Não foi possível encerrar a sessão. Tente novamente.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Até logo!",
        description: "Você foi desconectado com sucesso.",
      });
    }

    navigate("/auth");
  };

  const userEmail = user?.email || "Usuário";
  const userName = user?.user_metadata?.full_name || userEmail.split("@")[0];
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = userName.slice(0, 2).toUpperCase();

  // Dialog state for Help
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  // Apps group active state and collapse state
  const isAppsRoute =
    location.pathname.startsWith("/sprint") ||
    location.pathname.startsWith("/sprint-os") ||
    location.pathname.startsWith("/cronogramas") ||
    location.pathname.startsWith("/criafy") ||
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

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-200/80 bg-[#FBFBFD] h-screen flex flex-col select-none text-slate-800"
    >
      {/* 1. HEADER: Centered Logo + Top-Right Collapse Toggle Button */}
      <SidebarHeader className="p-0 shrink-0">
        {!isCollapsed ? (
          <div className="relative flex items-center justify-center w-full px-4 pt-5 pb-3">
            <div className="flex items-center justify-center">
              <img
                src="/logo_sidebar_open.png"
                alt="Qualify"
                className="h-7 w-auto object-contain"
              />
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              className="absolute right-4 top-5 h-7 w-7 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shadow-xs cursor-pointer"
              title="Recolher Sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full pt-5 pb-3 px-2 gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              className="h-7 w-7 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shadow-xs cursor-pointer mx-auto"
              title="Expandir Sidebar"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Workspace Card Switcher */}
        <div className={cn("px-3 mb-2", isCollapsed && "px-1.5")}>
          {isCollapsed ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="h-10 w-10 rounded-xl border border-slate-200/90 bg-gradient-to-br from-[#EEF0FD] to-[#E3E7FE] flex items-center justify-center text-[#5856d6] hover:brightness-95 transition-all shadow-xs cursor-pointer"
                        >
                          <Grid3X3 className="h-4.5 w-4.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56 rounded-2xl shadow-xl border border-slate-200 bg-white p-1.5 z-[9999]">
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-3 py-1.5">
                          Workspaces
                        </DropdownMenuLabel>
                        {companies.map((company) => (
                          <DropdownMenuItem
                            key={company.id}
                            onClick={() => setActiveCompany(company.id)}
                            className="flex items-center justify-between rounded-xl px-3 py-2 text-slate-700 hover:bg-[#EEF0FD] hover:text-[#5856d6] focus:bg-[#EEF0FD] focus:text-[#5856d6] cursor-pointer"
                          >
                            <span className="truncate text-xs font-semibold">{company.name}</span>
                            {company.id === activeCompany?.id && <Check className="h-4 w-4 text-[#5856d6]" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-semibold">
                  {activeCompany?.name || "Qualify"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 w-full rounded-2xl border border-slate-200/90 bg-white p-2.5 text-left hover:bg-slate-50/80 transition-all shadow-xs cursor-pointer group"
                >
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#EEF0FD] to-[#E3E7FE] flex items-center justify-center shrink-0 border border-indigo-100/60 shadow-xs">
                    <Grid3X3 className="h-4.5 w-4.5 text-[#5856d6]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-slate-800 truncate leading-tight">
                      {activeCompany?.name || "Qualify"}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium truncate leading-tight mt-0.5">
                      Seu workspace
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 mr-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-2xl shadow-xl border border-slate-200 bg-white p-1.5 z-[9999]">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-3 py-1.5">
                  Workspaces
                </DropdownMenuLabel>
                {companies.map((company) => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={() => setActiveCompany(company.id)}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-slate-700 hover:bg-[#EEF0FD] hover:text-[#5856d6] focus:bg-[#EEF0FD] focus:text-[#5856d6] cursor-pointer"
                  >
                    <span className="truncate text-xs font-semibold">{company.name}</span>
                    {company.id === activeCompany?.id && <Check className="h-4 w-4 text-[#5856d6]" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </SidebarHeader>

      {/* 2. BODY CONTENT */}
      <SidebarContent className="flex-1 flex flex-col justify-between py-2 overflow-y-auto scrollbar-hide px-3 min-h-0">
        <div className="space-y-4">
          {/* SECTION: PRINCIPAL */}
          <div>
            {!isCollapsed && (
              <div className="text-[10.5px] font-bold text-slate-400 tracking-wider uppercase px-3 py-1.5">
                PRINCIPAL
              </div>
            )}
            <SidebarMenu className="gap-1">
              {TOP_NAV_ITEMS.map((item) => {
                const isActive = item.exact ? location.pathname === item.url : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild tooltip={item.title} className="h-auto p-0 hover:bg-transparent">
                      <NavLink
                        to={item.url}
                        end={item.exact}
                        onClick={handleNavClick}
                        className={cn(
                          "relative flex items-center gap-3.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150",
                          isActive
                            ? "bg-[#EEF0FD] text-[#5856d6] font-semibold"
                            : "text-[#334155] hover:bg-slate-100/70 hover:text-slate-900",
                          isCollapsed && "justify-center px-0 h-10 w-10 mx-auto"
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#5856d6] rounded-r-full" />
                        )}
                        <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-[#5856d6]" : "text-[#334155]")} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </div>

          {/* SECTION: APPS */}
          <div>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                {isCollapsed ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <SidebarMenuButton
                        tooltip="Apps"
                        className={cn(
                          "relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl text-[13px] font-medium transition-all duration-150",
                          isAppsRoute
                            ? "bg-[#EEF0FD] text-[#5856d6]"
                            : "text-[#334155] hover:bg-slate-100/70 hover:text-slate-900"
                        )}
                      >
                        {isAppsRoute && (
                          <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#5856d6] rounded-r-full" />
                        )}
                        <Box className={cn("h-[18px] w-[18px] shrink-0", isAppsRoute ? "text-[#5856d6]" : "text-[#334155]")} />
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-52 p-2 rounded-2xl shadow-xl border border-slate-200 bg-white z-[9999]">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Apps</div>
                      {APP_SUB_ITEMS.map((sub) => {
                        const isActive = location.pathname.startsWith(sub.url);
                        return (
                          <NavLink
                            key={sub.id}
                            to={sub.url}
                            onClick={handleNavClick}
                            className={cn(
                              "relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all",
                              isActive && "bg-[#EEF0FD] text-[#5856d6] font-semibold"
                            )}
                          >
                            {isActive && (
                              <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#5856d6] rounded-r-full" />
                            )}
                            <sub.icon className="h-4 w-4" />
                            <span>{sub.title}</span>
                          </NavLink>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Collapsible open={appsOpen} onOpenChange={handleAppsOpenChange} className="group/collapsible">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "relative flex items-center gap-3.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all w-full text-left cursor-pointer",
                          isAppsRoute && !appsOpen
                            ? "bg-[#EEF0FD] text-[#5856d6] font-semibold"
                            : "text-[#334155] hover:bg-slate-100/70 hover:text-slate-900"
                        )}
                      >
                        {isAppsRoute && !appsOpen && (
                          <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#5856d6] rounded-r-full" />
                        )}
                        <Box className={cn("h-[18px] w-[18px] shrink-0", isAppsRoute && !appsOpen ? "text-[#5856d6]" : "text-[#334155]")} />
                        <span className="flex-1">Apps</span>
                        <ChevronRight className={cn("h-3.5 w-3.5 text-slate-400 transition-transform duration-200", appsOpen && "rotate-90")} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-0.5">
                      <div className="relative ml-5 pl-2.5 border-l border-slate-200/80 space-y-0.5 mt-0.5">
                        {APP_SUB_ITEMS.map((sub) => {
                          const isActive = location.pathname.startsWith(sub.url);
                          return (
                            <NavLink
                              key={sub.id}
                              to={sub.url}
                              onClick={handleNavClick}
                              className={cn(
                                "relative flex items-center gap-3 px-3 py-1.5 rounded-xl text-[12.5px] font-medium transition-all duration-150",
                                isActive
                                  ? "bg-[#EEF0FD] text-[#5856d6] font-semibold"
                                  : "text-[#334155] hover:bg-slate-100/70 hover:text-slate-900"
                              )}
                            >
                              {isActive && (
                                <span className="absolute -left-2.5 top-1.5 bottom-1.5 w-[3px] bg-[#5856d6] rounded-r-full" />
                              )}
                              <sub.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#5856d6]" : "text-[#334155]")} />
                              <span>{sub.title}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </div>

        {/* BOTTOM SECTION (UTILITÁRIOS) */}
        <div className="mt-auto pt-4 space-y-1">
          <SidebarMenu className="gap-1">
            {/* Notificações */}
            <SidebarMenuItem id="sidebar-notifications-trigger" className="relative">
              <NotificationsPopover>
                <SidebarMenuButton asChild tooltip="Notificações" className="h-auto p-0 cursor-pointer hover:bg-transparent">
                  <button
                    type="button"
                    className={cn(
                      "relative flex items-center gap-3.5 px-3 py-2 rounded-xl text-[13px] font-medium text-[#334155] hover:bg-slate-100/70 hover:text-slate-900 transition-all w-full text-left",
                      isCollapsed && "justify-center px-0 h-10 w-10 mx-auto"
                    )}
                  >
                    <div className="relative flex items-center justify-center">
                      <Bell className="h-[18px] w-[18px] shrink-0 text-[#334155]" />
                      {isCollapsed && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-[#5856d6] text-[9px] font-bold text-white shadow-xs">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span>Notificações</span>
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#5856d6] text-white text-[11px] font-bold shadow-xs">
                          {unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : 3}
                        </span>
                      </div>
                    )}
                  </button>
                </SidebarMenuButton>
              </NotificationsPopover>
            </SidebarMenuItem>

            {/* Ajuda */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Ajuda" className="h-auto p-0 cursor-pointer hover:bg-transparent">
                <button
                  type="button"
                  onClick={() => setHelpDialogOpen(true)}
                  className={cn(
                    "flex items-center gap-3.5 px-3 py-2 rounded-xl text-[13px] font-medium text-[#334155] hover:bg-slate-100/70 hover:text-slate-900 transition-all w-full text-left",
                    isCollapsed && "justify-center px-0 h-10 w-10 mx-auto"
                  )}
                >
                  <HelpCircle className="h-[18px] w-[18px] shrink-0 text-[#334155]" />
                  {!isCollapsed && <span>Ajuda</span>}
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Configurações */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Configurações" className="h-auto p-0 hover:bg-transparent">
                <NavLink
                  to="/settings"
                  onClick={handleNavClick}
                  className={cn(
                    "relative flex items-center gap-3.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150",
                    (location.pathname.startsWith("/settings") ||
                      location.pathname.startsWith("/carteira") ||
                      location.pathname.startsWith("/billing") ||
                      location.pathname.startsWith("/configuracoes"))
                      ? "bg-[#EEF0FD] text-[#5856d6] font-semibold"
                      : "text-[#334155] hover:bg-slate-100/70 hover:text-slate-900",
                    isCollapsed && "justify-center px-0 h-10 w-10 mx-auto"
                  )}
                >
                  {(location.pathname.startsWith("/settings") ||
                    location.pathname.startsWith("/carteira") ||
                    location.pathname.startsWith("/billing") ||
                    location.pathname.startsWith("/configuracoes")) && (
                    <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#5856d6] rounded-r-full" />
                  )}
                  <Settings className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    (location.pathname.startsWith("/settings") ||
                      location.pathname.startsWith("/carteira") ||
                      location.pathname.startsWith("/billing") ||
                      location.pathname.startsWith("/configuracoes"))
                      ? "text-[#5856d6]"
                      : "text-[#334155]"
                  )} />
                  {!isCollapsed && <span>Configurações</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>

      {/* 3. FOOTER: User Profile & Sign Out Option */}
      <SidebarFooter className="p-3 border-t border-slate-200/80 shrink-0 bg-[#FBFBFD]">
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-1">
              <Avatar className="h-8 w-8 rounded-lg shrink-0 shadow-xs">
                <AvatarImage src={avatarUrl} alt={userName} className="object-cover" />
                <AvatarFallback className="rounded-lg bg-gradient-to-br from-[#6366f1] to-[#7c3aed] text-white text-[11px] font-bold uppercase">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1 leading-tight">
                <span className="text-xs font-bold text-slate-800 truncate">{userName}</span>
                <span className="text-[10px] text-slate-400 font-medium truncate">{userEmail}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="h-10 w-10 mx-auto rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-semibold">
                Sign Out ({userName})
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </SidebarFooter>

      {/* Help Dialog (Clean Light Styling) */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 text-slate-800 rounded-2xl p-6 shadow-2xl z-[9999]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <HelpCircle className="h-5 w-5 text-[#5856d6]" /> Central de Ajuda & Suporte
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Precisa de ajuda com a plataforma Qualify Intelligence?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3 text-xs text-slate-600">
            <p>
              Consulte a nossa documentação oficial para guias de uso, APIs e tutoriais de configuração.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <a
                href="/webhook-docs"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-[#EEF0FD] hover:text-[#5856d6] transition-colors text-slate-700 font-semibold"
              >
                <span>Documentação de Webhooks & API</span>
                <ExternalLink className="h-4 w-4 text-[#5856d6]" />
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
