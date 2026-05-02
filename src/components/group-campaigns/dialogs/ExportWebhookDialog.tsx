import { useState } from "react";
import { useExportSchedules } from "@/hooks/useExportSchedules";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExportWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Ativos" },
  { value: "removed", label: "Removidos" },
  { value: "left", label: "Saíram" },
  { value: "muted", label: "Silenciados" },
];

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function ExportWebhookDialog({
  open,
  onOpenChange,
  campaignId,
}: ExportWebhookDialogProps) {
  const {
    schedules,
    exportNow,
    createSchedule,
    deleteSchedule,
    isExporting,
    isCreating,
  } = useExportSchedules(campaignId);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>(["active"]);
  const [sendType, setSendType] = useState<"now" | "schedule">("now");
  const [scheduleType, setScheduleType] = useState("daily");
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(1);

  const toggleStatus = (value: string) => {
    setStatusFilter((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const handleExportNow = async () => {
    if (!webhookUrl) return;
    await exportNow({ webhook_url: webhookUrl, status_filter: statusFilter });
  };

  const handleSchedule = async () => {
    if (!webhookUrl) return;
    await createSchedule({
      webhook_url: webhookUrl,
      status_filter: statusFilter,
      schedule_type: scheduleType,
      schedule_time: scheduleTime,
      schedule_day_of_week: scheduleType === "weekly" ? scheduleDayOfWeek : undefined,
    });
    setSendType("now");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar Membros via Webhook</DialogTitle>
          <DialogDescription>
            Envie os dados dos membros para um webhook externo, com opção de agendamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="webhook-url">URL do Webhook *</Label>
            <Input
              id="webhook-url"
              placeholder="https://exemplo.com/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Filtro de Status</Label>
            <div className="flex flex-wrap gap-3">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={statusFilter.includes(opt.value)}
                    onCheckedChange={() => toggleStatus(opt.value)}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Send Type */}
          <div className="space-y-2">
            <Label>Tipo de Envio</Label>
            <Select value={sendType} onValueChange={(v) => setSendType(v as "now" | "schedule")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="now">Enviar Agora</SelectItem>
                <SelectItem value="schedule">Agendar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule Options */}
          {sendType === "schedule" && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={scheduleType} onValueChange={setScheduleType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>

              {scheduleType === "weekly" && (
                <div className="space-y-2">
                  <Label>Dia da Semana</Label>
                  <Select
                    value={scheduleDayOfWeek.toString()}
                    onValueChange={(v) => setScheduleDayOfWeek(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_NAMES.map((name, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Existing Schedules */}
          {schedules.length > 0 && (
            <div className="space-y-2">
              <Label>Agendamentos Ativos</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {schedules.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-md border p-2 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{s.webhook_url}</p>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {s.schedule_type === "daily" && `Diário às ${s.schedule_time}`}
                          {s.schedule_type === "weekly" &&
                            `${DAY_NAMES[s.schedule_day_of_week ?? 0]} às ${s.schedule_time}`}
                        </span>
                        <Badge variant={s.is_active ? "default" : "secondary"} className="text-xs">
                          {s.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteSchedule(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {sendType === "now" ? (
            <Button
              onClick={handleExportNow}
              disabled={!webhookUrl || statusFilter.length === 0 || isExporting}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Exportar Agora
            </Button>
          ) : (
            <Button
              onClick={handleSchedule}
              disabled={!webhookUrl || statusFilter.length === 0 || isCreating}
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Clock className="mr-2 h-4 w-4" />
              )}
              Salvar Agendamento
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
