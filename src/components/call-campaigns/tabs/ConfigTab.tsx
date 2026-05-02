import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCallOperators } from "@/hooks/useCallOperators";
import { useCallActions } from "@/hooks/useCallActions";
import { CallCampaign } from "@/hooks/useCallCampaigns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Users, Wifi, Phone, ArrowRight, RefreshCw, AlertTriangle, Star } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const RETRY_INTERVAL_OPTIONS = [
  { label: "5 minutos", value: 5 },
  { label: "10 minutos", value: 10 },
  { label: "15 minutos", value: 15 },
  { label: "30 minutos", value: 30 },
  { label: "1 hora", value: 60 },
  { label: "2 horas", value: 120 },
  { label: "4 horas", value: 240 },
  { label: "8 horas", value: 480 },
  { label: "24 horas", value: 1440 },
];

interface ConfigTabProps {
  campaign: CallCampaign;
  onUpdate: (params: { id: string; updates: Partial<CallCampaign> }) => Promise<CallCampaign>;
}

export function ConfigTab({ campaign, onUpdate }: ConfigTabProps) {
  const navigate = useNavigate();
  const { operators } = useCallOperators();
  const { actions: campaignActions } = useCallActions(campaign.id);
  const activeOperators = operators.filter(o => o.isActive);
  const availableOperators = operators.filter(o => o.status === "available" && o.isActive);
  const onCallOperators = operators.filter(o => o.status === "on_call");

  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description || "");
  const [status, setStatus] = useState(campaign.status);
  const [dialDelayMinutes, setDialDelayMinutes] = useState(campaign.dialDelayMinutes);
  const [api4comQueueId, setApi4comQueueId] = useState(
    (campaign.api4comConfig?.queueId as string) || ""
  );
  const [queueExecutionEnabled, setQueueExecutionEnabled] = useState(campaign.queueExecutionEnabled);
  const [queueIntervalSeconds, setQueueIntervalSeconds] = useState(campaign.queueIntervalSeconds);
  const [queueUnavailableBehavior, setQueueUnavailableBehavior] = useState(campaign.queueUnavailableBehavior);
  const [retryCount, setRetryCount] = useState(campaign.retryCount);
  const [retryIntervalMinutes, setRetryIntervalMinutes] = useState(campaign.retryIntervalMinutes);
  const [retryExceededBehavior, setRetryExceededBehavior] = useState(campaign.retryExceededBehavior);
  const [retryExceededActionId, setRetryExceededActionId] = useState<string | null>(campaign.retryExceededActionId);
  const [isPriority, setIsPriority] = useState(campaign.isPriority);
  const [priorityPosition, setPriorityPosition] = useState(campaign.priorityPosition);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        id: campaign.id,
        updates: {
          name,
          description: description || undefined,
          status,
          dialDelayMinutes,
          api4comConfig: api4comQueueId ? { queueId: api4comQueueId } : {},
          queueExecutionEnabled,
          queueIntervalSeconds,
          queueUnavailableBehavior,
          retryCount,
          retryIntervalMinutes,
          retryExceededBehavior,
          retryExceededActionId,
          isPriority,
          priorityPosition,
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    name !== campaign.name ||
    description !== (campaign.description || "") ||
    status !== campaign.status ||
    dialDelayMinutes !== campaign.dialDelayMinutes ||
    api4comQueueId !== ((campaign.api4comConfig?.queueId as string) || "") ||
    queueExecutionEnabled !== campaign.queueExecutionEnabled ||
    queueIntervalSeconds !== campaign.queueIntervalSeconds ||
    queueUnavailableBehavior !== campaign.queueUnavailableBehavior ||
    retryCount !== campaign.retryCount ||
    retryIntervalMinutes !== campaign.retryIntervalMinutes ||
    retryExceededBehavior !== campaign.retryExceededBehavior ||
    retryExceededActionId !== campaign.retryExceededActionId ||
    isPriority !== campaign.isPriority ||
    priorityPosition !== campaign.priorityPosition;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome da Campanha</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da campanha"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da campanha..."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dialDelay">Intervalo para Ligação (minutos)</Label>
            <Input
              id="dialDelay"
              type="number"
              min={1}
              max={120}
              value={dialDelayMinutes}
              onChange={(e) => setDialDelayMinutes(Number(e.target.value) || 10)}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground">
              Tempo de espera entre o registro e a execução da ligação.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CallCampaign["status"])}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Priority */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Prioridade
            </CardTitle>
            <CardDescription>
              Quando habilitado, as ligações desta campanha entram à frente na fila,
              sendo posicionadas entre as próximas 5 ligações disponíveis.
            </CardDescription>
          </div>
          <Switch
            checked={isPriority}
            onCheckedChange={setIsPriority}
          />
        </CardHeader>
        {isPriority && (
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="priorityPosition">Posição na Fila (1-5)</Label>
              <Input
                id="priorityPosition"
                type="number"
                min={1}
                max={5}
                value={priorityPosition}
                onChange={(e) => setPriorityPosition(Math.min(5, Math.max(1, Number(e.target.value) || 3)))}
                placeholder="3"
                className="max-w-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Posição 1 = próxima ligação. Posição 5 = após 4 ligações.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>Execução em Fila</CardTitle>
            <CardDescription>
              Quando habilitado, o sistema executa automaticamente as ligações da fila,
              uma por vez, respeitando a disponibilidade dos operadores.
            </CardDescription>
          </div>
          <Switch
            checked={queueExecutionEnabled}
            onCheckedChange={setQueueExecutionEnabled}
          />
        </CardHeader>
        {queueExecutionEnabled && (
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="queueInterval">Intervalo entre Ligações (segundos)</Label>
              <Input
                id="queueInterval"
                type="number"
                min={5}
                max={300}
                value={queueIntervalSeconds}
                onChange={(e) => setQueueIntervalSeconds(Number(e.target.value) || 30)}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                Tempo de espera após encerrar uma ligação antes de iniciar a próxima.
              </p>
              <p className="text-xs text-muted-foreground italic">
                ℹ️ Operadores podem ajustar este tempo individualmente.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Comportamento quando operador indisponível</Label>
              <RadioGroup
                value={queueUnavailableBehavior}
                onValueChange={(v) => setQueueUnavailableBehavior(v as "wait" | "pause")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="wait" id="wait" />
                  <Label htmlFor="wait" className="font-normal cursor-pointer">
                    Aguardar operador ficar disponível
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pause" id="pause" />
                  <Label htmlFor="pause" className="font-normal cursor-pointer">
                    Pausar fila até intervenção manual
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Retentativas ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Retentativas</CardTitle>
          </div>
          <CardDescription>
            Configure quantas vezes o sistema deve tentar ligar quando o lead não atender.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="retryCount">Quantidade de Retentativas</Label>
            <Input
              id="retryCount"
              type="number"
              min={0}
              max={10}
              value={retryCount}
              onChange={(e) => setRetryCount(Math.min(10, Math.max(0, Number(e.target.value) || 0)))}
              placeholder="3"
              className="max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Número máximo de tentativas antes de desistir. (0 = sem retentativa)
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="retryInterval">Intervalo entre Retentativas</Label>
            <Select
              value={String(retryIntervalMinutes)}
              onValueChange={(v) => setRetryIntervalMinutes(Number(v))}
            >
              <SelectTrigger id="retryInterval" className="max-w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETRY_INTERVAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Tempo de espera antes de tentar novamente.
            </p>
          </div>

          {retryCount > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>Ao Exceder Retentativas</Label>
                <RadioGroup
                  value={retryExceededBehavior}
                  onValueChange={(v) => setRetryExceededBehavior(v as "mark_failed" | "execute_action")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mark_failed" id="mark_failed" />
                    <Label htmlFor="mark_failed" className="font-normal cursor-pointer">
                      Apenas marcar como "Não Atendeu"
                    </Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="execute_action" id="execute_action" className="mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="execute_action" className="font-normal cursor-pointer">
                        Executar ação da campanha:
                      </Label>
                      {retryExceededBehavior === "execute_action" && (
                        <div className="space-y-2">
                          {campaignActions.length === 0 ? (
                            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              <span>
                                Nenhuma ação cadastrada. Acesse a aba <strong>Ações</strong> para criar uma.
                              </span>
                            </div>
                          ) : (
                            <Select
                              value={retryExceededActionId || ""}
                              onValueChange={(v) => setRetryExceededActionId(v || null)}
                            >
                              <SelectTrigger className="max-w-[280px]">
                                <SelectValue placeholder="Selecione uma ação..." />
                              </SelectTrigger>
                              <SelectContent>
                                {campaignActions.map((action) => (
                                  <SelectItem key={action.id} value={action.id}>
                                    {action.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {retryExceededActionId && campaignActions.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              ℹ️ A ação será executada automaticamente quando todas as tentativas falharem.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integração API4com</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="queueId">ID da Fila (opcional)</Label>
            <Input
              id="queueId"
              value={api4comQueueId}
              onChange={(e) => setApi4comQueueId(e.target.value)}
              placeholder="Ex: queue-12345"
            />
            <p className="text-xs text-muted-foreground">
              Configure o ID da fila para integração com o sistema de telefonia.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Operadores Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{activeOperators.length}</p>
                <p className="text-xs text-muted-foreground">Total Ativos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-lg font-bold">{availableOperators.length}</p>
                <p className="text-xs text-muted-foreground">Disponíveis</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-lg font-bold">{onCallOperators.length}</p>
                <p className="text-xs text-muted-foreground">Em Ligação</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            ℹ️ Os operadores são gerenciados no Painel de Ligações. Todos os operadores ativos participam automaticamente das campanhas.
          </p>
          <Button variant="outline" onClick={() => navigate("/painel-ligacoes")}>
            <Users className="mr-2 h-4 w-4" />
            Gerenciar Operadores
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
