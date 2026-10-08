import { cn } from "@/lib/utils";
import { PhoneCall, Megaphone, Settings as SettingsIcon, Users, Headset, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type CallPanelSection = "calls" | "campaigns" | "settings";

interface CallPanelSidebarProps {
  activeSection: CallPanelSection;
  onSelectSection: (section: CallPanelSection) => void;
  queueCount: number;
  inProgressCount: number;
  campaignsCount: number;
  availableOps: number;
  totalOps: number;
  queueGlobalStatus?: string;
  isAdmin: boolean;
}

export function CallPanelSidebar({
  activeSection,
  onSelectSection,
  queueCount,
  inProgressCount,
  campaignsCount,
  availableOps,
  totalOps,
  queueGlobalStatus = "stopped",
  isAdmin,
}: CallPanelSidebarProps) {
  const statusLabel =
    queueGlobalStatus === "running"
      ? "Fila Ativa"
      : queueGlobalStatus === "paused"
      ? "Fila Pausada"
      : queueGlobalStatus === "mixed"
      ? "Fila Mista"
      : "Fila Parada";

  const statusDot =
    queueGlobalStatus === "running"
      ? "bg-emerald-500 animate-pulse"
      : queueGlobalStatus === "paused"
      ? "bg-amber-500"
      : queueGlobalStatus === "mixed"
      ? "bg-blue-500 animate-pulse"
      : "bg-muted-foreground";

  const mainNavItems = [
    {
      id: "calls" as CallPanelSection,
      title: "Ligações",
      subtitle: "Fila & Atendimento",
      icon: PhoneCall,
      badge: inProgressCount > 0 ? (
        <Badge variant="destructive" className="animate-pulse px-1.5 py-0.5 text-[10px] h-5">
          {inProgressCount} ativa{inProgressCount > 1 ? "s" : ""}
        </Badge>
      ) : queueCount > 0 ? (
        <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px] h-5 bg-amber-500/15 text-amber-600 dark:text-amber-400">
          {queueCount}
        </Badge>
      ) : null,
    },
    ...(isAdmin
      ? [
          {
            id: "campaigns" as CallPanelSection,
            title: "Campanhas",
            subtitle: "Roteiros, Ações & Regras",
            icon: Megaphone,
            badge: (
              <Badge variant="outline" className="px-1.5 py-0.5 text-[10px] h-5 text-muted-foreground">
                {campaignsCount}
              </Badge>
            ),
          },
        ]
      : []),
  ];

  const secondaryNavItems = [
    ...(isAdmin
      ? [
          {
            id: "settings" as CallPanelSection,
            title: "Configurações",
            subtitle: "Operadores & Telefonia",
            icon: SettingsIcon,
            badge: (
              <Badge variant="outline" className="px-1.5 py-0.5 text-[10px] h-5 gap-1 text-muted-foreground">
                <Users className="h-3 w-3" />
                {availableOps}/{totalOps}
              </Badge>
            ),
          },
        ]
      : []),
  ];

  const allItems = [...mainNavItems, ...secondaryNavItems];

  return (
    <>
      {/* Mobile Horizontal Navigation */}
      <div className="lg:hidden w-full space-y-3 bg-card/30 backdrop-blur-xl p-3.5 rounded-2xl border border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <PhoneCall className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Painel de Ligações</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={cn("h-1.5 w-1.5 rounded-full", statusDot)} />
                <span>{statusLabel}</span>
              </div>
            </div>
          </div>
          <Badge
            variant={availableOps > 0 ? "outline" : "secondary"}
            className="text-[11px] gap-1"
          >
            <Headset className="h-3 w-3" />
            {availableOps} livre{availableOps === 1 ? "" : "s"}
          </Badge>
        </div>

        {/* Horizontal Scroll Pill Menu */}
        <div className="flex overflow-x-auto gap-2 py-1 scrollbar-hide flex-nowrap">
          {allItems.map((item) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-background/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/30"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.title}</span>
                {item.badge}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 space-y-6 bg-card/30 backdrop-blur-xl p-5 rounded-2xl border border-border/40 self-start sticky top-4">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary shadow-sm shadow-primary/10">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Telefonia
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium">
                Discador & Campanhas
              </p>
            </div>
          </div>

          {/* Quick status banner */}
          <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/30 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", statusDot)} />
              <span className="font-semibold text-[11px]">{statusLabel}</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">
              {availableOps} op. livre{availableOps === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="space-y-6">
          {/* Main Navigation */}
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-3">
              Principal
            </div>
            <div className="space-y-1">
              {mainNavItems.map((item) => {
                const isActive = activeSection === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectSection(item.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 text-left cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-primary-foreground" : "text-muted-foreground"
                        )}
                      />
                      <div className="truncate">
                        <div className="truncate">{item.title}</div>
                        <div
                          className={cn(
                            "text-[10px] font-normal truncate",
                            isActive ? "text-primary-foreground/80" : "text-muted-foreground/70"
                          )}
                        >
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    {item.badge}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Navigation */}
          {secondaryNavItems.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-3">
                Sistema
              </div>
              <div className="space-y-1">
                {secondaryNavItems.map((item) => {
                  const isActive = activeSection === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectSection(item.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 text-left cursor-pointer",
                        isActive
                          ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-primary-foreground" : "text-muted-foreground"
                          )}
                        />
                        <div className="truncate">
                          <div className="truncate">{item.title}</div>
                          <div
                            className={cn(
                              "text-[10px] font-normal truncate",
                              isActive ? "text-primary-foreground/80" : "text-muted-foreground/70"
                            )}
                          >
                            {item.subtitle}
                          </div>
                        </div>
                      </div>
                      {item.badge}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
