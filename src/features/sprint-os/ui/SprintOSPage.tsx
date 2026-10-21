/**
 * Página Principal do Módulo de Cronogramas / Sprint OS (Apps → Cronogramas).
 * Especificação: Master Prompt v9.0 — Lean Operations Dashboard 80/20.
 *
 * Arquitetura Definitiva:
 * - Se nenhum cronograma estiver aberto: exibe "Meus Cronogramas" (SchedulesListView).
 * - Ao selecionar um cronograma: exibe o Cockpit Operacional 80/20 focado nas 5 perguntas.
 */

import React, { useEffect, useRef } from "react";
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
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
import { OKRsView } from "./views/OKRsView";
import { CalculatorsView } from "./views/CalculatorsView";
import { FunnelView } from "./views/FunnelView";
import { FinancialView } from "./views/FinancialView";
import { MilestonesView } from "./views/MilestonesView";

import { DeadlineUpdateModal } from "./modals/DeadlineUpdateModal";
import { ActivateSprintModal } from "./modals/ActivateSprintModal";
import { TaskDetailModal } from "./modals/TaskDetailModal";
import { ReportsModal } from "./modals/ReportsModal";
import { ShareLinkModal } from "./modals/ShareLinkModal";
import { TemplatesModal } from "./modals/TemplatesModal";
import { CreateScheduleModal } from "./modals/CreateScheduleModal";
import { upsertMember } from "../domain/ops";

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
      <div className="h-screen w-full flex items-center justify-center bg-[#0B0E14] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest text-white/50">
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
    <div className="min-h-screen bg-[#0B0E14] text-white flex flex-col font-sans pb-16 select-none">
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
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/50 border border-white/5">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Campo de Busca */}
            <div className="relative w-64">
              <Search className="h-3.5 w-3.5 text-white/40 absolute left-3 top-2.5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tarefa ou entrega..."
                className="h-8 pl-8 text-xs bg-black border-white/10 text-white rounded-xl placeholder:text-white/30"
              />
            </div>

            {/* Filtro por Responsável */}
            <select
              value={filterAssigneeId || ""}
              onChange={(e) => setFilterAssigneeId(e.target.value || null)}
              className="h-8 rounded-xl bg-black border border-white/10 text-xs text-white/80 px-2.5"
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
              className="h-8 rounded-xl bg-black border border-white/10 text-xs text-white/80 px-2.5"
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
              className="h-8 rounded-xl bg-black border border-white/10 text-xs text-white/80 px-2.5"
            >
              <option value="">Todos os Status</option>
              <option value="pending">🔴 Pendente</option>
              <option value="doing">🟡 Fazendo</option>
              <option value="done">🟢 Feito</option>
            </select>

            {(searchQuery || filterAssigneeId || filterPriority || filterStatus) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterAssigneeId(null);
                  setFilterPriority(null);
                  setFilterStatus(null);
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
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl mb-4 flex-wrap h-auto">
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
            <TabsTrigger value="okrs" className="text-xs font-bold gap-2">
              <Target className="h-3.5 w-3.5" />
              <span>OKRs</span>
            </TabsTrigger>
            <TabsTrigger value="calculators" className="text-xs font-bold gap-2">
              <Calculator className="h-3.5 w-3.5" />
              <span>Calculadoras</span>
            </TabsTrigger>
            <TabsTrigger value="funnel" className="text-xs font-bold gap-2">
              <Filter className="h-3.5 w-3.5" />
              <span>Funil X1</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="text-xs font-bold gap-2">
              <DollarSign className="h-3.5 w-3.5" />
              <span>Rentabilidade</span>
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

          <TabsContent value="okrs">
            <OKRsView />
          </TabsContent>

          <TabsContent value="calculators">
            <CalculatorsView />
          </TabsContent>

          <TabsContent value="funnel">
            <FunnelView />
          </TabsContent>

          <TabsContent value="financial">
            <FinancialView />
          </TabsContent>

          <TabsContent value="milestones">
            <MilestonesView />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modais Globais */}
      <CreateScheduleModal />
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
