import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, ArrowRight, Info, GitBranch, PhoneCall, CheckCircle2 } from "lucide-react";
import { useAllSequences } from "@/hooks/useSequences";
import { usePipelines } from "@/hooks/usePipelines";
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
  pipelineId?: string;
  stageId?: string;
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
  const { pipelines, isLoading: loadingPipelines } = usePipelines();
  const activeSequences = sequences.filter((s) => s.isActive !== false);

  const selectedPipeline = pipelines.find((p) => p.id === data.pipelineId);
  const availableStages = selectedPipeline?.stages || [];

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

  const handlePipelineChange = (pipelineId: string) => {
    if (pipelineId === "none") {
      onChange({ pipelineId: undefined, stageId: undefined });
      return;
    }
    const targetPipeline = pipelines.find((p) => p.id === pipelineId);
    const firstStage = targetPipeline?.stages?.[0];
    onChange({
      pipelineId,
      stageId: firstStage?.id || undefined,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 px-1 pr-2">
        {/* Bloco 1: Pipeline & CRM */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Destino no CRM (Pipeline de Vendas)</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Quando os leads retornarem da prospecção, crie automaticamente um card de negócio na pipeline selecionada.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Pipeline
              </Label>
              <Select
                value={data.pipelineId || "none"}
                onValueChange={handlePipelineChange}
              >
                <SelectTrigger className="h-10 rounded-xl bg-background border-border/50 text-xs">
                  <SelectValue placeholder={loadingPipelines ? "Carregando..." : "Selecione uma pipeline"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    Nenhuma (Apenas salvar lead no banco)
                  </SelectItem>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {data.pipelineId && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Etapa Inicial
                </Label>
                <Select
                  value={data.stageId || ""}
                  onValueChange={(v) => onChange({ stageId: v })}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-background border-border/50 text-xs">
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStages.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.name}
                      </SelectItem>
                    ))}
                    {availableStages.length === 0 && (
                      <SelectItem value="none" disabled className="text-xs">
                        Nenhuma etapa cadastrada
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground border-t border-primary/10">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>
              Validação automática: fixos vs WhatsApp. Se houver ambos, o celular vira o WhatsApp principal e o fixo vai para "Telefone Fixo".
            </span>
          </div>
        </div>

        {/* Bloco 2: Ação Pós-Prospecção */}
        <div>
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
            Ação com os leads
          </Label>

          <RadioGroup
            value={data.destinationMode}
            onValueChange={(v) => onChange({ destinationMode: v as DestinationMode })}
            className="space-y-2"
          >
            <label className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background/50 p-3.5 cursor-pointer hover:border-primary/40 transition-colors">
              <RadioGroupItem value="save_only" className="mt-1" />
              <div>
                <div className="font-bold text-xs">Apenas salvar os leads</div>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                  Os leads válidos serão salvos na base e inseridos na pipeline selecionada (se houver). Nenhuma mensagem será disparada.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background/50 p-3.5 cursor-pointer hover:border-primary/40 transition-colors">
              <RadioGroupItem value="review_before_start" className="mt-1" />
              <div>
                <div className="font-bold text-xs">Revisar antes de iniciar automação</div>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                  A prospecção ficará "Aguardando aprovação". Você poderá conferir a lista e aprovar os envios manualmente.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background/50 p-3.5 cursor-pointer hover:border-primary/40 transition-colors">
              <RadioGroupItem value="auto_start" className="mt-1" />
              <div>
                <div className="font-bold text-xs">Iniciar automação de mensagens automaticamente</div>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                  Os contatos elegíveis entrarão na fila de envio e receberão a sequência configurada automaticamente.
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {needsAutomation && (
          <div className="space-y-4 pt-2 border-t border-border/30">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sequência (Workflow) de Envio
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
                Os leads serão adicionados à fila e processados individualmente, respeitando intervalos anti-bloqueio e limites da cadência.
              </p>
            </div>

            <Accordion type="single" collapsible className="border border-border/40 rounded-2xl px-2">
              <AccordionItem value="advanced" className="border-0">
                <AccordionTrigger className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
                  Configurações avançadas da fila
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
                      <Label className="text-xs font-semibold text-muted-foreground">Horário início</Label>
                      <Input
                        type="time"
                        value={data.queuePolicy.start_time}
                        onChange={(e) => updatePolicy({ start_time: e.target.value })}
                        className="h-10 rounded-xl bg-background/50 border-border/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Horário fim</Label>
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

      <div className="flex justify-between gap-2 pt-4 shrink-0 border-t border-border/40">
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
