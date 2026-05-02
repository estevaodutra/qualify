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

  const campaignSubItems: Record<string, Array<{ title: string; url: string; icon: typeof SendHorizontal; comingSoon?: boolean }>> = {
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
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors",
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    isCollapsed && "justify-center px-0"
  );

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar"
    >
      <SidebarHeader className={cn(
        "border-b border-sidebar-border py-3 space-y-2",
        isCollapsed ? "px-2" : "px-4"
      )}>
        <div className={cn("flex items-center gap-2", isCollapsed && "justify-center")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-semibold text-sidebar-foreground">Dispatch</span>
              <span className="text-lg font-semibold text-primary">One</span>
            </div>
          )}
        </div>
        {!isCollapsed && companies.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 w-full rounded-md border border-sidebar-border bg-sidebar px-2.5 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate flex-1 text-left font-medium">
                  {activeCompany?.name || "Selecionar"}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground rotate-90" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {companies.map((company) => (
                <DropdownMenuItem
                  key={company.id}
                  onClick={() => setActiveCompany(company.id)}
                  className="flex items-center gap-2"
                >
                  {company.id === activeCompany?.id ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <div className="h-3.5 w-3.5" />
                  )}
                  <span className="truncate">{company.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>

      <SidebarContent className={cn("py-4", isCollapsed ? "px-1" : "px-2")}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={navLinkClasses}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Campaigns - collapsed: popover, expanded: collapsible */}
              {isCollapsed ? (
                <SidebarMenuItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <SidebarMenuButton
                        tooltip={t("nav.campaigns")}
                        className={cn(
                          "flex items-center rounded-lg py-2 text-sidebar-foreground transition-colors w-full justify-center px-0",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isCampaignsRoute && "bg-sidebar-accent text-sidebar-primary font-medium"
                        )}
                      >
                        <Megaphone className="h-4 w-4 flex-shrink-0" />
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-48 p-1">
                      <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        WhatsApp
                      </div>
                      {campaignSubItems.whatsapp.map((item) => (
                        <NavLink
                          key={item.url}
                          to={item.url}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-popover-foreground transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            item.comingSoon && "opacity-50"
                          )}
                          activeClassName="bg-accent text-accent-foreground font-medium"
                        >
                          <item.icon className="h-3.5 w-3.5" />
                          <span>{item.title}</span>
                          {item.comingSoon && (
                            <span className="ml-auto text-[10px] text-muted-foreground">Em breve</span>
                          )}
                        </NavLink>
                      ))}
                      <Separator className="my-1" />
                      <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        Telefonia
                      </div>
                      {campaignSubItems.telefonia.map((item) => (
                        <NavLink
                          key={item.url}
                          to={item.url}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-popover-foreground transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            item.comingSoon && "opacity-50"
                          )}
                          activeClassName="bg-accent text-accent-foreground font-medium"
                        >
                          <item.icon className="h-3.5 w-3.5" />
                          <span>{item.title}</span>
                          {item.comingSoon && (
                            <span className="ml-auto text-[10px] text-muted-foreground">Em breve</span>
                          )}
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
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors w-full",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isCampaignsRoute && "bg-sidebar-accent text-sidebar-primary font-medium"
                        )}
                      >
                        <Megaphone className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1">{t("nav.campaigns")}</span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            campaignsOpen && "rotate-90"
                          )}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            WhatsApp
                          </div>
                        </SidebarMenuSubItem>
                        {campaignSubItems.whatsapp.map((item) => (
                          <SidebarMenuSubItem key={item.url}>
                            <SidebarMenuSubButton asChild>
                              <NavLink
                                to={item.url}
                                className={cn(
                                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground transition-colors",
                                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                  item.comingSoon && "opacity-50"
                                )}
                                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                              >
                                <item.icon className="h-3.5 w-3.5" />
                                <span>{item.title}</span>
                                {item.comingSoon && (
                                  <span className="ml-auto text-[10px] text-muted-foreground">Em breve</span>
                                )}
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                        <SidebarMenuSubItem>
                          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
                            <Phone className="h-3 w-3" />
                            Telefonia
                          </div>
                        </SidebarMenuSubItem>
                        {campaignSubItems.telefonia.map((item) => (
                          <SidebarMenuSubItem key={item.url}>
                            <SidebarMenuSubButton asChild>
                              <NavLink
                                to={item.url}
                                className={cn(
                                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground transition-colors",
                                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                  item.comingSoon && "opacity-50"
                                )}
                                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                              >
                                <item.icon className="h-3.5 w-3.5" />
                                <span>{item.title}</span>
                                {item.comingSoon && (
                                  <span className="ml-auto text-[10px] text-muted-foreground">Em breve</span>
                                )}
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {isCollapsed ? (
                <SidebarMenuItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <SidebarMenuButton
                        tooltip="Carteira"
                        className={cn(
                          "flex items-center rounded-lg py-2 text-sidebar-foreground transition-colors w-full justify-center px-0",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isWalletRoute && "bg-sidebar-accent text-sidebar-primary font-medium"
                        )}
                      >
                        <Wallet className="h-4 w-4 flex-shrink-0" />
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-52 p-1">
                      {walletSubItems.map((item) => (
                        <NavLink
                          key={item.url}
                          to={item.url}
                          end={item.end}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-popover-foreground transition-colors",
                            "hover:bg-accent hover:text-accent-foreground"
                          )}
                          activeClassName="bg-accent text-accent-foreground font-medium"
                        >
                          <item.icon className="h-3.5 w-3.5" />
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
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors w-full",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isWalletRoute && "bg-sidebar-accent text-sidebar-primary font-medium"
                        )}
                      >
                        <Wallet className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1">Carteira</span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            walletOpen && "rotate-90"
                          )}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {walletSubItems.map((item) => (
                          <SidebarMenuSubItem key={item.url}>
                            <SidebarMenuSubButton asChild>
                              <NavLink
                                to={item.url}
                                end={item.end}
                                className={cn(
                                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground transition-colors",
                                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                )}
                                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                              >
                                <item.icon className="h-3.5 w-3.5" />
                                <span>{item.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="mx-auto w-4/5 my-2" />


        <SidebarGroup className="pt-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={navLinkClasses}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarTrigger className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
          {!isCollapsed && <span className="ml-2 text-sm">{t("nav.collapse")}</span>}
        </SidebarTrigger>
      </SidebarFooter>
    </Sidebar>
  );
}
