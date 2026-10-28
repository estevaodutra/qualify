import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  ArrowRight,
  ListTodo,
  CalendarDays,
  MessageSquare,
  Users,
  MoreHorizontal,
  Trash2,
  Share2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAlerts, type Alert } from "@/hooks/useAlerts";
import { useSprintStore } from "@/features/sprint/state/sprintStore";
import { parseNotificationTarget } from "@/services/notificationService";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { CriafySidebarIcon } from "@/components/criafy/CriafyBrandIcons";

interface NotificationsPopoverProps {
  children: React.ReactNode;
}

function isCriafyAlert(alert: Alert) {
  const entity = alert.entity || "";
  const title = (alert.title || "").toLowerCase();
  return (
    entity.startsWith("criafy_publication") ||
    title.includes("instagram") ||
    title.includes("criafy") ||
    title.includes("story") ||
    title.includes("reels") ||
    title.includes("post no feed")
  );
}

function getNotificationIcon(alert: Alert) {
  const entity = alert.entity || "";
  const title = (alert.title || "").toLowerCase();

  if (isCriafyAlert(alert)) {
    return <CriafySidebarIcon className="h-4.5 w-4.5" />;
  }
  if (entity.startsWith("sprint_card") || title.includes("card") || title.includes("sprint")) {
    return <ListTodo className="h-4 w-4 text-primary" />;
  }
  if (entity.includes("scheduling") || title.includes("agendamento")) {
    return <CalendarDays className="h-4 w-4 text-blue-500" />;
  }
  if (entity.includes("chat") || title.includes("chat") || title.includes("mensagem")) {
    return <MessageSquare className="h-4 w-4 text-emerald-500" />;
  }
  if (entity.includes("lead") || title.includes("lead")) {
    return <Users className="h-4 w-4 text-amber-500" />;
  }
  return <Bell className="h-4 w-4 text-primary" />;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const { alerts, unreadCount, markAsRead, markAllAsRead } = useAlerts();
  const { openCardModal } = useSprintStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleAccessNotification = async (alert: Alert) => {
    if (!alert.read) {
      await markAsRead(alert.id);
    }
    setOpen(false);

    const target = parseNotificationTarget(alert.entity, alert.link);
    if (target.type === "sprint_card" && target.cardId) {
      if (target.boardId) {
        if (window.location.pathname === `/sprint/b/${target.boardId}`) {
          openCardModal(target.cardId);
          return;
        }
        navigate(`/sprint/b/${target.boardId}?cardId=${target.cardId}`);
      } else {
        try {
          const { data } = await (supabase as any)
            .from("sprint_cards")
            .select("board_id")
            .eq("id", target.cardId)
            .single();

          if (data?.board_id) {
            navigate(`/sprint/b/${data.board_id}?cardId=${target.cardId}`);
            return;
          }
        } catch (e) {
          console.warn("Erro ao buscar board_id do card:", e);
        }
        navigate(`/sprint`);
      }
    } else {
      const url = alert.link || target.url;
      if (url) {
        if (url.startsWith("http://") || url.startsWith("https://")) {
          window.open(url, "_blank", "noopener,noreferrer");
        } else {
          navigate(url);
        }
      }
    }
  };

  const handleMarkSingleAsRead = async (alertId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await markAsRead(alertId);
  };

  const handleMarkSingleAsUnread = async (alertId: string) => {
    try {
      await supabase.from("alerts").update({ read: false }).eq("id", alertId);
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    } catch (err) {
      console.warn("Erro ao marcar como não lido:", err);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await supabase.from("alerts").delete().eq("id", alertId);
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    } catch (err) {
      console.warn("Erro ao excluir alerta:", err);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="right"
        align="center"
        sideOffset={14}
        className="relative z-[9999] w-[380px] sm:w-[420px] rounded-2xl border border-border/80 dark:border-white/10 bg-card text-card-foreground p-0 shadow-2xl shadow-black/15 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[side=right]:slide-in-from-left-2 duration-200"
      >
        {/* Triângulo / seta apontando para a Sidebar à esquerda */}
        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-card border-l border-b border-border/80 dark:border-white/10" />

        {/* Cabeçalho da janelinha */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-foreground">Notificações</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="text-[12px] font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Marcar todas como lidas</span>
            </button>
          )}
        </div>

        {/* Lista de Notificações com Scroll */}
        <div className="divide-y divide-border/40 max-h-[460px] overflow-y-auto scrollbar-thin">
          {alerts.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Bell className="h-9 w-9 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground/70">Nenhuma notificação no momento.</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const target = parseNotificationTarget(alert.entity, alert.link);
              const isActionable = target.type === "sprint_card" || !!target.url || !!alert.link;
              const isCriafy = isCriafyAlert(alert);

              return (
                <div
                  key={alert.id}
                  className={cn(
                    "p-3.5 transition-colors hover:bg-muted/40 flex items-start gap-3",
                    !alert.read ? "bg-primary/[0.04]" : ""
                  )}
                >
                  {/* Ponto indicador de não lido */}
                  <div className="pt-2 shrink-0">
                    <span
                      className={cn(
                        "block h-2 w-2 rounded-full transition-all",
                        !alert.read
                          ? "bg-primary shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                          : "opacity-0"
                      )}
                    />
                  </div>

                  {/* Ícone contextual */}
                  <div
                    className={cn(
                      "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                      isCriafy
                        ? "bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/60 p-1"
                        : "bg-primary/10"
                    )}
                  >
                    {getNotificationIcon(alert)}
                  </div>

                  {/* Detalhes da notificação */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h5
                        className="text-[12.5px] font-bold text-foreground leading-snug line-clamp-2 break-words"
                        title={alert.title}
                      >
                        {alert.title}
                      </h5>
                      <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap tabular-nums">
                        {alert.timestamp}
                      </span>
                    </div>

                    {alert.description && (
                      <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
                        {alert.description}
                      </p>
                    )}

                    {/* Linha de Ações */}
                    <div className="flex items-center justify-between mt-2.5 pt-0.5">
                      <div className="flex items-center gap-2.5">
                        {isActionable && (
                          <button
                            type="button"
                            onClick={() => handleAccessNotification(alert)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <span>Acessar</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}

                        {!alert.read && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkSingleAsRead(alert.id, e)}
                            className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                          >
                            Marcar como lida
                          </button>
                        )}
                      </div>

                      {/* Menu de mais opções */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="text-muted-foreground/60 hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
                            title="Mais opções"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl z-[10000]">
                          {!alert.read ? (
                            <DropdownMenuItem onClick={() => handleMarkSingleAsRead(alert.id)}>
                              <Check className="h-3.5 w-3.5 mr-2" />
                              <span>Marcar como lida</span>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleMarkSingleAsUnread(alert.id)}>
                              <Bell className="h-3.5 w-3.5 mr-2" />
                              <span>Marcar não lida</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            <span>Excluir</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
