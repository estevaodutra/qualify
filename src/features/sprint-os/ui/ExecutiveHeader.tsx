/**
 * Header Executivo do Sprint OS (Camada A).
 * - Identidade visual Linear/Notion estilo Dark Mode premium
 * - Troca de Sprints e status da Sprint ativa (Linha de base imutável)
 * - Botões de ação globais: 🚀 Ativar Sprint, 🔃 Atualizar Prazos, 📊 Relatórios, 🔗 Compartilhar, ⧉ Templates
 * - Alternador dos 3 Modos de Operação (Organização, Execução, Planejamento)
 */

import React from "react";
import {
  Rocket,
  RefreshCw,
  FileText,
  Share2,
  FolderArchive,
  Layers,
  Play,
  Calendar,
  Lock,
  Clock,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSprintOSStore } from "../state/sprintOsStore";
import { fmtDateTime } from "../scheduler/time";

export const ExecutiveHeader: React.FC = () => {
  const {
    workspace,
    activeSprintId,
    setActiveSprintId,
    interactionMode,
    setInteractionMode,
    openDeadlineUpdatePreview,
    setIsActivateModalOpen,
    setIsReportModalOpen,
    setIsShareModalOpen,
    setIsTemplatesModalOpen,
  } = useSprintOSStore();

  if (!workspace) return null;

  const sprints = Object.values(workspace.sprints).filter((s) => !s.archivedAt);
  const activeSprint = activeSprintId ? workspace.sprints[activeSprintId] : sprints[0];
  const isActivated = !!activeSprint?.activatedAt;

  return (
    <header className="border-b border-white/10 bg-[#0B0E14]/90 backdrop-blur-xl px-6 py-4 sticky top-0 z-30">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Lado Esquerdo: Projeto, Sprint e Status */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-black text-white/50">
                {workspace.project.name} · {workspace.project.client}
              </span>
              <Badge variant="outline" className="text-[10px] border-white/20 text-white/70 py-0">
                America/Sao_Paulo
              </Badge>
            </div>

            {/* Dropdown de Sprints */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-lg font-black text-white hover:text-primary transition-colors text-left">
                  <span>{activeSprint?.name || "Selecionar Sprint"}</span>
                  <ChevronDown className="h-4 w-4 text-white/40" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 bg-zinc-950 border-white/10 text-white">
                {sprints.map((sp) => (
                  <DropdownMenuItem
                    key={sp.id}
                    onClick={() => setActiveSprintId(sp.id)}
                    className="flex flex-col items-start gap-1 py-2 cursor-pointer focus:bg-white/10"
                  >
                    <span className="font-bold text-sm text-white">{sp.name}</span>
                    <span className="text-xs text-white/50 line-clamp-1">{sp.objective}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Badge de Linha de Base / Ativação */}
          <div className="ml-2">
            {isActivated ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-1 px-2.5">
                <Lock className="h-3 w-3" />
                <span className="text-[11px] font-bold">Linha de Base Fixada</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 gap-1.5 py-1 px-2.5">
                <Clock className="h-3 w-3" />
                <span className="text-[11px] font-bold">Rascunho / Não Ativada</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Lado Direito: Modos de Operação + Ações Canônicas */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Alternador dos 3 Modos Canônicos (Seção 8) */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
            <button
              onClick={() => setInteractionMode("organize")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                interactionMode === "organize"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
              title="Modo Organização: Arrastar blocos, criar etapas, reordenar e estruturar"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Organização</span>
            </button>

            <button
              onClick={() => setInteractionMode("execute")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                interactionMode === "execute"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
              title="Modo Execução: Checklists, ciência, evidências e avanço de tarefas"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Execução</span>
            </button>

            <button
              onClick={() => setInteractionMode("plan")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                interactionMode === "plan"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
              title="Modo Planejamento: Cronograma, Gantt, dependências e caminho crítico"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Planejamento</span>
            </button>
          </div>

          <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />

          {/* Botão 🚀 ATIVAR SPRINT (Seção 9) */}
          {!isActivated && (
            <Button
              onClick={() => setIsActivateModalOpen(true)}
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-lg shadow-emerald-900/30"
            >
              <Rocket className="h-3.5 w-3.5" />
              <span>Ativar Sprint</span>
            </Button>
          )}

          {/* Botão 🔃 ATUALIZAR PRAZOS (Seção 10) - Destaque Absoluto */}
          <Button
            onClick={openDeadlineUpdatePreview}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black gap-1.5 shadow-lg shadow-indigo-900/40"
          >
            <RefreshCw className="h-3.5 w-3.5 animate-spin-hover" />
            <span>Atualizar Prazos</span>
          </Button>

          {/* 📊 Relatórios */}
          <Button
            onClick={() => setIsReportModalOpen(true)}
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs gap-1.5"
          >
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Relatórios</span>
          </Button>

          {/* 🔗 Compartilhar Link */}
          <Button
            onClick={() => setIsShareModalOpen(true)}
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs gap-1.5"
            title="Gerar link de visualização externa para o cliente"
          >
            <Share2 className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Compartilhar</span>
          </Button>

          {/* ⧉ Templates & JSON */}
          <Button
            onClick={() => setIsTemplatesModalOpen(true)}
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs gap-1.5"
            title="Templates, Exportação e Importação de Dados"
          >
            <FolderArchive className="h-3.5 w-3.5 text-violet-400" />
            <span className="hidden sm:inline">Templates</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
