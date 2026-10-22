/**
 * Modal Completo de Detalhes da Tarefa (Cockpit 80/20 + Arquitetura 7D V2.0).
 * Especificação: Master Prompt v9.0 + PATCH 002 (Arquitetura 7D).
 * - P1.1: Classificação de Origem (DEFINIDO, DERIVADO, PROPOSTO)
 * - P1.2: Dependências e Bloqueios Operacionais (Banner 🚧, tipos e impacto)
 * - P1.3: Demandas Executivas do Expert (Gravar, Aprovar, Revisar, etc.)
 * - P1.4: Critérios Verificáveis de Conclusão (com validação obrigatória antes de Feito)
 * - P1.5: Entregáveis, Versionamento e Status de Revisão/Aprovação
 * - P1.6: Backup Master (Checklist de validação 7D e referências ao Drive)
 * - P1.7: Flags de Impacto (até 3 por tarefa) e Pomodoro integrado
 */

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Clock,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Eye,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  Paperclip,
  Brain,
  Minus,
  FileCheck,
  Play,
  Pause,
  RotateCcw,
  CheckSquare,
  ShieldAlert,
  FolderArchive,
  Layers,
  Video,
  ExternalLink,
  Lock,
  Unlock,
  Circle,
  Edit2,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { LabelsManagerPopover } from "../kanban/LabelsManagerPopover";
import {
  subtasksOf,
  stagesOf,
  updateTask,
  setTaskStatus,
  createSubtask,
  deleteSubtask,
  acknowledge,
  ackState,
  setPrompt,
  addTimeEntry,
  acceptTask,
} from "../../domain/ops";
import {
  PRIORITY_LABEL,
  COMPLEXITY_LABEL,
  SCOPE_LABEL,
  STATUS_ICON,
  IMPACT_FLAG_CONFIG,
  TASK_ORIGIN_CONFIG,
  BLOCK_TYPE_LABEL,
  REVIEW_STATUS_CONFIG,
  EXPERT_DEMAND_CATEGORIES,
  EXPERT_DEMAND_STATUSES,
  type Priority,
  type Complexity,
  type ScopeType,
  type TaskStatus,
  type ImpactFlag,
  type TaskOrigin,
  type BlockType,
  type TaskBlockInfo,
  type CompletionCriterion,
  type DeliverableMaterial,
  type ReviewStatus,
  type BackupMasterInfo,
  type ExpertDemandCategory,
  type ExpertDemandStatus,
} from "../../domain/types";
import { fmtDateTime, fmtMinutes } from "../../scheduler/time";

export const TaskDetailModal: React.FC = () => {
  const {
    workspace,
    activeSprintId,
    selectedTaskId,
    isTaskModalOpen,
    setIsTaskModalOpen,
    setTaskStatusAction,
    moveTaskAction,
    updateSubtaskAction,
    deleteSubtaskAction,
    toggleSubtaskAction,
    stepSubtaskCountAction,
    setTaskImpactFlagsAction,
    activeTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopAndSaveTimer,
    resetTimer,
    mutate,
    setActiveBrandManualTarget,
  } = useSprintOSStore();

  const [activeTab, setActiveTab] = useState("execution");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskTarget, setNewSubtaskTarget] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);
  const [editingCriterionText, setEditingCriterionText] = useState("");
  const [timeMinutes, setTimeMinutes] = useState("");
  const [timeNote, setTimeNote] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [durationInput, setDurationInput] = useState("");

  // Estados 7D — Critérios de Conclusão
  const [newCriterionText, setNewCriterionText] = useState("");
  const [newCriterionRequired, setNewCriterionRequired] = useState(true);

  // Estados 7D — Entregáveis & Versionamento
  const [newDelivName, setNewDelivName] = useState("");
  const [newDelivType, setNewDelivType] = useState("Documento");
  const [newDelivVersion, setNewDelivVersion] = useState("v1.0");
  const [newDelivUrl, setNewDelivUrl] = useState("");

  // Estados 7D — Bloqueio Operacional Form
  const [blockType, setBlockType] = useState<BlockType>("total");
  const [blockReason, setBlockReason] = useState("");
  const [blockResolver, setBlockResolver] = useState("");
  const [blockImpact, setBlockImpact] = useState("");
  const [blockDeadline, setBlockDeadline] = useState("");
  const [blockEvidence, setBlockEvidence] = useState("");

  // Live timer tick for UI
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!activeTimer || !activeTimer.isRunning) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  if (!workspace || !selectedTaskId) return null;

  const task = workspace.tasks[selectedTaskId];
  if (!task) return null;

  const stage = workspace.stages[task.stageId];
  const stagesList = activeSprintId
    ? stagesOf(workspace, activeSprintId)
    : Object.values(workspace.stages).filter((s) => !s.archivedAt);
  const subtasks = subtasksOf(workspace, task.id);
  const members = Object.values(workspace.members).filter((m) => !m.archivedAt);
  const assignee = task.assigneeId ? workspace.members[task.assigneeId] : null;
  const ack = ackState(workspace, task.id, task.assigneeId);
  const currentPrompt = workspace.prompts[task.id] || "";

  const isCurrentTimer = activeTimer && activeTimer.taskId === task.id;
  const timerElapsedMs = isCurrentTimer
    ? activeTimer.accumulatedMs + (activeTimer.isRunning ? Date.now() - activeTimer.startedAt : 0)
    : 0;
  const timerMinutes = Math.floor(timerElapsedMs / 60000);
  const timerSeconds = Math.floor((timerElapsedMs % 60000) / 1000);

  const isBlocked = !!(task.blockInfo?.active || task.blockedReason);
  const originCfg = TASK_ORIGIN_CONFIG[task.origin || "defined"];

  const handleUpdate = (patch: any) => {
    mutate((ws, ctx) => {
      updateTask(ws, ctx, task.id, patch);
    });
  };

  // Transição de Status com Validação 7D de Critérios Obrigatórios
  const handleStatusTransition = () => {
    const nextStatus: TaskStatus =
      task.status === "pending" ? "doing" : task.status === "doing" ? "done" : "pending";

    if (nextStatus === "done") {
      // 1. Validar bloqueio ativo
      if (isBlocked) {
        toast.error("Tarefa possui bloqueio ativo. Desbloqueie a tarefa antes de concluí-la.");
        return;
      }
      // 2. Validar critérios de conclusão obrigatórios (P1.4)
      if (task.completionCriteria && task.completionCriteria.length > 0) {
        const pendingRequired = task.completionCriteria.filter((c) => c.required && !c.done);
        if (pendingRequired.length > 0) {
          toast.error(
            `Critério de conclusão obrigatório pendente: "${pendingRequired[0].text}". Conclua todos os critérios obrigatórios antes de finalizar.`
          );
          return;
        }
      }
      // 3. Validar subtarefas obrigatórias
      const missingSubtasks = subtasks.filter((s) => s.required && !s.done);
      if (missingSubtasks.length > 0) {
        toast.error(`Existem ${missingSubtasks.length} subtarefa(s) obrigatória(s) pendente(s).`);
        return;
      }
    }

    try {
      mutate((ws, ctx) => {
        setTaskStatus(ws, ctx, task.id, nextStatus);
      });
      toast.success(
        nextStatus === "done" ? "Tarefa concluída com sucesso!" : `Status alterado para ${nextStatus}`
      );
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleToggleImpactFlag = async (flag: ImpactFlag) => {
    const currentFlags = task.impactFlags || [];
    let nextFlags: ImpactFlag[];
    if (currentFlags.includes(flag)) {
      nextFlags = currentFlags.filter((f) => f !== flag);
    } else {
      if (currentFlags.length >= 3) {
        toast.warning("Máximo de 3 flags de impacto por tarefa.");
        return;
      }
      nextFlags = [...currentFlags, flag];
    }
    await setTaskImpactFlagsAction(task.id, nextFlags);
  };

  const handleSetDuration = (minutes: number | null) => {
    handleUpdate({
      durationMinutes: minutes,
      durationSource: minutes ? "confirmed" : "unset",
    });
    setDurationInput("");
    toast.success(minutes ? `Duração definida para ${minutes}m.` : "Duração limpa (Não definida).");
  };

  // --- Handlers de Critérios de Conclusão 7D (P1.4) ---
  const handleAddCriterion = () => {
    if (!newCriterionText.trim()) return;
    const currentList = task.completionCriteria || [];
    const newCrit: CompletionCriterion = {
      id: `crit-${Date.now()}`,
      text: newCriterionText.trim(),
      done: false,
      required: newCriterionRequired,
    };
    handleUpdate({ completionCriteria: [...currentList, newCrit] });
    setNewCriterionText("");
    toast.success("Critério de conclusão adicionado.");
  };

  const handleToggleCriterion = (criterionId: string, currentDone: boolean) => {
    const currentList = task.completionCriteria || [];
    const updated = currentList.map((c) => (c.id === criterionId ? { ...c, done: !currentDone } : c));
    handleUpdate({ completionCriteria: updated });
  };

  const handleDeleteCriterion = (criterionId: string) => {
    const currentList = task.completionCriteria || [];
    handleUpdate({ completionCriteria: currentList.filter((c) => c.id !== criterionId) });
  };

  const handleUpdateCriterionText = (criterionId: string, text: string) => {
    const currentList = task.completionCriteria || [];
    const updated = currentList.map((c) => (c.id === criterionId ? { ...c, text } : c));
    handleUpdate({ completionCriteria: updated });
  };

  const handleToggleCriterionRequired = (criterionId: string, required: boolean) => {
    const currentList = task.completionCriteria || [];
    const updated = currentList.map((c) => (c.id === criterionId ? { ...c, required } : c));
    handleUpdate({ completionCriteria: updated });
  };

  // --- Handlers de Entregáveis e Versionamento 7D (P1.5) ---
  const handleAddDeliverable = () => {
    if (!newDelivName.trim()) return;
    const currentList = task.deliverableMaterials || [];
    const newDeliv: DeliverableMaterial = {
      id: `deliv-${Date.now()}`,
      name: newDelivName.trim(),
      type: newDelivType,
      version: newDelivVersion.trim() || "v1.0",
      assigneeName: assignee?.name,
      url: newDelivUrl.trim(),
      reviewStatus: "nao_enviado",
      updatedAt: new Date().toISOString(),
    };
    handleUpdate({ deliverableMaterials: [...currentList, newDeliv] });
    setNewDelivName("");
    setNewDelivUrl("");
    toast.success("Entregável registrado com sucesso.");
  };

  const handleUpdateDeliverableStatus = (delivId: string, reviewStatus: ReviewStatus) => {
    const currentList = task.deliverableMaterials || [];
    const updated = currentList.map((d) =>
      d.id === delivId ? { ...d, reviewStatus, updatedAt: new Date().toISOString() } : d
    );
    handleUpdate({ deliverableMaterials: updated });
    toast.success(`Status de revisão alterado para: ${REVIEW_STATUS_CONFIG[reviewStatus].label}`);
  };

  const handleDeleteDeliverable = (delivId: string) => {
    const currentList = task.deliverableMaterials || [];
    handleUpdate({ deliverableMaterials: currentList.filter((d) => d.id !== delivId) });
  };

  // --- Handlers de Bloqueio 7D (P1.2) ---
  const handleActivateBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockReason.trim()) return;

    const blockInfo: TaskBlockInfo = {
      active: true,
      type: blockType,
      reason: blockReason.trim(),
      resolverResponsible: blockResolver.trim() || (assignee?.name ?? "Responsável"),
      requestedAt: new Date().toISOString().slice(0, 10),
      agreedDeadline: blockDeadline || null,
      requiredDeliverable: blockImpact.trim(),
      impactDescription: blockImpact.trim(),
      unlockEvidenceUrl: blockEvidence.trim() || undefined,
    };

    handleUpdate({
      blockedReason: blockReason.trim(),
      blockInfo,
    });
    toast.warning("Bloqueio operacional registrado!");
  };

  const handleClearBlock = () => {
    handleUpdate({
      blockedReason: null,
      blockInfo: undefined,
    });
    toast.success("Tarefa desbloqueada com sucesso!");
  };

  // --- Handlers de Backup Master 7D (P1.6) ---
  const handleUpdateBackupChecklist = (key: keyof BackupMasterInfo, val: boolean) => {
    const current = task.backupMaster || {
      googleDriveUrl: "",
      fileName: "",
      version: "v1.0",
      folderPath: "",
      responsibleName: assignee?.name || "",
      updatedAt: new Date().toISOString(),
      approvalStatus: "nao_enviado",
      arquivoSalvo: false,
      linkDisponivel: false,
      permissoesVerificadas: false,
      versaoCorreta: false,
      aprovacaoRegistrada: false,
    };

    handleUpdate({
      backupMaster: {
        ...current,
        [key]: val,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  // Subtarefas e Evidências
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const target = newSubtaskTarget ? Number(newSubtaskTarget) : null;
    mutate((ws, ctx) => {
      createSubtask(ws, ctx, task.id, newSubtaskTitle.trim(), target);
    });
    setNewSubtaskTitle("");
    setNewSubtaskTarget("");
  };

  const handleAddTime = () => {
    if (!timeMinutes || Number(timeMinutes) <= 0) return;
    mutate((ws, ctx) => {
      addTimeEntry(ws, ctx, task.id, Number(timeMinutes), task.assigneeId, timeNote);
    });
    setTimeMinutes("");
    setTimeNote("");
    toast.success("Tempo registrado.");
  };

  const handleAddEvidence = () => {
    if (!evidenceName || !evidenceUrl) return;
    mutate((ws, ctx) => {
      const t = ws.tasks[task.id];
      t.evidence.push({
        id: `ev-${Date.now()}`,
        name: evidenceName,
        kind: "link",
        url: evidenceUrl,
        mime: null,
        authorName: ctx.actorName,
        at: ctx.nowIso,
      });
    });
    setEvidenceName("");
    setEvidenceUrl("");
    toast.success("Evidência anexada.");
  };

  return (
    <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
      <DialogContent className="bg-card border border-border text-card-foreground max-w-3xl w-full p-0 overflow-hidden rounded-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* P1.2: BANNER DESTACADO DE BLOQUEIO ATIVO */}
        {isBlocked && (
          <div className="bg-rose-500/10 border-b border-rose-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold uppercase text-rose-600 dark:text-rose-400 tracking-wider">
                    🚧 BLOQUEIO ATIVO ({BLOCK_TYPE_LABEL[task.blockInfo?.type || "total"]})
                  </span>
                </div>
                <div className="text-foreground mt-0.5 font-medium">
                  <strong>Motivo:</strong> {task.blockInfo?.reason || task.blockedReason}
                </div>
                <div className="text-muted-foreground flex flex-wrap gap-x-4 mt-0.5 text-[11px]">
                  <span>
                    <strong>Responsável:</strong> {task.blockInfo?.resolverResponsible || "Aguardando definição"}
                  </span>
                  {task.blockInfo?.impactDescription && (
                    <span>
                      <strong>Impacto:</strong> {task.blockInfo.impactDescription}
                    </span>
                  )}
                  {task.blockInfo?.agreedDeadline && (
                    <span>
                      <strong>Prazo acordado:</strong> {task.blockInfo.agreedDeadline}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={handleClearBlock}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-7 text-xs rounded-xl flex items-center gap-1.5 shrink-0"
            >
              <Unlock className="h-3.5 w-3.5" />
              <span>Desbloquear Tarefa</span>
            </Button>
          </div>
        )}

        {/* Cabeçalho */}
        <div className="p-6 pb-4 border-b border-border bg-muted/40">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Selector */}
              <select
                value={task.status}
                onChange={(e) => setTaskStatusAction(task.id, e.target.value as TaskStatus)}
                className="h-7 rounded-lg bg-background border border-input text-xs text-foreground px-2 font-bold"
                title="Status da Tarefa"
              >
                <option value="pending">🔴 Pendente</option>
                <option value="doing">🟡 Fazendo</option>
                <option value="done">🟢 Feito</option>
              </select>

              {/* Etapa Selector */}
              <select
                value={task.stageId}
                onChange={(e) => {
                  const newStageId = e.target.value;
                  if (newStageId && newStageId !== task.stageId) {
                    moveTaskAction(task.id, newStageId, 0);
                  }
                }}
                className="h-7 rounded-lg bg-background border border-input text-xs text-foreground px-2 font-medium"
                title="Mover para outra Etapa"
              >
                {stagesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>

              {/* Prioridade Selector */}
              <select
                value={task.priority}
                onChange={(e) => handleUpdate({ priority: e.target.value as any })}
                className="h-7 rounded-lg bg-background border border-input text-xs text-foreground px-2 font-bold"
                title="Prioridade"
              >
                <option value="P0">P0 — Crítica</option>
                <option value="P1">P1 — Alta</option>
                <option value="P2">P2 — Média</option>
                <option value="P3">P3 — Baixa</option>
              </select>

              {/* Origem 7D Selector */}
              <select
                value={task.origin || "defined"}
                onChange={(e) => handleUpdate({ origin: e.target.value as TaskOrigin })}
                className="h-7 rounded-lg bg-background border border-input text-xs text-foreground px-2 font-mono font-bold"
                title="Origem da Tarefa (Arquitetura 7D)"
              >
                <option value="defined">🎯 DEFINIDO</option>
                <option value="derived">⚡ DERIVADO</option>
                <option value="proposed">💡 PROPOSTO</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={handleStatusTransition}
                className="h-7 text-xs bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg font-bold"
              >
                {task.status === "pending" ? "Iniciar → Fazendo" : task.status === "doing" ? "Concluir → Feito" : "Reabrir Tarefa"}
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
              Título da Tarefa
            </label>
            <Input
              value={task.title}
              onChange={(e) => handleUpdate({ title: e.target.value })}
              className="text-base font-bold bg-background border-input text-foreground h-9 rounded-xl tracking-tight"
              placeholder="Título da tarefa..."
            />

            {/* Etiquetas Trello da Tarefa (AJ-022) */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {(task.labelIds || []).map((id) => {
                const lbl = workspace.labels?.[id];
                if (!lbl) return null;
                return (
                  <div
                    key={lbl.id}
                    className="px-2 py-0.5 rounded-md border text-xs font-semibold flex items-center gap-1.5"
                    style={{
                      backgroundColor: `${lbl.color}15`,
                      borderColor: `${lbl.color}40`,
                      color: lbl.color,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: lbl.color }}
                    />
                    <span>{lbl.name}</span>
                  </div>
                );
              })}
              <LabelsManagerPopover taskId={task.id} />
            </div>
          </div>
        </div>

        {/* Abas do Inspetor */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted border border-border p-1 rounded-xl mb-4 flex-wrap h-auto">
              <TabsTrigger value="execution" className="text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-foreground">
                Execução & Critérios
              </TabsTrigger>
              <TabsTrigger value="deliverables" className="text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-foreground">
                Entregáveis & Backup
              </TabsTrigger>
              <TabsTrigger value="expert" className="text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-foreground">
                Demanda do Expert
              </TabsTrigger>
              <TabsTrigger value="classification" className="text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-foreground">
                Classificação & Bloqueio
              </TabsTrigger>
              <TabsTrigger value="time" className="text-xs font-bold flex items-center gap-1 data-[state=active]:bg-card data-[state=active]:text-foreground">
                <Clock className="h-3 w-3 text-amber-500" />
                <span>Tempo & Foco</span>
              </TabsTrigger>
              <TabsTrigger value="prompt" className="text-xs font-bold flex items-center gap-1 data-[state=active]:bg-card data-[state=active]:text-foreground">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>Prompt IA</span>
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: EXECUÇÃO, SUBTAREFAS & CRITÉRIOS DE CONCLUSÃO (P1.4) */}
            <TabsContent value="execution" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Responsável Atribuído
                  </label>
                  <select
                    value={task.assigneeId || ""}
                    onChange={(e) => handleUpdate({ assigneeId: e.target.value || null })}
                    className="w-full h-8 rounded-lg bg-background border border-input text-xs text-foreground px-2.5"
                  >
                    <option value="">Sem atribuição</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    Ciência Operacional
                  </label>
                  {task.assigneeId ? (
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-background border border-border">
                      <span className="text-xs text-foreground">
                        {ack === "current" ? "🟢 Ciente" : ack === "outdated" ? "🟡 Desatualizada" : "⚪ Pendente"}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          mutate((ws, ctx) => acknowledge(ws, ctx, task.id, task.assigneeId!));
                          toast.success("Ciência confirmada!");
                        }}
                        className="h-6 text-[11px] bg-muted hover:bg-muted/80 text-foreground font-bold rounded"
                      >
                        Confirmar
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Atribua um responsável.</span>
                  )}
                </div>
              </div>

              {/* Descrição e Orientações da Tarefa */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground block flex items-center justify-between">
                  <span>Descrição & Orientações da Tarefa</span>
                  <span className="text-[10px] font-normal text-muted-foreground">Contexto e premissas operacionais</span>
                </label>
                <Textarea
                  value={task.description || ""}
                  onChange={(e) => handleUpdate({ description: e.target.value })}
                  placeholder="Descreva o escopo, orientações e passo a passo desta tarefa..."
                  className="text-xs bg-background border-input text-foreground min-h-[70px] rounded-xl leading-relaxed"
                />
              </div>

              {/* Prazos, Duração e Agendamento */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Prazos, Duração & Agendamento
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Início Previsto</label>
                    <Input
                      type="datetime-local"
                      value={task.plannedStart ? task.plannedStart.slice(0, 16) : ""}
                      onChange={(e) => handleUpdate({ plannedStart: e.target.value ? e.target.value + ":00" : null })}
                      className="h-8 text-xs bg-background border-input text-foreground font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Fim Previsto (Prazo)</label>
                    <Input
                      type="datetime-local"
                      value={task.plannedEnd ? task.plannedEnd.slice(0, 16) : ""}
                      onChange={(e) => handleUpdate({ plannedEnd: e.target.value ? e.target.value + ":00" : null })}
                      className="h-8 text-xs bg-background border-input text-foreground font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Duração Estimada (min)</label>
                    <Input
                      type="number"
                      value={task.durationMinutes || ""}
                      onChange={(e) => handleUpdate({ durationMinutes: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Ex: 60"
                      className="h-8 text-xs bg-background border-input text-foreground font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={!!task.pinned}
                      onChange={(e) => handleUpdate({ pinned: e.target.checked })}
                      className="rounded"
                    />
                    <span>Fixar data (impede que o motor de agendamento mova esta tarefa)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={!!task.financialImpact}
                      onChange={(e) => handleUpdate({ financialImpact: e.target.checked })}
                      className="rounded"
                    />
                    <span>Impacto financeiro ($)</span>
                  </label>
                </div>
              </div>

              {/* P1.4: CRITÉRIOS VERIFICÁVEIS DE CONCLUSÃO */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Critérios Verificáveis de Conclusão ({task.completionCriteria?.filter((c) => c.done).length || 0}/
                      {task.completionCriteria?.length || 0})
                    </h4>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Exige critérios obrigatórios antes de receber status Feito
                  </span>
                </div>

                <div className="space-y-1.5">
                  {(task.completionCriteria || []).length === 0 ? (
                    <div className="text-xs text-muted-foreground/60 italic py-2 text-center border border-dashed border-border rounded-xl">
                      Nenhum critério específico adicionado. A tarefa poderá ser concluída pelas subtarefas.
                    </div>
                  ) : (
                    (task.completionCriteria || []).map((crit) => (
                      <div
                        key={crit.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border text-xs gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleCriterion(crit.id, crit.done)}
                          className="shrink-0"
                          title={crit.done ? "Marcar pendente" : "Marcar atendido"}
                        >
                          {crit.done ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>

                        {editingCriterionId === crit.id ? (
                          <Input
                            value={editingCriterionText}
                            onChange={(e) => setEditingCriterionText(e.target.value)}
                            onBlur={() => {
                              if (editingCriterionText.trim() && editingCriterionText !== crit.text) {
                                handleUpdateCriterionText(crit.id, editingCriterionText.trim());
                              }
                              setEditingCriterionId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (editingCriterionText.trim() && editingCriterionText !== crit.text) {
                                  handleUpdateCriterionText(crit.id, editingCriterionText.trim());
                                }
                                setEditingCriterionId(null);
                              }
                            }}
                            autoFocus
                            className="h-6 text-xs bg-background border-primary text-foreground flex-1"
                          />
                        ) : (
                          <span
                            onDoubleClick={() => {
                              setEditingCriterionId(crit.id);
                              setEditingCriterionText(crit.text);
                            }}
                            onClick={() => handleToggleCriterion(crit.id, crit.done)}
                            className={`flex-1 truncate cursor-pointer ${crit.done ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}
                            title="Duplo-clique para editar o critério"
                          >
                            {crit.text}
                          </span>
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleCriterionRequired(crit.id, !crit.required)}
                            className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border transition-colors ${
                              crit.required
                                ? "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 font-bold"
                                : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                            title="Alternar se o critério é obrigatório"
                          >
                            {crit.required ? "Obrigatório" : "Opcional"}
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingCriterionId(crit.id);
                              setEditingCriterionText(crit.text);
                            }}
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            title="Editar texto do critério"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCriterion(crit.id)}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            title="Excluir critério"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={newCriterionText}
                    onChange={(e) => setNewCriterionText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCriterion()}
                    placeholder="Adicionar critério de aceite (ex: Arquivo disponibilizado, link testado)..."
                    className="h-8 text-xs bg-background border-input text-foreground flex-1"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={newCriterionRequired}
                      onChange={(e) => setNewCriterionRequired(e.target.checked)}
                      className="rounded"
                    />
                    <span>Obrigatório</span>
                  </label>
                  <Button onClick={handleAddCriterion} size="sm" className="h-8 text-xs bg-primary text-primary-foreground font-bold">
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Subtarefas / Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span>Subtarefas / Checklist ({subtasks.filter((s) => s.done).length}/{subtasks.length})</span>
                    {subtasks.length > 0 && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        Math.round((subtasks.filter((s) => s.done).length / subtasks.length) * 100) === 100
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {Math.round((subtasks.filter((s) => s.done).length / subtasks.length) * 100)}%
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-normal lowercase">duplo-clique para renomear</span>
                </div>

                {/* Barra de Progresso do Checklist no Modal */}
                {subtasks.length > 0 && (
                  <div className="w-full bg-muted/70 dark:bg-muted/50 rounded-full h-1.5 overflow-hidden border border-border/30">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ease-out ${
                        Math.round((subtasks.filter((s) => s.done).length / subtasks.length) * 100) === 100
                          ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                          : "bg-primary"
                      }`}
                      style={{
                        width: `${Math.round((subtasks.filter((s) => s.done).length / subtasks.length) * 100)}%`,
                      }}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  {subtasks.length === 0 ? (
                    <div className="text-xs text-muted-foreground/60 italic py-2 text-center border border-dashed border-border rounded-xl">
                      Nenhuma subtarefa adicionada.
                    </div>
                  ) : (
                    subtasks.map((st) => {
                      const match = st.title.match(/(POS|ALM|ICP)-0(\d)/i);
                      let bmLink: { moduleId: string; fieldId: string; label: string; isAnswered: boolean } | null = null;
                      if (match) {
                        const code = match[1].toUpperCase();
                        const num = match[2];
                        const fieldId = `${code.toLowerCase()}_0${num}`;
                        const moduleId = code === "POS" ? "posicionamento" : code === "ALM" ? "alma_copy" : "raio_x_icp";
                        const field = (workspace?.brandManual?.fields || []).find((f) => f.id === fieldId);
                        const isAnswered = Boolean(field && (field.response || "").trim().length > 0);
                        bmLink = { moduleId, fieldId, label: `${code}-0${num}`, isAnswered };
                      }

                      return (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-card border border-border text-xs gap-2"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSubtaskAction(st.id, !st.done)}
                            className="shrink-0"
                            title={st.done ? "Marcar pendente" : "Marcar concluída"}
                          >
                            {st.done || bmLink?.isAnswered ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>

                          {editingSubtaskId === st.id ? (
                            <Input
                              value={editingSubtaskTitle}
                              onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                              onBlur={() => {
                                if (editingSubtaskTitle.trim() && editingSubtaskTitle !== st.title) {
                                  updateSubtaskAction(st.id, { title: editingSubtaskTitle.trim() });
                                }
                                setEditingSubtaskId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  if (editingSubtaskTitle.trim() && editingSubtaskTitle !== st.title) {
                                    updateSubtaskAction(st.id, { title: editingSubtaskTitle.trim() });
                                  }
                                  setEditingSubtaskId(null);
                                }
                              }}
                              autoFocus
                              className="h-6 text-xs bg-background border-primary text-foreground flex-1"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => {
                                setEditingSubtaskId(st.id);
                                setEditingSubtaskTitle(st.title);
                              }}
                              onClick={() => {
                                if (bmLink) {
                                  setActiveBrandManualTarget(bmLink.moduleId, bmLink.fieldId);
                                } else {
                                  toggleSubtaskAction(st.id, !st.done);
                                }
                              }}
                              className={`flex-1 cursor-pointer truncate ${
                                st.done && !bmLink ? "line-through text-muted-foreground" : "text-foreground font-medium"
                              } hover:text-primary transition-colors`}
                              title={
                                bmLink
                                  ? `Clique para abrir ${bmLink.label} no Manual de Marca ou duplo-clique para editar título`
                                  : "Clique para alternar ou duplo-clique para editar o título"
                              }
                            >
                              {st.title}
                            </span>
                          )}

                          {/* Badge de resposta do Manual de Marca */}
                          {bmLink?.isAnswered && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] font-bold py-0 px-1.5 shrink-0">
                              ✓ Respondido
                            </Badge>
                          )}

                          {/* Ação direta: Abrir no Manual de Marca */}
                          {bmLink && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveBrandManualTarget(bmLink!.moduleId, bmLink!.fieldId);
                              }}
                              className="h-6 px-2 text-[10px] text-primary border-primary/30 hover:bg-primary/10 rounded-lg gap-1 shrink-0 font-medium"
                              title={`Abrir ${bmLink.label} diretamente no Manual de Marca`}
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Manual ↗</span>
                            </Button>
                          )}

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingSubtaskId(st.id);
                                setEditingSubtaskTitle(st.title);
                              }}
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              title="Editar título da subtarefa"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteSubtaskAction(st.id)}
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              title="Excluir subtarefa"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                    placeholder="Adicionar nova subtarefa..."
                    className="h-8 text-xs bg-background border-input text-foreground flex-1"
                  />
                  <Button onClick={handleAddSubtask} size="sm" className="h-8 text-xs bg-primary text-primary-foreground font-bold shrink-0">
                    Adicionar
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: ENTREGÁVEIS, VERSIONAMENTO & BACKUP MASTER (P1.5 e P1.6) */}
            <TabsContent value="deliverables" className="space-y-5">
              {/* P1.5: ENTREGÁVEIS E VERSIONAMENTO */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Entregáveis Vinculados & Versionamento 7D
                    </h4>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Aprovação independente do status da tarefa
                  </span>
                </div>

                <div className="space-y-2">
                  {(task.deliverableMaterials || []).length === 0 ? (
                    <div className="text-xs text-muted-foreground/60 italic py-2 text-center border border-dashed border-border rounded-xl">
                      Nenhum entregável formal vinculado a esta atividade.
                    </div>
                  ) : (
                    (task.deliverableMaterials || []).map((deliv) => {
                      const statusCfg = REVIEW_STATUS_CONFIG[deliv.reviewStatus || "nao_enviado"];
                      return (
                        <div
                          key={deliv.id}
                          className="p-3 rounded-xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{deliv.name}</span>
                              <Badge variant="outline" className="text-[9px] uppercase font-mono border-border">
                                {deliv.type} · {deliv.version}
                              </Badge>
                              <Badge className={`text-[9px] ${statusCfg.badgeClass}`}>
                                {statusCfg.label}
                              </Badge>
                            </div>
                            {deliv.url && (
                              <a
                                href={deliv.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline text-[11px] flex items-center gap-1 mt-0.5"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>Acessar material</span>
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={deliv.reviewStatus}
                              onChange={(e) => handleUpdateDeliverableStatus(deliv.id, e.target.value as ReviewStatus)}
                              className="h-7 rounded-lg bg-background border border-input text-[11px] text-foreground px-2"
                            >
                              <option value="nao_enviado">Não enviado</option>
                              <option value="aguardando_revisao">Aguardando revisão</option>
                              <option value="ajustes_solicitados">Ajustes solicitados</option>
                              <option value="aprovado">Aprovado</option>
                            </select>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDeliverable(deliv.id)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Formulário para novo entregável */}
                <div className="pt-2 border-t border-border space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase block">
                    + Adicionar Entregável Formal
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <Input
                      value={newDelivName}
                      onChange={(e) => setNewDelivName(e.target.value)}
                      placeholder="Nome (ex: Script de Qualificação)"
                      className="h-8 text-xs bg-background border-input text-foreground sm:col-span-2"
                    />
                    <select
                      value={newDelivType}
                      onChange={(e) => setNewDelivType(e.target.value)}
                      className="h-8 rounded-xl bg-background border border-input text-xs text-foreground px-2"
                    >
                      <option value="Documento">Documento</option>
                      <option value="Vídeo">Vídeo</option>
                      <option value="Criativo">Criativo</option>
                      <option value="Roteiro">Roteiro / Script</option>
                      <option value="Planilha">Planilha</option>
                      <option value="Outro">Outro</option>
                    </select>
                    <Input
                      value={newDelivVersion}
                      onChange={(e) => setNewDelivVersion(e.target.value)}
                      placeholder="Versão (v1.0)"
                      className="h-8 text-xs bg-background border-input text-foreground font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newDelivUrl}
                      onChange={(e) => setNewDelivUrl(e.target.value)}
                      placeholder="Link do material (Drive, Figma, Docs)..."
                      className="h-8 text-xs bg-background border-input text-foreground flex-1"
                    />
                    <Button onClick={handleAddDeliverable} size="sm" className="h-8 text-xs bg-primary text-primary-foreground font-bold">
                      Registrar Entregável
                    </Button>
                  </div>
                </div>
              </div>

              {/* P1.6: BACKUP MASTER */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <FolderArchive className="h-4 w-4 text-amber-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    📁 Backup Master & Repositório Oficial
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-muted-foreground block mb-1">Link da Pasta no Google Drive</label>
                    <Input
                      value={task.backupMaster?.googleDriveUrl || ""}
                      onChange={(e) =>
                        handleUpdate({
                          backupMaster: {
                            ...(task.backupMaster || {
                              fileName: "",
                              version: "v1.0",
                              folderPath: "",
                              responsibleName: assignee?.name || "",
                              updatedAt: new Date().toISOString(),
                              approvalStatus: "nao_enviado",
                              arquivoSalvo: false,
                              linkDisponivel: false,
                              permissoesVerificadas: false,
                              versaoCorreta: false,
                              aprovacaoRegistrada: false,
                            }),
                            googleDriveUrl: e.target.value,
                          },
                        })
                      }
                      placeholder="https://drive.google.com/drive/folders/..."
                      className="h-8 bg-background border-input text-foreground text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-1">Nome do Arquivo / Pasta</label>
                    <Input
                      value={task.backupMaster?.fileName || ""}
                      onChange={(e) =>
                        handleUpdate({
                          backupMaster: {
                            ...(task.backupMaster || {
                              googleDriveUrl: "",
                              version: "v1.0",
                              folderPath: "",
                              responsibleName: assignee?.name || "",
                              updatedAt: new Date().toISOString(),
                              approvalStatus: "nao_enviado",
                              arquivoSalvo: false,
                              linkDisponivel: false,
                              permissoesVerificadas: false,
                              versaoCorreta: false,
                              aprovacaoRegistrada: false,
                            }),
                            fileName: e.target.value,
                          },
                        })
                      }
                      placeholder="Ex: 01_FUNDACAO/Script_Comercial_v1.pdf"
                      className="h-8 bg-background border-input text-foreground text-xs"
                    />
                  </div>
                </div>

                {/* Checklist de Validação 7D */}
                <div className="pt-2 border-t border-border space-y-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Checklist de Verificação do Backup 7D:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={!!task.backupMaster?.arquivoSalvo}
                        onChange={(e) => handleUpdateBackupChecklist("arquivoSalvo", e.target.checked)}
                        className="rounded"
                      />
                      <span>Arquivo salvo no repositório</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={!!task.backupMaster?.linkDisponivel}
                        onChange={(e) => handleUpdateBackupChecklist("linkDisponivel", e.target.checked)}
                        className="rounded"
                      />
                      <span>Link disponível e acessível</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={!!task.backupMaster?.permissoesVerificadas}
                        onChange={(e) => handleUpdateBackupChecklist("permissoesVerificadas", e.target.checked)}
                        className="rounded"
                      />
                      <span>Permissões de compartilhamento verificadas</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={!!task.backupMaster?.versaoCorreta}
                        onChange={(e) => handleUpdateBackupChecklist("versaoCorreta", e.target.checked)}
                        className="rounded"
                      />
                      <span>Versão correta e atualizada</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={!!task.backupMaster?.aprovacaoRegistrada}
                        onChange={(e) => handleUpdateBackupChecklist("aprovacaoRegistrada", e.target.checked)}
                        className="rounded"
                      />
                      <span>Aprovação registrada para esta versão</span>
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: DEMANDAS EXECUTIVAS DO EXPERT (P1.3) */}
            <TabsContent value="expert" className="space-y-4">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-purple-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Demanda Executiva do Especialista
                    </h4>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={!!task.expertDemand?.isExpertDemand}
                      onChange={(e) =>
                        handleUpdate({
                          expertDemand: {
                            isExpertDemand: e.target.checked,
                            category: task.expertDemand?.category || "gravar",
                            status: task.expertDemand?.status || "solicitado",
                            requesterName: task.expertDemand?.requesterName || "",
                            quantity: task.expertDemand?.quantity || 1,
                            agreedDeadline: task.expertDemand?.agreedDeadline || "",
                            expectedMaterial: task.expertDemand?.expectedMaterial || "",
                          },
                        })
                      }
                      className="rounded"
                    />
                    <span>Ativar como Demanda do Expert</span>
                  </label>
                </div>

                {task.expertDemand?.isExpertDemand ? (
                  <div className="space-y-3 pt-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-muted-foreground block mb-1">Agrupamento da Ação</label>
                        <select
                          value={task.expertDemand.category}
                          onChange={(e) =>
                            handleUpdate({
                              expertDemand: {
                                ...task.expertDemand,
                                category: e.target.value as ExpertDemandCategory,
                              },
                            })
                          }
                          className="w-full h-8 rounded-lg bg-background border border-input text-xs text-foreground px-2"
                        >
                          {(Object.keys(EXPERT_DEMAND_CATEGORIES) as ExpertDemandCategory[]).map((cat) => (
                            <option key={cat} value={cat}>
                              {EXPERT_DEMAND_CATEGORIES[cat]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-muted-foreground block mb-1">Estado da Produção</label>
                        <select
                          value={task.expertDemand.status}
                          onChange={(e) =>
                            handleUpdate({
                              expertDemand: {
                                ...task.expertDemand,
                                status: e.target.value as ExpertDemandStatus,
                              },
                            })
                          }
                          className="w-full h-8 rounded-lg bg-background border border-input text-xs text-foreground px-2"
                        >
                          {(Object.keys(EXPERT_DEMAND_STATUSES) as ExpertDemandStatus[]).map((st) => (
                            <option key={st} value={st}>
                              {EXPERT_DEMAND_STATUSES[st].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-muted-foreground block mb-1">Solicitante</label>
                        <Input
                          value={task.expertDemand.requesterName || ""}
                          onChange={(e) =>
                            handleUpdate({
                              expertDemand: { ...task.expertDemand, requesterName: e.target.value },
                            })
                          }
                          placeholder="Ex: Gestor de Tráfego"
                          className="h-8 text-xs bg-background border-input text-foreground"
                        />
                      </div>

                      <div>
                        <label className="text-muted-foreground block mb-1">Quantidade de Itens</label>
                        <Input
                          type="number"
                          value={task.expertDemand.quantity || 1}
                          onChange={(e) =>
                            handleUpdate({
                              expertDemand: { ...task.expertDemand, quantity: Number(e.target.value) || 1 },
                            })
                          }
                          className="h-8 text-xs bg-background border-input text-foreground"
                        />
                      </div>

                      <div>
                        <label className="text-muted-foreground block mb-1">Prazo Acordado</label>
                        <Input
                          type="date"
                          value={task.expertDemand.agreedDeadline || ""}
                          onChange={(e) =>
                            handleUpdate({
                              expertDemand: { ...task.expertDemand, agreedDeadline: e.target.value },
                            })
                          }
                          className="h-8 text-xs bg-background border-input text-foreground"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1">Material Esperado e Orientações</label>
                      <Textarea
                        value={task.expertDemand.expectedMaterial || ""}
                        onChange={(e) =>
                          handleUpdate({
                            expertDemand: { ...task.expertDemand, expectedMaterial: e.target.value },
                          })
                        }
                        placeholder="Ex: 3 criativos de 45 segundos gravados em 9:16 com gancho direto para o grupo VIP..."
                        className="text-xs bg-background border-input text-foreground min-h-[80px]"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-3 text-center border border-dashed border-border rounded-xl">
                    Esta tarefa não está classificada como demanda direta do especialista.
                  </p>
                )}
              </div>
            </TabsContent>

            {/* ABA 4: CLASSIFICAÇÃO, ORIGEM 7D & GERENCIADOR DE BLOQUEIOS (P1.1 e P1.2) */}
            <TabsContent value="classification" className="space-y-5">
              {/* P1.1: ORIGEM DA TAREFA */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Origem da Tarefa (Arquitetura 7D)
                  </h4>
                  <Badge variant="outline" className={originCfg.badgeClass}>
                    {originCfg.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(["defined", "derived", "proposed"] as TaskOrigin[]).map((org) => {
                    const cfg = TASK_ORIGIN_CONFIG[org];
                    const isSelected = (task.origin || "defined") === org;

                    return (
                      <button
                        key={org}
                        type="button"
                        onClick={() => handleUpdate({ origin: org })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground shadow-sm ring-1 ring-primary/30"
                            : "bg-card border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <div className="text-xs font-bold text-foreground mb-1">{cfg.label}</div>
                        <div className="text-[10px] text-muted-foreground leading-tight">{cfg.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* P1.2: GERENCIADOR E CONFIGURAÇÃO DE BLOQUEIOS OPERACIONAIS */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Controle de Bloqueio Operacional
                    </h4>
                  </div>
                  {isBlocked && (
                    <Badge variant="destructive" className="text-[10px] font-mono">
                      Bloqueio Ativo
                    </Badge>
                  )}
                </div>

                <form onSubmit={handleActivateBlock} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-muted-foreground block mb-1">Tipo de Bloqueio</label>
                      <select
                        value={blockType}
                        onChange={(e) => setBlockType(e.target.value as BlockType)}
                        className="w-full h-8 rounded-lg bg-background border border-input text-xs text-foreground px-2"
                      >
                        {(Object.keys(BLOCK_TYPE_LABEL) as BlockType[]).map((bt) => (
                          <option key={bt} value={bt}>
                            {BLOCK_TYPE_LABEL[bt]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1">Responsável pelo Desbloqueio</label>
                      <Input
                        value={blockResolver}
                        onChange={(e) => setBlockResolver(e.target.value)}
                        placeholder="Ex: Expert / Cliente / Gestor de Tráfego"
                        className="h-8 text-xs bg-background border-input text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-1">Motivo do Bloqueio</label>
                    <Input
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Ex: Aguardando gravação dos criativos pelo especialista..."
                      className="h-8 text-xs bg-background border-input text-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-muted-foreground block mb-1">Impacto da Trava</label>
                      <Input
                        value={blockImpact}
                        onChange={(e) => setBlockImpact(e.target.value)}
                        placeholder="Ex: Impede publicação da campanha de aquisição"
                        className="h-8 text-xs bg-background border-input text-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1">Prazo Acordado p/ Solução</label>
                      <Input
                        type="date"
                        value={blockDeadline}
                        onChange={(e) => setBlockDeadline(e.target.value)}
                        className="h-8 text-xs bg-background border-input text-foreground"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {isBlocked && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClearBlock}
                        className="h-8 text-xs border-border"
                      >
                        Remover Bloqueio
                      </Button>
                    )}
                    <Button type="submit" size="sm" className="h-8 text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold">
                      {isBlocked ? "Atualizar Dados do Bloqueio" : "Registrar Bloqueio Ativo"}
                    </Button>
                  </div>
                </form>
              </div>

              {/* SEÇÃO 7: FLAGS DE IMPACTO (Até 3 simultâneas) */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Flags de Impacto ({task.impactFlags?.length || 0}/3)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Selecione até três flags visuais para classificar a influência desta atividade.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(IMPACT_FLAG_CONFIG) as ImpactFlag[]).map((flagKey) => {
                    const cfg = IMPACT_FLAG_CONFIG[flagKey];
                    const isSelected = task.impactFlags?.includes(flagKey);

                    return (
                      <button
                        key={flagKey}
                        type="button"
                        onClick={() => handleToggleImpactFlag(flagKey)}
                        className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground shadow-sm"
                            : "bg-card border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <span className="text-base shrink-0">{cfg.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground flex items-center justify-between">
                            <span>{cfg.label}</span>
                            {isSelected && <span className="text-primary text-[10px]">✓ Ativa</span>}
                          </div>
                          <span className="text-[10px] text-muted-foreground line-clamp-1 block mt-0.5">
                            {cfg.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DURAÇÃO ESTIMADA MANUAL */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Duração Estimada
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      Atual: {task.durationMinutes ? `${task.durationMinutes} minutos (${fmtMinutes(task.durationMinutes)})` : "Duração: Não definida"}
                    </span>
                  </div>

                  {task.durationMinutes && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDuration(null)}
                      className="text-xs text-muted-foreground hover:text-destructive h-7"
                    >
                      Limpar Estimativa
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={durationInput}
                    onChange={(e) => setDurationInput(e.target.value)}
                    placeholder="Duração em minutos (ex: 60, 120)..."
                    className="h-8 text-xs bg-background border-input text-foreground flex-1"
                  />
                  <Button
                    onClick={() => {
                      const mins = Number(durationInput);
                      if (mins > 0) handleSetDuration(mins);
                    }}
                    size="sm"
                    className="h-8 text-xs bg-primary text-primary-foreground font-bold"
                  >
                    Salvar Duração
                  </Button>
                </div>
              </div>

              {/* Complexidade e Escopo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-muted/30 border border-border text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Complexidade Operacional</label>
                  <select
                    value={task.complexity || "M"}
                    onChange={(e) => handleUpdate({ complexity: e.target.value as any })}
                    className="w-full h-8 rounded-lg bg-background border border-input text-xs text-foreground px-2"
                  >
                    <option value="S">S — Baixa (Simples)</option>
                    <option value="M">M — Média (Padrão)</option>
                    <option value="L">L — Alta (Complexa)</option>
                    <option value="XL">XL — Crítica (Estratégica)</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Escopo</label>
                  <select
                    value={task.scope || "standard"}
                    onChange={(e) => handleUpdate({ scope: e.target.value as any })}
                    className="w-full h-8 rounded-lg bg-background border border-input text-xs text-foreground px-2"
                  >
                    <option value="standard">Padrão</option>
                    <option value="critical">Crítico</option>
                    <option value="optional">Opcional</option>
                  </select>
                </div>
              </div>

              {/* Notas e Observações */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
                <label className="text-xs font-bold text-muted-foreground block">
                  Notas & Observações Internas
                </label>
                <Textarea
                  value={task.notes || ""}
                  onChange={(e) => handleUpdate({ notes: e.target.value })}
                  placeholder="Observações complementares, notas técnicas ou links de referência..."
                  className="text-xs bg-background border-input text-foreground min-h-[70px] rounded-xl"
                />
              </div>
            </TabsContent>

            {/* ABA 5: TEMPO & POMODORO */}
            <TabsContent value="time" className="space-y-4">
              <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Cronômetro de Foco / Pomodoro
                    </span>
                  </div>

                  <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 font-mono">
                    {isCurrentTimer ? (activeTimer?.isRunning ? "▶️ Rodando" : "⏸️ Pausado") : "⏹️ Parado"}
                  </Badge>
                </div>

                <div className="text-center py-2">
                  <div className="text-4xl font-extrabold font-mono text-foreground tracking-widest drop-shadow-sm">
                    {String(timerMinutes).padStart(2, "0")}:{String(timerSeconds).padStart(2, "0")}
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-1">
                    {isCurrentTimer ? "Tempo acumulado na sessão atual" : "Pronto para iniciar"}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  {!isCurrentTimer ? (
                    <Button
                      onClick={() => startTimer(task.id, "stopwatch")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 h-9 rounded-xl flex items-center gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>Iniciar Cronômetro</span>
                    </Button>
                  ) : (
                    <>
                      {activeTimer?.isRunning ? (
                        <Button
                          onClick={pauseTimer}
                          className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 h-8 rounded-xl flex items-center gap-1"
                        >
                          <Pause className="h-3.5 w-3.5" />
                          <span>Pausar</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={resumeTimer}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 h-8 rounded-xl flex items-center gap-1"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>Retomar</span>
                        </Button>
                      )}

                      <Button
                        onClick={() => stopAndSaveTimer(`Sessão de trabalho em ${task.title}`)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-3 h-8 rounded-xl"
                      >
                        Finalizar e Salvar
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Deseja zerar o cronômetro desta sessão?")) resetTimer();
                        }}
                        className="text-muted-foreground hover:text-destructive text-xs h-8 px-2"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                <span className="text-xs font-bold text-muted-foreground block">Ou apontar tempo manualmente:</span>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={timeMinutes}
                    onChange={(e) => setTimeMinutes(e.target.value)}
                    placeholder="Minutos (ex: 60)"
                    className="h-8 w-32 bg-background border-input text-foreground text-xs font-mono"
                  />
                  <Input
                    value={timeNote}
                    onChange={(e) => setTimeNote(e.target.value)}
                    placeholder="Descrição da atividade..."
                    className="h-8 flex-1 bg-background border-input text-foreground text-xs"
                  />
                  <Button onClick={handleAddTime} size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold">
                    Apontar
                  </Button>
                </div>

                <div className="space-y-1.5 pt-2 max-h-36 overflow-y-auto">
                  {task.timeEntries.map((te) => (
                    <div key={te.id} className="text-[11px] flex justify-between text-muted-foreground bg-card border border-border p-2 rounded-lg">
                      <span>{te.note || "Execução de tarefa"}</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{te.minutes} min</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ABA 6: PROMPT IA */}
            <TabsContent value="prompt" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Prompt de execução acelerada para operadores ou agentes de IA.
              </p>
              <Textarea
                value={currentPrompt}
                onChange={(e) => {
                  mutate((ws, ctx) => setPrompt(ws, ctx, task.id, e.target.value));
                }}
                placeholder="Insira o prompt executável para esta tarefa..."
                className="min-h-[140px] text-xs bg-background border-input text-foreground rounded-xl"
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
