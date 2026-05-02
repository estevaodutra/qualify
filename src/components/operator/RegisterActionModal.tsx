import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCallActions } from "@/hooks/useCallActions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { addHours, format, setHours, setMinutes, addDays } from "date-fns";

interface RegisterActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callId: string;
  campaignId: string;
  leadName: string;
  leadPhone: string;
  campaignName: string;
  duration: number;
  initialObservations?: string;
}

export function RegisterActionModal({
  open, onOpenChange, callId, campaignId,
  leadName, leadPhone, campaignName, duration, initialObservations,
}: RegisterActionModalProps) {
  const { actions, isLoading: actionsLoading } = useCallActions(campaignId);
  const { toast } = useToast();
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [notes, setNotes] = useState(initialObservations || "");
  const [customMessage, setCustomMessage] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedAction = actions.find(a => a.id === selectedActionId);
  const hasCustomMessageAction = actions.some(a => a.actionType === "custom_message");
  const isScheduleType = selectedAction?.actionType === "none" &&
    selectedAction?.name?.toLowerCase().includes("agend");

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const setScheduleShortcut = (date: Date) => {
    setScheduledDate(format(date, "yyyy-MM-dd"));
    setScheduledTime(format(date, "HH:mm"));
  };

  const handleSave = async () => {
    if (!selectedActionId) {
      toast({ title: "Selecione uma ação", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // Update call_logs
      const updates: Record<string, unknown> = {
        action_id: selectedActionId,
        notes: notes || null,
      };

      if (selectedAction?.actionType === "custom_message") {
        updates.custom_message = customMessage || null;
      }

      if (isScheduleType && scheduledDate && scheduledTime) {
        updates.scheduled_for = `${scheduledDate}T${scheduledTime}:00`;
      }

      await (supabase as any)
        .from("call_logs")
        .update(updates)
        .eq("id", callId);

      toast({ title: "Ação registrada", description: "Resultado salvo. A ligação será encerrada pelo callback." });
      onOpenChange(false);
      resetState();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const resetState = () => {
    setSelectedActionId(null);
    setNotes("");
    setCustomMessage("");
    setScheduledDate("");
    setScheduledTime("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>🎯 Registrar Ação</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
            <span>👤 {leadName}</span>
            <span>•</span>
            <span>{leadPhone}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>📁 {campaignName}</span>
            <span>•</span>
            <span>⏱️ {formatDuration(duration)}</span>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-2">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Resultado da Ligação *</Label>
              {actionsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : actions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Nenhuma ação configurada nesta campanha.
                </p>
              ) : (
                <div className="space-y-2 mt-2">
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => setSelectedActionId(action.id)}
                      className={cn(
                        "w-full text-left rounded-lg border p-3 transition-all",
                        selectedActionId === action.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: action.color }}
                        />
                        <span className="font-medium text-sm">{action.name}</span>
                        {selectedActionId === action.id && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            Selecionado
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule fields */}
            {isScheduleType && selectedActionId && (
              <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Quando ligar novamente?
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: "+1 hora", date: addHours(new Date(), 1) },
                    { label: "+3 horas", date: addHours(new Date(), 3) },
                    { label: "Amanhã 9h", date: setMinutes(setHours(addDays(new Date(), 1), 9), 0) },
                    { label: "Amanhã 14h", date: setMinutes(setHours(addDays(new Date(), 1), 14), 0) },
                  ].map(({ label, date }) => (
                    <Button
                      key={label}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setScheduleShortcut(date)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Message Field */}
            {hasCustomMessageAction && (
              <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
                <Label className="text-sm font-medium">💬 Mensagem Personalizada (opcional)</Label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Digite uma mensagem personalizada..."
                  className="mt-1"
                  rows={3}
                />
                {actions.filter(a => a.actionType === "custom_message").map(a => (
                  <p key={a.id} className="text-xs text-muted-foreground">
                    Essa mensagem será enviada quando você clicar em "{a.name}".
                  </p>
                ))}
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">📝 Observações (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anotações sobre a ligação..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!selectedActionId || isSaving}>
            {isSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            ✅ Salvar e Encerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
