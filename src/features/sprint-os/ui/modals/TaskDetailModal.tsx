/**
 * Modal Completo de Detalhes da Tarefa (Cockpit 80/20).
 * Especificação: Master Prompt v9.0 + Otimização — Seções 7, 11 e 12.
 * - Flags de Impacto: até 3 flags simultâneas (💸, 💰, ⏳, ⚙️, ⚠️)
 * - Cronômetro & Pomodoro individual com Play, Pause, Resume, Stop & Save
 * - Duração estimada manual (começa Não definida se não configurada)
 * - Microcheckpoints e evidências
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
import {
  subtasksOf,
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
  type Priority,
  type Complexity,
  type ScopeType,
  type TaskStatus,
  type ImpactFlag,
} from "../../domain/types";
import { fmtDateTime, fmtMinutes } from "../../scheduler/time";

export const TaskDetailModal: React.FC = () => {
  const {
    workspace,
    selectedTaskId,
    isTaskModalOpen,
    setIsTaskModalOpen,
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
  } = useSprintOSStore();

  const [activeTab, setActiveTab] = useState("execution");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskTarget, setNewSubtaskTarget] = useState("");
  const [timeMinutes, setTimeMinutes] = useState("");
  const [timeNote, setTimeNote] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [durationInput, setDurationInput] = useState("");

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

  const handleUpdate = (patch: any) => {
    mutate((ws, ctx) => {
      updateTask(ws, ctx, task.id, patch);
    });
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
      <DialogContent className="bg-[#12161F] border border-white/10 text-white max-w-3xl w-full p-0 overflow-hidden rounded-3xl max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="p-6 pb-4 border-b border-white/10 bg-zinc-950/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">{STATUS_ICON[task.status]}</span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono border-white/10 text-white/50">
                {stage?.title || "Etapa"}
              </Badge>
              <Badge className="text-[10px] font-black py-0 px-2 bg-primary/20 text-primary border-primary/30">
                {PRIORITY_LABEL[task.priority]}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={() => {
                  const nextStatus: TaskStatus =
                    task.status === "pending" ? "doing" : task.status === "doing" ? "done" : "pending";
                  handleUpdate({ status: nextStatus });
                }}
                className="h-7 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold"
              >
                Mudar: {task.status === "pending" ? "Iniciar (Fazendo)" : task.status === "doing" ? "Concluir (Feito)" : "Reabrir"}
              </Button>
            </div>
          </div>

          <Input
            value={task.title}
            onChange={(e) => handleUpdate({ title: e.target.value })}
            className="text-base font-bold bg-transparent border-transparent hover:border-white/10 focus:border-primary p-0 h-auto rounded-none text-white tracking-tight"
          />
        </div>

        {/* Abas do Inspetor */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl mb-4 flex-wrap h-auto">
              <TabsTrigger value="execution" className="text-xs font-bold">
                Execução & Checklist
              </TabsTrigger>
              <TabsTrigger value="classification" className="text-xs font-bold">
                Classificação & Flags
              </TabsTrigger>
              <TabsTrigger value="time" className="text-xs font-bold flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-400" />
                <span>Tempo & Pomodoro</span>
              </TabsTrigger>
              <TabsTrigger value="evidence" className="text-xs font-bold">
                Evidências
              </TabsTrigger>
              <TabsTrigger value="prompt" className="text-xs font-bold flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Prompt IA</span>
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: EXECUÇÃO & CHECKLIST */}
            <TabsContent value="execution" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <label className="text-xs font-bold text-white/50 block mb-1.5 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Responsável Atribuído
                  </label>
                  <select
                    value={task.assigneeId || ""}
                    onChange={(e) => handleUpdate({ assigneeId: e.target.value || null })}
                    className="w-full h-8 rounded-lg bg-black border border-white/10 text-xs text-white px-2.5"
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
                  <label className="text-xs font-bold text-white/50 block mb-1.5 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    Ciência Operacional
                  </label>
                  {task.assigneeId ? (
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-black/40 border border-white/10">
                      <span className="text-xs text-white/70">
                        {ack === "current" ? "🟢 Ciente" : ack === "outdated" ? "🟡 Desatualizada" : "⚪ Pendente"}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          mutate((ws, ctx) => acknowledge(ws, ctx, task.id, task.assigneeId!));
                          toast.success("Ciência confirmada!");
                        }}
                        className="h-6 text-[11px] bg-white/10 hover:bg-white/20 text-white font-bold rounded"
                      >
                        Confirmar
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-white/30 italic">Atribua um responsável.</span>
                  )}
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-white/60">
                  <span>Subtarefas ({subtasks.filter((s) => s.done).length}/{subtasks.length})</span>
                </div>
                <div className="space-y-1.5">
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSubtaskAction(st.id, !st.done)}
                        className="flex items-center gap-2 text-left flex-1"
                      >
                        {st.done ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Circle className="h-4 w-4 text-white/30" />
                        )}
                        <span className={st.done ? "line-through text-white/40" : "text-white"}>
                          {st.title}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Nova subtarefa..."
                    className="h-8 text-xs bg-black border-white/10 text-white flex-1"
                  />
                  <Button onClick={handleAddSubtask} size="sm" className="h-8 text-xs bg-primary font-bold">
                    Adicionar
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: CLASSIFICAÇÃO & FLAGS (Seção 7 e 12) */}
            <TabsContent value="classification" className="space-y-5">
              {/* SEÇÃO 7: FLAGS DE IMPACTO (Até 3 simultâneas) */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    Flags de Impacto ({task.impactFlags?.length || 0}/3)
                  </h4>
                  <p className="text-[11px] text-white/40">
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
                            ? "bg-primary/10 border-primary text-white shadow-sm"
                            : "bg-black/30 border-white/5 text-white/60 hover:border-white/15"
                        }`}
                      >
                        <span className="text-base shrink-0">{cfg.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>{cfg.label}</span>
                            {isSelected && <span className="text-primary text-[10px]">✓ Ativa</span>}
                          </div>
                          <span className="text-[10px] text-white/40 line-clamp-1 block mt-0.5">
                            {cfg.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SEÇÃO 12: DURAÇÃO ESTIMADA MANUAL */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Duração Estimada
                    </h4>
                    <span className="text-[11px] text-white/40">
                      Atual: {task.durationMinutes ? `${task.durationMinutes} minutos (${fmtMinutes(task.durationMinutes)})` : "Duração: Não definida"}
                    </span>
                  </div>

                  {task.durationMinutes && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDuration(null)}
                      className="text-xs text-white/50 hover:text-red-400 h-7"
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
                    className="h-8 text-xs bg-black border-white/10 text-white flex-1"
                  />
                  <Button
                    onClick={() => {
                      const mins = Number(durationInput);
                      if (mins > 0) handleSetDuration(mins);
                    }}
                    size="sm"
                    className="h-8 text-xs bg-primary font-bold"
                  >
                    Salvar Duração
                  </Button>
                </div>
              </div>

              {/* Bloqueio */}
              <div>
                <label className="text-xs font-bold text-white/50 block mb-1">Motivo de Bloqueio</label>
                <Input
                  value={task.blockedReason || ""}
                  onChange={(e) => handleUpdate({ blockedReason: e.target.value || null })}
                  placeholder="Deixe em branco se a tarefa não estiver travada..."
                  className="bg-black border-white/10 text-white text-xs h-8"
                />
              </div>
            </TabsContent>

            {/* ABA 3: TEMPO & POMODORO (Seção 11) */}
            <TabsContent value="time" className="space-y-4">
              {/* Cronômetro / Pomodoro Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-amber-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Cronômetro de Foco / Pomodoro
                    </span>
                  </div>

                  <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 font-mono">
                    {isCurrentTimer ? (activeTimer?.isRunning ? "▶️ Rodando" : "⏸️ Pausado") : "⏹️ Parado"}
                  </Badge>
                </div>

                {/* Display Digital do Tempo */}
                <div className="text-center py-2">
                  <div className="text-4xl font-extrabold font-mono text-white tracking-widest drop-shadow-md">
                    {String(timerMinutes).padStart(2, "0")}:{String(timerSeconds).padStart(2, "0")}
                  </div>
                  <span className="text-[11px] text-white/40 block mt-1">
                    {isCurrentTimer ? "Tempo acumulado na sessão atual" : "Pronto para iniciar"}
                  </span>
                </div>

                {/* Controles: Play / Pause / Retomar / Finalizar / Reiniciar */}
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
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 h-8 rounded-xl"
                      >
                        Finalizar e Salvar
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Deseja zerar o cronômetro desta sessão?")) resetTimer();
                        }}
                        className="text-white/40 hover:text-red-400 text-xs h-8 px-2"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Apontamento Manual de Minutos */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <span className="text-xs font-bold text-white/60 block">Ou apontar tempo manualmente:</span>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={timeMinutes}
                    onChange={(e) => setTimeMinutes(e.target.value)}
                    placeholder="Minutos (ex: 60)"
                    className="h-8 w-32 bg-black border-white/10 text-white text-xs font-mono"
                  />
                  <Input
                    value={timeNote}
                    onChange={(e) => setTimeNote(e.target.value)}
                    placeholder="Descrição da atividade..."
                    className="h-8 flex-1 bg-black border-white/10 text-white text-xs"
                  />
                  <Button onClick={handleAddTime} size="sm" className="h-8 text-xs bg-amber-600 font-bold">
                    Apontar
                  </Button>
                </div>

                {/* Histórico de Registros de Tempo */}
                <div className="space-y-1.5 pt-2 max-h-36 overflow-y-auto">
                  {task.timeEntries.map((te) => (
                    <div key={te.id} className="text-[11px] flex justify-between text-white/60 bg-black/30 p-2 rounded-lg">
                      <span>{te.note || "Execução de tarefa"}</span>
                      <span className="font-mono font-bold text-amber-400">{te.minutes} min</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ABA 4: EVIDÊNCIAS */}
            <TabsContent value="evidence" className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-white">Anexar Evidência / Link de Aceite</h4>
                <div className="flex gap-2">
                  <Input
                    value={evidenceName}
                    onChange={(e) => setEvidenceName(e.target.value)}
                    placeholder="Nome (ex: Print CRM)"
                    className="h-8 w-44 bg-black border-white/10 text-white text-xs"
                  />
                  <Input
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="URL (https://...)"
                    className="h-8 flex-1 bg-black border-white/10 text-white text-xs"
                  />
                  <Button onClick={handleAddEvidence} size="sm" className="h-8 text-xs bg-cyan-600 font-bold">
                    Anexar
                  </Button>
                </div>

                <div className="space-y-1.5 pt-2">
                  {task.evidence.map((ev) => (
                    <div key={ev.id} className="p-2 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                      <span className="text-white font-medium">{ev.name}</span>
                      <a href={ev.url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono text-[11px]">
                        Abrir link
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ABA 5: PROMPT OTIMIZADO */}
            <TabsContent value="prompt" className="space-y-3">
              <p className="text-xs text-white/50">
                Prompt de execução acelerada para operadores ou agentes de IA.
              </p>
              <Textarea
                value={currentPrompt}
                onChange={(e) => {
                  mutate((ws, ctx) => setPrompt(ws, ctx, task.id, e.target.value));
                }}
                placeholder="Insira o prompt executável para esta tarefa..."
                className="min-h-[140px] text-xs bg-black border-white/10 text-white rounded-xl"
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
