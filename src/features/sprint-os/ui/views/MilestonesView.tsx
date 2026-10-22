/**
 * Visão Marcos / Checkpoints de Implementação (Camada A / Seção 25).
 * Marcos 100% Editáveis:
 * - Edição de Título, Prazos, Critérios de Aceite e Tarefas Vinculadas
 * - Criação de novos marcos customizados (+ Adicionar Marco)
 * - Exclusão de marcos com validação
 * - Validação formal com bloqueio por critérios e tarefas
 */

import React, { useState } from "react";
import {
  Flag,
  CheckCircle2,
  Circle,
  Calendar,
  AlertCircle,
  CheckSquare,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { validateMilestone, sprintTasks, upsertMilestone, archiveEntity } from "../../domain/ops";
import { toast } from "sonner";
import type { Milestone } from "../../domain/types";

export const MilestonesView: React.FC = () => {
  const {
    workspace,
    activeSprintId,
    mutate,
    setSelectedTaskId,
    setIsTaskModalOpen,
  } = useSprintOSStore();

  // Estados do Modal de Criação / Edição de Marco
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");
  const [milestoneCriteria, setMilestoneCriteria] = useState<string[]>([]);
  const [newCriterionInput, setNewCriterionInput] = useState("");
  const [milestoneTaskIds, setMilestoneTaskIds] = useState<string[]>([]);

  // Confirmação de exclusão
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!workspace || !activeSprintId) return null;

  const milestones = Object.values(workspace.milestones)
    .filter((m) => m.sprintId === activeSprintId && !m.archivedAt)
    .sort((a, b) => a.position - b.position);

  const allSprintTasks = sprintTasks(workspace, activeSprintId);

  const handleOpenCreateModal = () => {
    setEditingMilestoneId(null);
    setMilestoneTitle(`MARCO ${milestones.length + 1}: `);
    setMilestoneDueDate("");
    setMilestoneCriteria([]);
    setNewCriterionInput("");
    setMilestoneTaskIds([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (m: Milestone) => {
    setEditingMilestoneId(m.id);
    setMilestoneTitle(m.title);
    setMilestoneDueDate(m.dueDate || "");
    setMilestoneCriteria([...(m.criteria || [])]);
    setNewCriterionInput("");
    setMilestoneTaskIds([...(m.taskIds || [])]);
    setIsModalOpen(true);
  };

  const handleSaveMilestone = async () => {
    if (!milestoneTitle.trim()) {
      toast.error("O título do marco é obrigatório.");
      return;
    }

    try {
      await mutate((ws, ctx) => {
        upsertMilestone(ws, ctx, {
          ...(editingMilestoneId ? { id: editingMilestoneId } : {}),
          sprintId: activeSprintId,
          title: milestoneTitle.trim(),
          dueDate: milestoneDueDate || null,
          criteria: milestoneCriteria,
          taskIds: milestoneTaskIds,
        });
      });
      setIsModalOpen(false);
      toast.success(editingMilestoneId ? "Marco atualizado com sucesso!" : "Novo marco criado com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar marco");
    }
  };

  const handleDeleteMilestone = async () => {
    if (!deleteConfirmId) return;
    try {
      await mutate((ws, ctx) => {
        archiveEntity(ws, ctx, "milestones", deleteConfirmId);
      });
      setDeleteConfirmId(null);
      toast.success("Marco removido com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover marco");
    }
  };

  const handleAddCriterion = () => {
    if (!newCriterionInput.trim()) return;
    setMilestoneCriteria((prev) => [...prev, newCriterionInput.trim()]);
    setNewCriterionInput("");
  };

  const handleRemoveCriterion = (idx: number) => {
    setMilestoneCriteria((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleToggleTaskLink = (taskId: string) => {
    setMilestoneTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleToggleValidation = (milestoneId: string, currentValid: boolean) => {
    try {
      mutate((ws, ctx) => {
        validateMilestone(ws, ctx, milestoneId, !currentValid);
      });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Ações Superior */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
            Checkpoints de Validação da Implementação
          </h3>
          <span className="text-xs text-muted-foreground">
            Marcos de entrega e validação formal perante os critérios de aceite (100% editáveis).
          </span>
        </div>

        <Button
          onClick={handleOpenCreateModal}
          size="sm"
          className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl flex items-center gap-1.5 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>+ Adicionar Marco</span>
        </Button>
      </div>

      {milestones.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40">
          <Flag className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <div className="text-xs font-semibold text-foreground">Nenhum marco cadastrado para esta sprint</div>
          <p className="text-[11px] text-muted-foreground max-w-sm mt-0.5 mb-3">
            Crie pontos de checagem para validar formalmente a entrega dos blocos da sua implementação.
          </p>
          <Button
            onClick={handleOpenCreateModal}
            size="sm"
            className="text-xs bg-primary text-primary-foreground rounded-xl"
          >
            + Criar Primeiro Marco
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((m, idx) => {
            const isValidated = !!m.validatedAt;
            const linkedTasks = (m.taskIds || [])
              .map((id) => workspace.tasks[id])
              .filter((t) => t && !t.archivedAt);
            const tasksDone = linkedTasks.filter((t) => t.status === "done").length;
            const totalTasks = linkedTasks.length;
            const pct = totalTasks > 0 ? Math.round((tasksDone / totalTasks) * 100) : 0;
            const canValidate = totalTasks > 0 && tasksDone === totalTasks;

            return (
              <div
                key={m.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isValidated
                    ? "bg-emerald-500/[0.04] border-emerald-500/30 shadow-sm"
                    : "bg-card border-border shadow-sm"
                }`}
              >
                {/* Header do Marco */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        isValidated
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      #{idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4
                          onClick={() => handleOpenEditModal(m)}
                          className="text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-2"
                          title="Clique para editar este marco"
                        >
                          <span>{m.title}</span>
                          <Edit2 className="h-3 w-3 text-muted-foreground/40 hover:text-primary" />
                        </h4>
                        {isValidated && (
                          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px]">
                            Validado
                          </Badge>
                        )}
                      </div>
                      {m.dueDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          Prazo previsto: {m.dueDate.split("-").reverse().join("/")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações: Editar, Excluir e Validação Formal */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEditModal(m)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                      title="Editar Marco"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(m.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg"
                      title="Excluir Marco"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      onClick={() => handleToggleValidation(m.id, isValidated)}
                      variant={isValidated ? "outline" : "default"}
                      size="sm"
                      className={`text-xs font-bold gap-1.5 ml-1 ${
                        isValidated
                          ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                          : canValidate
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      }`}
                      disabled={!isValidated && !canValidate}
                      title={!canValidate && !isValidated ? "Conclua todas as tarefas vinculadas primeiro" : ""}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>{isValidated ? "Reabrir Marco" : "Validar Marco"}</span>
                    </Button>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                    <span>
                      Entregas Concluídas ({tasksDone}/{totalTasks})
                    </span>
                    <span className="font-bold text-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5 bg-muted [&>div]:bg-emerald-500" />
                </div>

                {/* Critérios de Aceite */}
                {m.criteria && m.criteria.length > 0 && (
                  <div className="mb-3 p-3 rounded-xl bg-muted/30 border border-border">
                    <div className="flex items-center justify-between text-[11px] uppercase font-bold text-muted-foreground mb-2">
                      <span>Critérios de Aceite:</span>
                      <button
                        onClick={() => handleOpenEditModal(m)}
                        className="text-[10px] text-primary hover:underline lowercase font-normal"
                      >
                        editar critérios
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground">
                      {m.criteria.map((cr, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckSquare className="h-3 w-3 text-primary shrink-0" />
                          <span>{cr}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tarefas Vinculadas */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  <span className="text-[11px] text-muted-foreground mr-1">Tarefas Vinculadas:</span>
                  {linkedTasks.length === 0 ? (
                    <button
                      onClick={() => handleOpenEditModal(m)}
                      className="text-xs text-muted-foreground/60 hover:text-primary italic underline"
                    >
                      Nenhuma tarefa vinculada (clique para vincular)
                    </button>
                  ) : (
                    linkedTasks.map((t) => (
                      <Badge
                        key={t.id}
                        onClick={() => {
                          setSelectedTaskId(t.id);
                          setIsTaskModalOpen(true);
                        }}
                        variant="outline"
                        className={`text-[10px] cursor-pointer hover:border-primary/50 transition-colors ${
                          t.status === "done"
                            ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {t.status === "done" ? "✓" : "○"} {t.title}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição de Marco */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card border-border text-card-foreground max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Flag className="h-4 w-4 text-primary" />
              {editingMilestoneId ? "Editar Marco / Checkpoint" : "Novo Marco / Checkpoint"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="text-muted-foreground font-semibold block mb-1">Título do Marco</label>
              <Input
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="Ex: MARCO 1: ESTRUTURA COMERCIAL"
                className="h-8 text-xs bg-background border-input text-foreground font-bold"
              />
            </div>

            <div>
              <label className="text-muted-foreground font-semibold block mb-1">Prazo Previsto de Conclusão</label>
              <Input
                type="date"
                value={milestoneDueDate}
                onChange={(e) => setMilestoneDueDate(e.target.value)}
                className="h-8 text-xs bg-background border-input text-foreground font-mono"
              />
            </div>

            {/* Critérios de Aceite */}
            <div className="space-y-2">
              <label className="text-muted-foreground font-semibold block">Critérios de Aceite do Marco</label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {milestoneCriteria.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic py-1">Nenhum critério adicionado.</p>
                ) : (
                  milestoneCriteria.map((cr, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border text-xs gap-2"
                    >
                      <Input
                        value={cr}
                        onChange={(e) => {
                          const updated = [...milestoneCriteria];
                          updated[idx] = e.target.value;
                          setMilestoneCriteria(updated);
                        }}
                        className="h-6 text-xs bg-background border-input text-foreground flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCriterion(idx)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Input
                  value={newCriterionInput}
                  onChange={(e) => setNewCriterionInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCriterion()}
                  placeholder="Novo critério (ex: Página publicada e testada)..."
                  className="h-8 text-xs bg-background border-input text-foreground flex-1"
                />
                <Button onClick={handleAddCriterion} size="sm" className="h-8 text-xs bg-muted hover:bg-muted/80 text-foreground font-bold shrink-0">
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Vinculação de Tarefas da Sprint */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-muted-foreground font-semibold block">
                Tarefas da Sprint Vinculadas ({milestoneTaskIds.length}/{allSprintTasks.length})
              </label>
              <div className="max-h-44 overflow-y-auto border border-border rounded-xl p-2 space-y-1 bg-muted/20">
                {allSprintTasks.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic p-2">Nenhuma tarefa cadastrada nesta sprint.</p>
                ) : (
                  allSprintTasks.map((t) => {
                    const isLinked = milestoneTaskIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/60 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isLinked}
                          onChange={() => handleToggleTaskLink(t.id)}
                          className="rounded"
                        />
                        <span className={`truncate flex-1 ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>
                          {t.title}
                        </span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1 border-border font-mono shrink-0">
                          {t.status === "done" ? "✓ Feito" : t.status === "doing" ? "Fazendo" : "Pendente"}
                        </Badge>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)} className="text-xs text-muted-foreground">
              Cancelar
            </Button>
            <Button onClick={handleSaveMilestone} size="sm" className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
              Salvar Marco
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="bg-card border-border text-card-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Excluir Marco
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tem certeza que deseja excluir permanentemente este marco?
          </p>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(null)} className="text-xs text-muted-foreground">
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteMilestone} className="text-xs bg-destructive text-destructive-foreground">
              Sim, Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
