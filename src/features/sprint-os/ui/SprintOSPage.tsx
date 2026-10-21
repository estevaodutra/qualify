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
  Layers,
  Kanban,
  Calendar,
  Filter,
  DollarSign,
  Flag,
  Search,
  RotateCcw,
  Sparkles,
  BarChart3,
  Target,
  Calculator,
  Play,
  Pause,
  Square,
  Clock,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";

import { useSprintOSStore, type ViewTab } from "../state/sprintOsStore";
import { SchedulesListView } from "./views/SchedulesListView";
import { ExecutiveHeader } from "./ExecutiveHeader";
import { ExecutiveKPIs } from "./ExecutiveKPIs";
import { OperationalCompassCard } from "./OperationalCompassCard";
import { DailyRoutineCard } from "./DailyRoutineCard";
import { StructureView } from "./views/StructureView";
import { KanbanView } from "./views/KanbanView";
import { GanttView } from "./views/GanttView";
import { IndicatorsView } from "./views/IndicatorsView";
import { CalculatorsView } from "./views/CalculatorsView";
import { FunnelView } from "./views/FunnelView";
import { MilestonesView } from "./views/MilestonesView";

import { DeadlineUpdateModal } from "./modals/DeadlineUpdateModal";
import { ActivateSprintModal } from "./modals/ActivateSprintModal";
import { TaskDetailModal } from "./modals/TaskDetailModal";
import { ReportsModal } from "./modals/ReportsModal";
import { ShareLinkModal } from "./modals/ShareLinkModal";
import { TemplatesModal } from "./modals/TemplatesModal";
import { CreateScheduleModal } from "./modals/CreateScheduleModal";
import { EditTemplateModal } from "./modals/EditTemplateModal";
import { upsertMember } from "../domain/ops";

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
    searchQuery,
    setSearchQuery,
    filterAssigneeId,
    setFilterAssigneeId,
    filterPriority,
    setFilterPriority,
    filterStatus,
    setFilterStatus,
    filterImpact,
    setFilterImpact,
    initWorkspace,
    mutate,
  } = useSprintOSStore();

  const lastInitCompanyIdRef = useRef<string | null | undefined>(undefined);
  const syncedMembersRef = useRef<Set<string>>(new Set());

  // Inicialização do workspace (uma única vez por empresa ativa)
  useEffect(() => {
    if (lastInitCompanyIdRef.current === activeCompanyId) return;
    lastInitCompanyIdRef.current = activeCompanyId;
    initWorkspace(activeCompanyId, null, user?.email || "Operador");
  }, [activeCompanyId, initWorkspace, user?.email]);

  // Sincronização automática dos membros do Qualify no Sprint OS em lote único
  useEffect(() => {
    if (!workspace || !companyMembers || companyMembers.length === 0) return;

    const missing = companyMembers.filter(
      (cm) => !workspace.members[cm.id] && !syncedMembersRef.current.has(cm.id)
    );

    if (missing.length === 0) return;

    missing.forEach((cm) => syncedMembersRef.current.add(cm.id));

    mutate((ws, ctx) => {
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
  const membersList = Object.values(workspace.members).filter((m) => !m.archivedAt);

  return (
    <div className="min-h-full bg-background text-foreground flex flex-col font-sans pb-16">
      {/* Região 1: Cabeçalho Compacto (Linear Style) */}
      <ExecutiveHeader />

      {/* Região 2: Progresso e Execução (Foco nas 5 perguntas) */}
      <ExecutiveKPIs />

      {/* Inteligência Operacional Compacta e Recolhível (Seções 7 e 8) */}
      <section className="px-6 py-2 grid grid-cols-1 md:grid-cols-12 gap-3.5">
        <div className="md:col-span-6">
          <OperationalCompassCard />
        </div>
        <div className="md:col-span-6">
          <DailyRoutineCard />
        </div>
      </section>

      {/* Região 3: Filtros Compactos */}
      <section className="px-6 pt-3 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Campo de Busca */}
            <div className="relative w-64">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tarefa ou entrega..."
                className="h-8 pl-8 text-xs bg-background border-input text-foreground rounded-xl placeholder:text-muted-foreground"
              />
            </div>

            {/* Filtro por Responsável */}
            <select
              value={filterAssigneeId || ""}
              onChange={(e) => setFilterAssigneeId(e.target.value || null)}
              className="h-8 rounded-xl bg-background border border-input text-xs text-foreground px-2.5"
            >
              <option value="">Todos os Responsáveis</option>
              {membersList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* Filtro por Prioridade */}
            <select
              value={filterPriority || ""}
              onChange={(e) => setFilterPriority((e.target.value as any) || null)}
              className="h-8 rounded-xl bg-background border border-input text-xs text-foreground px-2.5"
            >
              <option value="">Todas as Prioridades</option>
              <option value="P0">P0 — Crítica</option>
              <option value="P1">P1 — Alta</option>
              <option value="P2">P2 — Média</option>
              <option value="P3">P3 — Baixa</option>
            </select>

            {/* Filtro por Status */}
            <select
              value={filterStatus || ""}
              onChange={(e) => setFilterStatus((e.target.value as any) || null)}
              className="h-8 rounded-xl bg-background border border-input text-xs text-foreground px-2.5"
            >
              <option value="">Todos os Status</option>
              <option value="pending">🔴 Pendente</option>
              <option value="doing">🟡 Fazendo</option>
              <option value="done">🟢 Feito</option>
            </select>

            {/* Filtro por Impacto */}
            <select
              value={filterImpact || ""}
              onChange={(e) => setFilterImpact((e.target.value as any) || null)}
              className="h-8 rounded-xl bg-background border border-input text-xs text-foreground px-2.5"
            >
              <option value="">Todos os Impactos</option>
              <option value="financial_light">💸 Fin. Leve</option>
              <option value="financial_heavy">💰 Fin. Alto</option>
              <option value="progress_blocker">⏳ No Andamento</option>
              <option value="operational">⚙️ Operacional</option>
              <option value="infrastructure">⚠️ Infraestrutura</option>
            </select>

            {(searchQuery || filterAssigneeId || filterPriority || filterStatus || filterImpact) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterAssigneeId(null);
                  setFilterPriority(null);
                  setFilterStatus(null);
                  setFilterImpact(null);
                }}
                className="text-[11px] text-primary hover:underline font-bold"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Região 3: Visualizações Especializadas (Uma visualização principal por vez) */}
      <main className="px-6 pt-2 flex-1">
        <Tabs value={activeTab} onValueChange={(t) => setActiveTab(t as ViewTab)} className="w-full">
          <TabsList className="bg-muted/60 border border-border p-1 rounded-2xl mb-4 flex-wrap h-auto">
            <TabsTrigger value="structure" className="text-xs font-bold gap-2">
              <Layers className="h-3.5 w-3.5" />
              <span>Estrutura em Blocos</span>
            </TabsTrigger>
            <TabsTrigger value="kanban" className="text-xs font-bold gap-2">
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </TabsTrigger>
            <TabsTrigger value="gantt" className="text-xs font-bold gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>Gantt & Cronograma</span>
            </TabsTrigger>
            <TabsTrigger value="indicators" className="text-xs font-bold gap-2">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Indicadores</span>
            </TabsTrigger>
            <TabsTrigger value="calculators" className="text-xs font-bold gap-2">
              <Calculator className="h-3.5 w-3.5" />
              <span>Calculadoras</span>
            </TabsTrigger>
            <TabsTrigger value="funnel" className="text-xs font-bold gap-2">
              <Filter className="h-3.5 w-3.5" />
              <span>Funil X1</span>
            </TabsTrigger>
            <TabsTrigger value="milestones" className="text-xs font-bold gap-2">
              <Flag className="h-3.5 w-3.5" />
              <span>Marcos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="structure">
            <StructureView />
          </TabsContent>

          <TabsContent value="kanban">
            <KanbanView />
          </TabsContent>

          <TabsContent value="gantt">
            <GanttView />
          </TabsContent>

          <TabsContent value="indicators">
            <IndicatorsView />
          </TabsContent>

          <TabsContent value="calculators">
            <CalculatorsView />
          </TabsContent>

          <TabsContent value="funnel">
            <FunnelView />
          </TabsContent>

          <TabsContent value="milestones">
            <MilestonesView />
          </TabsContent>
        </Tabs>
      </main>

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
