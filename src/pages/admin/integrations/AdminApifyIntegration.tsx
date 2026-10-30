import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Server,
  Lock,
  Loader2,
  Copy,
  ExternalLink,
  MapPin,
  Bot,
  Sliders,
  DollarSign,
  Cpu,
  Layers,
  Clock,
  Eye,
  EyeOff,
  PhoneCall,
  Globe,
  Star,
  Check,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ApifySettingsService,
  ApifyRunItem,
} from "@/services/apify/apifySettingsService";

export default function AdminApifyIntegration() {
  const queryClient = useQueryClient();

  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [actorId, setActorId] = useState(ApifySettingsService.DEFAULT_ACTOR);
  const [customActor, setCustomActor] = useState(false);

  // Parâmetros operacionais
  const [defaultMaxPlaces, setDefaultMaxPlaces] = useState(50);
  const [defaultLanguage, setDefaultLanguage] = useState("pt-BR");
  const [defaultCountry, setDefaultCountry] = useState("BR");
  const [maxMemoryMbytes, setMaxMemoryMbytes] = useState(4096);
  const [timeoutSecs, setTimeoutSecs] = useState(300);

  // Filtros / Enriquecimento
  const [extractSocial, setExtractSocial] = useState(true);
  const [extractHours, setExtractHours] = useState(true);
  const [extractReviews, setExtractReviews] = useState(true);

  // Estados de ação
  const [testingConnection, setTestingConnection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [runs, setRuns] = useState<ApifyRunItem[]>([]);

  // Carregar Configuração da Apify
  const { data: config, isLoading } = useQuery({
    queryKey: ["admin_apify_config"],
    queryFn: async () => {
      const c = await ApifySettingsService.getApifyConfig();
      if (c) {
        setActorId(c.actorId || ApifySettingsService.DEFAULT_ACTOR);
        setDefaultMaxPlaces(c.defaultMaxPlaces || 50);
        setDefaultLanguage(c.defaultLanguage || "pt-BR");
        setDefaultCountry(c.defaultCountry || "BR");
        setMaxMemoryMbytes(c.maxMemoryMbytes || 4096);
        setTimeoutSecs(c.timeoutSecs || 300);
        setExtractSocial(c.extractSocial ?? true);
        setExtractHours(c.extractHours ?? true);
        setExtractReviews(c.extractReviews ?? true);

        const isPreset = ApifySettingsService.ACTOR_PRESETS.some(
          (p) => p.id === c.actorId
        );
        setCustomActor(!isPreset && !!c.actorId);
      }
      return c;
    },
  });

  // Carregar Histórico de Runs da Apify
  const fetchRecentRuns = async () => {
    try {
      setLoadingRuns(true);
      const data = await ApifySettingsService.getRecentRuns(5);
      setRuns(data);
    } catch {
      // Falha silenciosa
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    if (config?.configured) {
      fetchRecentRuns();
    }
  }, [config?.configured]);

  // Salvar Configurações
  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      await ApifySettingsService.saveApifyConfig({
        apiKey: apiKey || undefined,
        actorId,
        defaultMaxPlaces: Number(defaultMaxPlaces),
        defaultLanguage,
        defaultCountry,
        maxMemoryMbytes: Number(maxMemoryMbytes),
        timeoutSecs: Number(timeoutSecs),
        extractSocial,
        extractHours,
        extractReviews,
      });

      setApiKey(""); // Limpa o input por segurança
      toast.success("Configurações da Apify salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin_apify_config"] });
      fetchRecentRuns();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar configuração.");
    } finally {
      setSaving(false);
    }
  };

  // Testar Conexão em Tempo Real
  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      const res = await ApifySettingsService.validateApifyConnection();
      toast.success(
        `Conexão com Apify validada com sucesso! Conta: ${res.username} (${res.planName}) | Ator: ${res.actorStatus}`
      );
      queryClient.invalidateQueries({ queryKey: ["admin_apify_config"] });
      fetchRecentRuns();
    } catch (err: any) {
      toast.error(err.message || "Falha na validação com a Apify.");
    } finally {
      setTestingConnection(false);
    }
  };

  const copyCallbackUrl = () => {
    if (config?.callbackUrl) {
      navigator.clipboard.writeText(config.callbackUrl);
      toast.success("URL do webhook copiada para a área de transferência!");
    }
  };

  const handleActorSelect = (val: string) => {
    if (val === "custom") {
      setCustomActor(true);
    } else {
      setCustomActor(false);
      setActorId(val);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header com estilo idêntico ao Super Admin OpenAI */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Compass className="h-6 w-6 text-primary" />
              Configurações Apify para Prospecção
            </h1>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-medium"
            >
              Credencial Única da Plataforma
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            A plataforma utiliza uma credencial mestra da Apify no backend para alimentar o
            motor de prospecção ativa de empresas no Google Maps. Os clientes e empresas não
            precisam configurar chaves individuais.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-xs h-8 gap-1.5"
          >
            <a
              href="https://console.apify.com"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Apify Console
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-xs h-8 gap-1.5"
          >
            <a
              href="https://apify.com/compass/crawler-google-places"
              target="_blank"
              rel="noreferrer"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Ver Ator na Store
            </a>
          </Button>
        </div>
      </div>

      {/* Card 1: Status do Provedor Apify */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              Status do Provedor Apify
            </CardTitle>
            <CardDescription className="text-xs">
              Verificação de conectividade, autorização de token e saúde do Ator scraper na Apify.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={testingConnection || isLoading}
            className="text-xs h-8"
          >
            {testingConnection ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Testar Conexão Agora
          </Button>
        </CardHeader>

        <CardContent className="space-y-3 text-xs pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
              <span className="text-muted-foreground text-[11px]">Provedor</span>
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Apify (REST API v2)
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
              <span className="text-muted-foreground text-[11px]">Status</span>
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                {config?.configured ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-600 dark:text-emerald-400">Conectado & Ativo</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">Pendente de Configuração</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
              <span className="text-muted-foreground text-[11px]">Conta Conectada</span>
              <div className="font-semibold text-foreground truncate" title={config?.userEmail}>
                {config?.username ? `${config.username}` : "Não identificada"}
              </div>
              {config?.planName && (
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  Plano: <Badge variant="secondary" className="text-[9px] py-0 px-1 font-mono">{config.planName}</Badge>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
              <span className="text-muted-foreground text-[11px]">Última Validação</span>
              <div className="font-mono text-[11px] text-foreground">
                {config?.lastValidatedAt
                  ? new Date(config.lastValidatedAt).toLocaleString("pt-BR")
                  : "Não validada recentemente"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {config?.monthlyUsageUsd !== undefined ? `Uso mês: $${config.monthlyUsageUsd.toFixed(2)} USD` : ""}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Credencial de Acesso (API Token) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Credencial e Autenticação (Personal API Token)
          </CardTitle>
          <CardDescription className="text-xs">
            A chave fica criptografada e armazenada exclusivamente nas configurações de sistema protegidas do backend.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center justify-between">
              <span>Apify API Token {config?.maskedKey && `(Atual: ${config.maskedKey})`}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-500" /> Nunca exposta no frontend
              </span>
            </Label>
            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={config?.configured ? "Deixe em branco para manter a chave atual" : "apify_api_..."}
                className="h-9 text-xs font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>
                Obtenha seu token no console da Apify:{" "}
                <a
                  href="https://console.apify.com/account/integrations"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Settings &gt; Integrations &gt; API tokens
                  <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                </a>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Recurso Utilizado (Ator / Scraper) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Recurso Utilizado na Prospecção (Ator / Crawler da Apify)
              </CardTitle>
              <CardDescription className="text-xs">
                Definição de qual ator da Apify Store executa a extração no Google Maps e os parâmetros de computação.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {actorId}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 text-xs">
          {/* Seletor de Ator */}
          <div className="space-y-1.5">
            <Label className="text-xs">Modelo de Ator Homologado</Label>
            <Select
              value={customActor ? "custom" : actorId}
              onValueChange={handleActorSelect}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione o ator de prospecção" />
              </SelectTrigger>
              <SelectContent>
                {ApifySettingsService.ACTOR_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id} className="text-xs">
                    <div className="flex flex-col py-0.5">
                      <span className="font-semibold text-foreground">{preset.label}</span>
                      <span className="text-[10px] text-muted-foreground">{preset.id}</span>
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="custom" className="text-xs">
                  Outro Ator Personalizado (Informar ID manual)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campo Ator ID (se customizado ou para ajuste fino) */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center justify-between">
              <span>Ator / Crawler ID da Apify</span>
              <span className="text-[11px] text-muted-foreground">Formato: username/actor-name ou username~actor-name</span>
            </Label>
            <Input
              value={actorId}
              onChange={(e) => {
                setActorId(e.target.value);
                setCustomActor(true);
              }}
              placeholder="compass~crawler-google-places"
              className="h-8 text-xs font-mono"
            />
            {config?.actorTitle && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                <Check className="h-3 w-3" /> Título oficial do ator: <strong className="font-medium">{config.actorTitle}</strong>
              </p>
            )}
          </div>

          {/* Parâmetros de Computação do Recurso */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-primary" />
                Memória Máxima por Execução (MB)
              </Label>
              <Input
                type="number"
                min={512}
                step={512}
                value={maxMemoryMbytes}
                onChange={(e) => setMaxMemoryMbytes(Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Padrão recomendado: 4096 MB para maior velocidade no scraping simultâneo.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Timeout Máximo de Execução (Segundos)
              </Label>
              <Input
                type="number"
                min={30}
                step={30}
                value={timeoutSecs}
                onChange={(e) => setTimeoutSecs(Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Padrão: 300s (5 minutos). Cancela a run se o ator ultrapassar esse tempo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Parâmetros Operacionais da Prospecção */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            Parâmetros Operacionais e Enriquecimento de Leads
          </CardTitle>
          <CardDescription className="text-xs">
            Valores padrão aplicados quando os operadores e usuários iniciam campanhas de prospecção.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Limite Padrão por Busca (Lugares)</Label>
              <Input
                type="number"
                min={5}
                max={500}
                value={defaultMaxPlaces}
                onChange={(e) => setDefaultMaxPlaces(Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Sugerido no assistente (ex: 50)</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Idioma dos Resultados</Label>
              <Input
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                placeholder="pt-BR"
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Localização dos termos (pt-BR)</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Código do País Padrão</Label>
              <Input
                value={defaultCountry}
                onChange={(e) => setDefaultCountry(e.target.value)}
                placeholder="BR"
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Filtro de geolocalização (BR)</p>
            </div>
          </div>

          <div className="border-t border-border/40 pt-3 space-y-3">
            <span className="text-[11px] font-medium text-foreground block">
              Recursos de Enriquecimento Automático:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <div className="font-medium text-foreground text-xs">Telefones & DDD</div>
                    <div className="text-[10px] text-muted-foreground">Formatados com DDI +55</div>
                  </div>
                </div>
                <Switch checked={true} disabled />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <div className="font-medium text-foreground text-xs">Websites & Redes</div>
                    <div className="text-[10px] text-muted-foreground">Instagram, Face, Links</div>
                  </div>
                </div>
                <Switch
                  checked={extractSocial}
                  onCheckedChange={setExtractSocial}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <div className="font-medium text-foreground text-xs">Avaliações & Horários</div>
                    <div className="text-[10px] text-muted-foreground">Rating e horários do Google</div>
                  </div>
                </div>
                <Switch
                  checked={extractReviews}
                  onCheckedChange={setExtractReviews}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 5: Webhook & Retorno (Callback) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Webhook de Retorno & Ingestão Contínua (Callback)
          </CardTitle>
          <CardDescription className="text-xs">
            URL chamada automaticamente pela Apify ao finalizar a raspagem para salvar os leads na campanha do Qualify.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs">URL Oficial de Retorno</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={
                  config?.callbackUrl ||
                  "https://qualify-supabase.d2x.site/functions/v1/prospecting-callback"
                }
                className="font-mono text-xs bg-muted/50 text-foreground"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-3 shrink-0 gap-1.5"
                onClick={copyCallbackUrl}
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] pt-1">
            <span className="text-muted-foreground py-0.5">Eventos monitorados:</span>
            <Badge variant="outline" className="font-mono text-[10px] bg-background">
              ACTOR.RUN.SUCCEEDED
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px] bg-background">
              ACTOR.RUN.FAILED
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px] bg-background">
              ACTOR.RUN.ABORTED
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Card 6: Histórico de Runs Recentes da Apify */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Últimas Execuções do Ator (Runs na Apify)
            </CardTitle>
            <CardDescription className="text-xs">
              Histórico direto da API da Apify para monitorar disparos recentes e consumo.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-xs"
            onClick={fetchRecentRuns}
            disabled={loadingRuns || !config?.configured}
          >
            {loadingRuns ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Atualizar Runs
          </Button>
        </CardHeader>

        <CardContent className="text-xs">
          {runs.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10">
              <Compass className="h-8 w-8 mx-auto mb-2 opacity-40 text-primary" />
              <p className="font-medium text-foreground">Nenhuma execução recente encontrada</p>
              <p className="text-[11px] mt-0.5">
                {config?.configured
                  ? "As execuções aparecerão aqui assim que as campanhas de prospecção forem iniciadas."
                  : "Configure o API Token para carregar o histórico de execuções."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40 border rounded-lg overflow-hidden">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="p-3 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 font-mono ${
                        run.status === "SUCCEEDED"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : run.status === "RUNNING"
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse"
                          : "bg-red-500/10 text-red-600 border-red-500/20"
                      }`}
                    >
                      {run.status}
                    </Badge>
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-foreground truncate">
                        Run ID: {run.id}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {run.startedAt ? new Date(run.startedAt).toLocaleString("pt-BR") : "—"}
                        {run.durationSeconds ? ` (${run.durationSeconds}s)` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="font-semibold text-foreground text-xs">
                        {run.itemCount} leads extraídos
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        ${run.usageTotalUsd?.toFixed(4) || "0.0000"} USD
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      asChild
                    >
                      <a
                        href={`https://console.apify.com/actors/runs/${run.id}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir no Apify Console"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botão de Salvar no Rodapé */}
      <div className="flex justify-end pt-2 pb-6">
        <Button
          size="default"
          onClick={handleSaveConfig}
          disabled={saving}
          className="text-xs px-5 gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar Configurações da Apify
        </Button>
      </div>
    </div>
  );
}
