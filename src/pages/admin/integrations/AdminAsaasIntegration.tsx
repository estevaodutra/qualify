import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CreditCard,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  Save,
  Globe,
  QrCode,
  Clock,
  Landmark,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function AdminAsaasIntegration() {
  const queryClient = useQueryClient();

  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [apiKey, setApiKey] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [pixExpirationMinutes, setPixExpirationMinutes] = useState(60);

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://jefuphrkyqddlyqckqba.supabase.co";
  const webhookUrl = `${supabaseUrl}/functions/v1/asaas-webhook`;

  // Carregar configuração do banco
  const { data: asaasConfig, isLoading } = useQuery({
    queryKey: ["admin", "platform-settings", "asaas_config"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_settings")
        .select("value")
        .eq("key", "asaas_config")
        .maybeSingle();
      if (error) throw error;
      return data?.value || {};
    },
  });

  useEffect(() => {
    if (asaasConfig) {
      if (asaasConfig.environment) setEnvironment(asaasConfig.environment);
      if (asaasConfig.webhook_token) setWebhookToken(asaasConfig.webhook_token);
      if (asaasConfig.enabled !== undefined) setEnabled(asaasConfig.enabled);
      if (asaasConfig.pix_expiration_minutes) setPixExpirationMinutes(asaasConfig.pix_expiration_minutes);
    }
  }, [asaasConfig]);

  // Salvar configuração
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        environment,
        webhook_token: webhookToken,
        enabled,
        pix_expiration_minutes: Number(pixExpirationMinutes) || 60,
      };
      if (apiKey) {
        payload.api_key = apiKey;
      } else if (asaasConfig?.api_key) {
        payload.api_key = asaasConfig.api_key;
      }

      const { error } = await (supabase as any).from("platform_settings").upsert(
        {
          key: "asaas_config",
          value: payload,
          description: "Configurações de integração com o gateway de pagamentos Asaas",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "platform-settings", "asaas_config"] });
      setApiKey("");
      toast.success("Configurações do Asaas salvas com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  // Testar conexão
  const handleTestConnection = async () => {
    const keyToTest = apiKey || asaasConfig?.api_key;
    if (!keyToTest) {
      toast.error("Informe a API Key do Asaas antes de testar.");
      return;
    }

    try {
      setTestingConnection(true);
      setTestResult(null);

      const baseUrl =
        environment === "production"
          ? "https://api.asaas.com/v3"
          : "https://sandbox.asaas.com/api/v3";

      // Teste direto na API do Asaas (GET /wallets ou /finance/balance)
      const res = await fetch(`${baseUrl}/finance/balance`, {
        method: "GET",
        headers: {
          access_token: keyToTest,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult({
          success: true,
          message: `Conexão bem-sucedida! Saldo na conta Asaas: R$ ${Number(data.balance || 0).toFixed(2)}`,
        });
        toast.success("Credenciais do Asaas validadas com sucesso!");
      } else {
        const errMsg = data.errors?.[0]?.description || "Chave inválida ou ambiente incorreto.";
        setTestResult({
          success: false,
          message: errMsg,
        });
        toast.error(`Falha no Asaas: ${errMsg}`);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: "Erro de rede ao conectar com Asaas: " + err.message,
      });
      toast.error("Erro ao testar conexão.");
    } finally {
      setTestingConnection(false);
    }
  };

  const hasConfiguredKey = !!asaasConfig?.api_key;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <Landmark className="h-8 w-8 text-primary" />
            Gateway de Pagamento Asaas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configuração da integração para recargas automáticas de carteira via PIX dinâmico
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasConfiguredKey ? (
            <Badge variant="outline" className="text-emerald-600 border-emerald-300 gap-1.5 px-3 py-1">
              <CheckCircle2 className="h-4 w-4" />
              Chave Configurada
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1.5 px-3 py-1">
              <AlertCircle className="h-4 w-4" />
              Chave Pendente
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Credenciais da API do Asaas
              </CardTitle>
              <CardDescription className="text-xs">
                Obtenha sua API Key no painel do Asaas em <strong>Configurações da Conta &gt; Integrações</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Ativar Recargas via Asaas</Label>
                  <p className="text-xs text-muted-foreground">
                    Permite que as empresas gerem PIX para adicionar saldo às suas carteiras.
                  </p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Ambiente</Label>
                  <Select value={environment} onValueChange={(v: any) => setEnvironment(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Homologação / Testes)</SelectItem>
                      <SelectItem value="production">Produção (Pagamentos Reais)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Expiração do PIX (Minutos)</Label>
                  <Input
                    type="number"
                    value={pixExpirationMinutes}
                    onChange={(e) => setPixExpirationMinutes(parseInt(e.target.value) || 60)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>API Key (Access Token)</span>
                  {hasConfiguredKey && (
                    <span className="text-[11px] text-muted-foreground">
                      Chave ativa já salva (preencha apenas para substituir)
                    </span>
                  )}
                </Label>
                <Input
                  type="password"
                  placeholder={hasConfiguredKey ? "••••••••••••••••••••••••••••••••" : "$aact_YTU5YTE0M2M6..."}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Geralmente inicia com <code>$aact_</code>. Fica armazenada de forma segura na plataforma.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Webhook Token (Opcional, Recomendado)</Label>
                <Input
                  type="text"
                  placeholder="Ex: asaas_secret_token_12345"
                  value={webhookToken}
                  onChange={(e) => setWebhookToken(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Token enviado pelo Asaas no cabeçalho <code>asaas-access-token</code> para validar a origem das notificações.
                </p>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-md text-xs flex items-center gap-2 ${
                    testResult.success
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testingConnection || (!apiKey && !hasConfiguredKey)}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${testingConnection ? "animate-spin" : ""}`} />
                  {testingConnection ? "Testando Conexão..." : "Testar Conexão"}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instruções de Webhook & Painel Asaas */}
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Configurar Webhook no Asaas
              </CardTitle>
              <CardDescription className="text-xs">
                Para que o saldo seja creditado instantaneamente após o pagamento do PIX.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">URL de Webhook da Plataforma</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={webhookUrl}
                    className="font-mono text-xs bg-muted/30 select-all"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      toast.success("URL copiada!");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-md border p-3 bg-muted/20 space-y-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Passo a passo no Asaas:</p>
                <ol className="list-decimal pl-4 space-y-1 leading-relaxed">
                  <li>Acesse o painel do Asaas (Sandbox ou Produção)</li>
                  <li>Vá em <strong>Configurações &gt; Integrações &gt; Webhooks para Cobranças</strong></li>
                  <li>Cole a URL acima no campo <strong>URL</strong></li>
                  <li>Selecione a versão da API: <strong>v3</strong></li>
                  <li>Marque os eventos: <strong>Pagamento Recebido (PAYMENT_RECEIVED)</strong> e <strong>Pagamento Confirmado (PAYMENT_CONFIRMED)</strong></li>
                  <li>Salve as alterações</li>
                </ol>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5"
                onClick={() =>
                  window.open(
                    environment === "production"
                      ? "https://www.asaas.com"
                      : "https://sandbox.asaas.com",
                    "_blank"
                  )
                }
              >
                Abrir Painel do Asaas
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
