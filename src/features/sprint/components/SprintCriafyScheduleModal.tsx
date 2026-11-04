import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Instagram,
  Send,
  Sparkles,
  Loader2,
  Film,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { SprintCard } from "../types";
import {
  CriafyTargetFormat,
  extractCriafyTarget,
  dispatchSprintCardToCriafy,
} from "@/services/criafy/sprintCriafyBridge";
import { toast } from "sonner";

interface SprintCriafyScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: SprintCard | null;
  companyId: string;
  onSuccess?: () => void;
}

export const SprintCriafyScheduleModal: React.FC<SprintCriafyScheduleModalProps> = ({
  open,
  onOpenChange,
  card,
  companyId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"schedule" | "library">("schedule");

  // Padrão: Amanhã às 18:00
  const getDefaultDateTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  };

  const [scheduledAt, setScheduledAt] = useState<string>(getDefaultDateTime);

  if (!card) return null;

  const targetInfo = extractCriafyTarget(`${card.title} ${card.description}`) || {
    format: "REELS" as CriafyTargetFormat,
    label: "Instagram Reels",
    matched: "@criafy/reels",
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const finalSchedule = scheduleMode === "schedule" && scheduledAt ? new Date(scheduledAt).toISOString() : null;

      const res = await dispatchSprintCardToCriafy({
        companyId,
        card,
        scheduledAt: finalSchedule,
        targetFormat: targetInfo.format,
      });

      if (!res.success) {
        throw new Error(res.error || "Falha ao enviar para o Criafy");
      }

      if (finalSchedule) {
        const formattedDate = new Date(finalSchedule).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
        toast.success(
          `Publicação enviada para o Criafy e agendada para ${formattedDate} (@${res.accountName || "instagram"})!`,
          { duration: 7000 }
        );
      } else {
        toast.success(
          `Conteúdo adicionado à Biblioteca do Criafy (@${res.accountName || "instagram"}) pronto para publicação!`,
          { duration: 6000 }
        );
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(`Erro ao despachar para o Criafy: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border border-border/80 shadow-2xl bg-card">
        {/* Header Decorativo */}
        <div className="bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 p-5 text-white relative">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-white/20 hover:bg-white/25 text-white border-0 text-[10px] font-bold gap-1">
              <Instagram className="w-3 h-3" />
              {targetInfo.label}
            </Badge>
          </div>
          <DialogTitle className="text-lg font-bold text-white tracking-tight">
            Agendar Conteúdo no Criafy
          </DialogTitle>
          <DialogDescription className="text-white/85 text-xs mt-0.5 line-clamp-1">
            Tarefa concluída no Sprint: "{card.title}"
          </DialogDescription>
        </div>

        {/* Opções de Agendamento */}
        <div className="p-5 space-y-4 text-xs">
          <div className="space-y-2">
            <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground block">
              Como deseja encaminhar?
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScheduleMode("schedule")}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between space-y-2 cursor-pointer transition-all ${
                  scheduleMode === "schedule"
                    ? "border-pink-500 bg-pink-500/10 text-foreground ring-1 ring-pink-500"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Calendar className="w-4 h-4 text-pink-500" />
                  {scheduleMode === "schedule" && (
                    <span className="w-2 h-2 rounded-full bg-pink-500" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-xs block text-foreground">
                    Agendar Horário
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Publica automaticamente
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScheduleMode("library")}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between space-y-2 cursor-pointer transition-all ${
                  scheduleMode === "library"
                    ? "border-purple-500 bg-purple-500/10 text-foreground ring-1 ring-purple-500"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Film className="w-4 h-4 text-purple-500" />
                  {scheduleMode === "library" && (
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-xs block text-foreground">
                    Apenas Biblioteca
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Salvar sem data definida
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Campo de Data/Hora (quando agendado) */}
          {scheduleMode === "schedule" && (
            <div className="space-y-2 p-3 rounded-xl bg-muted/40 border border-border/80">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Data e Horário da Publicação:
                </label>
              </div>

              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="h-9 text-xs rounded-lg bg-background"
              />

              <div className="flex items-center gap-1.5 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const today = new Date();
                    today.setHours(19, 0, 0, 0);
                    setScheduledAt(today.toISOString().slice(0, 16));
                  }}
                  className="h-6 text-[10px] px-2 rounded-md cursor-pointer"
                >
                  Hoje 19h
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const tom = new Date();
                    tom.setDate(tom.getDate() + 1);
                    tom.setHours(18, 0, 0, 0);
                    setScheduledAt(tom.toISOString().slice(0, 16));
                  }}
                  className="h-6 text-[10px] px-2 rounded-md cursor-pointer"
                >
                  Amanhã 18h
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const tom = new Date();
                    tom.setDate(tom.getDate() + 2);
                    tom.setHours(12, 0, 0, 0);
                    setScheduledAt(tom.toISOString().slice(0, 16));
                  }}
                  className="h-6 text-[10px] px-2 rounded-md cursor-pointer"
                >
                  Em 2 dias 12h
                </Button>
              </div>
            </div>
          )}

          {/* Rodapé com Ações */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={loading || (scheduleMode === "schedule" && !scheduledAt)}
              className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-bold text-xs h-9 rounded-xl px-4 gap-1.5 shadow-xs cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{scheduleMode === "schedule" ? "Confirmar e Agendar" : "Salvar na Biblioteca"}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
