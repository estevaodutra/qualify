import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Upload,
  FileText,
  FileArchive,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AIExecutionService } from "@/services/ai/aiExecutionService";
import { AiSkillCategory, AiSkillFile, AiSkillStatus } from "@/types/aiSkills";

interface CreateSkillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateSkillModal({ open, onOpenChange, onSuccess }: CreateSkillModalProps) {
  const [mode, setMode] = useState<"panel" | "zip">("panel");
  const [submitting, setSubmitting] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  // Form Fields - Modo A
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<AiSkillCategory>("CONTEÚDO");
  const [description, setDescription] = useState("");
  const [whenToUse, setWhenToUse] = useState("");
  const [targetObjective, setTargetObjective] = useState("");
  const [mainInstructions, setMainInstructions] = useState("");
  const [outputFormat, setOutputFormat] = useState<"json" | "markdown" | "text">("json");
  const [defaultProfile, setDefaultProfile] = useState("CONTENT_STANDARD");
  const [status, setStatus] = useState<AiSkillStatus>("draft");

  // Documentos / Referências
  const [files, setFiles] = useState<AiSkillFile[]>([]);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [newFileType, setNewFileType] = useState<"reference" | "asset">("reference");

  // Modo B - Arquivo ZIP
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipAnalysis, setZipAnalysis] = useState<{
    name: string;
    description: string;
    manifest_content: string;
    files: AiSkillFile[];
  } | null>(null);

  // Gerar slug automaticamente a partir do nome
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === "") {
      setSlug(
        val
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  };

  // Upload de arquivos de texto (.md, .txt, .json)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    for (let i = 0; i < uploaded.length; i++) {
      const f = uploaded[i];
      const text = await f.text();
      const relativePath = `references/${f.name}`;
      setFiles((prev) => [
        ...prev,
        {
          path: relativePath,
          name: f.name,
          type: "reference",
          content: text,
          size: text.length,
          updatedAt: new Date().toISOString(),
        },
      ]);
    }
    toast.success(`${uploaded.length} documento(s) adicionado(s).`);
  };

  // Upload e Análise de ZIP (Modo B)
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await AIExecutionService.importZipSkill(file);
      setZipFile(file);
      setZipAnalysis(parsed);
      setName(parsed.name);
      setDescription(parsed.description);
      setSlug(
        parsed.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      );
      toast.success("Arquivo .zip validado com sucesso! Contém SKILL.md válido.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar arquivo .zip.");
      setZipFile(null);
      setZipAnalysis(null);
    }
  };

  // Gerar estrutura da Skill com IA
  const handleGenerateScaffoldWithAi = async () => {
    if (!name && !description && files.length === 0) {
      toast.error("Preencha ao menos o Nome, Objetivo ou anexe documentos para a IA analisar.");
      return;
    }

    try {
      setGeneratingAi(true);
      const scaffold = await AIExecutionService.generateSkillScaffold({
        scaffoldPrompt: `Skill: ${name}\nCategoria: ${category}\nObjetivo: ${targetObjective || description}\nQuando usar: ${whenToUse}`,
        documents: files.map((f) => ({ name: f.name, type: f.type, content: f.content })),
      });

      if (scaffold) {
        if (scaffold.main_instructions) setMainInstructions(scaffold.main_instructions);
        if (scaffold.target_objective) setTargetObjective(scaffold.target_objective);
        if (scaffold.when_to_use) setWhenToUse(scaffold.when_to_use);
        if (scaffold.suggested_profile) setDefaultProfile(scaffold.suggested_profile);

        // Mesclar referências e assets gerados
        const newFileList: AiSkillFile[] = [...files];
        if (scaffold.references?.length) {
          scaffold.references.forEach((ref: any) => {
            newFileList.push({
              path: ref.path || `references/${ref.name}`,
              name: ref.name,
              type: "reference",
              content: ref.content,
              size: ref.content?.length || 0,
              updatedAt: new Date().toISOString(),
            });
          });
        }
        if (scaffold.assets?.length) {
          scaffold.assets.forEach((ast: any) => {
            newFileList.push({
              path: ast.path || `assets/${ast.name}`,
              name: ast.name,
              type: "asset",
              content: ast.content,
              size: ast.content?.length || 0,
              updatedAt: new Date().toISOString(),
            });
          });
        }
        setFiles(newFileList);

        toast.success("Estrutura da Skill gerada com sucesso pela IA! Revise antes de publicar.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar com IA.");
    } finally {
      setGeneratingAi(false);
    }
  };

  // Salvar Skill
  const handleSaveSkill = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Nome e Slug são obrigatórios.");
      return;
    }

    try {
      setSubmitting(true);

      if (mode === "zip" && zipAnalysis) {
        await AIExecutionService.createSkill(
          {
            name,
            slug,
            description,
            category,
            status,
            default_model_profile: defaultProfile,
            output_format: "json",
          },
          zipAnalysis.files
        );
      } else {
        await AIExecutionService.createSkill(
          {
            name,
            slug,
            description,
            category,
            when_to_use: whenToUse,
            target_objective: targetObjective,
            main_instructions: mainInstructions,
            output_format: outputFormat,
            default_model_profile: defaultProfile,
            status,
          },
          files
        );
      }

      toast.success("Skill cadastrada com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar Skill.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-primary" />
            Cadastrar Nova Skill Global
          </DialogTitle>
          <DialogDescription className="text-xs">
            Crie uma nova habilidade para o motor de IA da Criafy pelo painel assistido ou importe um bundle .zip.
          </DialogDescription>
        </DialogHeader>

        {/* Seleção do Modo */}
        <div className="grid grid-cols-2 gap-3 p-1 bg-muted/40 rounded-lg">
          <Button
            type="button"
            variant={mode === "panel" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("panel")}
            className="text-xs flex items-center justify-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Modo A — Criar pelo Painel
          </Button>
          <Button
            type="button"
            variant={mode === "zip" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("zip")}
            className="text-xs flex items-center justify-center gap-2"
          >
            <FileArchive className="h-4 w-4" />
            Modo B — Importar .zip
          </Button>
        </div>

        {mode === "panel" ? (
          <div className="space-y-4 pt-2">
            {/* Metadados Básicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome da Skill *</Label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Roteirista de Reels"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Slug Único *</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="ex: reel-scriptwriter"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONTEÚDO">CONTEÚDO</SelectItem>
                    <SelectItem value="ESTRATÉGIA">ESTRATÉGIA</SelectItem>
                    <SelectItem value="ANÁLISE">ANÁLISE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Perfil de Modelo</Label>
                <Select value={defaultProfile} onValueChange={setDefaultProfile}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONTENT_STANDARD">Content Standard (GPT-4o Mini)</SelectItem>
                    <SelectItem value="CONTENT_ADVANCED">Content Advanced (GPT-4o)</SelectItem>
                    <SelectItem value="STRATEGY_ADVANCED">Strategy Advanced (o3/Reasoning)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Status Inicial</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho (draft)</SelectItem>
                    <SelectItem value="testing">Em Testes (testing)</SelectItem>
                    <SelectItem value="published">Publicada (published)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Descrição Resumida</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Roteirização de vídeos curtos de 30 a 60 segundos com gancho magnético."
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Quando Usar</Label>
                <Textarea
                  value={whenToUse}
                  onChange={(e) => setWhenToUse(e.target.value)}
                  placeholder="Ex: Quando o usuário solicitar vídeos em formato Reel/TikTok."
                  className="text-xs min-h-[60px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Objetivo Mensurável</Label>
                <Textarea
                  value={targetObjective}
                  onChange={(e) => setTargetObjective(e.target.value)}
                  placeholder="Ex: Reter nos primeiros 3s e direcionar para comentário na postagem."
                  className="text-xs min-h-[60px]"
                />
              </div>
            </div>

            {/* Documentos & Referências */}
            <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Documentos e Referências da Skill ({files.length})
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Anexe documentos (.md, .txt, .json) para compor a pasta references/ e assets/.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept=".md,.txt,.json,.docx,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" asChild>
                      <span>
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        Anexar Arquivo
                      </span>
                    </Button>
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                    onClick={handleGenerateScaffoldWithAi}
                    disabled={generatingAi}
                  >
                    {generatingAi ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                    )}
                    Gerar Estrutura com IA
                  </Button>
                </div>
              </div>

              {files.length > 0 ? (
                <div className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-border/40">
                  {files.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2 bg-background rounded">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[10px] py-0">{f.type}</Badge>
                        <span className="font-mono text-[11px] truncate">{f.path}</span>
                        <span className="text-[10px] text-muted-foreground">({f.size} bytes)</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-destructive"
                        onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-muted-foreground border border-dashed rounded">
                  Nenhum documento anexado. Você pode anexar guias de copy, frameworks de storytelling ou deixar a IA gerar.
                </div>
              )}
            </div>

            {/* Instruções Principais (SKILL.md) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Instruções Principais (SKILL.md)</Label>
                <span className="text-[10px] text-muted-foreground">Markdown suportado</span>
              </div>
              <Textarea
                value={mainInstructions}
                onChange={(e) => setMainInstructions(e.target.value)}
                placeholder="Descreva as instruções operacionais que o modelo seguirá fielmente ao executar esta Skill..."
                className="text-xs font-mono min-h-[120px]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="border-2 border-dashed rounded-xl p-8 text-center space-y-3 bg-muted/10">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <FileArchive className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Importar Bundle de Skill (.zip)</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  O arquivo .zip deve conter obrigatoriamente um <code className="text-xs">SKILL.md</code> na raiz, e opcionalmente as pastas <code className="text-xs">references/</code> e <code className="text-xs">assets/</code>.
                </p>
              </div>
              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleZipUpload}
                  className="hidden"
                />
                <Button type="button" variant="outline" size="sm" className="text-xs" asChild>
                  <span>
                    <Upload className="h-3.5 w-3.5 mr-2" />
                    Selecionar Arquivo .zip
                  </span>
                </Button>
              </label>
            </div>

            {zipAnalysis && (
              <div className="rounded-lg border p-4 bg-emerald-500/5 border-emerald-500/20 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  Bundle Válido Detectado!
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-muted-foreground">Nome:</span> {zipAnalysis.name}</div>
                  <div><span className="text-muted-foreground">Arquivos:</span> {zipAnalysis.files.length}</div>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {zipAnalysis.files.map((f, i) => (
                    <div key={i} className="font-mono text-[10px] text-muted-foreground">
                      • {f.path} ({f.type})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-4 border-t flex items-center justify-between sm:justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Skills são globais e imutáveis após publicadas.
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveSkill}
              disabled={submitting || (mode === "zip" && !zipAnalysis)}
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Salvar Skill
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
