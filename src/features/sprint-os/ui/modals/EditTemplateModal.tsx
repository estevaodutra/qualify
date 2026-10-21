import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Edit3,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { SprintOSRepository } from "../../persistence/repository";
import {
  type Workspace,
  type Stage,
  type Task,
  type Routine,
  type ImpactFlag,
  type Priority,
  IMPACT_FLAG_CONFIG,
} from "../../domain/types";
import { newId } from "../../domain/ops";

export const EditTemplateModal: React.FC = () => {
  const {
    isEditTemplateModalOpen,
    setIsEditTemplateModalOpen,
    editingTemplateId,
    setEditingTemplateId,
    updateTemplateAction,
  } = useSprintOSStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateData, setTemplateData] = useState<Workspace | null>(null);
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"stages" | "routines">("stages");

  useEffect(() => {
    if (!editingTemplateId || !isEditTemplateModalOpen) {
      setTemplateData(null);
      return;
    }

    const tpl = SprintOSRepository.getTemplate(editingTemplateId);
    if (tpl) {
      setName(tpl.meta.name);
      setDescription(tpl.meta.description || "");
      setTemplateData(JSON.parse(JSON.stringify(tpl.data)));
      const firstStage = Object.values(tpl.data.stages || {}).sort((a, b) => a.order - b.order)[0];
      if (firstStage) setExpandedStageId(firstStage.id);
    }
  }, [editingTemplateId, isEditTemplateModalOpen]);

  if (!isEditTemplateModalOpen || !templateData) return null;

  const sortedStages = Object.values(templateData.stages || {})
    .filter((s) => !s.archivedAt)
    .sort((a, b) => a.order - b.order);

  const sortedRoutines = Object.values(templateData.routines || {}).filter((r) => !r.archivedAt);

  const handleClose = () => {
    setIsEditTemplateModalOpen(false);
    setEditingTemplateId(null);
  };

  const handleSave = () => {
    if (!editingTemplateId || !templateData) return;
    updateTemplateAction(editingTemplateId, { name, description }, templateData);
    handleClose();
  };

  // --- Handlers para Etapas ---
  const handleAddStage = () => {
    const stageId = newId();
    const newStage: Stage = {
      id: stageId,
      name: `Nova Etapa ${sortedStages.length + 1}`,
      order: sortedStages.length,
      createdAt: new Date().toISOString(),
    };
    setTemplateData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stages: { ...prev.stages, [stageId]: newStage },
      };
    });
    setExpandedStageId(stageId);
  };

  const handleUpdateStageName = (stageId: string, newName: string) => {
    setTemplateData((prev) => {
      if (!prev || !prev.stages[stageId]) return prev;
      return {
        ...prev,
        stages: {
          ...prev.stages,
          [stageId]: { ...prev.stages[stageId], name: newName },
        },
      };
    });
  };

  const handleDeleteStage = (stageId: string) => {
    setTemplateData((prev) => {
      if (!prev) return prev;
      const stages = { ...prev.stages };
      delete stages[stageId];
      // Exclui tarefas vinculadas a essa etapa
      const tasks = { ...prev.tasks };
      Object.keys(tasks).forEach((taskId) => {
        if (tasks[taskId].stageId === stageId) {
          delete tasks[taskId];
        }
      });
      return { ...prev, stages, tasks };
    });
  };

  const handleMoveStage = (stageId: string, direction: "up" | "down") => {
    const idx = sortedStages.findIndex((s) => s.id === stageId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sortedStages.length) return;

    const currentStage = sortedStages[idx];
    const targetStage = sortedStages[targetIdx];

    setTemplateData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stages: {
          ...prev.stages,
          [currentStage.id]: { ...currentStage, order: targetStage.order },
          [targetStage.id]: { ...targetStage, order: currentStage.order },
        },
      };
    });
  };

  // --- Handlers para Tarefas do Template ---
  const handleAddTask = (stageId: string) => {
    const taskId = newId();
    const newTask: Task = {
      id: taskId,
      stageId,
      title: "Nova Tarefa Padrão",
      description: "",
      priority: "P1",
      status: "pending",
      durationMinutes: null,
      durationSource: "unset",
      impactFlags: [],
      dependencies: [],
      evidence: [],
      subtasks: [],
      timeEntries: [],
      tags: [],
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTemplateData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: { ...prev.tasks, [taskId]: newTask },
      };
    });
  };

  const handleUpdateTask = (taskId: string, patch: Partial<Task>) => {
    setTemplateData((prev) => {
      if (!prev || !prev.tasks[taskId]) return prev;
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskId]: { ...prev.tasks[taskId], ...patch, updatedAt: new Date().toISOString() },
        },
      };
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setTemplateData((prev) => {
      if (!prev) return prev;
      const tasks = { ...prev.tasks };
      delete tasks[taskId];
      return { ...prev, tasks };
    });
  };

  const handleToggleTaskImpactFlag = (taskId: string, flag: ImpactFlag) => {
    const current = templateData.tasks[taskId]?.impactFlags || [];
    let updated: ImpactFlag[];
    if (current.includes(flag)) {
      updated = current.filter((f) => f !== flag);
    } else {
      if (current.length >= 3) {
        updated = [...current.slice(1), flag];
      } else {
        updated = [...current, flag];
      }
    }
    handleUpdateTask(taskId, { impactFlags: updated });
  };

  // --- Handlers para Rotinas do Template ---
  const handleAddRoutine = () => {
    const routineId = newId();
    const newRoutine: Routine = {
      id: routineId,
      title: "Nova Rotina Diária",
      description: "",
      cadence: "daily",
      daysOfWeek: [1, 2, 3, 4, 5],
      suggestedHour: 9,
      history: {},
    };
    setTemplateData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        routines: { ...prev.routines, [routineId]: newRoutine },
      };
    });
  };

  const handleDeleteRoutine = (routineId: string) => {
    setTemplateData((prev) => {
      if (!prev) return prev;
      const routines = { ...prev.routines };
      delete routines[routineId];
      return { ...prev, routines };
    });
  };

  const handleUpdateRoutine = (routineId: string, patch: Partial<Routine>) => {
    setTemplateData((prev) => {
      if (!prev || !prev.routines[routineId]) return prev;
      return {
        ...prev,
        routines: {
          ...prev.routines,
          [routineId]: { ...prev.routines[routineId], ...patch },
        },
      };
    });
  };

  return (
    <Dialog open={isEditTemplateModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-card border-border text-card-foreground p-0 overflow-hidden shadow-2xl">
        {/* Cabeçalho */}
        <DialogHeader className="px-6 py-5 border-b border-border bg-muted/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                <Edit3 className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Editar Template de Cronograma</span>
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30 font-mono">
                    {editingTemplateId === "seed_percurso_da_vida" ? "Oficial" : "Salvo"}
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Personalize as etapas, tarefas sugeridas, flags e rotinas padrão para novas instâncias.
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Informações Básicas do Modelo */}
        <div className="px-6 py-4 border-b border-border bg-muted/20 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Nome do Template
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: SPRINT 10 DIAS — Operação Comercial"
              className="bg-background border-border text-foreground text-xs h-9 rounded-xl"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Descrição do Modelo
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Template de ativação para implementação rápida em 10 dias"
              className="bg-background border-border text-foreground text-xs h-9 rounded-xl"
            />
          </div>
        </div>

        {/* Abas: Etapas e Tarefas vs Rotinas */}
        <div className="px-6 pt-3 border-b border-border flex items-center gap-2 bg-muted/20">
          <button
            onClick={() => setActiveTab("stages")}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "stages"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Etapas e Tarefas ({sortedStages.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("routines")}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "routines"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Rotinas Padrão da Sprint ({sortedRoutines.length})</span>
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "stages" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Defina a sequência de etapas e os blocos de trabalho do cronograma.
                </span>
                <Button
                  onClick={handleAddStage}
                  size="sm"
                  className="bg-muted hover:bg-muted/80 text-foreground text-xs rounded-xl flex items-center gap-1.5 h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar Etapa</span>
                </Button>
              </div>

              {sortedStages.map((stg, index) => {
                const stageTasks = Object.values(templateData.tasks || {}).filter(
                  (t) => t.stageId === stg.id && !t.archivedAt
                );
                const isExpanded = expandedStageId === stg.id;
                const cleanName = stg.name.replace(/^Etapa\s*\d+\s*[—–-]\s*/i, "").trim() || stg.name;

                return (
                  <div
                    key={stg.id}
                    className="rounded-2xl border border-border bg-card overflow-hidden transition-all"
                  >
                    {/* Header da Etapa */}
                    <div className="p-3.5 bg-muted/40 flex items-center justify-between gap-3 border-b border-border">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/20 text-[10px] font-mono shrink-0"
                        >
                          ETAPA {String(index + 1).padStart(2, "0")}
                        </Badge>
                        <Input
                          value={cleanName}
                          onChange={(e) => handleUpdateStageName(stg.id, e.target.value)}
                          className="h-8 text-xs font-semibold bg-transparent border-border text-foreground max-w-sm"
                        />
                        <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                          ({stageTasks.length} tarefas)
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => handleMoveStage(stg.id, "up")}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === sortedStages.length - 1}
                          onClick={() => handleMoveStage(stg.id, "down")}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteStage(stg.id)}
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedStageId(isExpanded ? null : stg.id)}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground ml-1 px-2.5"
                        >
                          {isExpanded ? "Ocultar Tarefas" : "Ver Tarefas"}
                        </Button>
                      </div>
                    </div>

                    {/* Lista de Tarefas da Etapa */}
                    {isExpanded && (
                      <div className="p-4 space-y-3 bg-muted/20">
                        {stageTasks.length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                            Nenhuma tarefa cadastrada nesta etapa do template.
                          </div>
                        ) : (
                          stageTasks.map((t) => (
                            <div
                              key={t.id}
                              className="p-3 rounded-xl bg-card border border-border space-y-2.5 hover:border-border transition-all"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <Input
                                  value={t.title}
                                  onChange={(e) => handleUpdateTask(t.id, { title: e.target.value })}
                                  placeholder="Título da tarefa..."
                                  className="h-8 text-xs bg-muted/40 border-border text-foreground font-medium flex-1"
                                />

                                <div className="flex items-center gap-2">
                                  {/* Prioridade Padrão */}
                                  <select
                                    value={t.priority || "P1"}
                                    onChange={(e) => handleUpdateTask(t.id, { priority: e.target.value as Priority })}
                                    className="h-8 rounded-lg bg-background border border-border text-[11px] text-foreground px-2"
                                  >
                                    <option value="P0">P0 — Crítica</option>
                                    <option value="P1">P1 — Alta</option>
                                    <option value="P2">P2 — Média</option>
                                    <option value="P3">P3 — Baixa</option>
                                  </select>

                                  {/* Duração Sugerida Manual */}
                                  <div className="flex items-center gap-1 bg-background border border-border rounded-lg px-2 h-8">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <input
                                      type="number"
                                      min={0}
                                      value={t.durationMinutes ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value ? parseInt(e.target.value, 10) : null;
                                        handleUpdateTask(t.id, {
                                          durationMinutes: v,
                                          durationSource: v ? "manual" : "unset",
                                        });
                                      }}
                                      placeholder="Não definida"
                                      className="w-16 bg-transparent text-[11px] text-foreground outline-none placeholder:text-foreground/30 text-center"
                                    />
                                    <span className="text-[10px] text-muted-foreground">min</span>
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteTask(t.id)}
                                    className="h-7 w-7 text-foreground/30 hover:text-red-400"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Flags de Impacto do Template (Max 3) */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-mono mr-1">
                                  Impacto Padrão:
                                </span>
                                {(Object.keys(IMPACT_FLAG_CONFIG) as ImpactFlag[]).map((flag) => {
                                  const cfg = IMPACT_FLAG_CONFIG[flag];
                                  const isSelected = (t.impactFlags || []).includes(flag);
                                  return (
                                    <button
                                      key={flag}
                                      type="button"
                                      onClick={() => handleToggleTaskImpactFlag(t.id, flag)}
                                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                                        isSelected
                                          ? `${cfg.badgeClass} ring-1 ring-white/20 font-bold`
                                          : "bg-muted/50 border-border text-muted-foreground hover:text-muted-foreground"
                                      }`}
                                    >
                                      <span>{cfg.icon}</span>
                                      <span>{cfg.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        )}

                        <Button
                          onClick={() => handleAddTask(stg.id)}
                          size="sm"
                          className="w-full bg-muted/50 hover:bg-muted text-foreground text-xs rounded-xl h-8 border border-dashed border-border flex items-center justify-center gap-1.5 mt-2"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Adicionar Tarefa a Esta Etapa</span>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Aba de Rotinas Padrão da Sprint */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Configure os rituais diários e checkpoints que serão herdados quando uma sprint for ativada.
                </span>
                <Button
                  onClick={handleAddRoutine}
                  size="sm"
                  className="bg-muted hover:bg-muted/80 text-foreground text-xs rounded-xl flex items-center gap-1.5 h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar Rotina</span>
                </Button>
              </div>

              {sortedRoutines.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                  Nenhuma rotina padrão configurada no modelo.
                </div>
              ) : (
                sortedRoutines.map((rtn) => (
                  <div
                    key={rtn.id}
                    className="p-4 rounded-2xl bg-card border border-border space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Input
                        value={rtn.title}
                        onChange={(e) => handleUpdateRoutine(rtn.id, { title: e.target.value })}
                        placeholder="Ex: Daily Alinhamento Matinal"
                        className="h-8 text-xs font-semibold bg-muted/40 border-border text-foreground flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRoutine(rtn.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        value={rtn.description || ""}
                        onChange={(e) => handleUpdateRoutine(rtn.id, { description: e.target.value })}
                        placeholder="Descrição ou checklist do ritual..."
                        className="h-8 text-xs bg-muted/40 border-border text-foreground"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={rtn.cadence}
                          onChange={(e) => handleUpdateRoutine(rtn.id, { cadence: e.target.value as any })}
                          className="h-8 rounded-lg bg-background border border-border text-[11px] text-foreground px-2.5 flex-1"
                        >
                          <option value="daily">Diária (Seg a Sex)</option>
                          <option value="weekly">Semanal</option>
                        </select>
                        <div className="flex items-center gap-1 bg-background border border-border rounded-lg px-2 h-8">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <input
                            type="number"
                            min={0}
                            max={23}
                            value={rtn.suggestedHour ?? 9}
                            onChange={(e) =>
                              handleUpdateRoutine(rtn.id, {
                                suggestedHour: parseInt(e.target.value || "9", 10),
                              })
                            }
                            className="w-10 bg-transparent text-[11px] text-foreground outline-none text-center"
                          />
                          <span className="text-[10px] text-muted-foreground">h</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/40 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </Button>

          <Button
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-foreground text-xs font-semibold px-5 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Salvar Alterações do Template</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
