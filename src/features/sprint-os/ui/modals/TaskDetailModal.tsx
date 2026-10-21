/**
 * Modal Completo de Detalhes da Tarefa (Camada A / Seções 17, 19, 20, 21, 30, 31, 35).
 * Estrutura Canônica:
 * - Identificação & Classificação (Prioridade P0-P3, Complexidade, Impacto Financeiro, Escopo)
 * - Responsável & Confirmação de Ciência com Alerta de Versão Desatualizada
 * - Checklist de Execução & Microcheckpoints com Contadores [-] 0/N [+]
 * - Registro de Tempo Real
 * - Anexos & Evidências
 * - ✨ Prompt Otimizado associado à tarefa
 * - 🧠 Aprendizados de Implementação (8 campos da Seção 35)
 */

import React, { useState } from "react";
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
  type Priority,
  type Complexity,
  type ScopeType,
  type TaskStatus,
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
    mutate,
  } = useSprintOSStore();

  const [activeTab, setActiveTab] = useState("execution");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskTarget, setNewSubtaskTarget] = useState("");
  const [timeMinutes, setTimeMinutes] = useState("");
  const [timeNote, setTimeNote] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  if (!workspace || !selectedTaskId) return null;

  const task = workspace.tasks[selectedTaskId];
  if (!task) return null;

  const stage = workspace.stages[task.stageId];
  const subtasks = subtasksOf(workspace, task.id);
  const members = Object.values(workspace.members).filter((m) => !m.archivedAt);
  const assignee = task.assigneeId ? workspace.members[task.assigneeId] : null;
  const ack = ackState(workspace, task.id, task.assigneeId);
  const currentPrompt = workspace.prompts[task.id] || "";

  const handleUpdate = (patch: any) => {
    mutate((ws, ctx) => {
      updateTask(ws, ctx, task.id, patch);
    });
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

  const handleCopyPrompt = () => {
    if (currentPrompt) {
      navigator.clipboard.writeText(currentPrompt);
      toast.success("Prompt copiado para a área de transferência!");
    }
  };

  return (
    <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
      <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 text-white max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Topo do Inspector */}
        <div className="p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
              {stage?.title || "Etapa Operacional"}
            </span>

            <div className="flex items-center gap-2">
              {/* Status Selector */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                {(["pending", "doing", "done"] as TaskStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      mutate((ws, ctx) => {
                        setTaskStatus(ws, ctx, task.id, st);
                      });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      task.status === st
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <span>{STATUS_ICON[st]}</span>
                    <span className="capitalize">{st === "pending" ? "Pendente" : st === "doing" ? "Fazendo" : "Feito"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Título Editável */}
          <Input
            value={task.title}
            onChange={(e) => handleUpdate({ title: e.target.value })}
            className="text-lg font-black bg-transparent border-transparent hover:border-white/10 focus:border-primary p-0 h-auto rounded-none text-white mb-2"
          />

          {/* Descrição */}
          <Textarea
            value={task.description}
            onChange={(e) => handleUpdate({ description: e.target.value })}
            placeholder="Adicione um detalhamento operacional desta tarefa..."
            rows={2}
            className="text-xs bg-black/30 border-white/5 text-white/80 resize-none"
          />
        </div>

        {/* Abas do Inspetor */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl mb-4">
              <TabsTrigger value="execution" className="text-xs font-bold">
                Execução & Checklist
              </TabsTrigger>
              <TabsTrigger value="classification" className="text-xs font-bold">
                Classificação & Escopo
              </TabsTrigger>
              <TabsTrigger value="evidence" className="text-xs font-bold">
                Evidências & Tempo
              </TabsTrigger>
              <TabsTrigger value="prompt" className="text-xs font-bold flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Prompt Otimizado</span>
              </TabsTrigger>
              <TabsTrigger value="learnings" className="text-xs font-bold flex items-center gap-1">
                <Brain className="h-3 w-3 text-indigo-400" />
                <span>Aprendizados</span>
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: EXECUÇÃO & CHECKLIST */}
            <TabsContent value="execution" className="space-y-5">
              {/* Barra de Responsável & Ciência */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <label className="text-xs font-bold text-white/50 block mb-1.5 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Responsável Atribuído
                  </label>
                  <select
                    value={task.assigneeId || ""}
                    onChange={(e) => handleUpdate({ assigneeId: e.target.value || null })}
                    className="w-full h-9 rounded-lg bg-black border border-white/10 text-xs text-white px-2.5"
                  >
                    <option value="">Sem atribuição</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role || "Operador"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Confirmação de Ciência (Seção 21) */}
                <div>
                  <label className="text-xs font-bold text-white/50 block mb-1.5 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    Confirmação de Ciência
                  </label>
                  {task.assigneeId ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/10">
                      <div className="text-xs">
                        {ack === "current" ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Ciente na v{task.materialVersion}
                          </span>
                        ) : ack === "outdated" ? (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" /> Ciência Desatualizada
                          </span>
                        ) : (
                          <span className="text-white/40">Pendente de confirmação</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          mutate((ws, ctx) => acknowledge(ws, ctx, task.id, task.assigneeId!));
                          toast.success("Ciência confirmada!");
                        }}
                        className="h-7 text-xs bg-white/10 hover:bg-white/20 text-white font-bold"
                      >
                        Confirmar Ciência
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-white/30 italic p-2">
                      Atribua um responsável para registrar ciência.
                    </div>
                  )}
                </div>
              </div>

              {/* Checklist de Execução */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    Checklist de Execução & Microcheckpoints ({subtasks.filter((s) => s.done).length}/{subtasks.length})
                  </h4>
                </div>

                <div className="space-y-2 mb-3">
                  {subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                          onClick={() => toggleSubtaskAction(sub.id, !sub.done)}
                          className="shrink-0 text-white/40 hover:text-emerald-400"
                        >
                          {sub.done ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-white/40" />
                          )}
                        </button>
                        <span className={`truncate ${sub.done ? "line-through text-white/40" : "text-white"}`}>
                          {sub.title}
                        </span>
                        {sub.required && (
                          <span className="text-[10px] text-amber-400/80 font-bold shrink-0">*obrigatória</span>
                        )}
                      </div>

                      {/* Contador Quantitativo [-] 0 / N [+] */}
                      {sub.target != null && (
                        <div className="flex items-center gap-1.5 bg-black px-2 py-0.5 rounded border border-white/10 shrink-0">
                          <button
                            onClick={() => stepSubtaskCountAction(sub.id, -1)}
                            disabled={sub.count <= 0}
                            className="text-white/40 hover:text-white disabled:opacity-20"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-mono font-bold text-[11px] text-white">
                            {sub.count}/{sub.target}
                          </span>
                          <button
                            onClick={() => stepSubtaskCountAction(sub.id, 1)}
                            disabled={sub.count >= sub.target}
                            className="text-white/40 hover:text-white disabled:opacity-20"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => mutate((ws, ctx) => deleteSubtask(ws, ctx, sub.id))}
                        className="text-white/20 hover:text-rose-400 transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Adicionar Novo Item */}
                <div className="flex items-center gap-2">
                  <Input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Título da nova subtarefa..."
                    className="h-8 text-xs bg-black border-white/10 text-white flex-1"
                  />
                  <Input
                    type="number"
                    value={newSubtaskTarget}
                    onChange={(e) => setNewSubtaskTarget(e.target.value)}
                    placeholder="Meta (ex: 2)"
                    className="h-8 w-24 text-xs bg-black border-white/10 text-white"
                  />
                  <Button onClick={handleAddSubtask} size="sm" className="h-8 text-xs bg-primary font-bold">
                    Adicionar
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: CLASSIFICAÇÃO & ESCOPO */}
            <TabsContent value="classification" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/50 block mb-1">Prioridade</label>
                  <select
                    value={task.priority}
                    onChange={(e) => handleUpdate({ priority: e.target.value as Priority })}
                    className="w-full h-9 rounded-lg bg-black border border-white/10 text-xs text-white px-2.5"
                  >
                    <option value="P0">P0 — Crítica (Bloqueia receita/operação)</option>
                    <option value="P1">P1 — Alta (Estabilidade e qualidade)</option>
                    <option value="P2">P2 — Média (Planejamento e análise)</option>
                    <option value="P3">P3 — Baixa (Refinamentos)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 block mb-1">Complexidade Técnica</label>
                  <select
                    value={task.complexity}
                    onChange={(e) => handleUpdate({ complexity: e.target.value as Complexity })}
                    className="w-full h-9 rounded-lg bg-black border border-white/10 text-xs text-white px-2.5"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/50 block mb-1">Tipo de Escopo</label>
                  <select
                    value={task.scope}
                    onChange={(e) => handleUpdate({ scope: e.target.value as ScopeType })}
                    className="w-full h-9 rounded-lg bg-black border border-white/10 text-xs text-white px-2.5"
                  >
                    <option value="original">Escopo Original (Contratado)</option>
                    <option value="adjustment">Ajuste Operacional</option>
                    <option value="additional">Solicitação Adicional (Extra)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 block mb-1">Duração Estimada (Minutos)</label>
                  <Input
                    type="number"
                    value={task.durationMinutes ?? ""}
                    onChange={(e) => handleUpdate({ durationMinutes: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Ex: 120"
                    className="bg-black border-white/10 text-white h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Flags de Impacto Financeiro e Bloqueio */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl bg-white/5 border border-white/5">
                  <input
                    type="checkbox"
                    checked={task.financialImpact}
                    onChange={(e) => handleUpdate({ financialImpact: e.target.checked })}
                    className="h-4 w-4 rounded border-white/20 bg-black text-primary"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                      Impacto Financeiro Direto
                    </span>
                    <span className="text-white/40 block">
                      Atividade ligada à geração de receita, tráfego ou conversão imediata.
                    </span>
                  </div>
                </label>

                {/* Bloqueio */}
                <div>
                  <label className="text-xs font-bold text-white/50 block mb-1">Motivo de Bloqueio (Se houver)</label>
                  <Input
                    value={task.blockedReason || ""}
                    onChange={(e) => handleUpdate({ blockedReason: e.target.value || null })}
                    placeholder="Deixe em branco se a tarefa não estiver travada..."
                    className="bg-black border-white/10 text-white text-xs"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: EVIDÊNCIAS & TEMPO */}
            <TabsContent value="evidence" className="space-y-5">
              {/* Apontamento de Horas Reais */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <h4 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  Registrar Horas Reais Trabalhadas
                </h4>
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
                    placeholder="Descrição da atividade executada..."
                    className="h-8 flex-1 bg-black border-white/10 text-white text-xs"
                  />
                  <Button onClick={handleAddTime} size="sm" className="h-8 text-xs bg-amber-600 font-bold">
                    Apontar
                  </Button>
                </div>

                {/* Lista de Registros de Tempo */}
                <div className="space-y-1.5 pt-2 max-h-32 overflow-y-auto">
                  {task.timeEntries.map((te) => (
                    <div key={te.id} className="text-[11px] flex justify-between text-white/60 bg-black/30 p-2 rounded-lg">
                      <span>{te.note || "Execução de tarefa"}</span>
                      <span className="font-mono font-bold text-amber-400">{te.minutes} min</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anexos de Evidências */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <h4 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-cyan-400" />
                  Evidências de Conclusão / Links
                </h4>
                <div className="flex gap-2">
                  <Input
                    value={evidenceName}
                    onChange={(e) => setEvidenceName(e.target.value)}
                    placeholder="Nome da evidência (ex: Print CRM)"
                    className="h-8 w-44 bg-black border-white/10 text-white text-xs"
                  />
                  <Input
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="Link (ex: https://...)"
                    className="h-8 flex-1 bg-black border-white/10 text-white text-xs"
                  />
                  <Button onClick={handleAddEvidence} size="sm" className="h-8 text-xs bg-primary font-bold">
                    Anexar
                  </Button>
                </div>

                <div className="space-y-1.5 pt-2">
                  {task.evidence.map((ev) => (
                    <div key={ev.id} className="flex justify-between items-center text-xs p-2 rounded-lg bg-black/30">
                      <a href={ev.url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline font-bold truncate">
                        {ev.name}
                      </a>
                      <span className="text-[10px] text-white/40">{ev.authorName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ABA 4: PROMPT OTIMIZADO (Seção 31) */}
            <TabsContent value="prompt" className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">✨ Prompt de Engenharia / Execução</h4>
                  <span className="text-[11px] text-white/50">
                    Instrução padronizada para delegar a execução a agentes ou terceiros
                  </span>
                </div>
                <Button onClick={handleCopyPrompt} size="sm" variant="outline" className="h-7 text-xs border-white/10 text-white gap-1.5">
                  <Copy className="h-3 w-3" />
                  <span>Copiar</span>
                </Button>
              </div>

              <Textarea
                value={currentPrompt}
                onChange={(e) => {
                  mutate((ws, ctx) => setPrompt(ws, ctx, task.id, e.target.value));
                }}
                rows={8}
                placeholder="Insira aqui o prompt completo e estruturado para executar esta entrega..."
                className="font-mono text-xs bg-black border-white/10 text-white/90"
              />
            </TabsContent>

            {/* ABA 5: APRENDIZADOS DE IMPLEMENTAÇÃO (Seção 35) */}
            <TabsContent value="learnings" className="space-y-3">
              <div className="text-xs text-white/50 mb-2">
                Sistematização de aprendizado para transformar esta execução em playbook replicável:
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-white/70 block mb-1">O que funcionou?</label>
                  <Input
                    value={task.learnings.worked}
                    onChange={(e) => {
                      const patch = { learnings: { ...task.learnings, worked: e.target.value } };
                      handleUpdate(patch);
                    }}
                    className="bg-black border-white/10 text-white text-xs h-8"
                  />
                </div>

                <div>
                  <label className="font-bold text-white/70 block mb-1">O que não funcionou?</label>
                  <Input
                    value={task.learnings.didntWork}
                    onChange={(e) => {
                      const patch = { learnings: { ...task.learnings, didntWork: e.target.value } };
                      handleUpdate(patch);
                    }}
                    className="bg-black border-white/10 text-white text-xs h-8"
                  />
                </div>

                <div>
                  <label className="font-bold text-white/70 block mb-1">Qual foi o impedimento?</label>
                  <Input
                    value={task.learnings.impediment}
                    onChange={(e) => {
                      const patch = { learnings: { ...task.learnings, impediment: e.target.value } };
                      handleUpdate(patch);
                    }}
                    className="bg-black border-white/10 text-white text-xs h-8"
                  />
                </div>

                <div>
                  <label className="font-bold text-white/70 block mb-1">Como foi resolvido?</label>
                  <Input
                    value={task.learnings.resolution}
                    onChange={(e) => {
                      const patch = { learnings: { ...task.learnings, resolution: e.target.value } };
                      handleUpdate(patch);
                    }}
                    className="bg-black border-white/10 text-white text-xs h-8"
                  />
                </div>

                <div>
                  <label className="font-bold text-white/70 block mb-1">O que poderia ser automatizado?</label>
                  <Input
                    value={task.learnings.automatable}
                    onChange={(e) => {
                      const patch = { learnings: { ...task.learnings, automatable: e.target.value } };
                      handleUpdate(patch);
                    }}
                    className="bg-black border-white/10 text-white text-xs h-8"
                  />
                </div>

                <div>
                  <label className="font-bold text-white/70 block mb-1">Melhoria para a próxima sprint:</label>
                  <Input
                    value={task.learnings.nextImprovement}
                    onChange={(e) => {
                      const patch = { learnings: { ...task.learnings, nextImprovement: e.target.value } };
                      handleUpdate(patch);
                    }}
                    className="bg-black border-white/10 text-white text-xs h-8"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
