/**
 * Página Principal do Sprint OS (Cockpit Operacional).
 * Localização: Módulo na aba de Apps do Qualify (/sprint-os).
 */

import React, { useEffect } from "react";
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
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";

import { useSprintOSStore, type ViewTab } from "../state/sprintOsStore";
import { ExecutiveHeader } from "./ExecutiveHeader";
import { ExecutiveKPIs } from "./ExecutiveKPIs";
import { MissionNowCard } from "./MissionNowCard";
import { OperationalCompassCard } from "./OperationalCompassCard";
import { DailyRoutineCard } from "./DailyRoutineCard";
import { StructureView } from "./views/StructureView";
import { KanbanView } from "./views/KanbanView";
import { GanttView } from "./views/GanttView";
import { FunnelView } from "./views/FunnelView";
import { FinancialView } from "./views/FinancialView";
import { MilestonesView } from "./views/MilestonesView";

import { DeadlineUpdateModal } from "./modals/DeadlineUpdateModal";
import { ActivateSprintModal } from "./modals/ActivateSprintModal";
import { TaskDetailModal } from "./modals/TaskDetailModal";
import { ReportsModal } from "./modals/ReportsModal";
import { ShareLinkModal } from "./modals/ShareLinkModal";
import { TemplatesModal } from "./modals/TemplatesModal";
import { upsertMember } from "../domain/ops";

export const SprintOSPage: React.FC = () => {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const { members: companyMembers } = useCompanyMembers();

  const {
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

  // Inicialização do workspace
  useEffect(() => {
    initWorkspace(activeCompanyId, null, user?.email || "Operador");
  }, [activeCompanyId, initWorkspace, user]);

  // Sincronização automática dos membros do Qualify no Sprint OS
  useEffect(() => {
    if (workspace && companyMembers && companyMembers.length > 0) {
      companyMembers.forEach((cm) => {
        if (!workspace.members[cm.id]) {
          mutate((ws, ctx) => {
            upsertMember(ws, ctx, {
              id: cm.id,
              userId: cm.user_id,
              name: cm.full_name || cm.email || "Membro Qualify",
              role: cm.role,
              active: cm.is_active,
            });
          });
        }
      });
    }
  }, [companyMembers, workspace, mutate]);

  if (isLoading || !workspace) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0B0E14] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest text-white/50">
            Carregando Sprint OS...
          </span>
        </div>
      </div>
    );
  }

  const membersList = Object.values(workspace.members).filter((m) => !m.archivedAt);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white flex flex-col font-sans pb-16 select-none">
      {/* 1. Header Executivo Fixo */}
      <ExecutiveHeader />

      {/* 2. KPIs Executivos */}
      <ExecutiveKPIs />

      {/* 3. Bloco de Inteligência Operacional (Missão Agora, Bússola e Rotina Diária) */}
      <section className="px-6 py-2 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Missão Agora: 6 colunas */}
        <div className="lg:col-span-6 flex flex-col">
          <MissionNowCard />
        </div>

        {/* Bússola Operacional: 3 colunas */}
        <div className="lg:col-span-3 flex flex-col">
          <OperationalCompassCard />
        </div>

        {/* Rotina Diária: 3 colunas */}
        <div className="lg:col-span-3 flex flex-col">
          <DailyRoutineCard />
        </div>
      </section>

      {/* 4. Barra de Filtros & Busca */}
      <section className="px-6 pt-4 pb-2">
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

      {/* 5. Abas de Visualização Central */}
      <main className="px-6 pt-2 flex-1">
        <Tabs value={activeTab} onValueChange={(t) => setActiveTab(t as ViewTab)} className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl mb-4 flex-wrap h-auto">
            <TabsTrigger value="dashboard" className="text-xs font-bold gap-2">
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

          <TabsContent value="dashboard">
            <StructureView />
          </TabsContent>

          <TabsContent value="kanban">
            <KanbanView />
          </TabsContent>

          <TabsContent value="gantt">
            <GanttView />
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

      {/* 6. Modais Globais do Sistema */}
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
