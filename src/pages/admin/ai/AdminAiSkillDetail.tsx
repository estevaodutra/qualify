import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  ArrowLeft,
  PlayCircle,
  Plus,
  Copy,
  Download,
  Power,
  CheckCircle2,
  FileText,
  FileCode,
  History,
  Activity,
  ShieldCheck,
  Lock,
  Upload,
  Trash2,
  Eye,
  AlertCircle,
  Loader2,
  Sliders,
  Send,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AIExecutionService } from "@/services/ai/aiExecutionService";
import { AiSkill, AiSkillVersion, AiSkillFile, AiSkillStatus } from "@/types/aiSkills";

export default function AdminAiSkillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState<
    "overview" | "instructions" | "documents" | "output" | "versions" | "tests" | "executions"
  >("overview");

  const [selectedFile, setSelectedFile] = useState<AiSkillFile | null>(null);

  // Modal para Criar Nova Versão
  const [newVersionModalOpen, setNewVersionModalOpen] = useState(false);
  const [newManifest, setNewManifest] = useState("");
  const [newChangelog, setNewChangelog] = useState("");
  const [submittingVersion, setSubmittingVersion] = useState(false);

  // Estado para teste rápido in-page
  const [testTheme, setTestTheme] = useState("Conteúdo estratégico de teste");
  const [testInstruction, setTestInstruction] = useState("");
  const [testingInPage, setTestingInPage] = useState(false);
  const [testOutput, setTestOutput] = useState<any>(null);

  // Buscar Skill
  const { data: skill, isLoading: skillLoading } = useQuery({
    queryKey: ["admin_ai_skill", id],
    queryFn: () => AIExecutionService.getSkillById(id!),
    enabled: !!id,
  });

  // Buscar Versões
  const { data: versions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ["admin_ai_skill_versions", id],
    queryFn: () => (id ? AIExecutionService.getSkillVersions(id) : []),
    enabled: !!id,
  });

  // Buscar Execuções desta Skill
  const { data: executionsData } = useQuery({
    queryKey: ["admin_ai_skill_executions", skill?.slug],
    queryFn: () => AIExecutionService.getExecutions({ skillSlug: skill?.slug, limit: 15 }),
    enabled: !!skill?.slug,
  });

  const activeVersion =
    versions.find((v) => v.id === skill?.active_version_id) || versions[0];

  const filesList = Array.isArray(activeVersion?.files) ? activeVersion.files : [];

  // Mutação para Publicar / Tornar Ativa Versão
  const publishMutation = useMutation({
    mutationFn: (versionId: string) => AIExecutionService.publishVersion(skill!.id, versionId),
    onSuccess: () => {
      toast.success("Versão definida como ativa e publicada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin_ai_skill", id] });
      queryClient.invalidateQueries({ queryKey: ["admin_ai_skill_versions", id] });
    },
    onError: (err: any) => toast.error(err.message || "Erro ao publicar versão."),
  });

  // Exportar ZIP
  const handleExportZip = async () => {
    if (!skill || !activeVersion) return;
    try {
      const blob = await AIExecutionService.exportSkillZip(skill, activeVersion);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${skill.slug}-v${activeVersion.version}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Bundle .zip exportado com sucesso!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao exportar ZIP.");
    }
  };

  // Abrir modal de nova versão
  const handleOpenNewVersionModal = () => {
    if (!activeVersion) return;
    setNewManifest(activeVersion.manifest_content || skill?.main_instructions || "");
    setNewChangelog("");
    setNewVersionModalOpen(true);
  };

  const handleSaveNewVersion = async () => {
    if (!skill) return;
    try {
      setSubmittingVersion(true);
      await AIExecutionService.createNewVersion(skill.id, {
        manifest_content: newManifest,
        files: activeVersion?.files || [],
        changelog: newChangelog || "Atualização de instruções",
        status: "draft",
      });
      toast.success("Nova versão criada como rascunho com sucesso!");
      setNewVersionModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin_ai_skill_versions", id] });
      queryClient.invalidateQueries({ queryKey: ["admin_ai_skill", id] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar nova versão.");
    } finally {
      setSubmittingVersion(false);
    }
  };

  // Testar in-page
  const handleQuickTest = async () => {
    if (!skill) return;
    try {
      setTestingInPage(true);
      setTestOutput(null);
      const res = await AIExecutionService.generate({
        skillSlug: skill.slug,
        skillVersion: activeVersion?.version,
        theme: testTheme,
        customInstruction: testInstruction || undefined,
      });
      setTestOutput(res);
      toast.success("Execução de teste finalizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin_ai_skill_executions", skill.slug] });
    } catch (err: any) {
      toast.error(err.message || "Falha no teste.");
    } finally {
      setTestingInPage(false);
    }
  };

  if (skillLoading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground">
        Carregando detalhes da Skill...
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-sm font-semibold">Skill não encontrada</div>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/ia/skills")}>
          Voltar para Skills
        </Button>
      </div>
    );
  }

  const navSections = [
    { id: "overview", label: "Visão Geral", icon: Layers },
    { id: "instructions", label: "Instruções", icon: FileCode },
    { id: "documents", label: "Documentos", icon: FileText, badge: filesList.length },
    { id: "output", label: "Output", icon: Sliders },
    { id: "versions", label: "Versões", icon: History, badge: versions.length },
    { id: "tests", label: "Testes", icon: PlayCircle },
    { id: "executions", label: "Execuções", icon: Activity, badge: executionsData?.total || 0 },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Botão Voltar */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/admin/ia/skills")}
        className="text-xs h-7 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5 mr-1" />
        Voltar para Catálogo de Skills
      </Button>

      {/* Header Principal da Skill */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{skill.name}</h1>
              <Badge
                className={`text-[10px] ${
                  skill.status === "published"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                }`}
              >
                {skill.status === "published" ? "Publicada" : skill.status}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                v{activeVersion?.version || 1}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Slug: <code className="font-mono text-foreground font-semibold">{skill.slug}</code>
              </span>
              <span>•</span>
              <span>
                OpenAI ID: <code className="font-mono text-foreground">{skill.openai_skill_id || `skill_${skill.slug}`}</code>
              </span>
              <span>•</span>
              <span>
                Perfil: <Badge variant="secondary" className="text-[10px] ml-1">{skill.default_model_profile}</Badge>
              </span>
              <span>•</span>
              <span>Categoria: <strong className="text-foreground">{skill.category}</strong></span>
            </div>
          </div>

          {/* Ações da Skill */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate(`/admin/ia/playground?skillSlug=${skill.slug}`)}
              className="text-xs"
            >
              <PlayCircle className="h-4 w-4 mr-1.5 text-primary-foreground" />
              Playground Completo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenNewVersionModal}
              className="text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Criar Nova Versão
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportZip}
              className="text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Exportar .zip
            </Button>
          </div>
        </div>
      </div>

      {/* Layout com SUBSIDEBAR Contextual no Detalhe da Skill (Sem tabs horizontais) */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[580px]">
        {/* Subsidebar vertical da Skill */}
        <aside className="w-full md:w-56 border-r bg-muted/20 p-3 space-y-1 shrink-0">
          <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Navegação da Skill
          </div>
          {navSections.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <item.icon className={`h-4 w-4 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  {item.label}
                </span>
                {item.badge !== undefined && (
                  <Badge
                    variant={isActive ? "secondary" : "outline"}
                    className={`text-[9px] py-0 px-1.5 ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : ""}`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </aside>

        {/* Conteúdo Central / Editor */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* 1. VISÃO GERAL */}
          {activeSection === "overview" && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="text-base font-semibold text-foreground">Visão Geral da Skill</h3>
                <p className="text-xs text-muted-foreground">
                  Informações conceituais e diretrizes operacionais.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-none border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-foreground">Quando Usar</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground leading-relaxed">
                    {skill.when_to_use || "Nenhuma regra de quando usar informada."}
                  </CardContent>
                </Card>

                <Card className="shadow-none border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-foreground">Objetivo Estratégico</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground leading-relaxed">
                    {skill.target_objective || "Nenhum objetivo informado."}
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-none border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-foreground">Descrição da Competência</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground leading-relaxed">
                  {skill.description || "Sem descrição cadastrada."}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 2. INSTRUÇÕES (SKILL.md) */}
          {activeSection === "instructions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-primary" />
                    Manifesto SKILL.md — Versão {activeVersion?.version}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Instruções operacionais fornecidas ao modelo para execução da Skill.
                  </p>
                </div>
                {activeVersion?.status === "published" && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Imutável (Publicada)
                  </Badge>
                )}
              </div>

              <div className="bg-muted/40 p-4 rounded-lg font-mono text-xs whitespace-pre-wrap leading-relaxed border max-h-[480px] overflow-y-auto">
                {activeVersion?.manifest_content || skill.main_instructions}
              </div>
            </div>
          )}

          {/* 3. DOCUMENTOS */}
          {activeSection === "documents" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Arquivos em references/ e assets/ (v{activeVersion?.version})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Materiais permanentes que o modelo consulta durante a geração.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={handleOpenNewVersionModal} className="text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Nova Versão para Adicionar
                </Button>
              </div>

              {filesList.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Nenhum arquivo de referência adicional nesta versão.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1 border rounded-lg divide-y text-xs">
                    {filesList.map((f, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedFile(f)}
                        className={`w-full text-left p-3 flex items-center justify-between transition-colors ${
                          selectedFile?.path === f.path ? "bg-primary/10 font-semibold" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-mono text-[11px] truncate text-foreground">{f.name}</div>
                          <div className="text-[10px] text-muted-foreground">{f.path}</div>
                        </div>
                        <Badge variant="outline" className="text-[9px] py-0 shrink-0">{f.type}</Badge>
                      </button>
                    ))}
                  </div>

                  <div className="md:col-span-2 border rounded-lg p-4 bg-muted/20">
                    {selectedFile ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b">
                          <span className="font-mono text-xs font-semibold">{selectedFile.path}</span>
                          <span className="text-[10px] text-muted-foreground">{selectedFile.size} bytes</span>
                        </div>
                        <div className="font-mono text-xs whitespace-pre-wrap max-h-[350px] overflow-y-auto leading-relaxed p-2 bg-background rounded border">
                          {selectedFile.content}
                        </div>
                      </div>
                    ) : (
                      <div className="py-20 text-center text-xs text-muted-foreground">
                        Selecione um arquivo ao lado para inspecionar.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. OUTPUT */}
          {activeSection === "output" && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  Contrato de Saída Estruturado (Structured Outputs)
                </h3>
                <p className="text-xs text-muted-foreground">
                  A aplicação exige este contrato estritamente no backend. Formato: {skill.output_format.toUpperCase()}.
                </p>
              </div>

              <div className="bg-muted/40 p-4 rounded-lg font-mono text-xs border max-h-[460px] overflow-y-auto">
                <pre>{JSON.stringify(skill.output_schema || {}, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* 5. VERSÕES */}
          {activeSection === "versions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Histórico de Versões
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Versões publicadas são imutáveis. Edições criam uma nova versão em rascunho.
                  </p>
                </div>
                <Button size="sm" onClick={handleOpenNewVersionModal} className="text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Criar Nova Versão
                </Button>
              </div>

              <div className="divide-y text-xs">
                {versions.map((ver) => {
                  const isCurrentActive = ver.id === skill.active_version_id;
                  return (
                    <div key={ver.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">Versão {ver.version}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">({ver.openai_version || `v${ver.version}`})</span>
                          {isCurrentActive && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                              Ativa em Produção
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">{ver.status}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {ver.changelog || "Sem changelog informado"}
                        </p>
                        <div className="text-[10px] text-muted-foreground/70 mt-1">
                          Criada em: {new Date(ver.created_at).toLocaleString("pt-BR")}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isCurrentActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => publishMutation.mutate(ver.id)}
                            disabled={publishMutation.isPending}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            Tornar Ativa
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. TESTES (TEST RUNNER IN-PAGE) */}
          {activeSection === "tests" && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-primary" />
                  Teste Rápido da Skill "{skill.name}"
                </h3>
                <p className="text-xs text-muted-foreground">
                  Execute uma chamada de validação direta para conferir o contrato de saída.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs">Tema / Briefing do Teste</Label>
                    <Input
                      value={testTheme}
                      onChange={(e) => setTestTheme(e.target.value)}
                      placeholder="Ex: Quebrando mitos sobre posicionamento"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Instrução Específica (Opcional)</Label>
                    <Textarea
                      value={testInstruction}
                      onChange={(e) => setTestInstruction(e.target.value)}
                      placeholder="Instruções particulares para este teste..."
                      className="text-xs min-h-[80px]"
                    />
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="w-full text-xs"
                    onClick={handleQuickTest}
                    disabled={testingInPage}
                  >
                    {testingInPage ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Executando Skill...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        Disparar Teste In-Page
                      </>
                    )}
                  </Button>
                </div>

                {/* Saída do Teste In-Page */}
                <div className="border rounded-lg p-3 bg-muted/20 text-xs flex flex-col justify-between min-h-[220px]">
                  <div className="font-semibold text-foreground border-b pb-1.5 mb-2">
                    Resultado da Execução
                  </div>
                  {testOutput ? (
                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px]">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>Tokens: {testOutput.tokens.total}</span>
                        <span>•</span>
                        <span>Latência: {testOutput.latency_ms}ms</span>
                        <span>•</span>
                        <span>Custo: ${Number(testOutput.estimated_cost).toFixed(5)}</span>
                      </div>
                      <pre className="p-2 bg-background border rounded font-mono text-[11px] leading-relaxed">
                        {JSON.stringify(testOutput.structured_output || testOutput.result, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-xs">
                      Clique em "Disparar Teste In-Page" para visualizar o output estruturado gerado pela OpenAI.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 7. EXECUÇÕES */}
          {activeSection === "executions" && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Histórico de Execuções da Skill
                </h3>
                <p className="text-xs text-muted-foreground">
                  Últimos disparos realizados com tokens consumidos e status.
                </p>
              </div>

              {executionsData?.executions?.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Nenhuma execução registrada para esta Skill ainda.
                </div>
              ) : (
                <div className="divide-y text-xs">
                  {executionsData?.executions.map((e) => (
                    <div key={e.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">v{e.skill_version}</Badge>
                          <span className="font-semibold text-foreground">
                            {e.input_summary?.theme || e.action}
                          </span>
                          <Badge
                            variant={e.status === "success" ? "outline" : "destructive"}
                            className="text-[10px]"
                          >
                            {e.status}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Modelo: {e.model} • {new Date(e.created_at).toLocaleString("pt-BR")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{e.tokens_input + e.tokens_output} tokens</div>
                        <div className="text-[10px] text-muted-foreground">
                          {e.latency_ms}ms • ${Number(e.estimated_cost).toFixed(4)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modal: Criar Nova Versão */}
      <Dialog open={newVersionModalOpen} onOpenChange={setNewVersionModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Criar Nova Versão da Skill
            </DialogTitle>
            <DialogDescription className="text-xs">
              Como as versões publicadas são imutáveis, alterações requerem a criação de uma nova versão (ex: v{(activeVersion?.version || 1) + 1}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Changelog / O que mudou nesta versão? *</Label>
              <Input
                value={newChangelog}
                onChange={(e) => setNewChangelog(e.target.value)}
                placeholder="Ex: Refinamento de ganchos nos primeiros 3s e novas referências"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Instruções do Manifesto (SKILL.md)</Label>
              <Textarea
                value={newManifest}
                onChange={(e) => setNewManifest(e.target.value)}
                className="font-mono text-xs min-h-[220px]"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewVersionModalOpen(false)}
              disabled={submittingVersion}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNewVersion}
              disabled={submittingVersion || !newChangelog.trim()}
            >
              {submittingVersion && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Criar Versão Rascunho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
