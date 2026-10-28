import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Cpu,
  Plus,
  Edit2,
  CheckCircle2,
  Sparkles,
  Zap,
  Sliders,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { AiModelProfile } from "@/types/aiSkills";

export default function AdminAiModels() {
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState<Partial<AiModelProfile> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin_ai_model_profiles"],
    queryFn: () => AIExecutionService.getModelProfiles(),
  });

  const saveMutation = useMutation({
    mutationFn: (profile: Partial<AiModelProfile>) => AIExecutionService.saveModelProfile(profile),
    onSuccess: () => {
      toast.success("Perfil de modelo salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin_ai_model_profiles"] });
      setModalOpen(false);
      setEditingProfile(null);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar perfil."),
  });

  const handleOpenEdit = (profile: AiModelProfile) => {
    setEditingProfile({ ...profile });
    setModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingProfile({
      code: "",
      name: "",
      description: "",
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_output_tokens: 2000,
      timeout_seconds: 60,
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingProfile?.code || !editingProfile?.name || !editingProfile?.model) {
      toast.error("Código, Nome e Modelo são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      await saveMutation.mutateAsync(editingProfile);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Perfis de Modelos OpenAI</h1>
            <Badge variant="secondary" className="font-mono text-xs">{profiles.length} perfis</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            As Skills não são acopladas diretamente a nomes de modelos espalhados no código. Elas apontam para estes perfis centralizados.
          </p>
        </div>
        <Button onClick={handleOpenNew} className="shrink-0 text-xs">
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Perfil
        </Button>
      </div>

      {/* Grid de Perfis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 py-16 text-center text-xs text-muted-foreground">
            Carregando perfis de modelos...
          </div>
        ) : (
          profiles.map((p) => (
            <Card key={p.id} className="shadow-sm border flex flex-col justify-between hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {p.code}
                  </Badge>
                  {p.is_active ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Ativo
                    </span>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                  )}
                </div>
                <CardTitle className="text-base font-bold mt-2">{p.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2 min-h-[32px]">
                  {p.description || "Sem descrição."}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 text-xs border-t pt-3 mt-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Provedor:</span>
                  <strong className="text-foreground uppercase font-mono text-[11px]">{p.provider}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Modelo OpenAI:</span>
                  <code className="bg-background px-1.5 py-0.5 rounded border font-mono text-[11px] font-semibold text-primary">
                    {p.model}
                  </code>
                </div>
                {p.reasoning_effort && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Reasoning Effort:</span>
                    <Badge variant="outline" className="text-[10px] font-mono">{p.reasoning_effort}</Badge>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Temperatura:</span>
                  <span className="font-mono text-[11px]">{p.temperature}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Max Output Tokens:</span>
                  <span className="font-mono text-[11px]">{p.max_output_tokens}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Timeout:</span>
                  <span className="font-mono text-[11px]">{p.timeout_seconds}s</span>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleOpenEdit(p)}
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                    Editar Perfil
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Criação / Edição de Perfil */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              {editingProfile?.id ? "Editar Perfil de Modelo" : "Novo Perfil de Modelo"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure as diretrizes operacionais do modelo OpenAI para este perfil.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Código do Perfil (Único) *</Label>
              <Input
                value={editingProfile?.code || ""}
                onChange={(e) =>
                  setEditingProfile((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                }
                placeholder="Ex: CONTENT_ADVANCED"
                disabled={!!editingProfile?.id}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nome de Exibição *</Label>
              <Input
                value={editingProfile?.name || ""}
                onChange={(e) => setEditingProfile((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Content Advanced (GPT-4o)"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Descrição do Caso de Uso</Label>
              <Input
                value={editingProfile?.description || ""}
                onChange={(e) =>
                  setEditingProfile((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Ex: Utilizado para roteirização complexa e carrosséis"
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Modelo OpenAI *</Label>
                <Select
                  value={editingProfile?.model || "gpt-4o-mini"}
                  onValueChange={(m) => setEditingProfile((prev) => ({ ...prev, model: m }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">gpt-4o-mini (rápido e econômico)</SelectItem>
                    <SelectItem value="gpt-4o">gpt-4o (criatividade alta)</SelectItem>
                    <SelectItem value="o3-mini">o3-mini (raciocínio estruturado)</SelectItem>
                    <SelectItem value="o1-mini">o1-mini (raciocínio rápido)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Temperatura</Label>
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1.5"
                  value={editingProfile?.temperature ?? 0.7}
                  onChange={(e) =>
                    setEditingProfile((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Max Output Tokens</Label>
                <Input
                  type="number"
                  step="200"
                  min="500"
                  max="8000"
                  value={editingProfile?.max_output_tokens ?? 2000}
                  onChange={(e) =>
                    setEditingProfile((prev) => ({
                      ...prev,
                      max_output_tokens: parseInt(e.target.value) || 2000,
                    }))
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Timeout (segundos)</Label>
                <Input
                  type="number"
                  min="15"
                  max="180"
                  value={editingProfile?.timeout_seconds ?? 60}
                  onChange={(e) =>
                    setEditingProfile((prev) => ({
                      ...prev,
                      timeout_seconds: parseInt(e.target.value) || 60,
                    }))
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Salvar Perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
