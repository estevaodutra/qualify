/**
 * Visão Calculadoras Operacionais:
 * - Calculadora de Horas & Capacidade (Seção 18)
 * - Calculadora de Anúncios, ROI & ROAS (Seção 19)
 */

import React, { useState } from "react";
import {
  Calculator,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { sprintTasks } from "../../domain/ops";

export const CalculatorsView: React.FC = () => {
  const { workspace, activeSprintId, updateHoursCalcAction, updateAdsCalcAction } = useSprintOSStore();
  const [activeTab, setActiveTab] = useState<"hours" | "ads">("hours");

  if (!workspace || !activeSprintId) return null;

  const tasks = sprintTasks(workspace, activeSprintId);
  const liveTasksCount = tasks.length;

  // Calculadora de Horas
  const hoursData = workspace.hoursCalculator || {
    taskCount: liveTasksCount || 26,
    avgHoursPerTask: 2.5,
    membersAvailable: 2,
    hoursPerDay: 8,
    businessDays: 10,
    hourlyRate: 50,
  };

  const totalEffortHours = hoursData.taskCount * hoursData.avgHoursPerTask;
  const totalCapacityHours = hoursData.membersAvailable * hoursData.hoursPerDay * hoursData.businessDays;
  const hoursPerMember = hoursData.membersAvailable > 0 ? totalEffortHours / hoursData.membersAvailable : 0;
  const effortSurplus = totalEffortHours - totalCapacityHours;
  const estimatedDays = (hoursData.membersAvailable * hoursData.hoursPerDay) > 0
    ? totalEffortHours / (hoursData.membersAvailable * hoursData.hoursPerDay)
    : 0;
  const estimatedCost = totalEffortHours * hoursData.hourlyRate;

  // Calculadora de Ads
  const adsData = workspace.adsCalculator || {
    dailyBudget: 50,
    campaignDays: 10,
    totalSpent: 500,
    cpl: 5,
    conversionRate: 5,
    avgTicket: 500,
    attributedRevenue: 2500,
    otherCosts: 0,
  };

  const calculatedInvestment = adsData.totalSpent > 0 ? adsData.totalSpent : adsData.dailyBudget * adsData.campaignDays;
  const projectedLeads = adsData.cpl > 0 ? Math.floor(calculatedInvestment / adsData.cpl) : 0;
  const projectedSales = Math.floor(projectedLeads * (adsData.conversionRate / 100));
  const projectedRevenue = projectedSales * adsData.avgTicket;
  const cpa = projectedSales > 0 ? calculatedInvestment / projectedSales : 0;

  const actualRevenue = adsData.attributedRevenue || projectedRevenue;
  const roas = calculatedInvestment > 0 ? actualRevenue / calculatedInvestment : 0;
  const totalCosts = calculatedInvestment + (adsData.otherCosts || 0);
  const roi = totalCosts > 0 ? ((actualRevenue - totalCosts) / totalCosts) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Selector */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-card border border-border shadow-sm w-fit">
        <button
          onClick={() => setActiveTab("hours")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "hours" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ⏱️ Calculadora de Horas & Capacidade
        </button>
        <button
          onClick={() => setActiveTab("ads")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "ads" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          💰 Calculadora Ads, ROI & ROAS
        </button>
      </div>

      {/* TAB 1: Calculadora de Horas */}
      {activeTab === "hours" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs */}
          <div className="lg:col-span-6 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Parâmetros da Operação
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">Tarefas Totais</label>
                <Input
                  type="number"
                  value={hoursData.taskCount}
                  onChange={(e) => updateHoursCalcAction({ taskCount: Number(e.target.value) || 0 })}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Tempo Médio/Tarefa (h)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={hoursData.avgHoursPerTask}
                  onChange={(e) => updateHoursCalcAction({ avgHoursPerTask: Number(e.target.value) || 0 })}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Membros Disponíveis</label>
                <Input
                  type="number"
                  value={hoursData.membersAvailable}
                  onChange={(e) => updateHoursCalcAction({ membersAvailable: Number(e.target.value) || 1 })}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Horas Úteis/Dia</label>
                <Input
                  type="number"
                  value={hoursData.hoursPerDay}
                  onChange={(e) => updateHoursCalcAction({ hoursPerDay: Number(e.target.value) || 8 })}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Dias Úteis da Sprint</label>
                <Input
                  type="number"
                  value={hoursData.businessDays}
                  onChange={(e) => updateHoursCalcAction({ businessDays: Number(e.target.value) || 10 })}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Custo Médio/Hora (R$)</label>
                <Input
                  type="number"
                  value={hoursData.hourlyRate}
                  onChange={(e) => updateHoursCalcAction({ hourlyRate: Number(e.target.value) || 0 })}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Resultados */}
          <div className="lg:col-span-6 p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              Balanço e Estimativa de Capacidade
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-[11px] text-muted-foreground block">Esforço Total Estimado</span>
                <span className="text-xl font-bold text-foreground font-mono">{totalEffortHours.toFixed(1)}h</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-[11px] text-muted-foreground block">Capacidade Total Disponível</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{totalCapacityHours.toFixed(1)}h</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-[11px] text-muted-foreground block">Dias Estimados Necessários</span>
                <span className="text-xl font-bold text-foreground font-mono">{estimatedDays.toFixed(1)} dias</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-[11px] text-muted-foreground block">Saldo de Horas</span>
                <span className={`text-xl font-bold font-mono ${effortSurplus > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {effortSurplus > 0 ? `+${effortSurplus.toFixed(1)}h (Gargalo)` : `${effortSurplus.toFixed(1)}h (Folga)`}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs flex items-center justify-between">
              <span className="text-foreground">Custo Total Projetado de Mão de Obra:</span>
              <span className="font-bold font-mono text-primary text-base">
                R$ {estimatedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Calculadora Ads, ROI & ROAS */}
      {activeTab === "ads" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs */}
          <div className="lg:col-span-6 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Métricas e Orçamento de Mídia
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">Orçamento Diário (R$)</label>
                <Input
                  type="number"
                  value={adsData.dailyBudget}
                  onChange={(e) => updateAdsCalcAction({ dailyBudget: Number(e.target.value) || 0 })}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Dias de Campanha</label>
                <Input
                  type="number"
                  value={adsData.campaignDays}
                  onChange={(e) => updateAdsCalcAction({ campaignDays: Number(e.target.value) || 1 })}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">CPL Médio (R$)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={adsData.cpl}
                  onChange={(e) => updateAdsCalcAction({ cpl: Number(e.target.value) || 1 })}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Taxa de Conversão (%)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={adsData.conversionRate}
                  onChange={(e) => updateAdsCalcAction({ conversionRate: Number(e.target.value) || 0 })}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Ticket Médio (R$)</label>
                <Input
                  type="number"
                  value={adsData.avgTicket}
                  onChange={(e) => updateAdsCalcAction({ avgTicket: Number(e.target.value) || 0 })}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Receita Atribuída (R$)</label>
                <Input
                  type="number"
                  value={adsData.attributedRevenue}
                  onChange={(e) => updateAdsCalcAction({ attributedRevenue: Number(e.target.value) || 0 })}
                  className="h-8 text-xs bg-background border-input text-foreground rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Resultados Projeções vs Reais */}
          <div className="lg:col-span-6 p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Projeções de Performance Comercial
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-[11px] text-muted-foreground block">Leads Projetados</span>
                <span className="text-xl font-bold text-foreground font-mono">{projectedLeads}</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-[11px] text-muted-foreground block">Vendas Projetadas</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{projectedSales}</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-[11px] text-muted-foreground block">CPA Médio</span>
                <span className="text-xl font-bold text-foreground font-mono">
                  R$ {cpa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-[11px] text-muted-foreground block">ROAS Calculado</span>
                <span className="text-xl font-bold text-primary font-mono">{roas.toFixed(2)}x</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
              <span className="text-foreground">Retorno sobre Investimento (ROI):</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-lg">
                {roi > 0 ? `+${roi.toFixed(1)}%` : `${roi.toFixed(1)}%`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
