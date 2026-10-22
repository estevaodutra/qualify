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
import { EditTemplateModal } from "../modals/EditTemplateModal";

export const SchedulesListView: React.FC = () => {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const {
    workspacesList,
    templatesList,
    openWorkspace,
    duplicateCurrentWorkspace,
    deleteWorkspaceAction,
    updateWorkspaceInfoAction,
    setIsCreateModalOpen,
    setIsEditTemplateModalOpen,
    setEditingTemplateId,
  } = useSprintOSStore();

  const [activeTab, setActiveTab] = useState<"schedules" | "templates">("schedules");
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editSprintName, setEditSprintName] = useState("");
  const [editProjectName, setEditProjectName] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editStatus, setEditStatus] = useState<"draft" | "active" | "completed">("draft");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleStartEdit = (item: any) => {
    setEditingItem(item);
    setEditSprintName(item.name || "");
    setEditProjectName(item.projectName || "");
    setEditClient(item.client || "");
    setEditStatus(item.status || "draft");
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    await updateWorkspaceInfoAction(
      editingItem.id,
      {
        name: editSprintName.trim() || editingItem.name,
        projectName: editProjectName.trim() || editingItem.projectName,
        client: editClient.trim() || editingItem.client,
        status: editStatus,
      },
      activeCompanyId,
      user?.email || "Operador"
    );
    setEditingItem(null);
  };

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
    <div className="min-h-full bg-background text-foreground flex flex-col font-sans">
      {/* 1. Header Superior */}
      <header className="px-8 py-6 border-b border-border bg-card/60 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Rocket className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Cronogramas</h1>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-border text-muted-foreground bg-muted/40 font-mono">
              Sprint OS v9.0
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gerencie suas implementações, templates e cockpits de execução.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Alternador de visualização: Meus Cronogramas vs Templates */}
          <div className="flex items-center p-1 rounded-xl bg-muted border border-border text-xs">
            <button
              onClick={() => setActiveTab("schedules")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "schedules" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Meus Cronogramas ({workspacesList.length})
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "templates" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Templates ({templatesList.length})
            </button>
          </div>

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center gap-2"
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
              <div className="py-24 text-center flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40">
                <Rocket className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <h3 className="text-sm font-semibold text-foreground">Nenhum cronograma cadastrado</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Crie uma implementação em branco ou selecione um modelo pronto como a Sprint 10 Dias.
                </p>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2 rounded-xl"
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
                    className="group relative flex flex-col justify-between p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <div>
                      {/* Top: Status & Ações */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : item.status === "completed"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {item.status === "active" ? "🟢 Ativa" : item.status === "completed" ? "🏁 Concluída" : "🟡 Rascunho"}
                        </Badge>

                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground text-xs w-48 shadow-lg">
                              <DropdownMenuItem onClick={() => handleOpen(item.id)} className="cursor-pointer">
                                <ExternalLink className="h-3.5 w-3.5 mr-2 text-primary" />
                                Abrir Cockpit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStartEdit(item)} className="cursor-pointer">
                                <Edit2 className="h-3.5 w-3.5 mr-2 text-amber-500" />
                                Editar Informações
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(item.id)} className="cursor-pointer">
                                <Copy className="h-3.5 w-3.5 mr-2" />
                                Duplicar Cronograma
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirmId(item.id)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
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
                          className="text-base font-bold text-foreground group-hover:text-primary transition-colors cursor-pointer line-clamp-1"
                        >
                          {item.name}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {item.projectName} · {item.client}
                        </p>
                      </div>

                      {/* Progresso Geral Limpo (Regra 80/20) */}
                      <div className="space-y-1.5 mb-5 p-3 rounded-xl bg-muted/40 border border-border">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-medium">Progresso Geral</span>
                          <span className="font-bold text-foreground font-mono">{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} className="h-2 bg-muted" />
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                          <span>{item.doneTaskCount} de {item.taskCount} tarefas concluídas</span>
                          <span>{item.sprintCount} sprint(s)</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Atualização e Ação Principal */}
                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{fmtDateTime(item.updatedAt)}</span>
                      </div>

                      <Button
                        onClick={() => handleOpen(item.id)}
                        size="sm"
                        className="h-8 text-xs bg-muted hover:bg-primary hover:text-primary-foreground text-foreground rounded-xl font-medium transition-all flex items-center gap-1.5"
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
                className="flex flex-col justify-between p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/20 bg-primary/10 font-mono">
                      {tpl.isDefault ? "Template Oficial" : "Template Salvo"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {tpl.stageCount} etapas · {tpl.taskCount} tarefas
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground mb-1.5">{tpl.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingTemplateId(tpl.id);
                      setIsEditTemplateModalOpen(true);
                    }}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl font-medium flex items-center gap-1.5"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Editar Template</span>
                  </Button>

                  <Button
                    onClick={() => {
                      setIsCreateModalOpen(true);
                    }}
                    size="sm"
                    className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium flex items-center gap-1.5"
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

      {/* Modal de Edição de Template */}
      <EditTemplateModal />

      {/* Diálogo de Confirmação de Exclusão */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="bg-card border-border text-card-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Excluir Cronograma
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tem certeza que deseja excluir permanentemente este cronograma? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(null)} className="text-xs text-muted-foreground">
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Sim, Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Edição de Informações do Cronograma */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="bg-card border-border text-card-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" />
              Editar Informações do Cronograma
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <label className="text-muted-foreground font-semibold block mb-1">Nome do Cronograma / Sprint</label>
              <Input
                value={editSprintName}
                onChange={(e) => setEditSprintName(e.target.value)}
                placeholder="Ex: Sprint 01 — Fundação"
                className="h-8 text-xs bg-background border-input text-foreground"
              />
            </div>
            <div>
              <label className="text-muted-foreground font-semibold block mb-1">Projeto / Operação</label>
              <Input
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                placeholder="Ex: Percurso da Vida"
                className="h-8 text-xs bg-background border-input text-foreground"
              />
            </div>
            <div>
              <label className="text-muted-foreground font-semibold block mb-1">Cliente / Solicitante</label>
              <Input
                value={editClient}
                onChange={(e) => setEditClient(e.target.value)}
                placeholder="Ex: Rodrigo"
                className="h-8 text-xs bg-background border-input text-foreground"
              />
            </div>
            <div>
              <label className="text-muted-foreground font-semibold block mb-1">Status Operacional</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full h-8 rounded-xl bg-background border border-input text-xs text-foreground px-2.5 font-medium"
              >
                <option value="draft">🟡 Rascunho (Não ativado)</option>
                <option value="active">🟢 Ativa (Em execução)</option>
                <option value="completed">🏁 Concluída</option>
              </select>
            </div>
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditingItem(null)} className="text-xs text-muted-foreground">
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} size="sm" className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
