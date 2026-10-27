import React, { useState, useEffect, useMemo } from "react";
import {
  Share2,
  Copy,
  CheckCircle2,
  ExternalLink,
  Globe,
  Lock,
  Unlock,
  Check,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { SprintOSRepository } from "../../persistence/repository";
import { getBrandManualData } from "../../domain/ops";
import { BrandManualPublicShareConfig } from "../../domain/types";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";

export const BrandManualShareModal: React.FC = () => {
  const {
    workspace,
    isBrandManualShareModalOpen,
    setIsBrandManualShareModalOpen,
    mutate,
    saveAndPublishAction,
  } = useSprintOSStore();
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();

  const [enabled, setEnabled] = useState(true);
  const [allowedModules, setAllowedModules] = useState<string[]>([
    "posicionamento",
    "alma_copy",
    "raio_x_icp",
  ]);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"pending" | "completed">("pending");
  const [allowReopen, setAllowReopen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const brandManual = useMemo(() => {
    if (!workspace) return null;
    return getBrandManualData(workspace);
  }, [workspace]);

  // Sincroniza estado ao abrir o modal
  useEffect(() => {
    if (!isBrandManualShareModalOpen || !brandManual) return;

    const existing = brandManual.publicShareConfig;
    if (existing && existing.token) {
      setEnabled(existing.enabled ?? true);
      setAllowedModules(
        existing.allowedModuleIds && existing.allowedModuleIds.length > 0
          ? existing.allowedModuleIds
          : ["posicionamento", "alma_copy", "raio_x_icp"]
      );
      setToken(existing.token);
      setStatus(existing.status || "pending");
      setAllowReopen(existing.allowReopen || false);
    } else {
      const newToken = `bm_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
      setEnabled(true);
      setAllowedModules(["posicionamento", "alma_copy", "raio_x_icp"]);
      setToken(newToken);
      setStatus("pending");
      setAllowReopen(false);
    }
  }, [isBrandManualShareModalOpen, brandManual]);

  if (!workspace || !brandManual) return null;

  const publicUrl = `${window.location.origin}/briefing/${token}`;

  // Estatísticas das perguntas selecionadas
  const selectedStats = useMemo(() => {
    const activeFields = brandManual.fields.filter(
      (f) => !f.archived && !f.removed && allowedModules.includes(f.moduleId)
    );
    const answered = activeFields.filter((f) => (f.response || "").trim().length > 0).length;
    return {
      total: activeFields.length,
      answered,
      missing: activeFields.length - answered,
    };
  }, [brandManual.fields, allowedModules]);

  const toggleModule = (modId: string) => {
    setAllowedModules((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  const selectRecommendedThree = () => {
    setAllowedModules(["posicionamento", "alma_copy", "raio_x_icp"]);
  };

  const handleSaveAndPublish = async () => {
    if (allowedModules.length === 0) {
      toast.error("Selecione pelo menos um módulo para incluir no link público.");
      return;
    }

    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const companyId = activeCompanyId || workspace.project.companyId || "";

      const newConfig: BrandManualPublicShareConfig = {
        enabled,
        token,
        url: publicUrl,
        allowedModuleIds: allowedModules,
        status,
        allowReopen,
        completedAt: brandManual.publicShareConfig?.completedAt,
        submittedBy: brandManual.publicShareConfig?.submittedBy,
        lastAnsweredAt: brandManual.publicShareConfig?.lastAnsweredAt,
        createdAt: brandManual.publicShareConfig?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      // 1. Atualiza o workspace
      await mutate((ws) => {
        const bm = getBrandManualData(ws);
        bm.publicShareConfig = newConfig;
        bm.lastUpdatedAt = nowIso;
      }, user?.email || "Estrategista");

      // 2. Registra na tabela sprint_os_share_links
      if (companyId) {
        await SprintOSRepository.upsertBrandManualShareLink({
          token,
          workspaceId: workspace.project.id,
          companyId,
          label: `Briefing Manual de Marca - ${workspace.project.name}`,
          enabled,
        });
      }

      // 3. Salva e publica o workspace no Supabase
      await saveAndPublishAction(user?.email || "Estrategista");

      navigator.clipboard.writeText(publicUrl);
      toast.success("Link público publicado e copiado para a área de transferência!");
    } catch (e: any) {
      console.error("Erro ao publicar link:", e);
      toast.error("Erro ao salvar configuração do link público.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReopenForClient = async () => {
    setStatus("pending");
    setAllowReopen(true);
    toast.info("Status alterado para Pendente. Clique em 'Publicar Link' para confirmar a reabertura.");
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link público copiado!");
  };

  // Filtra módulos de perguntas (exclui copy_ads da seleção ou mostra com indicação)
  const questionModules = brandManual.modules.filter((m) => m.id !== "copy_ads");

  return (
    <Dialog open={isBrandManualShareModalOpen} onOpenChange={setIsBrandManualShareModalOpen}>
      <DialogContent className="sm:max-w-lg rounded-3xl bg-card border border-border text-card-foreground shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Globe className="h-4 w-4" />
            <span className="text-[11px] uppercase font-black tracking-wider">
              Link Público do Cliente · Preenchimento Único
            </span>
          </div>
          <DialogTitle className="text-base font-black text-foreground">
            Configurar Link Público do Manual de Marca
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Escolha quais módulos o cliente deverá responder. O link só fica acessível enquanto houver informações faltando ou ainda não enviadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 1. Ativar / Desativar Link */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/80">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                {enabled ? (
                  <Unlock className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span>Acesso ao Link Público</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {enabled
                  ? "Link habilitado para coleta de respostas do cliente."
                  : "Link desativado temporariamente."}
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* 2. Seleção de Módulos que vão para o Link */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">
                Módulos Habilitados no Link Público
              </label>
              <button
                type="button"
                onClick={selectRecommendedThree}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                Habilitar Posicionamento + Alma + Raio X
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {questionModules.map((mod) => {
                const isSelected = allowedModules.includes(mod.id);
                const modFields = brandManual.fields.filter(
                  (f) => f.moduleId === mod.id && !f.archived && !f.removed
                );
                const answeredModCount = modFields.filter(
                  (f) => (f.response || "").trim().length > 0
                ).length;

                return (
                  <div
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-background hover:bg-muted/40 opacity-75"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-background"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-foreground">{mod.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {mod.description}
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono shrink-0 ml-2 bg-card"
                    >
                      {answeredModCount}/{modFields.length} resp.
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Resumo de Preenchimento e Regra de Acesso Único */}
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                Status do Preenchimento:
              </span>
              {status === "completed" && selectedStats.missing === 0 ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Concluído pelo Cliente
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]"
                >
                  {selectedStats.answered} de {selectedStats.total} respondidas ({selectedStats.missing} faltando)
                </Badge>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {status === "completed" && selectedStats.missing === 0
                ? "Todas as perguntas selecionadas já foram respondidas e finalizadas. O link encontra-se travado para evitar alterações acidentais."
                : "O link está aberto e acessível para o cliente preencher as perguntas pendentes. Ao finalizar o envio, o link será bloqueado automaticamente."}
            </p>

            {status === "completed" && (
              <div className="pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleReopenForClient}
                  className="h-7 text-[11px] rounded-lg gap-1"
                >
                  <Unlock className="w-3 h-3" /> Reabrir link para novas alterações
                </Button>
              </div>
            )}
          </div>

          {/* 4. URL do Link Público */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              Link de Acesso do Cliente
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={publicUrl}
                readOnly
                className="text-xs bg-background border-input font-mono text-muted-foreground"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                className="h-9 px-3 rounded-xl gap-1.5 text-xs font-bold shrink-0"
                title="Copiar link"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                asChild
                className="h-9 w-9 rounded-xl shrink-0"
                title="Testar link em nova aba"
              >
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsBrandManualShareModalOpen(false)}
            className="text-xs rounded-xl"
          >
            Fechar
          </Button>
          <Button
            type="button"
            onClick={handleSaveAndPublish}
            disabled={isSaving || allowedModules.length === 0}
            className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl gap-1.5"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Publicando...</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span>Publicar e Copiar Link</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
