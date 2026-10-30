import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ApifySettingsService } from "@/services/apify/apifySettingsService";

export default function AdminApifyIntegration() {
  const queryClient = useQueryClient();

  const [apiKey, setApiKey] = useState("");
  const [actorId, setActorId] = useState("compass~crawler-google-places");
  const [defaultMaxPlaces, setDefaultMaxPlaces] = useState(50);
  const [defaultLanguage, setDefaultLanguage] = useState("pt-BR");

  const [testingConnection, setTestingConnection] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carregar Configuração da Apify
  const { data: config, isLoading } = useQuery({
    queryKey: ["admin_apify_config"],
    queryFn: async () => {
      const c = await ApifySettingsService.getApifyConfig();
      if (c) {
        setActorId(c.actorId || "compass~crawler-google-places");
        setDefaultMaxPlaces(c.defaultMaxPlaces || 50);
        setDefaultLanguage(c.defaultLanguage || "pt-BR");
      }
      return c;
    },
  });

  // Salvar Configuração
  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      await ApifySettingsService.saveApifyConfig({
        apiKey: apiKey || undefined,
        actorId,
        defaultMaxPlaces: Number(defaultMaxPlaces),
        defaultLanguage,
      });
      setApiKey(""); // Limpa o input por segurança
      toast.success("Configurações da Apify salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin_apify_config"] });
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
      toast.success(`Conexão com Apify validada com sucesso! Conta: ${res.username} (${res.actorStatus})`);
      queryClient.invalidateQueries({ queryKey: ["admin_apify_config"] });
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

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações Apify (Google Maps)</h1>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
            Credencial Única da Plataforma
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          A plataforma utiliza uma credencial da Apify para extração direta de empresas no Google Maps através do ator <span className="font-mono text-xs text-foreground">compass/crawler-google-places</span>.
        </p>
      </div>

      {/* Card 1: Status do Provedor Apify */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              Status do Provedor Apify
            </CardTitle>
            <CardDescription className="text-xs">
              Verificação de conectividade e autorização com a API oficial da Apify.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-2 text-xs"
            onClick={handleTestConnection}
            disabled={testingConnection || isLoading}
          >
            {testingConnection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Testar Conexão Agora
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/40 border border-border/40">
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Provedor</span>
              <div className="flex items-center gap-1.5 font-medium text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Apify (Oficial)
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block mb-1">Status</span>
              <div className="flex items-center gap-1.5 font-medium text-sm">
                {config?.status === "connected" ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-600 dark:text-emerald-400">Conectado & Ativo</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">Não Verificado</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block mb-1">Conta Conectada</span>
              <span className="font-medium text-sm truncate block" title={config?.userEmail}>
                {config?.username ? `${config.username}` : "—"}
              </span>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block mb-1">Última Validação</span>
              <span className="text-xs text-muted-foreground">
                {config?.lastValidatedAt
                  ? new Date(config.lastValidatedAt).toLocaleString("pt-BR")
                  : "Nunca validado"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Credencial e Parâmetros da API */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Credencial e Parâmetros da API
          </CardTitle>
          <CardDescription className="text-xs">
            A chave fica armazenada com segurança no banco de dados e é consumida pelas Edge Functions para prospecção automática.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Apify API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                Apify API Token {config?.maskedKey && `(Atual: ${config.maskedKey})`}
              </Label>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> Nunca exposta no frontend
              </span>
            </div>
            <Input
              type="password"
              placeholder="Deixe em branco para manter a chave atual"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Utilize um Personal API Token gerado no Apify Console (Settings &gt; Integrations &gt; API tokens).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ator da Apify */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Ator / Crawler da Apify
              </Label>
              <Input
                placeholder="compass~crawler-google-places"
                value={actorId}
                onChange={(e) => setActorId(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Ator oficial para raspagem do Google Maps (<span className="font-mono">compass/crawler-google-places</span>).
              </p>
            </div>

            {/* Idioma */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Idioma de Busca</Label>
              <Input
                placeholder="pt-BR"
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Idioma para localização de categorias e resultados (padrão: pt-BR).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Limite de empresas por busca */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Limite Padrão por Busca</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={defaultMaxPlaces}
                onChange={(e) => setDefaultMaxPlaces(Number(e.target.value))}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Quantidade padrão sugerida no assistente de prospecção (ex: 50).
              </p>
            </div>

            {/* Webhook Callback URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">URL de Retorno (Webhook)</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={config?.callbackUrl || "https://qualify-supabase.d2x.site/functions/v1/prospecting-callback"}
                  className="font-mono text-xs bg-muted/50 text-muted-foreground"
                />
                <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={copyCallbackUrl} title="Copiar URL">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Configurado dinamicamente na criação da run via parâmetro ad-hoc de webhooks.
              </p>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end pt-2">
            <Button
              className="gap-2 text-xs"
              onClick={handleSaveConfig}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Informações do MCP Server */}
      <Card className="border-border/60 shadow-sm bg-muted/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            Servidor MCP (Model Context Protocol) Instalado
          </CardTitle>
          <CardDescription className="text-xs">
            O assistente de IA está conectado ao servidor oficial de ferramentas da Apify via transporte Streamable HTTP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-muted/50 rounded-lg border border-border/40 font-mono text-xs text-foreground flex items-center justify-between">
            <span className="truncate">https://mcp.apify.com/?tools=fetch-actor-details,compass/crawler-google-places</span>
            <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">Streamable HTTP</Badge>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-muted-foreground text-xs py-1">Ferramentas ativas:</span>
            <Badge variant="outline" className="text-[11px] font-mono bg-background">fetch-actor-details</Badge>
            <Badge variant="outline" className="text-[11px] font-mono bg-background">compass/crawler-google-places</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
