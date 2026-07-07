import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import { useAllSequences } from "@/hooks/useSequences";
import type { DestinationMode, QueuePolicy } from "@/hooks/useProspectingCampaigns";

const WEEKDAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

export interface StepDestinationData {
  destinationMode: DestinationMode;
  automationCampaignId: string;
  automationSequenceId: string;
  instanceId: string;
  queuePolicy: QueuePolicy;
}

interface StepDestinationProps {
  data: StepDestinationData;
  onChange: (patch: Partial<StepDestinationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepDestination({ data, onChange, onNext, onBack }: StepDestinationProps) {
  const { sequences } = useAllSequences();
  const activeSequences = sequences.filter((s) => s.isActive !== false);

  const needsAutomation = data.destinationMode === "review_before_start" || data.destinationMode === "auto_start";
  const isValid =
    data.destinationMode === "save_only" ||
    !!data.automationSequenceId;

  const updatePolicy = (patch: Partial<QueuePolicy>) => {
    onChange({ queuePolicy: { ...data.queuePolicy, ...patch } });
  };

  const toggleDay = (day: number) => {
    const days = data.queuePolicy.allowed_days.includes(day)
      ? data.queuePolicy.allowed_days.filter((d) => d !== day)
      : [...data.queuePolicy.allowed_days, day];
    updatePolicy({ allowed_days: days });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 px-1">
        <p className="text-sm text-muted-foreground/80 -mt-1 mb-2">
          O que deve acontecer após a prospecção?
        </p>

        <RadioGroup
          value={data.destinationMode}
          onValueChange={(v) => onChange({ destinationMode: v as DestinationMode })}
          className="space-y-2"
        >
          <label className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background/50 p-4 cursor-pointer hover:border-primary/40">
            <RadioGroupItem value="save_only" className="mt-1" />
            <div>
              <div className="font-bold text-sm">Apenas salvar os leads</div>
              <p className="text-xs text-muted-foreground/70">
                Os leads válidos serão salvos na Central de Leads, vinculados a esta prospecção. Nenhuma automação será iniciada.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background/50 p-4 cursor-pointer hover:border-primary/40">
            <RadioGroupItem value="review_before_start" className="mt-1" />
            <div>
              <div className="font-bold text-sm">Revisar antes de iniciar</div>
              <p className="text-xs text-muted-foreground/70">
                A prospecção ficará "Aguardando aprovação". Você poderá selecionar os leads e aprovar o início da automação depois.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background/50 p-4 cursor-pointer hover:border-primary/40">
            <RadioGroupItem value="auto_start" className="mt-1" />
            <div>
              <div className="font-bold text-sm">Iniciar uma automação automaticamente</div>
              <p className="text-xs text-muted-foreground/70">
                Os leads elegíveis são adicionados a uma fila e processados individualmente assim que a prospecção terminar.
              </p>
            </div>
          </label>
        </RadioGroup>

        {needsAutomation && (
          <div className="space-y-4 pt-2 border-t border-border/30">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sequência (Workflow)
              </Label>
              <Select
                value={data.automationSequenceId}
                onValueChange={(v) => onChange({ automationSequenceId: v })}
              >
                <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/40">
                  <SelectValue placeholder="Selecione o fluxo a ser iniciado" />
                </SelectTrigger>
                <SelectContent>
                  {activeSequences.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                  {activeSequences.length === 0 && (
                    <SelectItem value="none" disabled>Nenhum fluxo ativo</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {data.destinationMode === "auto_start" && (
          <>
            <div className="rounded-xl bg-info/10 border border-info/20 p-3 flex gap-2">
              <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/80">
                Os leads serão adicionados a uma fila e processados individualmente, respeitando os intervalos e limites configurados.
              </p>
            </div>

            <Accordion type="single" collapsible className="border border-border/40 rounded-2xl px-2">
              <AccordionItem value="advanced" className="border-0">
                <AccordionTrigger className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
                  Configurações avançadas
                </AccordionTrigger>
                <AccordionContent className="space-y-4 px-2 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Delay mínimo (minutos)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={Math.round(data.queuePolicy.delay_min_seconds / 60)}
                        onChange={(e) => updatePolicy({ delay_min_seconds: Number(e.target.value) * 60 })}
                        className="h-10 rounded-xl bg-background/50 border-border/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Delay máximo (minutos)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={Math.round(data.queuePolicy.delay_max_seconds / 60)}
                        onChange={(e) => updatePolicy({ delay_max_seconds: Number(e.target.value) * 60 })}
                        className="h-10 rounded-xl bg-background/50 border-border/40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Limite por hora</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Sem limite"
                        value={data.queuePolicy.hourly_limit ?? ""}
                        onChange={(e) => updatePolicy({ hourly_limit: e.target.value ? Number(e.target.value) : null })}
                        className="h-10 rounded-xl bg-background/50 border-border/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Limite diário</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Sem limite"
                        value={data.queuePolicy.daily_limit ?? ""}
                        onChange={(e) => updatePolicy({ daily_limit: e.target.value ? Number(e.target.value) : null })}
                        className="h-10 rounded-xl bg-background/50 border-border/40"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Dias permitidos</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={`h-9 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                            data.queuePolicy.allowed_days.includes(day.value)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background/50 border-border/40 text-muted-foreground"
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Horário inicial</Label>
                      <Input
                        type="time"
                        value={data.queuePolicy.start_time}
                        onChange={(e) => updatePolicy({ start_time: e.target.value })}
                        className="h-10 rounded-xl bg-background/50 border-border/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Horário final</Label>
                      <Input
                        type="time"
                        value={data.queuePolicy.end_time}
                        onChange={(e) => updatePolicy({ end_time: e.target.value })}
                        className="h-10 rounded-xl bg-background/50 border-border/40"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">Pausar quando o lead responder</Label>
                    <Switch
                      checked={data.queuePolicy.pause_on_reply}
                      onCheckedChange={(checked) => updatePolicy({ pause_on_reply: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">Retomar fila após reconexão da instância</Label>
                    <Switch
                      checked={data.queuePolicy.auto_resume_on_reconnect}
                      onCheckedChange={(checked) => updatePolicy({ auto_resume_on_reconnect: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Permitir reentrada de leads que já participaram desta automação
                    </Label>
                    <Switch
                      checked={data.queuePolicy.allow_reentry}
                      onCheckedChange={(checked) => updatePolicy({ allow_reentry: checked })}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </div>

      <div className="flex justify-between gap-2 pt-4 shrink-0">
        <Button type="button" variant="ghost" onClick={onBack} className="rounded-xl font-semibold">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="rounded-xl gradient-primary glow-primary font-bold shadow-lg min-w-[120px]"
        >
          Continuar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
