import { Bell, Search, LogOut, Settings, UserCircle, Wallet as WalletIcon, Menu, PanelLeft, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAlerts, type Alert } from "@/hooks/useAlerts";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useCompany } from "@/contexts/CompanyContext";
import { useWallet } from "@/hooks/useWallet";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { parseNotificationTarget } from "@/services/notificationService";
import { useSprintStore } from "@/features/sprint/state/sprintStore";

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
};

function SystemClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex items-center justify-center h-9 px-3 rounded-xl border border-border/50 bg-muted/30 text-[13px] font-medium text-muted-foreground tracking-widest tabular-nums">
      {time.toLocaleTimeString('pt-BR')}
    </div>
  );
}

export function AppHeader() {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { alerts, unreadCount, markAsRead, markAllAsRead } = useAlerts();
  const { activeCompanyId } = useCompany();
  const { data: wallet } = useWallet();
  const { isSubscribed, subscribe, isLoading: isPushLoading } = usePushNotifications();
  const { openCardModal } = useSprintStore();

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

  const handleAlertItemClick = async (alert: Alert) => {
    if (!alert.read) {
      await markAsRead(alert.id);
    }

    const target = parseNotificationTarget(alert.entity, alert.link);
    if (target.type === "sprint_card" && target.cardId) {
      if (target.boardId) {
        if (window.location.pathname === `/sprint/b/${target.boardId}`) {
          openCardModal(target.cardId);
          return;
        }
        navigate(`/sprint/b/${target.boardId}?cardId=${target.cardId}`);
      } else {
        navigate(`/sprint`);
      }
    } else if (target.url) {
      navigate(target.url);
    }
  };

  const userEmail = user?.email || "Usuário";
  const userName = user?.user_metadata?.full_name || userEmail.split("@")[0];
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = userName.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex h-[60px] items-center justify-between px-6 gap-4">

        {/* Left */}
        <div className="flex items-center gap-3 flex-1">
          <SidebarTrigger className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <Menu className="h-5 w-5 md:hidden" />
            <PanelLeft className="h-5 w-5 hidden md:block" />
          </SidebarTrigger>
          <div className="flex items-center gap-2 md:hidden">
            <img src="/logo-dark.png" alt="Qualify Logo" className="h-6 w-auto dark:hidden" />
            <img src="/logo-fundo-transparente-branco.png" alt="Qualify Logo" className="h-6 w-auto hidden dark:block" />
            <span className="font-extrabold text-sm tracking-widest text-foreground uppercase">QUALIFY</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Status pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/8 border border-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            <span className="text-[10px] font-black tracking-[0.15em] uppercase">Sistemas OK</span>
          </div>

          <SystemClock />

          {/* Wallet Balance Pill */}
          {wallet !== undefined && (
            <button 
              onClick={() => navigate("/carteira/configuracoes")}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-border/50 bg-muted/30 text-[13px] font-bold text-foreground hover:bg-accent hover:text-foreground hover:border-border transition-all duration-200"
            >
              <WalletIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {wallet !== null 
                  ? wallet.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  : "R$ 0,00"}
              </span>
            </button>
          )}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative h-9 w-9 flex items-center justify-center rounded-xl border border-border/50 bg-muted/30 text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border transition-all duration-200"
                aria-label="Abrir notificações"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-84 sm:w-96 rounded-2xl shadow-elevation-lg border-border/50 bg-background/95 backdrop-blur-xl p-2.5 max-h-[460px] overflow-y-auto">
              <div className="flex items-center justify-between px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <DropdownMenuLabel className="p-0 text-[13px] font-bold">Notificações</DropdownMenuLabel>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                      {unreadCount} {unreadCount === 1 ? "nova" : "novas"}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>

              {!isSubscribed && (
                <div className="mx-1.5 my-1.5 p-2.5 rounded-xl bg-primary/10 border border-primary/20 flex flex-col gap-1.5">
                  <p className="text-[11px] font-semibold text-foreground leading-tight">
                    Receba avisos no celular quando chegarem novas mensagens.
                  </p>
                  <button
                    onClick={() => subscribe()}
                    disabled={isPushLoading}
                    className="self-start text-[10px] font-bold bg-primary text-primary-foreground px-2.5 py-1 rounded-lg hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    {isPushLoading ? "Ativando..." : "Ativar Notificações Push"}
                  </button>
                </div>
              )}
              <DropdownMenuSeparator className="bg-border/50 my-1.5" />
              {alerts.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground/70">Nenhuma notificação por aqui.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {alerts.slice(0, 25).map((alert) => {
                    const target = parseNotificationTarget(alert.entity, alert.link);
                    const isSprintCard = target.type === "sprint_card";

                    return (
                      <div
                        key={alert.id}
                        onClick={() => handleAlertItemClick(alert)}
                        className={cn(
                          "group rounded-xl p-2.5 transition-all cursor-pointer border border-transparent hover:bg-accent/60 hover:border-border/40",
                          !alert.read ? "bg-primary/5 border-primary/15" : "opacity-85 hover:opacity-100"
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full mt-1.5 shrink-0",
                              !alert.read
                                ? "bg-primary shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                                : "bg-muted-foreground/30"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-[12px] font-bold text-foreground leading-snug", !alert.read && "text-primary")}>
                              {alert.title}
                            </p>
                            {alert.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                                {alert.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/30">
                              <span className="text-[10px] text-muted-foreground/60">{alert.timestamp}</span>
                              {isSprintCard && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:underline">
                                  <span>Acessar card</span>
                                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 rounded-xl px-2 gap-2.5 hover:bg-accent transition-all active:scale-95 group"
              >
                <Avatar className="h-7 w-7 rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-105">
                  <AvatarImage src={avatarUrl} alt={userName} className="object-cover" />
                  <AvatarFallback className="rounded-lg gradient-primary text-white text-[10px] font-bold uppercase">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start leading-none">
                  <span className="text-[13px] font-semibold text-foreground">{userName}</span>
                  <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-0.5">Admin</span>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60 rounded-2xl shadow-elevation-lg border-border/50 bg-background/95 backdrop-blur-xl p-2">
              <DropdownMenuLabel className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 rounded-xl shadow-sm">
                    <AvatarImage src={avatarUrl} alt={userName} className="object-cover" />
                    <AvatarFallback className="rounded-xl gradient-primary text-white text-xs font-bold uppercase">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{userName}</p>
                    <p className="text-[11px] text-muted-foreground/60 truncate">{userEmail}</p>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-border/50 my-1" />

              <DropdownMenuItem
                onClick={handleSignOut}
                className="rounded-xl gap-3 px-3 py-2.5 text-[13px] font-bold text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                {t("header.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
