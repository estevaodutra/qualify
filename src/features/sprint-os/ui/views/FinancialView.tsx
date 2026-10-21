/**
 * Módulo Financeiro: RENTABILIDADE DA EMPREITADA (Camada A / Seção 33).
 * Fórmulas canônicas:
 * - Custo planejado = Σ(horas planejadas × custo/hora) + despesas previstas
 * - Custo realizado = Σ(horas reais × custo/hora) + despesas realizadas
 * - Custo final projetado = custo realizado + custo restante previsto
 * - Resultado bruto projetado = receita contratada − custo final projetado
 * - Margem bruta projetada = resultado bruto projetado ÷ receita contratada × 100
 * - Mídia do cliente separada categoricamente.
 */

import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Plus,
  Trash2,
  Users,
  PieChart,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { computeSprintFinancials } from "../../metrics/calculations";
import { setMemberCost, upsertFinancial, archiveEntity } from "../../domain/ops";

export const FinancialView: React.FC = () => {
  const { workspace, activeSprintId, mutate } = useSprintOSStore();

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<"expense" | "rework" | "client_media">("expense");

  if (!workspace || !activeSprintId) return null;

  const fin = computeSprintFinancials(workspace, activeSprintId);
  const sprint = workspace.sprints[activeSprintId];
  const members = Object.values(workspace.members).filter((m) => !m.archivedAt);
  const records = Object.values(workspace.financialRecords).filter(
    (r) => r.sprintId === activeSprintId && !r.archivedAt
  );

  const handleUpdateCost = (memberId: string, value: string) => {
    const cost = value === "" ? null : Number(value);
    mutate((ws, ctx) => {
      setMemberCost(ws, ctx, memberId, cost);
    });
  };

  const handleAddExpense = () => {
    if (!expenseDesc || !expenseAmount) return;
    mutate((ws, ctx) => {
      upsertFinancial(ws, ctx, {
        sprintId: activeSprintId,
        description: expenseDesc,
        amount: Number(expenseAmount),
        kind: "actual",
        category: expenseCategory,
      });
    });
    setExpenseDesc("");
    setExpenseAmount("");
    setIsExpenseModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Grid Superior de Cards Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita Contratada */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md">
          <div className="text-xs uppercase font-bold text-white/50 mb-1 flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            Valor Contratado (Receita)
          </div>
          <div className="text-2xl font-black text-white">
            R$ {fin.contractValue.toLocaleString("pt-BR")}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1 font-semibold">
            Recebido: R$ {fin.revenueReceived.toLocaleString("pt-BR")}
          </div>
        </div>

        {/* Custo Final Projetado */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md">
          <div className="text-xs uppercase font-bold text-white/50 mb-1 flex items-center gap-1.5">
            <PieChart className="h-3.5 w-3.5 text-rose-400" />
            Custo Final Projetado
          </div>
          <div className="text-2xl font-black text-rose-400">
            R$ {fin.projectedFinalCost.toLocaleString("pt-BR")}
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            Realizado: R$ {fin.actualCost.toLocaleString("pt-BR")} · Restante: R$ {fin.projectedRemainingCost.toLocaleString("pt-BR")}
          </div>
        </div>

        {/* Resultado Bruto Projetado */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md">
          <div className="text-xs uppercase font-bold text-white/50 mb-1 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            Resultado Bruto Previsto
          </div>
          <div className="text-2xl font-black text-emerald-400">
            R$ {fin.projectedGrossProfit.toLocaleString("pt-BR")}
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            (Receita − Custo Final Projetado)
          </div>
        </div>

        {/* Margem Bruta */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md">
          <div className="text-xs uppercase font-bold text-white/50 mb-1 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
            Margem Bruta Estimada
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {fin.projectedGrossMarginPct}%
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            Desvio de custo: {fin.costVariance >= 0 ? `+R$ ${fin.costVariance}` : `-R$ ${Math.abs(fin.costVariance)}`}
          </div>
        </div>
      </div>

      {/* Grid de Seções: Custo/Hora por Profissional + Lançamentos Financeiros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabela de Custo/Hora por Membro */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Custo/Hora por Profissional
              </h3>
              <span className="text-xs text-white/50">
                Valor utilizado na apuração do esforço e margem da sprint
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {members.length === 0 ? (
              <div className="p-4 text-center text-xs text-white/30 border border-dashed border-white/5 rounded-xl">
                Nenhum membro cadastrado. Os custos podem ser definidos ao associar responsáveis.
              </div>
            ) : (
              members.map((m) => {
                const currentCost = workspace.costs[m.id];
                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{m.name}</div>
                      <div className="text-[11px] text-white/40">{m.role || "Operador"}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50">R$/h:</span>
                      <Input
                        type="number"
                        defaultValue={currentCost ?? ""}
                        placeholder="Não definido"
                        onBlur={(e) => handleUpdateCost(m.id, e.target.value)}
                        className="h-8 w-28 text-xs font-bold bg-black border-white/10 text-white"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Lançamentos de Despesas, Retrabalho e Mídia */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  Despesas & Retrabalho
                </h3>
                <span className="text-xs text-white/50">
                  Registros adicionais com impacto no resultado operacional
                </span>
              </div>

              <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs font-bold gap-1.5 h-8">
                    <Plus className="h-3 w-3" />
                    <span>Lançar</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-950 border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-base font-bold">Novo Lançamento Financeiro</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-xs font-bold text-white/60 mb-1 block">Descrição</label>
                      <Input
                        value={expenseDesc}
                        onChange={(e) => setExpenseDesc(e.target.value)}
                        placeholder="Ex: Assinatura Zapier, Taxa extra, etc."
                        className="bg-black border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-white/60 mb-1 block">Valor (R$)</label>
                      <Input
                        type="number"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-black border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-white/60 mb-1 block">Categoria</label>
                      <select
                        value={expenseCategory}
                        onChange={(e: any) => setExpenseCategory(e.target.value)}
                        className="w-full h-9 rounded-md bg-black border border-white/10 text-xs text-white px-3"
                      >
                        <option value="expense">Despesa Operacional</option>
                        <option value="rework">Custo de Retrabalho</option>
                        <option value="client_media">Mídia Paga pelo Cliente (Não deduz)</option>
                      </select>
                    </div>
                    <Button onClick={handleAddExpense} className="w-full bg-primary font-bold text-xs mt-2">
                      Salvar Lançamento
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Lista de Registros */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {records.length === 0 ? (
                <div className="p-4 text-center text-xs text-white/30 border border-dashed border-white/5 rounded-xl">
                  Nenhum lançamento registrado nesta sprint.
                </div>
              ) : (
                records.map((r) => (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{r.description}</div>
                      <div className="text-[10px] text-white/40 capitalize">
                        {r.category === "client_media"
                          ? "Mídia do Cliente"
                          : r.category === "rework"
                          ? "Retrabalho"
                          : "Despesa Operacional"}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-white">
                        R$ {r.amount.toLocaleString("pt-BR")}
                      </span>
                      <button
                        onClick={() => mutate((ws, ctx) => archiveEntity(ws, ctx, "financialRecords", r.id))}
                        className="text-white/30 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Destaque de Mídia Paga */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/60">
            <span>Investimento em Mídia do Cliente (Meta Ads):</span>
            <span className="font-bold text-cyan-400">
              R$ {fin.clientMediaSpent.toLocaleString("pt-BR")} (Isolado)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
