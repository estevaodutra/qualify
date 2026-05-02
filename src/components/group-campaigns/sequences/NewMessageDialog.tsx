import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  CalendarIcon, MessageSquare, Image as ImageIcon, Video, Music, FileText,
  BarChart3, MousePointerClick, List, Smile, MapPin, Contact, CalendarDays,
  Pencil, UserPlus, UserMinus, ShieldPlus, ShieldMinus, Settings, Plus, CircleDot,
} from "lucide-react";

interface NewMessageDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (nodeType: string, schedule: Record<string, unknown>) => void;
  triggerType?: string;
}

const CATEGORIES = [
  {
    label: "Mensagens",
    items: [
      { type: "message", label: "Texto", icon: MessageSquare },
      { type: "buttons", label: "Botões", icon: MousePointerClick },
      { type: "list", label: "Lista", icon: List },
      { type: "poll", label: "Enquete", icon: BarChart3 },
    ],
  },
  {
    label: "Mídia",
    items: [
      { type: "image", label: "Imagem", icon: ImageIcon },
      { type: "video", label: "Vídeo", icon: Video },
      { type: "audio", label: "Áudio", icon: Music },
      { type: "document", label: "Documento", icon: FileText },
      { type: "sticker", label: "Figurinha", icon: Smile },
    ],
  },
  {
    label: "Interativo",
    items: [
      { type: "location", label: "Localização", icon: MapPin },
      { type: "contact", label: "Contato", icon: Contact },
      { type: "event", label: "Evento", icon: CalendarDays },
    ],
  },
  {
    label: "Status",
    items: [
      { type: "status_image", label: "Status Imagem", icon: CircleDot },
      { type: "status_video", label: "Status Vídeo", icon: CircleDot },
    ],
  },
  {
    label: "Gestão de Grupo",
    items: [
      { type: "group_create", label: "Criar Grupo", icon: Plus },
      { type: "group_rename", label: "Renomear Grupo", icon: Pencil },
      { type: "group_photo", label: "Alterar Foto", icon: ImageIcon },
      { type: "group_description", label: "Alterar Descrição", icon: FileText },
      { type: "group_add_participant", label: "Adicionar", icon: UserPlus },
      { type: "group_remove_participant", label: "Remover", icon: UserMinus },
      { type: "group_promote_admin", label: "Promover Admin", icon: ShieldPlus },
      { type: "group_remove_admin", label: "Remover Admin", icon: ShieldMinus },
      { type: "group_settings", label: "Configurações", icon: Settings },
    ],
  },
];

const ALL_TYPES = CATEGORIES.flatMap(c => c.items);

const DAYS_OF_WEEK = [
  { value: "0", label: "Dom" },
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
];



export function NewMessageDialog({ open, onClose, onSave, triggerType }: NewMessageDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [scheduleType, setScheduleType] = useState<"fixed" | "delay" | "recurring">("fixed");
  const [fixedDate, setFixedDate] = useState<Date | undefined>();
  const [fixedTime, setFixedTime] = useState("09:00");
  const [delayValue, setDelayValue] = useState(1);
  const [delayUnit, setDelayUnit] = useState("days");
  const [delayTime, setDelayTime] = useState("08:00");
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [recurringTime, setRecurringTime] = useState("08:00");

  const reset = () => {
    setStep(1);
    setSelectedType(null);
    setScheduleType("fixed");
    setFixedDate(undefined);
    setFixedTime("09:00");
    setDelayValue(1);
    setDelayUnit("days");
    setDelayTime("08:00");
    setRecurringDays([]);
    setRecurringTime("08:00");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    if (triggerType === "webhook" || triggerType === "member_join" || triggerType === "member_leave") {
      onSave(type, { enabled: false });
      reset();
      onClose();
    } else {
      setStep(2);
    }
  };

  const handleSave = () => {
    if (!selectedType) return;
    const schedule: Record<string, unknown> = { enabled: true, scheduleType };
    if (scheduleType === "fixed" && fixedDate) {
      schedule.fixedDate = format(fixedDate, "yyyy-MM-dd");
      schedule.fixedTime = fixedTime;
    } else if (scheduleType === "delay") {
      schedule.delayValue = delayValue;
      schedule.delayUnit = delayUnit;
      schedule.delayTime = delayTime;
    } else if (scheduleType === "recurring") {
      schedule.days = recurringDays.map(Number);
      schedule.times = [recurringTime];
    }
    onSave(selectedType, schedule);
    handleClose();
  };

  const unitLabel = delayUnit === "minutes" ? "minuto(s)" : delayUnit === "hours" ? "hora(s)" : "dia(s)";
  const selectedDayLabels = recurringDays.map(Number).sort((a, b) => a - b).map(d => DAYS_OF_WEEK[d]?.label).join(", ");
  const selectedTypeInfo = ALL_TYPES.find(t => t.type === selectedType);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Nova Mensagem</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {CATEGORIES.map(({ label, items }) => {
                if (items.length === 0) return null;
                return (
                  <div key={label}>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{label}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {items.map(({ type, label: itemLabel, icon: Icon }) => (
                        <button
                          key={type}
                          onClick={() => handleSelectType(type)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors",
                            "hover:bg-accent hover:border-primary/30 cursor-pointer"
                          )}
                        >
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <span className="text-[11px] font-medium text-center leading-tight">{itemLabel}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {selectedTypeInfo?.label || "Mensagem"} — Agendamento
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <RadioGroup value={scheduleType} onValueChange={(v) => setScheduleType(v as "fixed" | "delay" | "recurring")} className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="fixed" id="sched-fixed" />
                  <Label htmlFor="sched-fixed" className="text-sm cursor-pointer">Data e hora específica</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="delay" id="sched-delay" />
                  <Label htmlFor="sched-delay" className="text-sm cursor-pointer">Delay após entrada</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="recurring" id="sched-recurring" />
                  <Label htmlFor="sched-recurring" className="text-sm cursor-pointer">Dias da semana</Label>
                </div>
              </RadioGroup>

              {scheduleType === "fixed" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !fixedDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {fixedDate ? format(fixedDate, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={fixedDate} onSelect={setFixedDate} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Hora</Label>
                    <Input type="time" value={fixedTime} onChange={e => setFixedTime(e.target.value)} className="h-9" />
                  </div>
                </div>
              ) : scheduleType === "delay" ? (
                <div className="space-y-3">
                  <div className="flex gap-3 items-end">
                    <div className="space-y-1.5 w-24">
                      <Label className="text-xs">Enviar após</Label>
                      <Input type="number" min={1} value={delayValue} onChange={e => setDelayValue(Number(e.target.value))} className="h-9" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <Label className="text-xs">Unidade</Label>
                      <Select value={delayUnit} onValueChange={setDelayUnit}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Minutos</SelectItem>
                          <SelectItem value="hours">Horas</SelectItem>
                          <SelectItem value="days">Dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 w-28">
                      <Label className="text-xs">Horário</Label>
                      <Input type="time" value={delayTime} onChange={e => setDelayTime(e.target.value)} className="h-9" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 Mensagem será enviada {delayValue} {unitLabel} após o lead entrar na campanha{delayUnit === "days" ? `, às ${delayTime}` : ""}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dias da semana</Label>
                    <ToggleGroup type="multiple" value={recurringDays} onValueChange={setRecurringDays} className="justify-start gap-1">
                      {DAYS_OF_WEEK.map(({ value, label }) => (
                        <ToggleGroupItem key={value} value={value} variant="outline" size="sm" className="px-3 text-xs">
                          {label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                  <div className="space-y-1.5 w-32">
                    <Label className="text-xs">Horário de envio</Label>
                    <Input type="time" value={recurringTime} onChange={e => setRecurringTime(e.target.value)} className="h-9" />
                  </div>
                  {recurringDays.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      💡 Mensagem será enviada toda {selectedDayLabels} às {recurringTime}.
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={handleSave}>Criar Mensagem</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
