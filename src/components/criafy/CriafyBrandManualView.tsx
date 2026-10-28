import React, { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Palette,
  Mic,
  Check,
  CheckCheck,
  ChevronDown,
  Download,
  FileText,
  RefreshCw,
  Plus,
  Rocket,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSprintOSStore } from "@/features/sprint-os/state/sprintOsStore";
import { BrandManualView } from "@/features/sprint-os/ui/views/BrandManualView";
import { CreativesView } from "@/features/sprint-os/ui/views/CreativesView";
import { ScriptsAndAudiosView } from "@/features/sprint-os/ui/views/ScriptsAndAudiosView";
import { CreateScheduleModal } from "@/features/sprint-os/ui/modals/CreateScheduleModal";
import { ShareLinkModal } from "@/features/sprint-os/ui/modals/ShareLinkModal";
import { BrandManualShareModal } from "@/features/sprint-os/ui/modals/BrandManualShareModal";
import { TaskDetailModal } from "@/features/sprint-os/ui/modals/TaskDetailModal";
import { ReportsModal } from "@/features/sprint-os/ui/modals/ReportsModal";
import { downloadBrandManualMarkdown } from "@/features/sprint-os/utils/exportBrandManualMarkdown";
import { CriafySubsidebar, CriafySubsidebarGroup } from "./CriafySubsidebar";
import { Target, Users, User } from "lucide-react";
import { toast } from "sonner";

export const CriafyBrandManualView: React.FC = () => {
  const { activeCompanyId, activeCompany } = useCompany();
  const { user } = useAuth();

  const {
    workspace,
    activeWorkspaceId,
    workspacesList,
    isLoading,
    activeTab,
    setActiveTab,
    openWorkspace,
    initWorkspace,
    autosaveStatus,
    saveAndPublishAction,
    setIsCreateModalOpen,
    setIsBrandManualShareModalOpen,
  } = useSprintOSStore();

  // Sub-aba ativa dentro do Manual da Marca no Criafy: "brand_manual" | "creatives" | "scripts_and_audios"
  const currentSubTab = (["brand_manual", "creatives", "scripts_and_audios"].includes(activeTab)
    ? activeTab
    : "brand_manual") as "brand_manual" | "creatives" | "scripts_and_audios";

  // Inicialização do workspace para a empresa ativa
  useEffect(() => {
    if (activeCompanyId) {
      initWorkspace(activeCompanyId, activeWorkspaceId || null, user?.email || "Operador");
    }
  }, [activeCompanyId, initWorkspace, user?.email]);

  // Se houver lista de workspaces mas nenhum ativo, seleciona o primeiro
  useEffect(() => {
    if (!isLoading && !activeWorkspaceId && workspacesList.length > 0 && activeCompanyId) {
      openWorkspace(workspacesList[0].id, activeCompanyId, user?.email || "Operador");
    }
  }, [isLoading, activeWorkspaceId, workspacesList, activeCompanyId, openWorkspace, user?.email]);

  const handleExportMarkdown = () => {
    if (!workspace?.brandManual) {
      toast.error("Manual da Marca não encontrado.");
      return;
    }
    downloadBrandManualMarkdown(
      workspace.project.name || "manual-da-marca",
      workspace.brandManual,
      user?.email || "Estrategista"
    );
  };

  const handleExportJson = () => {
    if (!workspace) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workspace, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `manual-da-marca-${(workspace.project.name || "projeto").toLowerCase().replace(/\s+/g, "-")}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Download do Manual da Marca iniciado.");
  };

  // Contagem de perguntas respondidas no Manual da Marca
  const brandManualStats = useMemo(() => {
    const fields = workspace?.brandManual?.fields || [];
    const activeFields = fields.filter((f) => !f.archived && !f.removed);
    const count = activeFields.filter((f) => (f.response || "").trim().length > 15).length;
    return {
      answered: count,
      total: activeFields.length,
      pct: activeFields.length > 0 ? Math.round((count / activeFields.length) * 100) : 0,
    };
  }, [workspace?.brandManual?.fields]);

  // Contagem de pedidos de áudio / scripts
  const audioStats = useMemo(() => {
    const list = Object.values(workspace?.audioRequests || {}).filter((a) => !a.archivedAt);
    const completed = list.filter((a) => a.status === "gravado" || (a.recordings && a.recordings.length > 0)).length;
    return {
      total: list.length,
      completed,
    };
  }, [workspace?.audioRequests]);

  if (isLoading) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-card/50 rounded-2xl border border-border">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Carregando Manual da Marca...
          </span>
        </div>
      </div>
    );
  }

  // Se a empresa ainda não tiver nenhum projeto/cronograma cadastrado
  if (!workspace) {
    return (
      <div className="p-8 rounded-3xl bg-card border border-border text-center space-y-4 max-w-lg mx-auto my-8 shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shadow-md">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold">Manual da Marca — Criafy</h3>
          <p className="text-xs text-muted-foreground">
            Nenhum projeto encontrado para a empresa <strong>{activeCompany?.name || "ativa"}</strong>.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2 text-xs font-bold bg-primary text-primary-foreground h-9 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Criar Manual da Marca
        </Button>
        <CreateScheduleModal />
      </div>
    );
  }

  const brandSubsidebarGroups: CriafySubsidebarGroup[] = [
    {
      title: "Manual de Marca 7D",
      items: [
        { id: "posicionamento", label: "Posicionamento & Mecanismo", icon: Target },
        { id: "alma_copy", label: "Alma da Copy", icon: Sparkles },
        { id: "raio_x_icp", label: "Raio-X do ICP", icon: Users },
        { id: "personalidade", label: "Personalidade do Expert", icon: User },
        { id: "copy_ads", label: "Copy Ads (10 Variantes)", icon: Palette },
      ],
    },
    {
      title: "Recursos & Execução",
      items: [
        { id: "creatives", label: "Criativos da Marca", icon: Palette },
        {
          id: "scripts_and_audios",
          label: "Scripts e Áudios",
          icon: Mic,
          count: audioStats.total > 0 ? `${audioStats.completed}/${audioStats.total}` : undefined,
        },
      ],
    },
  ];

  const sprints = Object.values(workspace.sprints || {}).filter((s) => !s.archivedAt);
  const activeSprint = sprints[0];
  const isActivated = !!activeSprint?.activatedAt;

  return (
    <div className="space-y-4 pt-1">
      {/* Barra de Controle Interna do Manual da Marca no Criafy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border border-border/80 rounded-2xl shadow-xs">
        {/* Seletor do Projeto do Manual da Marca */}
        <div className="flex items-center gap-2.5 min-w-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 group hover:opacity-90 transition-opacity truncate text-left rounded-xl px-2.5 py-1.5 hover:bg-muted/70 border border-border/60"
              >
                <div className="truncate">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-black flex items-center gap-1">
                    <span>Projeto</span>
                    <ChevronDown className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                  </div>
                  <div className="text-xs font-bold text-foreground tracking-tight truncate max-w-[180px] sm:max-w-[220px]">
                    {workspace.project.name || "Projeto Principal"}
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={`text-[9px] font-semibold px-2 py-0 rounded-full shrink-0 ml-1 ${
                    isActivated
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  }`}
                >
                  {isActivated ? "Publicado" : "Rascunho"}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 p-2 rounded-2xl shadow-2xl border-border bg-card z-50">
              <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Alternar Projeto
              </div>
              {workspacesList.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => openWorkspace(ws.id, activeCompanyId, user?.email || "Operador")}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl cursor-pointer"
                >
                  <div className="truncate">
                    <div className="text-xs font-bold text-foreground truncate">{ws.projectName || ws.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{ws.client || "Cliente"}</div>
                  </div>
                  {ws.id === workspace.project.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => setIsCreateModalOpen(true)}
                className="gap-2 text-xs font-semibold text-primary cursor-pointer rounded-xl p-2"
              >
                <Plus className="h-3.5 w-3.5" /> Novo Projeto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* ID rápido */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(workspace.project.id);
              toast.success(`ID copiado: ${workspace.project.id}`);
            }}
            className="hidden md:flex items-center gap-1 font-mono text-[10px] text-muted-foreground/80 hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-1 rounded-lg border border-border/50 transition-colors cursor-pointer shrink-0"
            title={`Clique para copiar o ID: ${workspace.project.id}`}
          >
            <span className="text-[9px] text-muted-foreground/60 font-sans font-bold">ID</span>
            <span className="font-semibold">{workspace.project.id.slice(0, 8)}</span>
          </button>
        </div>



        {/* Ações: Status, Salvar e Exportar */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <div
            className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-muted-foreground px-2 py-1 rounded-lg"
            title={autosaveStatus === "saving" ? "Salvando alterações no Supabase..." : "Todas as alterações salvas"}
          >
            {autosaveStatus === "saving" ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin text-amber-500" />
                <span className="text-amber-500 font-semibold">Salvando...</span>
              </>
            ) : (
              <>
                <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Salvo</span>
              </>
            )}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBrandManualShareModalOpen(true)}
            className="h-8 px-3 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 rounded-xl gap-1.5"
            title="Configurar link público para o cliente preencher o briefing"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Link Público</span>
          </Button>

          <Button
            size="sm"
            onClick={() => saveAndPublishAction(user?.email || "Operador")}
            className="h-8 px-3 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs gap-1.5"
            title="Salvar alterações e sincronizar com Supabase"
          >
            <Rocket className="h-3.5 w-3.5" />
            <span>Salvar e Publicar</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
                title="Mais opções"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-2xl shadow-xl border-border bg-card">
              <DropdownMenuItem
                onClick={handleExportMarkdown}
                className="gap-2 text-xs cursor-pointer rounded-xl p-2 font-medium"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Exportar Markdown (.md)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportJson}
                className="gap-2 text-xs cursor-pointer rounded-xl p-2"
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Exportar JSON do Manual</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Layout com Subsidebar Contextual (Sem Tabs Horizontais) */}
      <div className="flex flex-col lg:flex-row gap-5 items-start pt-2">
        <CriafySubsidebar
          groups={brandSubsidebarGroups}
          activeId={activeBrandSubId}
          onChange={handleSubsidebarChange}
          title="Manual 7D"
        />

        <div className="flex-1 w-full min-w-0">
          {["posicionamento", "alma_copy", "raio_x_icp", "personalidade", "copy_ads"].includes(activeBrandSubId) && (
            <BrandManualView forcedModuleId={activeBrandSubId} hideTopTabs />
          )}
          {activeBrandSubId === "creatives" && <CreativesView />}
          {activeBrandSubId === "scripts_and_audios" && <ScriptsAndAudiosView />}
        </div>
      </div>

      {/* Modais Globais de Apoio */}
      <CreateScheduleModal />
      <ShareLinkModal />
      <BrandManualShareModal />
      <TaskDetailModal />
      <ReportsModal />
    </div>
  );
};

export default CriafyBrandManualView;
