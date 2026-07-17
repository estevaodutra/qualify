import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { TriggerConfigComponentProps } from "../types";

const WEEK_DAYS = [
  { value: "monday", label: "Segunda" },
  { value: "tuesday", label: "Terça" },
  { value: "wednesday", label: "Quarta" },
  { value: "thursday", label: "Quinta" },
  { value: "friday", label: "Sexta" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

export function ScheduledTriggerConfig({ config, onChange }: TriggerConfigComponentProps) {
  const scheduleType = (config.scheduleType as string) || "schedule_once";

  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const handleTypeChange = (val: string) => {
    onChange({
      ...config,
      scheduleType: val,
      // Reset specific fields when switching type to avoid lingering data
      scheduledDate: undefined,
      times: ["09:00"], // Set a default time
      daysOfMonth: undefined,
      daysOfWeek: undefined,
      interval: undefined,
      unit: undefined,
    });
  };

  const times = (config.times as string[]) || ["09:00"];
  
  const renderTimeList = () => (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Horários de execução</Label>
      <div className="space-y-2">
        {times.map((t, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              type="time"
              className="h-8"
              value={t}
              onChange={(e) => {
                const newTimes = [...times];
                newTimes[idx] = e.target.value;
                updateConfig("times", newTimes);
              }}
            />
            {times.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={() => updateConfig("times", times.filter((_, i) => i !== idx))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full h-8 text-xs text-[#8A3CFF] border-[#8A3CFF]/30 hover:bg-[#8A3CFF]/10"
          onClick={() => updateConfig("times", [...times, "12:00"])}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar horário
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-4 rounded-xl bg-slate-50/50 border border-slate-200">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">Tipo de agendamento</Label>
        <Select value={scheduleType} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full bg-white h-9">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="schedule_once">Data e hora específica (Única vez)</SelectItem>
            <SelectItem value="schedule_daily">Diário (Todos os dias)</SelectItem>
            <SelectItem value="schedule_week_days">Dias da semana</SelectItem>
            <SelectItem value="schedule_month_days">Dias do mês</SelectItem>
            <SelectItem value="schedule_interval">Intervalo fixo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-2 border-t border-slate-200">
        {scheduleType === "schedule_once" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Data</Label>
              <Input
                type="date"
                className="h-9 bg-white"
                value={(config.scheduledDate as string) || ""}
                onChange={(e) => updateConfig("scheduledDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Hora</Label>
              <Input
                type="time"
                className="h-9 bg-white"
                value={(config.scheduledTime as string) || ""}
                onChange={(e) => updateConfig("scheduledTime", e.target.value)}
              />
            </div>
          </div>
        )}

        {scheduleType === "schedule_daily" && (
          <div>{renderTimeList()}</div>
        )}

        {scheduleType === "schedule_week_days" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Dias da semana</Label>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map(day => {
                  const selectedDays = (config.daysOfWeek as string[]) || [];
                  const isSelected = selectedDays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      onClick={() => {
                        if (isSelected) {
                          updateConfig("daysOfWeek", selectedDays.filter(d => d !== day.value));
                        } else {
                          updateConfig("daysOfWeek", [...selectedDays, day.value]);
                        }
                      }}
                      className={`px-3 py-1.5 text-[11px] font-medium rounded-full border transition-colors ${
                        isSelected 
                          ? "bg-[#8A3CFF] border-[#8A3CFF] text-white shadow-sm" 
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {renderTimeList()}
          </div>
        )}

        {scheduleType === "schedule_month_days" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Dias do mês (separados por vírgula)</Label>
              <Input
                placeholder="Ex: 1, 5, 15, 30"
                className="h-9 bg-white text-sm"
                value={((config.daysOfMonth as number[]) || []).join(", ")}
                onChange={(e) => {
                  // Permitir digitação livre, transformar em array de num ao salvar
                  const str = e.target.value;
                  const arr = str.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                  // Guardar a string digitada no state (pode criar um config "raw") ou array direto
                  updateConfig("daysOfMonthRaw", str); 
                  updateConfig("daysOfMonth", arr);
                }}
              />
              <p className="text-[10px] text-slate-500">
                O valor lido atualmente: {((config.daysOfMonth as number[]) || []).join(", ") || "Nenhum dia"}
              </p>
            </div>
            {renderTimeList()}
          </div>
        )}

        {scheduleType === "schedule_interval" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">A cada</Label>
              <Input
                type="number"
                min="1"
                className="h-9 bg-white"
                value={(config.interval as number) || ""}
                onChange={(e) => updateConfig("interval", parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Unidade</Label>
              <Select 
                value={(config.unit as string) || "hours"} 
                onValueChange={(val) => updateConfig("unit", val)}
              >
                <SelectTrigger className="w-full bg-white h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minuto(s)</SelectItem>
                  <SelectItem value="hours">Hora(s)</SelectItem>
                  <SelectItem value="days">Dia(s)</SelectItem>
                  <SelectItem value="weeks">Semana(s)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5 mt-2">
              <Label className="text-xs font-medium text-slate-500">Horário inicial opcional</Label>
              <Input
                type="datetime-local"
                className="h-9 bg-white text-sm"
                value={(config.startAt as string) || ""}
                onChange={(e) => updateConfig("startAt", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
