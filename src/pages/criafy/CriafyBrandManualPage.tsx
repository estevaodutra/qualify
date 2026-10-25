import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Palette,
  Mic,
  Check,
  CheckCheck,
  ChevronDown,
  ExternalLink,
  Download,
  FolderArchive,
  RefreshCw,
  Plus,
  Rocket,
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
import { useSprintOSStore, type ViewTab } from "@/features/sprint-os/state/sprintOsStore";
import { BrandManualView } from "@/features/sprint-os/ui/views/BrandManualView";
import { CreativesView } from "@/features/sprint-os/ui/views/CreativesView";
import { ScriptsAndAudiosView } from "@/features/sprint-os/ui/views/ScriptsAndAudiosView";
import { CreateScheduleModal } from "@/features/sprint-os/ui/modals/CreateScheduleModal";
import { ShareLinkModal } from "@/features/sprint-os/ui/modals/ShareLinkModal";
import { TaskDetailModal } from "@/features/sprint-os/ui/modals/TaskDetailModal";
import { ReportsModal } from "@/features/sprint-os/ui/modals/ReportsModal";
import { toast } from "sonner";

export const CriafyBrandManualPage: React.FC = () => {
  const { workspaceId: urlWorkspaceId } = useParams<{ workspaceId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

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
  } = useSprintOSStore();

  // Sub-aba ativa dentro da página: "brand_manual" | "creatives" | "scripts_and_audios"
  const currentTab = (["brand_manual", "creatives", "scripts_and_audios"].includes(activeTab)
    ? activeTab
    : "brand_manual") as "brand_manual" | "creatives" | "scripts_and_audios";

  // Sincroniza query parameter ?tab= da URL
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "brand_manual" || tabParam === "manual" || tabParam === "manual_marca") {
      setActiveTab("brand_manual");
    } else if (tabParam === "creatives" || tabParam === "criativos") {
      setActiveTab("creatives");
    } else if (tabParam === "scripts_and_audios" || tabParam === "audios" || tabParam === "scripts") {
      setActiveTab("scripts_and_audios");
    } else if (!["brand_manual", "creatives", "scripts_and_audios"].includes(activeTab)) {
      setActiveTab("brand_manual");
    }
  }, [searchParams, setActiveTab]);

  // Inicialização do workspace com a empresa ativa
  useEffect(() => {
    if (activeCompanyId) {
      initWorkspace(activeCompanyId, urlWorkspaceId || activeWorkspaceId || null, user?.email || "Operador");
    }
  }, [activeCompanyId, urlWorkspaceId, initWorkspace, user?.email]);

  // Se houver lista de workspaces mas nenhum ativo, seleciona o primeiro
  useEffect(() => {
    if (!isLoading && !activeWorkspaceId && workspacesList.length > 0 && activeCompanyId) {
      openWorkspace(workspacesList[0].id, activeCompanyId, user?.email || "Operador");
    }
  }, [isLoading, activeWorkspaceId, workspacesList, activeCompanyId, openWorkspace, user?.email]);

  // Sincronização da URL com o cronograma ativo
  useEffect(() => {
    if (activeWorkspaceId && urlWorkspaceId !== activeWorkspaceId) {
      navigate(`/criafy/manual-da-marca/${activeWorkspaceId}`, { replace: true });
    }
  }, [activeWorkspaceId, urlWorkspaceId, navigate]);

  const handleSelectTab = (tab: "brand_manual" | "creatives" | "scripts_and_audios") => {
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tab);
    setSearchParams(nextParams, { replace: true });
  };

  const handleExportJson = () => {
    if (!workspace) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workspace, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `manual-da-marca-${(workspace.project.name || "projeto").toLowerCase().replace(/\s+/g, "-")}.json`);
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
    const completed = list.filter((a) => a.status === "gravado" || a.recordings?.length > 0).length;
    return {
      total: list.length,
      completed,
    };
  }, [workspace?.audioRequests]);

  if (isLoading) {
    return (
      <div className="h-[65vh] w-full flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Carregando Manual da Marca...
          </span>
        </div>
      </div>
    );
  }

  // Se a empresa ainda não tiver nenhum projeto/cronograma cadastrado
  if (!workspace) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-border shadow-xl space-y-5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">Manual da Marca — Criafy</h2>
            <p className="text-xs text-muted-foreground">
              Nenhum projeto ou manual de marca foi encontrado para a empresa{" "}
              <strong className="text-foreground">{activeCompany?.name || "ativa"}</strong>.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full gap-2 text-xs font-bold bg-primary text-primary-foreground h-10 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Criar Primeiro Manual da Marca
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/criafy")}
              className="w-full text-xs h-10 rounded-xl"
            >
              Voltar ao Criafy
            </Button>
          </div>
        </div>
        <CreateScheduleModal />
      </div>
    );
  }

  const sprints = Object.values(workspace.sprints || {}).filter((s) => !s.archivedAt);
  const activeSprint = sprints[0];
  const isActivated = !!activeSprint?.activatedAt;

  return (
    <div className="min-h-full bg-background text-foreground flex flex-col font-sans pb-16">
      {/* 1. Header do Manual da Marca no Criafy */}
      <header className="border-b border-border bg-card/80 backdrop-blur-xl px-6 py-3.5 sticky top-0 z-30 flex items-center justify-between gap-4 text-card-foreground">
        {/* Esquerda: Voltar ao Criafy + Seletor de Projeto / Workspace */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/criafy")}
            className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center gap-1.5 shrink-0"
            title="Voltar ao Criafy"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs font-medium hidden sm:inline">Criafy</span>
          </Button>

          <div className="h-4 w-[1px] bg-border shrink-0" />

          {/* Seletor de Workspace / Projeto */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 group hover:opacity-90 transition-opacity truncate text-left rounded-xl px-2 py-1 hover:bg-muted/60"
              >
                <div className="truncate">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black flex items-center gap-1">
                    <span>Projeto</span>
                    <ChevronDown className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                  </div>
                  <div className="text-sm font-bold text-foreground tracking-tight truncate max-w-[180px] sm:max-w-[260px]">
                    {workspace.project.name || "Projeto Principal"}
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={`text-[9px] font-semibold px-2 py-0 rounded-full shrink-0 ml-1 hidden md:inline-flex ${
                    isActivated
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  }`}
                >
                  {isActivated ? "Publicado" : "Rascunho"}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 p-2 rounded-2xl shadow-2xl border-border bg-card">
              <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Alternar Manual do Projeto
              </div>
              {workspacesList.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => openWorkspace(ws.id, activeCompanyId, user?.email || "Operador")}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl cursor-pointer"
                >
                  <div className="truncate">
                    <div className="text-xs font-bold text-foreground truncate">{ws.projectName || ws.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{ws.client || "Cliente"}</div>
                  </div>
                  {ws.id === workspace.project.id && <Check className="h-4 w-4 text-primary shrink-0" />}
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
            className="hidden lg:flex items-center gap-1 font-mono text-[10px] text-muted-foreground/80 hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md border border-border/50 transition-colors cursor-pointer shrink-0"
            title={`Clique para copiar o ID: ${workspace.project.id}`}
          >
            <span className="text-[9px] text-muted-foreground/60 font-sans font-bold">ID</span>
            <span className="font-semibold">{workspace.project.id.slice(0, 8)}</span>
          </button>
        </div>

        {/* Centro: Switcher de 3 Abas Específicas do Manual da Marca */}
        <div className="flex items-center p-0.5 bg-muted/60 border border-border/80 rounded-2xl gap-1 shrink-0 overflow-x-auto">
          {/* Aba 1: Manual de Marca */}
          <button
            type="button"
            onClick={() => handleSelectTab("brand_manual")}
            className={`h-8 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              currentTab === "brand_manual"
                ? "bg-background text-primary shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Manual de Marca 7D — Posicionamento, Alma da Copy, Raio X do ICP, Personalidade & Copy Ads"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Manual de Marca</span>
            {brandManualStats.total > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                {brandManualStats.answered}/{brandManualStats.total}
              </span>
            )}
          </button>

          {/* Aba 2: Criativos */}
          <button
            type="button"
            onClick={() => handleSelectTab("creatives")}
            className={`h-8 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              currentTab === "creatives"
                ? "bg-background text-primary shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Criativos — Biblioteca de Anúncios, Ganchos e Formatos"
          >
            <Palette className="h-3.5 w-3.5 text-primary" />
            <span>Criativos</span>
          </button>

          {/* Aba 3: Scripts e Áudios */}
          <button
            type="button"
            onClick={() => handleSelectTab("scripts_and_audios")}
            className={`h-8 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              currentTab === "scripts_and_audios"
                ? "bg-background text-primary shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Scripts e Áudios — Solicitações e Gravações de Voz com Transcrição"
          >
            <Mic className="h-3.5 w-3.5 text-primary" />
            <span>Scripts e Áudios</span>
            {audioStats.total > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                {audioStats.completed}/{audioStats.total}
              </span>
            )}
          </button>
        </div>

        {/* Direita: Autosave + Salvar e Publicar + Mais Opções */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Indicador de Salvamento */}
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

          {/* Botão Salvar e Publicar */}
          <Button
            size="sm"
            onClick={() => saveAndPublishAction(user?.email || "Operador")}
            className="h-8 px-3.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs gap-1.5"
            title="Salvar alterações e sincronizar com Supabase"
          >
            <Rocket className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Salvar e Publicar</span>
          </Button>

          {/* Menu de Opções Secundárias */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
                title="Mais opções do Manual"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl shadow-2xl border-border bg-card">
              <DropdownMenuItem
                onClick={handleExportJson}
                className="gap-2 text-xs cursor-pointer rounded-xl p-2"
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Exportar JSON do Manual</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                onClick={() => navigate(`/cronogramas/${workspace.project.id}`)}
                className="gap-2 text-xs cursor-pointer rounded-xl p-2"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Ver no Cronograma Operacional</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 2. Conteúdo da Aba Selecionada */}
      <main className="px-6 pt-4 flex-1">
        {currentTab === "brand_manual" && <BrandManualView />}
        {currentTab === "creatives" && <CreativesView />}
        {currentTab === "scripts_and_audios" && <ScriptsAndAudiosView />}
      </main>

      {/* Modais Globais de Apoio */}
      <CreateScheduleModal />
      <ShareLinkModal />
      <TaskDetailModal />
      <ReportsModal />
    </div>
  );
};

export default CriafyBrandManualPage;
