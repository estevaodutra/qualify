/**
 * Header Executivo Compacto do Sprint OS (Cockpit 80/20).
 * Especificação: Master Prompt v9.0 — Seção 6 (Região 1).
 * Mostra:
 * - Botão "← Cronogramas" para voltar à listagem
 * - Projeto / Nome do Cronograma (editáveis inline)
 * - Alternador dos 3 Modos (Organização, Execução, Planejamento)
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

export const ExecutiveHeader: React.FC = () => {
  const { activeCompanyId } = useCompany();
  const {
    workspace,
    activeSprintId,
    interactionMode,
    setInteractionMode,
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
              placeholder="Projeto"
              className="h-7 text-xs bg-background border-input text-foreground rounded-lg w-36"
            />
            <span className="text-muted-foreground text-xs">/</span>
            <Input
              value={editedSprintName}
              onChange={(e) => setEditedSprintName(e.target.value)}
              placeholder="Nome do Cronograma"
              className="h-7 text-xs bg-background border-input text-foreground rounded-lg w-48 font-bold"
            />
            <Button
              size="icon"
              onClick={handleSaveTitle}
              className="h-7 w-7 bg-primary text-primary-foreground rounded-lg"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div
            onClick={handleStartEdit}
            className="group flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity truncate"
            title="Clique para editar os nomes"
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

      {/* Lado Direito: Modos de Operação + Atualizar Prazos + Menu "••• Mais opções" */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Alternador de Modos (Linear/Pill Style) */}
        <div className="hidden md:flex items-center p-0.5 rounded-xl bg-muted border border-border text-[11px]">
          {(["organize", "execute", "plan"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setInteractionMode(mode)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                interactionMode === mode
                  ? "bg-background text-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "organize" ? "Organização" : mode === "execute" ? "Execução" : "Planejamento"}
            </button>
          ))}
        </div>

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
