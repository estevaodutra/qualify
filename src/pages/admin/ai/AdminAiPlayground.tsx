import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  PlayCircle,
  Sparkles,
  Layers,
  Building2,
  Instagram,
  Zap,
  Clock,
  DollarSign,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Copy,
  Code,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AIExecutionService } from "@/services/ai/aiExecutionService";
import { AiExecutionResult } from "@/types/aiSkills";

export default function AdminAiPlayground() {
  const [searchParams] = useSearchParams();
  const preselectedSkillSlug = searchParams.get("skillSlug") || "";

  // Seletores
  const [selectedSkillSlug, setSelectedSkillSlug] = useState<string>("");
  const [selectedVersion, setSelectedVersion] = useState<string>("active");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("none");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("none");

  // Parâmetros de Entrada
  const [theme, setTheme] = useState("");
  const [objective, setObjective] = useState("");
  const [angle, setAngle] = useState("");
  const [cta, setCta] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");

  // Estado de Execução
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<AiExecutionResult | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // 1. Carregar Skills
  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ["admin_ai_skills_all"],
    queryFn: () => AIExecutionService.getSkills(),
  });

  // Atualizar skill selecionada se vier por query param ou default
  useEffect(() => {
    if (preselectedSkillSlug) {
      setSelectedSkillSlug(preselectedSkillSlug);
    } else if (skills.length > 0 && !selectedSkillSlug) {
      setSelectedSkillSlug(skills[0].slug);
    }
  }, [skills, preselectedSkillSlug]);

  const currentSkill = skills.find((s) => s.slug === selectedSkillSlug);

  // 2. Carregar Versões da Skill Selecionada
  const { data: versions = [] } = useQuery({
    queryKey: ["admin_ai_skill_versions", currentSkill?.id],
    queryFn: () => (currentSkill ? AIExecutionService.getSkillVersions(currentSkill.id) : []),
    enabled: !!currentSkill?.id,
  });

  // 3. Carregar Empresas do Sistema
  const { data: companies = [] } = useQuery({
    queryKey: ["admin_companies_list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("companies")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // 4. Carregar Contas de Instagram da Empresa Selecionada
  const { data: accounts = [] } = useQuery({
    queryKey: ["admin_company_accounts", selectedCompanyId],
    queryFn: async () => {
      if (selectedCompanyId === "none") return [];
      const { data, error } = await (supabase as any)
        .from("criafy_instagram_accounts")
        .select("id, username, name")
        .eq("company_id", selectedCompanyId);
      if (error) throw error;
      return data || [];
    },
    enabled: selectedCompanyId !== "none",
  });

  // Executar no Playground
  const handleExecute = async () => {
    if (!selectedSkillSlug) {
      toast.error("Selecione uma Skill para testar.");
      return;
    }

    try {
      setExecuting(true);
      setErrorDetails(null);
      setExecutionResult(null);

      const chosenVersionNumber =
        selectedVersion !== "active" ? parseInt(selectedVersion) : undefined;

      const res = await AIExecutionService.generate({
        skillSlug: selectedSkillSlug,
        skillVersion: chosenVersionNumber,
        companyId: selectedCompanyId !== "none" ? selectedCompanyId : undefined,
        accountId: selectedAccountId !== "none" ? selectedAccountId : undefined,
        theme: theme || "Tendências do mercado e quebra de mitos",
        objective: objective || "Autoridade e retenção máxima",
        angle: angle || undefined,
        cta: cta || undefined,
        customInstruction: customInstruction || undefined,
      });

      setExecutionResult(res);
      toast.success("Execução concluída com sucesso!");
    } catch (err: any) {
      setErrorDetails(err.message || "Falha na execução.");
      toast.error(err.message || "Falha na execução.");
    } finally {
      setExecuting(false);
    }
  };

  const handleCopyOutput = () => {
    if (!executionResult) return;
    const textToCopy =
      typeof executionResult.structured_output === "object"
        ? JSON.stringify(executionResult.structured_output, null, 2)
        : executionResult.result;
    navigator.clipboard.writeText(textToCopy);
    toast.success("Resultado copiado para a área de transferência!");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Playground de IA</h1>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-medium">
            Ambiente de Testes Reais
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Teste qualquer Skill global combinando-a em tempo real com dados reais de uma empresa, conta do Instagram ou briefing sintético.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Configuração do Teste */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Configuração da Skill & Contexto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              {/* Seleção de Skill */}
              <div className="space-y-1">
                <Label className="text-xs">Skill Global *</Label>
                <Select value={selectedSkillSlug} onValueChange={setSelectedSkillSlug}>
                  <SelectTrigger className="h-8 text-xs font-medium">
                    <SelectValue placeholder="Selecione uma Skill..." />
                  </SelectTrigger>
                  <SelectContent>
                    {skills.map((s) => (
                      <SelectItem key={s.id} value={s.slug}>
                        {s.name} ({s.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Versão & Perfil */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Versão da Skill</Label>
                  <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Versão Ativa de Produção</SelectItem>
                      {versions.map((v) => (
                        <SelectItem key={v.id} value={String(v.version)}>
                          Versão {v.version} ({v.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Perfil de Modelo</Label>
                  <Input
                    value={currentSkill?.default_model_profile || "CONTENT_STANDARD"}
                    disabled
                    className="h-8 text-xs bg-muted font-mono"
                  />
                </div>
              </div>

              {/* Empresa Teste (Multitenant) */}
              <div className="space-y-1">
                <Label className="text-xs">Empresa Teste (Manual da Marca)</Label>
                <Select
                  value={selectedCompanyId}
                  onValueChange={(val) => {
                    setSelectedCompanyId(val);
                    setSelectedAccountId("none");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Sem empresa (Contexto Genérico)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (Contexto Genérico)</SelectItem>
                    {companies.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conta do Instagram Teste */}
              <div className="space-y-1">
                <Label className="text-xs">Conta do Instagram (Tom de Voz & Regras)</Label>
                <Select
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                  disabled={selectedCompanyId === "none"}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Sem conta (Tom Padrão)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma conta selecionada</SelectItem>
                    {accounts.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        @{a.username} ({a.name || "Conta"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parâmetros do Briefing Atual */}
              <div className="pt-2 border-t space-y-2.5">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Briefing da Tarefa Atual
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">Tema do Conteúdo</Label>
                  <Input
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="Ex: Como evitar o distanciamento silencioso da equipe"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Objetivo</Label>
                    <Input
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      placeholder="Ex: Autoridade"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Ângulo</Label>
                    <Input
                      value={angle}
                      onChange={(e) => setAngle(e.target.value)}
                      placeholder="Ex: Provocativo"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">CTA Desejado</Label>
                  <Input
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="Ex: Comente 'LIDERANÇA' no direct"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">Instrução Específica Adicional</Label>
                  <Textarea
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder="Instruções particulares para o teste..."
                    className="text-xs min-h-[55px]"
                  />
                </div>
              </div>

              <Button
                type="button"
                className="w-full text-xs font-semibold"
                onClick={handleExecute}
                disabled={executing}
              >
                {executing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                    Executando Skill via OpenAI...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Executar Skill no Playground
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Painel Direito: Resultados & Auditoria */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card de Métricas da Execução */}
          {executionResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-card p-3 text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Cpu className="h-3.5 w-3.5 text-primary" /> Modelo
                </span>
                <div className="font-mono font-bold mt-1 text-foreground">{executionResult.model}</div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> Tokens
                </span>
                <div className="font-bold mt-1 text-foreground">
                  {executionResult.tokens.total}
                  <span className="text-[10px] text-muted-foreground font-normal ml-1">
                    ({executionResult.tokens.input} in / {executionResult.tokens.output} out)
                  </span>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-blue-500" /> Latência
                </span>
                <div className="font-bold mt-1 text-foreground">{executionResult.latency_ms} ms</div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Custo Est.
                </span>
                <div className="font-bold mt-1 text-foreground">
                  ${Number(executionResult.estimated_cost).toFixed(5)}
                </div>
              </div>
            </div>
          )}

          {/* Erro */}
          {errorDetails && (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                Erro durante a execução
              </div>
              <p className="font-mono text-[11px] leading-relaxed">{errorDetails}</p>
            </div>
          )}

          {/* Área de Visualização do Output */}
          <Card className="shadow-sm min-h-[460px] flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Saída Gerada
                </CardTitle>
                <CardDescription className="text-xs">
                  {executionResult
                    ? `Skill: ${executionResult.skill.name} (v${executionResult.skill.version})`
                    : "Aguardando disparo..."}
                </CardDescription>
              </div>
              {executionResult && (
                <Button variant="ghost" size="sm" onClick={handleCopyOutput} className="h-7 text-xs">
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copiar Saída
                </Button>
              )}
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
              {executing ? (
                <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-xs text-muted-foreground">
                    Consultando OpenAI Responses API com Skill Reference...
                  </div>
                </div>
              ) : executionResult ? (
                <Tabs defaultValue="visual" className="flex-1 flex flex-col space-y-3">
                  <TabsList className="bg-muted/40 p-1 border self-start">
                    <TabsTrigger value="visual" className="text-xs flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Visual Formatado
                    </TabsTrigger>
                    <TabsTrigger value="json" className="text-xs flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5" />
                      JSON Bruto
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="visual" className="flex-1">
                    <div className="bg-muted/20 border rounded-lg p-4 space-y-3 text-xs max-h-[480px] overflow-y-auto">
                      {typeof executionResult.structured_output === "object" ? (
                        Object.entries(executionResult.structured_output).map(([key, val]) => (
                          <div key={key} className="space-y-1 pb-2 border-b border-border/40 last:border-0">
                            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                              {key}:
                            </span>
                            <div className="text-foreground whitespace-pre-wrap leading-relaxed font-sans">
                              {typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {executionResult.result}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="json" className="flex-1">
                    <pre className="bg-muted/40 border rounded-lg p-4 font-mono text-[11px] leading-relaxed max-h-[480px] overflow-y-auto">
                      {JSON.stringify(executionResult.structured_output || executionResult.result, null, 2)}
                    </pre>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-24 text-center space-y-2 text-muted-foreground">
                  <PlayCircle className="h-10 w-10 stroke-[1.2] opacity-40 mx-auto" />
                  <div className="text-xs font-medium">Nenhuma execução realizada ainda.</div>
                  <p className="text-[11px] max-w-xs">
                    Configure os parâmetros à esquerda e clique em "Executar Skill" para disparar a geração.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
