import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSprintStore } from "@/features/sprint/state/sprintStore";
import { parseNotificationTarget } from "@/services/notificationService";
import { supabase } from "@/integrations/supabase/client";

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
  const navigate = useNavigate();
  const { openCardModal } = useSprintStore();
  const [popups, setPopups] = useState<ActivePopupNotification[]>([]);

  const dismissPopup = useCallback((id: string) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleOpenTarget = useCallback(
    async (popup: ActivePopupNotification) => {
      // 1. Marca como lida no banco se tiver id válido
      if (popup.id && !popup.id.startsWith("temp-")) {
        try {
          await supabase.from("alerts").update({ read: true }).eq("id", popup.id);
        } catch (err) {
          console.warn("Falha ao marcar alerta como lido:", err);
        }
      }

      dismissPopup(popup.id);

      // 2. Extrai dados de navegação
      const target = parseNotificationTarget(popup.entity, popup.link);
      const boardId = popup.boardId || target.boardId;
      const cardId = popup.cardId || target.cardId;

      if (cardId) {
        if (boardId) {
          // Se estamos no mesmo quadro, apenas abre o modal diretamente
          const currentPath = window.location.pathname;
          if (currentPath === `/sprint/b/${boardId}`) {
            openCardModal(cardId);
            return;
          }
          // Navega para o quadro com query param do cartão
          navigate(`/sprint/b/${boardId}?cardId=${cardId}`);
        } else {
          // Se não temos boardId, busca do banco antes de navegar
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
      } else if (target.url) {
        navigate(target.url);
      }
    },
    [dismissPopup, navigate, openCardModal]
  );

  useEffect(() => {
    const handleIncomingPopup = (e: Event) => {
      const customEvent = e as CustomEvent<ActivePopupNotification>;
      const detail = customEvent.detail;
      if (!detail) return;

      // Se o alerta for destinado a um usuário específico, verifica se é para o usuário logado
      if (detail.userId && user?.id && detail.userId !== user.id) {
        return;
      }

      // Adiciona o novo pop-up à lista
      const popupItem: ActivePopupNotification = {
        ...detail,
        id: detail.id || `popup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      };

      setPopups((prev) => {
        // Evita duplicatas pelo id
        if (prev.some((p) => p.id === popupItem.id)) return prev;
        return [popupItem, ...prev].slice(0, 3); // Mantém no máximo 3 visíveis ao mesmo tempo
      });

      // Auto dismiss após 10 segundos
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== popupItem.id));
      }, 10000);
    };

    window.addEventListener("app:notification_popup", handleIncomingPopup);
    return () => {
      window.removeEventListener("app:notification_popup", handleIncomingPopup);
    };
  }, [user?.id]);

  if (popups.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-16 right-6 z-50 flex flex-col gap-3 max-w-[380px] w-full pointer-events-none"
    >
      {popups.map((popup) => (
        <div
          key={popup.id}
          className="pointer-events-auto w-full bg-card/95 backdrop-blur-xl border border-primary/30 text-card-foreground p-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300 ring-1 ring-primary/20"
        >
          {/* Header do pop-up */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                Menção no Sprint
              </span>
            </div>
            <button
              onClick={() => dismissPopup(popup.id)}
              className="text-muted-foreground/70 hover:text-foreground p-1 rounded-lg hover:bg-muted/50 transition-colors"
              title="Dispensar notificação"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Conteúdo principal */}
          <div className="space-y-1.5">
            <h4 className="text-[13px] font-bold text-foreground leading-snug line-clamp-2">
              {popup.title}
            </h4>
            <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-3">
              {popup.description}
            </p>
          </div>

          {/* Ações */}
          <div className="mt-3.5 pt-2 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissPopup(popup.id)}
              className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground"
            >
              Dispensar
            </Button>
            <Button
              size="sm"
              onClick={() => handleOpenTarget(popup)}
              className="h-7 text-xs px-3 font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
            >
              <span>Acessar card</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
