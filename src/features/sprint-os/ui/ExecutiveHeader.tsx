/**
 * Header Executivo Compacto do Sprint OS (Cockpit 80/20).
 * Especificação: Master Prompt v9.0 — Seção 6 (Região 1).
 * Mostra:
 * - Botão "← Cronogramas" para voltar à listagem
 * - Projeto / Nome do Cronograma (editáveis inline)
 * - Filtro Rápido de Atribuição: "Minhas Demandas"
 * - Botão em destaque "Atualizar Prazos"
 * - Menu compacto "••• Mais opções" que reúne todas as opções secundárias
 */

import React, { useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  MoreHorizontal,
  Rocket,
  FileText,
  Share2,
  FolderArchive,
  Copy,
  Download,
  Settings,
  Edit2,
  Check,
  ChevronDown,
  Sparkles,
  UserCheck,
  Users,
  X,
  Kanban,
  Palette,
  Mic,
  LayoutGrid,
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
import { Input } from "@/components/ui/input";
import { useSprintOSStore } from "../state/sprintOsStore";
import { updateProject, updateSprint } from "../domain/ops";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";

export const ExecutiveHeader: React.FC = () => {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const {
    workspace,
    activeSprintId,
    activeTab,
    setActiveTab,
    filterAssigneeId,
    setFilterAssigneeId,
    openDeadlineUpdatePreview,
    closeWorkspace,
    setIsActivateModalOpen,
    setIsReportModalOpen,
    setIsShareModalOpen,
    setIsTemplatesModalOpen,
    duplicateCurrentWorkspace,
    saveCurrentAsTemplate,
    mutate,
  } = useSprintOSStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedProjectName, setEditedProjectName] = useState("");
  const [editedSprintName, setEditedSprintName] = useState("");

  if (!workspace) return null;

  const sprints = Object.values(workspace.sprints).filter((s) => !s.archivedAt);
  const activeSprint = activeSprintId ? workspace.sprints[activeSprintId] : sprints[0];
  const isActivated = !!activeSprint?.activatedAt;

  const membersList = Object.values(workspace.members || {}).filter((m) => !m.archivedAt);

  // Encontra membro correspondente ao usuário logado
  const myMember = membersList.find(
    (m) =>
      (user?.id && m.userId === user.id) ||
      (user?.email && m.name.toLowerCase().includes(user.email.toLowerCase()))
  );

  // Membro atualmente selecionado no filtro de atribuição
  const selectedMember = filterAssigneeId ? workspace.members[filterAssigneeId] : null;

  // Tarefas da sprint atual (não arquivadas)
  const sprintTasksList = Object.values(workspace.tasks || {}).filter(
    (t) => !t.archivedAt && (activeSprintId ? t.sprintId === activeSprintId : true)
  );

  // Contagem de tarefas por membro
  const taskCountsByMember = sprintTasksList.reduce<Record<string, number>>((acc, t) => {
    if (t.assigneeId) {
      acc[t.assigneeId] = (acc[t.assigneeId] || 0) + 1;
    }
    return acc;
  }, {});

  const currentFilterCount = filterAssigneeId
    ? sprintTasksList.filter((t) => t.assigneeId === filterAssigneeId).length
    : 0;

  const handleStartEdit = () => {
    setEditedProjectName(workspace.project.name);
    setEditedSprintName(activeSprint?.name || "Sprint 01");
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (editedProjectName.trim() && editedProjectName !== workspace.project.name) {
      await mutate((ws, ctx) => {
        updateProject(ws, ctx, { name: editedProjectName.trim() });
      });
    }
    if (activeSprint && editedSprintName.trim() && editedSprintName !== activeSprint.name) {
      await mutate((ws, ctx) => {
        updateSprint(ws, ctx, activeSprint.id, { name: editedSprintName.trim() });
      });
    }
    setIsEditingTitle(false);
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workspace, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sprint-os-${workspace.project.name.toLowerCase().replace(/\s+/g, "-")}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-xl px-6 py-3.5 sticky top-0 z-30 flex items-center justify-between gap-4 text-card-foreground">
      {/* Lado Esquerdo: Voltar + Títulos Editáveis */}
      <div className="flex items-center gap-3.5 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={closeWorkspace}
          className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center gap-1.5 shrink-0"
          title="Voltar para a lista de cronogramas"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs font-medium hidden sm:inline">Cronogramas</span>
        </Button>

        <div className="h-4 w-[1px] bg-border shrink-0" />

        {isEditingTitle ? (
          <div className="flex items-center gap-2">
            <Input
              value={editedProjectName}
              onChange={(e) => setEditedProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") setIsEditingTitle(false);
              }}
              placeholder="Projeto"
              className="h-7 text-xs bg-background border-input text-foreground rounded-lg w-36"
              autoFocus
            />
            <span className="text-muted-foreground text-xs">/</span>
            <Input
              value={editedSprintName}
              onChange={(e) => setEditedSprintName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") setIsEditingTitle(false);
              }}
              placeholder="Nome do Cronograma"
              className="h-7 text-xs bg-background border-input text-foreground rounded-lg w-48 font-bold"
            />
            <Button
              size="icon"
              onClick={handleSaveTitle}
              className="h-7 w-7 bg-primary text-primary-foreground rounded-lg shrink-0"
              title="Salvar alterações"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div
            onDoubleClick={handleStartEdit}
            onClick={handleStartEdit}
            className="group flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity truncate"
            title="Dois cliques para renomear"
          >
            <div className="truncate">
              <span className="text-xs text-muted-foreground font-medium mr-1.5 truncate">
                {workspace.project.name} <span className="text-muted-foreground/40">/</span>
              </span>
              <span className="text-sm font-bold text-foreground tracking-tight">
                {activeSprint?.name || "Cronograma"}
              </span>
            </div>
            <Edit2 className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
            <Badge
              variant="outline"
              className={`text-[9px] font-semibold px-2 py-0 rounded-full shrink-0 ml-1 ${
                isActivated
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}
            >
              {isActivated ? "Ativa" : "Rascunho"}
            </Badge>
          </div>
        )}
      </div>

      {/* Centro: Switcher de 4 Abas Principais (AJ-021) */}
      <div className="flex items-center p-0.5 bg-muted/60 border border-border/80 rounded-2xl gap-1 shrink-0 overflow-x-auto">
        {/* Aba 1: Operação */}
        <button
          onClick={() => setActiveTab("kanban")}
          className={`h-7 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === "kanban" || activeTab === "structure"
              ? "bg-background text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Visão Operacional Kanban & Cockpit 80/20"
        >
          <Kanban className="h-3.5 w-3.5" />
          <span className="inline">Operação</span>
        </button>

        {/* Aba 2: Manual de Marca */}
        <button
          onClick={() => setActiveTab("brand_manual")}
          className={`h-7 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === "brand_manual"
              ? "bg-background text-primary shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Manual de Marca 7D — Briefing Inteligente e Modular"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Manual de Marca</span>
          {(() => {
            const fields = workspace.brandManual?.fields || [];
            const activeFields = fields.filter((f) => !f.archived && !f.removed);
            const count = activeFields.filter((f) => (f.response || "").trim().length > 15).length;
            if (count === 0) return null;
            return (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                {count}/{activeFields.length}
              </span>
            );
          })()}
        </button>

        {/* Aba 3: Criativos */}
        <button
          onClick={() => setActiveTab("creatives")}
          className={`h-7 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === "creatives"
              ? "bg-background text-primary shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Criativos — Biblioteca de Anúncios e Conteúdo"
        >
          <Palette className="h-3.5 w-3.5 text-primary" />
          <span>Criativos</span>
        </button>

        {/* Aba 4: Scripts e Áudios (AJ-021) */}
        <button
          onClick={() => setActiveTab("scripts_and_audios")}
          className={`h-7 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === "scripts_and_audios"
              ? "bg-background text-primary shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Scripts e Áudios — Solicitações e Gravações de Voz"
        >
          <Mic className="h-3.5 w-3.5 text-primary" />
          <span>Scripts e Áudios</span>
          {(() => {
            const reqs = Object.values(workspace.audioRequests || {}).filter((r) => !r.archivedAt && !r.archived);
            const recordedCount = reqs.filter((r) => r.recordings && r.recordings.length > 0).length;
            if (reqs.length === 0) return null;
            return (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                {recordedCount}/{reqs.length}
              </span>
            );
          })()}
        </button>
      </div>

      {/* Lado Direito: Minhas Demandas (Filtro de Atribuição) + Atualizar Prazos + Menu "••• Mais opções" */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Filtro Rápido de Atribuição: "Minhas Demandas" */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shadow-xs select-none ${
                filterAssigneeId
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/80 hover:bg-muted text-foreground border-border"
              }`}
              title="Filtrar tarefas por atribuição"
            >
              <UserCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate max-w-[130px]">
                {filterAssigneeId
                  ? selectedMember
                    ? selectedMember.id === myMember?.id
                      ? "Minhas Demandas"
                      : selectedMember.name.split(" ")[0]
                    : "Demandas Filtradas"
                  : "Minhas Demandas"}
              </span>

              {filterAssigneeId ? (
                <span className="flex items-center gap-1">
                  <Badge
                    variant="secondary"
                    className="h-4 px-1.5 text-[10px] font-mono font-bold bg-white/20 text-white border-none"
                  >
                    {currentFilterCount}
                  </Badge>
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterAssigneeId(null);
                    }}
                    className="h-4 w-4 rounded-full hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white"
                    title="Remover filtro"
                  >
                    <X className="h-2.5 w-2.5" />
                  </span>
                </span>
              ) : (
                <ChevronDown className="h-3 w-3 opacity-60 ml-0.5 shrink-0" />
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64 p-1.5 rounded-2xl shadow-xl bg-card border border-border text-card-foreground">
            <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Filtro de Atribuição</span>
              {filterAssigneeId && (
                <button
                  onClick={() => setFilterAssigneeId(null)}
                  className="text-primary hover:underline lowercase font-normal text-[10px]"
                >
                  limpar filtro
                </button>
              )}
            </div>

            {/* Opção Rápida 1: Minhas Demandas (Usuário Logado) */}
            {myMember ? (
              <DropdownMenuItem
                onClick={() =>
                  setFilterAssigneeId(filterAssigneeId === myMember.id ? null : myMember.id)
                }
                className={`cursor-pointer rounded-xl flex items-center justify-between text-xs py-2 px-2.5 ${
                  filterAssigneeId === myMember.id
                    ? "bg-primary/10 text-primary font-bold"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                    Eu
                  </div>
                  <div>
                    <div className="leading-tight font-bold">Minhas Demandas</div>
                    <div className="text-[10px] text-muted-foreground">{myMember.name} (Você)</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">
                    {taskCountsByMember[myMember.id] || 0}
                  </span>
                  {filterAssigneeId === myMember.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
              </DropdownMenuItem>
            ) : (
              <div className="px-2 py-1 text-[11px] text-muted-foreground italic">
                Selecione um membro para filtrar demandas:
              </div>
            )}

            <DropdownMenuSeparator className="my-1" />

            <div className="px-2.5 py-1 text-[10px] font-bold uppercase text-muted-foreground/70">
              Membros da Equipe ({membersList.length})
            </div>

            {/* Lista de Membros da Equipe */}
            <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
              {membersList.length === 0 ? (
                <div className="py-3 text-center text-xs text-muted-foreground">
                  Nenhum membro cadastrado.
                </div>
              ) : (
                membersList.map((m) => {
                  const isSelected = filterAssigneeId === m.id;
                  const count = taskCountsByMember[m.id] || 0;
                  return (
                    <DropdownMenuItem
                      key={m.id}
                      onClick={() => setFilterAssigneeId(isSelected ? null : m.id)}
                      className={`cursor-pointer rounded-xl flex items-center justify-between text-xs py-1.5 px-2.5 ${
                        isSelected
                          ? "bg-primary/10 text-primary font-bold"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 uppercase">
                          {m.name.slice(0, 2)}
                        </div>
                        <span className="truncate">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {count} {count === 1 ? "tarefa" : "tarefas"}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                    </DropdownMenuItem>
                  );
                })
              )}
            </div>

            {filterAssigneeId && (
              <>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={() => setFilterAssigneeId(null)}
                  className="cursor-pointer rounded-xl text-xs text-muted-foreground hover:text-foreground justify-center py-1.5 font-medium"
                >
                  Exibir Todas as Demandas (Sem Filtro)
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Botão de Destaque: Atualizar Prazos */}
        <Button
          onClick={openDeadlineUpdatePreview}
          size="sm"
          className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-3 rounded-xl flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Atualizar Prazos</span>
        </Button>

        {/* Menu ••• Mais Opções (Reúne ações secundárias evitando poluição) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground text-xs w-52 p-1.5 rounded-2xl shadow-xl">
            <DropdownMenuItem
              onClick={() => setActiveTab(activeTab === "brand_manual" ? "kanban" : "brand_manual")}
              className="cursor-pointer font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
              {activeTab === "brand_manual" ? "Alternar para Kanban" : "Abrir Manual de Marca 7D"}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {!isActivated && (
              <DropdownMenuItem
                onClick={() => setIsActivateModalOpen(true)}
                className="cursor-pointer text-primary focus:text-primary font-medium"
              >
                <Rocket className="h-3.5 w-3.5 mr-2" />
                Ativar Sprint Oficial
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => setIsReportModalOpen(true)} className="cursor-pointer">
              <FileText className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Relatórios Executivos
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setIsShareModalOpen(true)} className="cursor-pointer">
              <Share2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Compartilhar Link Público
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                const name = prompt("Nome do novo template:", `${workspace.project.name} - Template`);
                if (name) saveCurrentAsTemplate(name);
              }}
              className="cursor-pointer"
            >
              <FolderArchive className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Transformar em Template
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => duplicateCurrentWorkspace(`Cópia de ${workspace.project.name}`, activeCompanyId)}
              className="cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Duplicar Cronograma
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleExportJson} className="cursor-pointer">
              <Download className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Exportar Backup JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
