import { useParams, useNavigate } from "react-router-dom";
/**
 * Página Principal do Módulo de Cronogramas / Sprint OS (Apps → Cronogramas).
 * Especificação: Master Prompt v9.0 — Lean Operations Dashboard 80/20.
 *
 * Arquitetura Definitiva:
 * - Se nenhum cronograma estiver aberto: exibe "Meus Cronogramas" (SchedulesListView).
 * - Ao selecionar um cronograma: exibe o Cockpit Operacional 80/20 focado nas 5 perguntas.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Square,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";

import { useSprintOSStore } from "../state/sprintOsStore";
import { SchedulesListView } from "./views/SchedulesListView";
import { ExecutiveHeader } from "./ExecutiveHeader";
import { KanbanView } from "./views/KanbanView";
import { ModularDashboard } from "./dashboard/ModularDashboard";
import { BrandManualView } from "./views/BrandManualView";
import { CreativesView } from "./views/CreativesView";
import { ScriptsAndAudiosView } from "./views/ScriptsAndAudiosView";

import { DeadlineUpdateModal } from "./modals/DeadlineUpdateModal";
import { ActivateSprintModal } from "./modals/ActivateSprintModal";
import { TaskDetailModal } from "./modals/TaskDetailModal";
import { ReportsModal } from "./modals/ReportsModal";
import { ShareLinkModal } from "./modals/ShareLinkModal";
import { TemplatesModal } from "./modals/TemplatesModal";
import { CreateScheduleModal } from "./modals/CreateScheduleModal";
import { EditTemplateModal } from "./modals/EditTemplateModal";
import { upsertMember, cleanDuplicateMembers } from "../domain/ops";

const FloatingTimerBar: React.FC = () => {
  const { user } = useAuth();
  const { activeTimer, pauseTimer, resumeTimer, stopAndSaveTimer, openTaskModal } = useSprintOSStore();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!activeTimer || !activeTimer.isRunning) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeTimer?.isRunning]);

  if (!activeTimer) return null;

  const currentElapsed =
    activeTimer.elapsedSeconds +
    (activeTimer.isRunning && activeTimer.startedAt
      ? Math.floor((Date.now() - activeTimer.startedAt) / 1000)
      : 0);

  const displaySeconds =
    activeTimer.mode === "pomodoro"
      ? Math.max(0, activeTimer.targetSeconds - currentElapsed)
      : currentElapsed;

  const m = Math.floor(displaySeconds / 60);
  const s = displaySeconds % 60;
  const timeFormatted = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card border border-border shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-300 text-card-foreground">
      <div
        className="flex items-center gap-2.5 cursor-pointer group"
        onClick={() => openTaskModal(activeTimer.taskId)}
      >
        <span className="relative flex h-2.5 w-2.5">
          {activeTimer.isRunning && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              activeTimer.isRunning ? "bg-primary" : "bg-amber-500"
            }`}
          />
        </span>
        <div className="max-w-[180px]">
          <div className="text-[11px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
            {activeTimer.taskTitle}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {activeTimer.mode === "pomodoro" ? "🍅 Pomodoro" : "⏱️ Cronômetro"}
          </div>
        </div>
      </div>

      <div className="font-mono text-base font-black text-foreground px-2 py-0.5 rounded-lg bg-muted border border-border tracking-wider">
        {timeFormatted}
      </div>

      <div className="flex items-center gap-1">
        {activeTimer.isRunning ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={pauseTimer}
            className="h-8 w-8 text-amber-500 hover:bg-amber-500/10 rounded-xl"
            title="Pausar"
          >
            <Pause className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            onClick={resumeTimer}
            className="h-8 w-8 text-primary hover:bg-primary/10 rounded-xl"
            title="Retomar"
          >
            <Play className="h-4 w-4 fill-current" />
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => stopAndSaveTimer(user?.email || "Operador")}
          className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1 shadow-md shadow-emerald-900/20"
          title="Concluir e Salvar Registro"
        >
          <Square className="h-3 w-3 fill-current" />
          <span>Salvar</span>
        </Button>
      </div>
    </div>
  );
};

export const SprintOSPage: React.FC = () => {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const { members: companyMembers } = useCompanyMembers();

  const {
    activeWorkspaceId,
    workspace,
    isLoading,
    activeTab,
    setActiveTab,
    initWorkspace,
    mutate,
  } = useSprintOSStore();

  const lastInitCompanyIdRef = useRef<string | null | undefined>(undefined);
  const syncedMembersRef = useRef<Set<string>>(new Set());

  // Detecção de parâmetro ?tab= na URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "brand_manual" || tabParam === "manual_marca" || tabParam === "manual") {
      setActiveTab("brand_manual");
    } else if (tabParam === "scripts_and_audios" || tabParam === "audios" || tabParam === "scripts") {
      setActiveTab("scripts_and_audios");
    } else if (tabParam === "creatives" || tabParam === "criativos") {
      setActiveTab("creatives");
    }
  }, [setActiveTab]);

  const { workspaceId: urlWorkspaceId } = useParams<{ workspaceId?: string }>();
  const navigate = useNavigate();

  // Inicialização do workspace (por empresa ativa e sincronizado com o ID da URL)
  useEffect(() => {
    lastInitCompanyIdRef.current = activeCompanyId;
    initWorkspace(activeCompanyId, urlWorkspaceId || null, user?.email || "Operador");
  }, [activeCompanyId, urlWorkspaceId, initWorkspace, user?.email]);

  // Sincronização da URL com o cronograma ativo
  useEffect(() => {
    if (activeWorkspaceId && (!urlWorkspaceId || urlWorkspaceId !== activeWorkspaceId)) {
      navigate(`/sprint-os/${activeWorkspaceId}`, { replace: true });
    }
  }, [activeWorkspaceId, urlWorkspaceId, navigate]);

  // Se houver um ID na URL mas não houver cronograma ativo e o carregamento terminou, volta para a lista
  useEffect(() => {
    if (urlWorkspaceId && !activeWorkspaceId && !isLoading) {
      navigate("/sprint-os", { replace: true });
    }
  }, [urlWorkspaceId, activeWorkspaceId, isLoading, navigate]);

  // Ao voltar via histórico do navegador para /sprint-os sem ID
  useEffect(() => {
    if (!urlWorkspaceId && activeWorkspaceId) {
      useSprintOSStore.getState().closeWorkspace();
    }
  }, [urlWorkspaceId]);

  // Sincronização automática e higienização dos membros do Qualify no Sprint OS em lote único
  useEffect(() => {
    if (!workspace) return;

    // Detecta se existem duplicatas no workspace atual (por userId ou por nome)
    const existingList = Object.values(workspace.members || {});
    const hasDuplicates = existingList.some((m, idx) =>
      existingList.findIndex(
        (other) =>
          other.id !== m.id &&
          ((m.userId && other.userId && m.userId === other.userId) ||
           (m.name && other.name && m.name.trim().toLowerCase() === other.name.trim().toLowerCase()))
      ) > idx
    );

    const missing = (companyMembers || []).filter((cm) => {
      const alreadyHas = Object.values(workspace.members || {}).some(
        (m) =>
          m.id === cm.id ||
          (cm.user_id && m.userId === cm.user_id) ||
          (cm.full_name && m.name && m.name.trim().toLowerCase() === cm.full_name.trim().toLowerCase())
      );
      return !alreadyHas && !syncedMembersRef.current.has(cm.id);
    });

    if (hasDuplicates || missing.length > 0) {
      missing.forEach((cm) => syncedMembersRef.current.add(cm.id));

      mutate((ws, ctx) => {
        // Higieniza duplicatas pré-existentes
        cleanDuplicateMembers(ws, ctx);

        // Adiciona apenas membros que realmente faltavam
        missing.forEach((cm) => {
          upsertMember(ws, ctx, {
            id: cm.id,
            userId: cm.user_id,
            name: cm.full_name || cm.email || "Membro Qualify",
            role: cm.role,
            active: cm.is_active,
          });
        });
      }, user?.email || "Sistema");
    }
  }, [workspace?.project?.id, companyMembers, mutate, user?.email]);

  if (isLoading) {
    return (
      <div className="h-[60vh] w-full flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Carregando Cronogramas...
          </span>
        </div>
      </div>
    );
  }

  // 1. SE NENHUM CRONOGRAMA ESTIVER ABERTO -> EXIBE LISTAGEM MEUS CRONOGRAMAS (Seção 4)
  if (!activeWorkspaceId || !workspace) {
    return (
      <>
        <SchedulesListView />
        <CreateScheduleModal />
      </>
    );
  }

  // 2. CRONOGRAMA ABERTO -> COCKPIT OPERACIONAL 80/20 (Seção 6)
  return (
    <div className="min-h-full bg-background text-foreground flex flex-col font-sans pb-16">
      {/* Região 1: Cabeçalho Compacto (Linear Style) */}
      <ExecutiveHeader />

      {/* Alternância de Visualização Principal: 4 Abas Principais (AJ-021) */}
      {activeTab === "brand_manual" ? (
        <main className="px-6 pt-4 flex-1">
          <BrandManualView />
        </main>
      ) : activeTab === "creatives" ? (
        <main className="px-6 pt-4 flex-1">
          <CreativesView />
        </main>
      ) : activeTab === "scripts_and_audios" ? (
        <main className="px-6 pt-4 flex-1">
          <ScriptsAndAudiosView />
        </main>
      ) : (
        <>
          {/* Cockpit Operacional Minimalista 80/20: INFRA | DISTRIBUIÇÃO | FUNIL */}
          <ModularDashboard />

          {/* Visualização Principal: Apenas Kanban */}
          <main className="px-6 pt-2 flex-1">
            <KanbanView />
          </main>
        </>
      )}

      {/* Floating Pomodoro / Stopwatch Timer */}
      <FloatingTimerBar />

      {/* Modais Globais */}
      <CreateScheduleModal />
      <EditTemplateModal />
      <DeadlineUpdateModal />
      <ActivateSprintModal />
      <TaskDetailModal />
      <ReportsModal />
      <ShareLinkModal />
      <TemplatesModal />
    </div>
  );
};

export default SprintOSPage;
