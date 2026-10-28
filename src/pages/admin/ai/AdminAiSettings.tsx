import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  ShieldCheck,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Server,
  DollarSign,
  Cpu,
  Lock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { AIExecutionService } from "@/services/ai/aiExecutionService";

export default function AdminAiSettings() {
  const queryClient = useQueryClient();

  const [apiKey, setApiKey] = useState("");
  const [projectId, setProjectId] = useState("");
  const [orgId, setOrgId] = useState("");
  const [defaultModel, setDefaultModel] = useState("gpt-4o-mini");
  const [spendLimit, setSpendLimit] = useState(500);

  const [testingConnection, setTestingConnection] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carregar Configuração
  const { data: config, isLoading } = useQuery({
    queryKey: ["admin_ai_config"],
    queryFn: async () => {
      const c = await AIExecutionService.getOpenAiConfig();
      if (c) {
        setProjectId(c.projectId || "");
        setOrgId(c.orgId || "");
        setDefaultModel(c.defaultModel || "gpt-4o-mini");
        setSpendLimit(c.monthlySpendLimit || 500);
      }
      return c;
    },
  });

  // Salvar Configuração
  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      await AIExecutionService.saveOpenAiConfig({
        apiKey: apiKey || undefined,
        projectId,
        organizationId: orgId,
        defaultModel,
        monthlySpendLimit: Number(spendLimit),
      });
      setApiKey(""); // Limpa o input de chave para segurança
      toast.success("Configuração da OpenAI salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin_ai_config"] });
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
      const res = await AIExecutionService.validateOpenAiConnection();
      toast.success(`Conexão com OpenAI validada! ${res.modelsCount} modelos disponíveis.`);
      queryClient.invalidateQueries({ queryKey: ["admin_ai_config"] });
    } catch (err: any) {
      toast.error(err.message || "Falha na validação com a OpenAI.");
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações OpenAI da Criafy</h1>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
            Credencial Única da Plataforma
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          A Criafy utiliza uma única chave mestra da OpenAI protegida no backend. Clientes e empresas não configuram nem possuem acesso às chaves.
        </p>
      </div>

      {/* Card de Status da Conexão */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                Status do Provedor OpenAI
              </CardTitle>
              <CardDescription className="text-xs">
                Verificação de conectividade com a API oficial da OpenAI.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="text-xs"
            >
              {testingConnection ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Testar Conexão Agora
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-xs pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
              <span className="text-muted-foreground text-[11px]">Provedor</span>
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                OpenAI (Oficial)
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
              <span className="text-muted-foreground text-[11px]">Status</span>
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                {config?.configured ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Conectado & Ativo
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Pendente de Configuração
                  </>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
              <span className="text-muted-foreground text-[11px]">Última Validação</span>
              <div className="font-mono text-[11px] text-foreground">
                {config?.lastValidatedAt
                  ? new Date(config.lastValidatedAt).toLocaleString("pt-BR")
                  : "Não validada recentemente"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Credencial */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            Credencial e Parâmetros da API
          </CardTitle>
          <CardDescription className="text-xs">
            A chave fica criptografada e armazenada exclusivamente nas configurações de sistema protegidas do backend.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center justify-between">
              <span>OpenAI API Key {config?.maskedKey && `(Atual: ${config.maskedKey})`}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> Nunca exposta no frontend
              </span>
            </Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.configured ? "Deixe em branco para manter a chave atual" : "sk-proj-..."}
              className="h-8 text-xs font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Utilize uma API Key de projeto Criafy com permissão para Responses e Chat.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Project ID (Opcional)</Label>
              <Input
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="proj_..."
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Organization ID (Opcional)</Label>
              <Input
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="org-..."
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Modelo Padrão da Plataforma</Label>
              <Input
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                placeholder="gpt-4o-mini"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Limite Interno de Alerta Mensal ($ USD)</Label>
              <Input
                type="number"
                value={spendLimit}
                onChange={(e) => setSpendLimit(Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button size="sm" onClick={handleSaveConfig} disabled={saving} className="text-xs">
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
