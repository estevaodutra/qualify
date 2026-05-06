import { useState } from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Megaphone,
  Phone,
  FileText,
  MessageSquare,
  Bell,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Code2,
  Radio,
  SendHorizontal,
  Users,
  Skull,
  Bot,
  PhoneCall,
  CalendarDays,
  Wallet,
  Receipt,
  SlidersHorizontal,
  UserCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useLanguage } from "@/i18n";
import { useCompany } from "@/contexts/CompanyContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Building2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function AppSidebar() {
  const { state } = useSidebar();
  const { t } = useLanguage();
  const location = useLocation();
  const isCollapsed = state === "collapsed";
  const { companies, activeCompany, setActiveCompany, isAdmin } = useCompany();

  const isCampaignsRoute = location.pathname.startsWith("/campaigns");
  const [campaignsOpen, setCampaignsOpen] = useState(isCampaignsRoute);

  const isSettingsRoute = location.pathname.startsWith("/settings") || 
                          location.pathname.startsWith("/carteira") || 
                          location.pathname.startsWith("/billing") || 
                          location.pathname.startsWith("/configuracoes/membros");
                          
  const [settingsOpen, setSettingsOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar_settings_open");
    return saved === null ? isSettingsRoute : saved === "true";
  });

  const handleSettingsOpenChange = (open: boolean) => {
    setSettingsOpen(open);
    localStorage.setItem("sidebar_settings_open", String(open));
  };

  const mainNavItems = [
    { title: t("nav.dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("nav.callPanel"), url: "/painel-ligacoes", icon: PhoneCall },
    { title: t("nav.leads") || "Leads", url: "/leads", icon: Users },
    { title: "Agendamentos", url: "/agendamentos/calendarios", icon: CalendarDays },
    { title: t("nav.phoneNumbers"), url: "/numbers", icon: Phone },
  ];

  const systemNavItems = [
    { title: "Connections", url: "/instances", icon: MessageSquare },
    { title: t("nav.alerts"), url: "/alerts", icon: Bell },
  ];

  const campaignSubItems: Record<string, Array<{ title: string; url: string; icon: any; comingSoon?: boolean }>> = {
    whatsapp: [
      { title: "Disparos", url: "/campaigns/whatsapp/despacho", icon: SendHorizontal },
      { title: "Grupos", url: "/campaigns/whatsapp/grupos", icon: Users },
      { title: "Pirata", url: "/campaigns/whatsapp/pirata", icon: Skull },
    ],
    telefonia: [
      { title: "URA", url: "/campaigns/telefonia/ura", icon: Bot, comingSoon: true },
      { title: "Ligação", url: "/campaigns/telefonia/ligacao", icon: PhoneCall },
    ],
  };

  const settingsSubItems = [
    { title: "Perfil", url: "/settings/profile", icon: UserCircle },
    { title: "Conta", url: "/settings/account", icon: Settings },
    { title: "Carteira", url: "/carteira", icon: Wallet },
    { title: t("nav.billing"), url: "/billing", icon: CreditCard },
    ...(isAdmin ? [{ title: "Membros", url: "/configuracoes/membros", icon: Users }] : []),
  ];

  const navLinkClasses = cn(
    "flex items-center gap-3.5 rounded-2xl px-4 py-3 text-white transition-all duration-300",
    "hover:bg-white/10 hover:text-white group",
    isCollapsed && "justify-center px-0"
  );

  const activeClasses = "bg-white/10 text-white font-bold sidebar-active-item shadow-sm";

  const subNavLinkClasses = cn(
    "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-all",
    isCollapsed && "justify-center px-0"
  );

  return <Sidebar
      collapsible="icon"
      className="border-r border-white/5 bg-[#0B0E14] backdrop-blur-3xl"
    >
      <SidebarHeader className={cn(
        "py-8 space-y-6",
        isCollapsed ? "px-2" : "px-6"
      )}>
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-4")}>
          <div className="flex items-center justify-center shrink-0">
             <img 
               src="/logo-fundo-transparente-branco.png" 
               alt="Qualify Logo" 
               className={cn(
                 "transition-all duration-500",
                  isCollapsed ? "h-9 w-9" : "h-11 w-auto"
               )} 
             />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tighter text-white uppercase leading-none">Qualify</span>
              <span className="text-[10px] font-black text-primary tracking-[0.2em] uppercase mt-1">Intelligence</span>
            </div>
          )}
        </div>
        
        {!isCollapsed && companies.length > 0 && (
          <div className="pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white hover:bg-white/10 transition-all duration-300">
                  <div className="h-6 w-6 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="truncate flex-1 text-left font-bold tracking-tight">
                    {activeCompany?.name || "Selecionar"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-white/20 rotate-90" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 rounded-2xl shadow-2xl border-white/10 bg-zinc-900/95 backdrop-blur-3xl p-2">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black px-4 py-3">Organizações</DropdownMenuLabel>
                {companies.map((company) => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={() => setActiveCompany(company.id)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-white/70 focus:bg-primary/20 focus:text-white cursor-pointer transition-colors"
                  >
                    <div className={cn("h-2 w-2 rounded-full", company.id === activeCompany?.id ? "bg-primary glow-primary" : "bg-white/10")} />
                    <span className="truncate text-sm font-bold">{company.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className={cn("py-4 overflow-y-auto scrollbar-hide", isCollapsed ? "px-1" : "px-4")}>
        <SidebarGroup className="pb-6">
          {!isCollapsed && (
            <div className="px-4 pb-3 text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Principal</div>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title} className="h-auto p-0">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={navLinkClasses}
                      activeClassName="sidebar-item-active"
                    >
                      <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110", location.pathname === item.url && "text-primary")} />
                      {!isCollapsed && <span className="text-[13px] font-bold tracking-tight">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Campaigns */}
              {isCollapsed ? (
                <SidebarMenuItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <SidebarMenuButton
                        tooltip={t("nav.campaigns")}
                        className={cn(
                          navLinkClasses,
                          isCampaignsRoute && activeClasses
                        )}
                      >
                        <Megaphone className="h-[18px] w-[18px] flex-shrink-0" />
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-52 p-1.5 rounded-xl shadow-2xl border-white/10 bg-[#0B0E14] backdrop-blur-xl">
                      <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                        WhatsApp
                      </div>
                      {campaignSubItems.whatsapp.map((item) => (
                        <NavLink
                          key={item.url}
                          to={item.url}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
                          activeClassName="bg-white/10 text-white font-semibold"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      ))}
                      <Separator className="my-1.5 bg-white/5" />
                      <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                        Telefonia
                      </div>
                      {campaignSubItems.telefonia.map((item) => (
                        <NavLink
                          key={item.url}
                          to={item.url}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all",
                            item.comingSoon && "opacity-40"
                          )}
                          activeClassName="bg-white/10 text-white font-semibold"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          {item.comingSoon && <span className="ml-auto text-[8px] opacity-50">BREVE</span>}
                        </NavLink>
                      ))}
                    </PopoverContent>
                  </Popover>
                </SidebarMenuItem>
              ) : (
                <Collapsible
                  open={campaignsOpen}
                  onOpenChange={setCampaignsOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={t("nav.campaigns")}
                        className={cn(navLinkClasses, isCampaignsRoute && !campaignsOpen && activeClasses)}
                      >
                        <Megaphone className="h-[18px] w-[18px] flex-shrink-0" />
                        <span className="flex-1 text-sm">{t("nav.campaigns")}</span>
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-300 text-white/30",
                            campaignsOpen && "rotate-90"
                          )}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="animate-fade-in pl-3 pr-1 pt-1">
                      <div className="space-y-1 border-l border-white/10 ml-5 pl-2 my-1">
                        {campaignSubItems.whatsapp.map((item) => (
                          <NavLink
                            key={item.url}
                            to={item.url}
                            className={subNavLinkClasses}
                            activeClassName="text-white font-bold"
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            <span>{item.title}</span>
                          </NavLink>
                        ))}
                        <div className="flex items-center gap-2 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white/20 mt-2">Telefonia</div>
                        {campaignSubItems.telefonia.map((item) => (
                          <NavLink
                            key={item.url}
                            to={item.url}
                            className={cn(
                              subNavLinkClasses,
                              item.comingSoon && "opacity-60"
                            )}
                            activeClassName="text-white font-bold"
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            <span>{item.title}</span>
                          </NavLink>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="mx-5 my-4 bg-white/5" />

        <SidebarGroup>
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">Sistema</div>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title} className="h-auto p-0">
                    <NavLink
                      to={item.url}
                      className={navLinkClasses}
                      activeClassName={activeClasses}
                    >
                      <item.icon className="h-[17px] w-[17px] flex-shrink-0" />
                      {!isCollapsed && <span className="text-[13px] font-bold tracking-tight">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="mx-5 my-4 bg-white/5" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {isCollapsed ? (
                <SidebarMenuItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <SidebarMenuButton
                        tooltip="Settings"
                        className={cn(navLinkClasses, isSettingsRoute && activeClasses)}
                      >
                        <Settings className="h-[18px] w-[18px] flex-shrink-0" />
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-52 p-1.5 rounded-xl shadow-2xl border-white/10 bg-[#0B0E14] backdrop-blur-xl">
                      {settingsSubItems.map((item) => (
                        <NavLink
                          key={item.url}
                          to={item.url}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
                          activeClassName="bg-white/10 text-white font-semibold"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      ))}
                    </PopoverContent>
                  </Popover>
                </SidebarMenuItem>
              ) : (
                <Collapsible
                  open={settingsOpen}
                  onOpenChange={handleSettingsOpenChange}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip="Settings"
                        className={cn(navLinkClasses, isSettingsRoute && !settingsOpen && activeClasses)}
                      >
                        <Settings className="h-[18px] w-[18px] flex-shrink-0" />
                        <span className="flex-1 text-sm font-bold">Settings</span>
                        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-300 text-white/30", settingsOpen && "rotate-90")} />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="animate-fade-in pl-3 pr-1 pt-1">
                      <div className="space-y-1 border-l border-white/10 ml-5 pl-2 my-1">
                        {settingsSubItems.map((item) => (
                          <NavLink
                            key={item.url}
                            to={item.url}
                            className={subNavLinkClasses}
                            activeClassName="text-white font-bold"
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            <span>{item.title}</span>
                          </NavLink>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-white/5">
        <SidebarTrigger className="w-full h-10 rounded-xl justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all duration-300">
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-500", isCollapsed && "rotate-180")} />
          {!isCollapsed && <span className="ml-2 text-xs font-semibold tracking-widest uppercase">{t("nav.collapse")}</span>}
        </SidebarTrigger>
      </SidebarFooter>
    </Sidebar>;
}
