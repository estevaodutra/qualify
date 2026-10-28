import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useSprintStore } from "@/features/sprint/state/sprintStore";
import { parseNotificationTarget } from "@/services/notificationService";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export interface ActivePopupNotification {
  id: string;
  userId?: string | null;
  title: string;
  description: string;
  boardId?: string;
  cardId?: string;
  cardTitle?: string;
  authorName?: string;
  entity?: string | null;
  link?: string | null;
  created_at?: string;
}

export const NotificationPopupManager: React.FC = () => {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { openCardModal } = useSprintStore();
  const [popups, setPopups] = useState<ActivePopupNotification[]>([]);
  const [anchorPos, setAnchorPos] = useState<{ top: number; left: number } | null>(null);

  // Calcula a posição do item 'Notificações' na Sidebar para posicionar o pop-up ao lado dele
  const updateAnchor = useCallback(() => {
    const el = document.getElementById("sidebar-notifications-trigger");
    if (el) {
      const rect = el.getBoundingClientRect();
      setAnchorPos({
        top: Math.round(rect.top + rect.height / 2),
        left: Math.round(rect.right + 12),
      });
    } else {
      // Fallback para canto inferior esquerdo se sidebar não estiver visível
      setAnchorPos({
        top: window.innerHeight - 120,
        left: 20,
      });
    }
  }, []);

  useEffect(() => {
    updateAnchor();
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor);

    const triggerEl = document.getElementById("sidebar-notifications-trigger");
    let observer: ResizeObserver | null = null;
    if (triggerEl) {
      observer = new ResizeObserver(updateAnchor);
      observer.observe(triggerEl);
    }

    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor);
      if (observer) observer.disconnect();
    };
  }, [updateAnchor, popups.length]);

  const dismissPopup = useCallback((id: string) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Marca como lido e ignora / fecha o pop-up
  const handleMarkAsReadAndDismiss = useCallback(
    async (popup: ActivePopupNotification) => {
      dismissPopup(popup.id);

      if (popup.id && !popup.id.startsWith("popup-") && !popup.id.startsWith("temp-")) {
        try {
          await supabase.from("alerts").update({ read: true }).eq("id", popup.id);
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
        } catch (err) {
          console.warn("Falha ao marcar alerta como lido:", err);
        }
      }
    },
    [dismissPopup, queryClient]
  );

  // Acessa o card correspondente e já marca como lido
  const handleOpenTarget = useCallback(
    async (popup: ActivePopupNotification) => {
      // 1. Marca como lida no banco
      if (popup.id && !popup.id.startsWith("popup-") && !popup.id.startsWith("temp-")) {
        try {
          await supabase.from("alerts").update({ read: true }).eq("id", popup.id);
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
        } catch (err) {
          console.warn("Falha ao marcar alerta como lido:", err);
        }
      }

      dismissPopup(popup.id);

      // 2. Extrai dados de navegação do card e quadro
      const target = parseNotificationTarget(popup.entity, popup.link);
      const boardId = popup.boardId || target.boardId;
      const cardId = popup.cardId || target.cardId;

      if (cardId) {
        if (boardId) {
          const currentPath = window.location.pathname;
          if (currentPath === `/sprint/b/${boardId}`) {
            openCardModal(cardId);
            return;
          }
          navigate(`/sprint/b/${boardId}?cardId=${cardId}`);
        } else {
          try {
            const { data } = await (supabase as any)
              .from("sprint_cards")
              .select("board_id")
              .eq("id", cardId)
              .single();

            if (data?.board_id) {
              navigate(`/sprint/b/${data.board_id}?cardId=${cardId}`);
              return;
            }
          } catch (e) {
            console.warn("Erro ao buscar board_id do card:", e);
          }
          navigate(`/sprint`);
        }
      } else {
        const url = popup.link || target.url;
        if (url) {
          if (url.startsWith("http://") || url.startsWith("https://")) {
            window.open(url, "_blank", "noopener,noreferrer");
          } else {
            navigate(url);
          }
        }
      }
    },
    [dismissPopup, navigate, openCardModal, queryClient]
  );

  // Escuta canal Realtime único para alertas e menções
  useEffect(() => {
    if (!user) return;

    const channelName = `realtime-alerts-${user.id}`;
    
    // Remove canal pré-existente seguro
    const channels = supabase.getChannels();
    for (const ch of channels) {
      if (ch.topic === `realtime:${channelName}`) {
        supabase.removeChannel(ch);
      }
    }

    const channel = supabase.channel(channelName);
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alerts",
        },
        (payload) => {
          const newAlert = payload.new as any;
          const isTargetedToMe =
            newAlert.user_id === user.id ||
            (!newAlert.user_id && newAlert.company_id === activeCompanyId);

          if (isTargetedToMe) {
            queryClient.invalidateQueries({ queryKey: ["alerts"] });

            if (!newAlert.read) {
              setPopups((prev) => {
                if (prev.some((p) => p.id === newAlert.id)) return prev;
                return [
                  {
                    id: newAlert.id,
                    userId: newAlert.user_id,
                    title: newAlert.title,
                    description: newAlert.description,
                    entity: newAlert.entity,
                    link: newAlert.link,
                    created_at: newAlert.created_at,
                  },
                  ...prev,
                ].slice(0, 2);
              });
              setTimeout(updateAnchor, 50);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "alerts",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
        }
      )
      .on("broadcast", { event: "mention_notification" }, ({ payload }) => {
        if (!payload) return;
        if (payload.userId === user.id) {
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
          setPopups((prev) => {
            if (prev.some((p) => p.id === payload.id)) return prev;
            return [payload, ...prev].slice(0, 2);
          });
          setTimeout(updateAnchor, 50);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeCompanyId, queryClient, updateAnchor]);

  // Listener para eventos locais disparados na mesma aba
  useEffect(() => {
    const handleIncomingPopup = (e: Event) => {
      const customEvent = e as CustomEvent<ActivePopupNotification>;
      const detail = customEvent.detail;
      if (!detail) return;

      if (detail.userId && user?.id && detail.userId !== user.id) {
        return;
      }

      const popupItem: ActivePopupNotification = {
        ...detail,
        id: detail.id || `popup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      };

      setPopups((prev) => {
        if (prev.some((p) => p.id === popupItem.id)) return prev;
        return [popupItem, ...prev].slice(0, 2);
      });

      // Recalcula o anchor imediatamente
      setTimeout(updateAnchor, 50);

      // Auto dismiss após 14 segundos
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== popupItem.id));
      }, 14000);
    };

    window.addEventListener("app:notification_popup", handleIncomingPopup);
    return () => {
      window.removeEventListener("app:notification_popup", handleIncomingPopup);
    };
  }, [user?.id, updateAnchor]);

  if (popups.length === 0 || !anchorPos) return null;

  // Renderiza a notificação mais recente no formato sutil do print
  const latestPopup = popups[0];

  // Extrai o nome do autor e do card para formatar o texto limpo: "Admin mencionou você no card 'Card'."
  const author = latestPopup.authorName || "Um membro";
  const cardName = latestPopup.cardTitle || (latestPopup.title.match(/card\s+["']?([^"']+)["']?/i)?.[1]) || "Card";
  const bodyText = `${author} mencionou você no card "${cardName}".`;

  return (
    <div
      aria-live="polite"
      className="fixed z-[100] pointer-events-auto"
      style={{
        left: `${anchorPos.left}px`,
        top: `${anchorPos.top}px`,
        transform: "translateY(-50%)",
      }}
    >
      <div className="relative w-[320px] bg-white dark:bg-[#18181b] border border-border/80 dark:border-white/10 text-foreground p-3.5 rounded-2xl shadow-xl shadow-black/8 animate-in fade-in slide-in-from-left-2 duration-200">
        {/* Triângulo / seta do balão apontando para o item Notificações */}
        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-white dark:bg-[#18181b] border-l border-b border-border/80 dark:border-white/10" />

        {/* Topo do balãozinho: bolinha azul + 'Menção no sprint' + X */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
            <span className="text-[12px] font-semibold text-foreground">
              Menção no sprint
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleMarkAsReadAndDismiss(latestPopup)}
            className="text-muted-foreground/60 hover:text-foreground p-0.5 rounded transition-colors"
            title="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Corpo: texto sutil e direto */}
        <div className="py-1">
          <p className="text-[12.5px] text-muted-foreground dark:text-zinc-300 leading-snug">
            {bodyText}
          </p>
        </div>

        {/* Rodapé: Dispensar / Marcar como lido + Botão Acessar */}
        <div className="mt-2 pt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleMarkAsReadAndDismiss(latestPopup)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors cursor-pointer"
            title="Marcar como lido e dispensar"
          >
            Dispensar
          </button>
          <Button
            size="sm"
            onClick={() => handleOpenTarget(latestPopup)}
            className="h-7 text-xs font-semibold px-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-1 shadow-sm transition-all"
          >
            <span>Acessar</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};
