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
  Zap,
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Building2, Check } from "lucide-react";
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

  const isWalletRoute = location.pathname.startsWith("/carteira");
  const [walletOpen, setWalletOpen] = useState(isWalletRoute);

  const walletSubItems = [
    { title: "Saldo e Recarga", url: "/carteira", icon: Wallet, end: true },
    { title: "Extrato", url: "/carteira/extrato", icon: Receipt, end: false },
    { title: "Configurações", url: "/carteira/configuracoes", icon: SlidersHorizontal, end: false },
  ];

  const mainNavItems = [
    { title: t("nav.dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("nav.callPanel"), url: "/painel-ligacoes", icon: PhoneCall },
    { title: t("nav.leads") || "Leads", url: "/leads", icon: Users },
    { title: "Agendamentos", url: "/agendamentos/calendarios", icon: CalendarDays },
    { title: t("nav.phoneNumbers"), url: "/numbers", icon: Phone },
    { title: t("nav.logs") || "Logs", url: "/logs", icon: FileText },
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

  const systemNavItems = [
    { title: t("nav.instances"), url: "/instances", icon: MessageSquare },
    { title: t("nav.webhookEvents") || "Eventos", url: "/events", icon: Radio },
    { title: t("nav.alerts"), url: "/alerts", icon: Bell },
    { title: t("nav.billing"), url: "/billing", icon: CreditCard },
    ...(isAdmin ? [{ title: "Membros", url: "/configuracoes/membros", icon: Users }] : []),
    { title: t("nav.settings"), url: "/settings", icon: Settings },
    { title: t("nav.apiDocs"), url: "/api-docs", icon: Code2 },
  ];

  const navLinkClasses = cn(
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sidebar-foreground/80 transition-all duration-200",
    "hover:bg-sidebar-accent hover:text-sidebar-foreground",
    isCollapsed && "justify-center px-0"
  );

  const activeClasses = "bg-sidebar-accent text-sidebar-primary font-semibold sidebar-active-item shadow-sm";

  return <Sidebar
      collapsible="icon"
      className="border-r border-white/5 bg-zinc-950/80 backdrop-blur-2xl"
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
                 isCollapsed ? "h-8 w-8" : "h-10 w-auto"
               )} 
             />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tighter text-white uppercase leading-none">Qualify</span>
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase mt-1">Intelligence</span>
            </div>
          )}
        </div>
        
        {!isCollapsed && companies.length > 0 && (
          <div className="pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-xs text-white/70 hover:bg-white/10 transition-all duration-300">
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
                <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-black px-4 py-3">Organizações</DropdownMenuLabel>
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

      <SidebarContent className={cn("py-4", isCollapsed ? "px-1" : "px-4")}>
        <SidebarGroup className="pb-6">
          {!isCollapsed && (
            <div className="px-4 pb-3 text-[10px] font-black uppercase tracking-[0.25em] text-white/20">Principal</div>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title} className="h-auto p-0">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={cn(
                        "flex items-center gap-3.5 rounded-2xl px-4 py-3 text-white/50 transition-all duration-300 hover:bg-white/5 hover:text-white",
                        isCollapsed && "justify-center px-0"
                      )}
                      activeClassName="sidebar-item-active"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span className="text-sm font-bold tracking-tight">{item.title}</span>}
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
                    <PopoverContent side="right" align="start" className="w-52 p-1.5 rounded-xl shadow-2xl border-sidebar-border bg-sidebar-accent/95 backdrop-blur-xl">
                      <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30">
                        WhatsApp
                      </div>
                      {campaignSubItems.whatsapp.map((item) => (
                        <NavLink
                          key={item.url}
                          to={item.url}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-primary/10 hover:text-sidebar-foreground transition-all"
                          activeClassName="bg-sidebar-primary/20 text-sidebar-foreground font-semibold"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      ))}
                      <Separator className="my-1.5 bg-sidebar-border/50" />
                      <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30">
                        Telefonia
                      </div>
                      {campaignSubItems.telefonia.map((item) => (
                        <NavLink
                          key={item.url}
                          to={item.url}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-primary/10 hover:text-sidebar-foreground transition-all",
                            item.comingSoon && "opacity-40"
                          )}
                          activeClassName="bg-sidebar-primary/20 text-sidebar-foreground font-semibold"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          {item.comingSoon && <span className="ml-auto text-[8px] badge-coming-soon">BREVE</span>}
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
                            "h-3.5 w-3.5 transition-transform duration-300 text-sidebar-foreground/30",
                            campaignsOpen && "rotate-90"
                          )}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="animate-fade-in pl-3 pr-1 pt-1">
                      <div className="space-y-1 border-l-2 border-sidebar-border/40 ml-5 pl-2 my-1">
                        <div className="flex items-center gap-2 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-sidebar-foreground/25">WhatsApp</div>
                        {campaignSubItems.whatsapp.map((item) => (
                          <NavLink
                            key={item.url}
                            to={item.url}
                            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
                            activeClassName="text-sidebar-primary font-bold"
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            <span>{item.title}</span>
                          </NavLink>
                        ))}
                        <div className="flex items-center gap-2 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-sidebar-foreground/25 mt-2">Telefonia</div>
                        {campaignSubItems.telefonia.map((item) => (
                          <NavLink
                            key={item.url}
                            to={item.url}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all",
                              item.comingSoon && "opacity-40"
                            )}
                            activeClassName="text-sidebar-primary font-bold"
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

        <SidebarGroup className="pb-4">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/30">Finanças</div>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {isCollapsed ? (
                <SidebarMenuItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <SidebarMenuButton
                        tooltip="Carteira"
                        className={cn(navLinkClasses, isWalletRoute && activeClasses)}
                      >
                        <Wallet className="h-[18px] w-[18px] flex-shrink-0" />
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-52 p-1.5 rounded-xl shadow-2xl border-sidebar-border bg-sidebar-accent/95 backdrop-blur-xl">
                      {walletSubItems.map((item) => (
                        <NavLink
                          key={item.url}
                          to={item.url}
                          end={item.end}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-primary/10 hover:text-sidebar-foreground transition-all"
                          activeClassName="bg-sidebar-primary/20 text-sidebar-foreground font-semibold"
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
                  open={walletOpen}
                  onOpenChange={setWalletOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip="Carteira"
                        className={cn(navLinkClasses, isWalletRoute && !walletOpen && activeClasses)}
                      >
                        <Wallet className="h-[18px] w-[18px] flex-shrink-0" />
                        <span className="flex-1 text-sm">Carteira</span>
                        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-300 text-sidebar-foreground/30", walletOpen && "rotate-90")} />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="animate-fade-in pl-3 pr-1 pt-1">
                      <div className="space-y-1 border-l-2 border-sidebar-border/40 ml-5 pl-2 my-1">
                        {walletSubItems.map((item) => (
                          <NavLink
                            key={item.url}
                            to={item.url}
                            end={item.end}
                            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
                            activeClassName="text-sidebar-primary font-bold"
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

        <Separator className="mx-5 my-4 bg-sidebar-border/30" />

        <SidebarGroup>
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/30">Sistema</div>
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
                      {!isCollapsed && <span className="text-[13px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border/50">
        <SidebarTrigger className="w-full h-10 rounded-xl justify-center text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-300">
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-500", isCollapsed && "rotate-180")} />
          {!isCollapsed && <span className="ml-2 text-xs font-semibold tracking-widest uppercase">{t("nav.collapse")}</span>}
        </SidebarTrigger>
      </SidebarFooter>
    </Sidebar>;
}
