/**
 * Página "Meus Cronogramas" (Apps → Cronogramas).
 * Especificação: Master Prompt v9.0 — Seções 3, 4 e 5.
 * Página inicial limpa, listando todos os cronogramas da empresa, com opção de criar em branco ou via template.
 */

import React, { useState } from "react";
import {
  Rocket,
  Plus,
  Calendar,
  MoreVertical,
  Layers,
  Copy,
  FolderArchive,
  Trash2,
  FileCheck2,
  ExternalLink,
  Edit2,
  Sparkles,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { fmtDateTime } from "../../scheduler/time";

export const SchedulesListView: React.FC = () => {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const {
    workspacesList,
    templatesList,
    openWorkspace,
    duplicateCurrentWorkspace,
    deleteWorkspaceAction,
    setIsCreateModalOpen,
  } = useSprintOSStore();

  const [activeTab, setActiveTab] = useState<"schedules" | "templates">("schedules");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleOpen = (id: string) => {
    openWorkspace(id, activeCompanyId, user?.email || "Operador");
  };

  const handleDuplicate = async (id: string) => {
    // Abrir o workspace e duplicar
    await openWorkspace(id, activeCompanyId, user?.email || "Operador");
    await duplicateCurrentWorkspace("Cópia de Cronograma", activeCompanyId);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteWorkspaceAction(deleteConfirmId, activeCompanyId);
    setDeleteConfirmId(null);
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white flex flex-col font-sans">
      {/* 1. Header Superior */}
      <header className="px-8 py-6 border-b border-white/5 bg-zinc-950/60 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Rocket className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Cronogramas</h1>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-white/10 text-white/50 bg-white/5 font-mono">
              Sprint OS v9.0
            </Badge>
          </div>
          <p className="text-xs text-white/50 mt-1">
            Gerencie suas implementações, templates e cockpits de execução.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Alternador de visualização: Meus Cronogramas vs Templates */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-white/10 text-xs">
            <button
              onClick={() => setActiveTab("schedules")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "schedules" ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white"
              }`}
            >
              Meus Cronogramas ({workspacesList.length})
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "templates" ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white"
              }`}
            >
              Templates ({templatesList.length})
            </button>
          </div>

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Criar Cronograma</span>
          </Button>
        </div>
      </header>

      {/* 2. Conteúdo Principal */}
      <main className="flex-1 px-8 py-8 max-w-7xl w-full mx-auto">
        {activeTab === "schedules" ? (
          <div>
            {workspacesList.length === 0 ? (
              <div className="py-24 text-center flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-zinc-950/40">
                <Rocket className="h-10 w-10 text-white/20 mb-3" />
                <h3 className="text-sm font-semibold text-white/80">Nenhum cronograma cadastrado</h3>
                <p className="text-xs text-white/40 max-w-sm mt-1">
                  Crie uma implementação em branco ou selecione um modelo pronto como a Sprint 10 Dias.
                </p>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-5 text-xs bg-primary hover:bg-primary/90 text-white font-medium px-4 py-2 rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Cronograma
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {workspacesList.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex flex-col justify-between p-5 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-primary/40 hover:bg-zinc-900/80 transition-all duration-200 shadow-sm"
                  >
                    <div>
                      {/* Top: Status & Ações */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : item.status === "completed"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {item.status === "active" ? "🟢 Ativa" : item.status === "completed" ? "🏁 Concluída" : "🟡 Rascunho"}
                        </Badge>

                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white rounded-lg">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#12161F] border-white/10 text-white text-xs w-48">
                              <DropdownMenuItem onClick={() => handleOpen(item.id)} className="cursor-pointer">
                                <ExternalLink className="h-3.5 w-3.5 mr-2 text-primary" />
                                Abrir Cockpit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(item.id)} className="cursor-pointer">
                                <Copy className="h-3.5 w-3.5 mr-2" />
                                Duplicar Cronograma
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirmId(item.id)}
                                className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Título & Projeto */}
                      <div className="mb-4">
                        <h3
                          onClick={() => handleOpen(item.id)}
                          className="text-base font-bold text-white group-hover:text-primary transition-colors cursor-pointer line-clamp-1"
                        >
                          {item.name}
                        </h3>
                        <p className="text-xs text-white/40 line-clamp-1 mt-0.5">
                          {item.projectName} · {item.client}
                        </p>
                      </div>

                      {/* Progresso Geral Limpo (Regra 80/20) */}
                      <div className="space-y-1.5 mb-5 p-3 rounded-xl bg-black/40 border border-white/5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50 font-medium">Progresso Geral</span>
                          <span className="font-bold text-white font-mono">{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} className="h-2 bg-white/5" />
                        <div className="flex items-center justify-between text-[11px] text-white/40 pt-1">
                          <span>{item.doneTaskCount} de {item.taskCount} tarefas concluídas</span>
                          <span>{item.sprintCount} sprint(s)</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Atualização e Ação Principal */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                        <Clock className="h-3 w-3" />
                        <span>{fmtDateTime(item.updatedAt)}</span>
                      </div>

                      <Button
                        onClick={() => handleOpen(item.id)}
                        size="sm"
                        className="h-8 text-xs bg-white/10 hover:bg-primary hover:text-white text-white/90 rounded-xl font-medium transition-all flex items-center gap-1.5"
                      >
                        <span>Abrir</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Aba de Templates */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templatesList.map((tpl) => (
              <div
                key={tpl.id}
                className="flex flex-col justify-between p-5 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-primary/40 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/10 font-mono">
                      {tpl.isDefault ? "Template Oficial" : "Template Salvo"}
                    </Badge>
                    <span className="text-[11px] text-white/40 font-mono">
                      {tpl.stageCount} etapas · {tpl.taskCount} tarefas
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1.5">{tpl.name}</h3>
                  <p className="text-xs text-white/50 line-clamp-3 mb-4 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-end">
                  <Button
                    onClick={() => {
                      setIsCreateModalOpen(true);
                    }}
                    size="sm"
                    className="h-8 text-xs bg-primary hover:bg-primary/90 text-white rounded-xl font-medium flex items-center gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Usar Template</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Diálogo de Confirmação de Exclusão */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="bg-[#12161F] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-400 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Excluir Cronograma
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-white/60 leading-relaxed">
            Tem certeza que deseja excluir permanentemente este cronograma? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(null)} className="text-xs text-white/60">
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="text-xs bg-red-600 hover:bg-red-700">
              Sim, Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
