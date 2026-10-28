import { useState, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UploadCloud,
  FileText,
  FolderOpen,
  FileArchive,
  CheckCircle2,
  Sparkles,
  Layers,
  Cpu,
  Code,
  Loader2,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  SkillAutoDetector,
  SkillAutoDetectionResult,
} from "@/services/ai/skillAutoDetector";
import { AIExecutionService } from "@/services/ai/aiExecutionService";
import { AiSkillCategory, AiSkillStatus } from "@/types/aiSkills";

interface ImportSkillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportSkillModal({ open, onOpenChange, onSuccess }: ImportSkillModalProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detection, setDetection] = useState<SkillAutoDetectionResult | null>(null);

  // Campos ajustáveis após a detecção automática
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<AiSkillCategory>("CONTEÚDO");
  const [defaultProfile, setDefaultProfile] = useState("CONTENT_STANDARD");
  const [status, setStatus] = useState<AiSkillStatus>("published");

  const singleFileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // Processar entrada com o SkillAutoDetector
  const handleProcessFiles = async (singleFile?: File, fileList?: File[]) => {
    try {
      setAnalyzing(true);
      const result = await SkillAutoDetector.detectFromInput({ singleFile, fileList });
      setDetection(result);

      // Preencher o setup automático
      setName(result.name);
      setSlug(result.slug);
      setDescription(result.description);
      setCategory(result.category);
      setDefaultProfile(result.default_model_profile);
      setStatus(result.status);

      toast.success(
        `Identificado com sucesso: ${result.formatLabel}! Setup gerado automaticamente.`
      );
    } catch (err: any) {
      toast.error(err.message || "Erro ao analisar arquivos da Skill.");
      setDetection(null);
    } finally {
      setAnalyzing(false);
    }
  };

  // Upload de arquivo único (.zip ou .md)
  const handleSingleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleProcessFiles(file, undefined);
  };

  // Upload de pasta inteira
  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleProcessFiles(undefined, Array.from(files));
  };

  // Drag and Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;

    if (droppedFiles.length === 1) {
      handleProcessFiles(droppedFiles[0], undefined);
    } else {
      handleProcessFiles(undefined, Array.from(droppedFiles));
    }
  };

  // Salvar Skill
  const handleSaveSetup = async () => {
    if (!detection) return;
    if (!name.trim() || !slug.trim()) {
      toast.error("Nome e Slug são obrigatórios.");
      return;
    }

    try {
      setSaving(true);
      await AIExecutionService.createSkill(
        {
          name,
          slug,
          description,
          category,
          when_to_use: detection.when_to_use,
          target_objective: detection.target_objective,
          main_instructions: detection.main_instructions,
          output_format: detection.output_format,
          output_schema: detection.output_schema,
          default_model_profile: defaultProfile,
          status,
        },
        detection.files
      );

      toast.success(`Skill "${name}" configurada e cadastrada com sucesso!`);
      onSuccess();
      onOpenChange(false);
      // Resetar estado
      setDetection(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar setup da Skill.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDetection(null);
    setName("");
    setSlug("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UploadCloud className="h-5 w-5 text-primary" />
            Importação Inteligente de Skill
          </DialogTitle>
          <DialogDescription className="text-xs">
            Importe um arquivo avulso <code className="font-mono text-primary font-bold">.md</code>, uma <code className="font-mono text-primary font-bold">pasta de arquivos</code> ou um pacote <code className="font-mono text-primary font-bold">.zip</code>. O sistema identifica automaticamente se é Carrossel, Reels ou Estratégia e monta todo o setup para você.
          </DialogDescription>
        </DialogHeader>

        {/* Inputs ocultos */}
        <input
          ref={singleFileInputRef}
          type="file"
          accept=".zip,.md,.markdown,.txt"
          onChange={handleSingleFileChange}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore: webkitdirectory não é padrão no tipo HTMLInputElement do React mas funciona
          webkitdirectory="true"
          directory=""
          multiple
          onChange={handleFolderChange}
          className="hidden"
        />

        {!detection ? (
          <div className="space-y-4 pt-2">
            {/* Dropzone Principal */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed rounded-xl p-8 text-center space-y-4 bg-muted/10 hover:bg-muted/20 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Sparkles className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Arraste e solte seu arquivo ou pasta aqui
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  Suporta arquivos <strong>.md</strong> avulsos (ex: instruções de carrossel), <strong>pastas inteiras</strong> ou bundles <strong>.zip</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => singleFileInputRef.current?.click()}
                  disabled={analyzing}
                  className="text-xs"
                >
                  <FileText className="h-4 w-4 mr-1.5 text-primary" />
                  Selecionar Arquivo (.md ou .zip)
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => folderInputRef.current?.click()}
                  disabled={analyzing}
                  className="text-xs"
                >
                  <FolderOpen className="h-4 w-4 mr-1.5 text-amber-500" />
                  Selecionar Pasta Inteira
                </Button>
              </div>

              {analyzing && (
                <div className="flex items-center justify-center gap-2 text-xs text-primary font-medium pt-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Identificando estrutura e tipo de conteúdo...
                </div>
              )}
            </div>

            {/* Dicas de Detecção Automática */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Carrossel Automático
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Se contiver lâminas ou slides, gera automaticamente o schema estruturado de Carrossel.
                </p>
              </div>

              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Apenas um arquivo .md
                </div>
                <p className="text-muted-foreground text-[11px]">
                  O arquivo é transformado no SKILL.md oficial com frontmatter, objetivo e instruções.
                </p>
              </div>

              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  Pasta ou .zip
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Separa automaticamente referências em references/, templates em assets/ e manifesto.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Card de Diagnóstico da Detecção */}
            <div className="rounded-xl border bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5" />
                  Identificação Concluída com Sucesso!
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Importar Outro
                </Button>
              </div>

              {/* Badges do Setup Automático */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-600 text-white font-semibold text-xs">
                  🎯 Formato: {detection.formatLabel}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  📦 Origem: {detection.sourceType} ({detection.files.length} arquivos)
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  🏷️ Categoria: {detection.category}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs bg-background">
                  ⚙️ Perfil: {detection.default_model_profile}
                </Badge>
              </div>

              {/* Notas de Confiança */}
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                {detection.confidenceNotes.map((note, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-emerald-500">✓</span> {note}
                  </div>
                ))}
              </div>
            </div>

            {/* Configuração Gerada & Editável */}
            <div className="space-y-3 text-xs">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" />
                Setup da Skill Pronto para Cadastro
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome da Skill *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 text-xs font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Slug Único *</Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
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

                <div className="space-y-1">
                  <Label className="text-xs">Perfil OpenAI Sugerido</Label>
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

                <div className="space-y-1">
                  <Label className="text-xs">Status Inicial</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Publicada (Disponível Imediatamente)</SelectItem>
                      <SelectItem value="testing">Em Testes</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Descrição Resumida</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Arquivos Gerados */}
              <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="font-semibold text-foreground flex items-center justify-between text-xs">
                  <span>Estrutura de Arquivos ({detection.files.length})</span>
                  <Badge variant="outline" className="text-[10px]">OpenAI Skills Bundle</Badge>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-[11px]">
                  {detection.files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between py-0.5 px-2 bg-background rounded border">
                      <span className="truncate">{f.path}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{f.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Output Schema Gerado */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1.5">
                  <Code className="h-3.5 w-3.5 text-primary" />
                  Contrato de Saída JSON Gerado Automaticamente
                </Label>
                <pre className="p-3 bg-muted/40 border rounded-lg font-mono text-[10px] max-h-24 overflow-y-auto">
                  {JSON.stringify(detection.output_schema || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>

          {detection && (
            <Button
              type="button"
              size="sm"
              onClick={handleSaveSetup}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Salvando Skill...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Concluir Setup e Cadastrar Skill
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
