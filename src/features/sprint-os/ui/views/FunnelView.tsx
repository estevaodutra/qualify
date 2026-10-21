/**
 * Módulo Comercial: FUNIL X1 (Camada A / Seção 27).
 * Gestão quantitativa de contatos com contadores [-] 0 [+] por etapa:
 * 1. Em Aberto
 * 2. ICP
 * 3. Interessado
 * 4. Follow-Up 24h
 * 5. Follow-Up 72h
 * 6. Follow-Up 7 dias
 * 7. Follow-Up 15 dias
 * 8. Call Agendada
 * 9. Venda Realizada
 * 10. Venda Perdida
 * 11. Lead Frio
 */

import React from "react";
import {
  TrendingUp,
  Minus,
  Plus,
  Users,
  PhoneCall,
  CheckCircle2,
  DollarSign,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { setFunnelCount } from "../../domain/ops";

export const FunnelView: React.FC = () => {
  const { workspace, mutate } = useSprintOSStore();

  if (!workspace) return null;

  const funnelStages = Object.values(workspace.funnel).sort(
    (a, b) => a.position - b.position
  );

  const totalLeads = funnelStages.reduce((sum, s) => sum + s.count, 0);
  const callsAgendadas = workspace.funnel["funnel-8"]?.count ?? 0;
  const vendasRealizadas = workspace.funnel["funnel-9"]?.count ?? 0;
  const conversaoGeral = totalLeads > 0 ? ((vendasRealizadas / totalLeads) * 100).toFixed(1) : "0";

  const handleStepCount = (stageId: string, delta: number) => {
    const current = workspace.funnel[stageId]?.count ?? 0;
    mutate((ws, ctx) => {
      setFunnelCount(ws, ctx, stageId, Math.max(0, current + delta));
    });
  };

  return (
    <div className="space-y-6">
      {/* Topo: KPIs do Funil Comercial */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md">
          <div className="text-xs uppercase font-bold text-white/50 mb-1 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-blue-400" />
            Total de Oportunidades
          </div>
          <div className="text-2xl font-black text-white">{totalLeads}</div>
          <div className="text-[11px] text-white/40 mt-1">Registros nas etapas</div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md">
          <div className="text-xs uppercase font-bold text-white/50 mb-1 flex items-center gap-1.5">
            <PhoneCall className="h-3.5 w-3.5 text-purple-400" />
            Calls Agendadas
          </div>
          <div className="text-2xl font-black text-purple-400">{callsAgendadas}</div>
          <div className="text-[11px] text-white/40 mt-1">Agendamentos pelo SDR</div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md">
          <div className="text-xs uppercase font-bold text-white/50 mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Vendas Fechadas
          </div>
          <div className="text-2xl font-black text-emerald-400">{vendasRealizadas}</div>
          <div className="text-[11px] text-white/40 mt-1">Conversão final</div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md">
          <div className="text-xs uppercase font-bold text-white/50 mb-1 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
            Taxa de Conversão Geral
          </div>
          <div className="text-2xl font-black text-amber-400">{conversaoGeral}%</div>
          <div className="text-[11px] text-white/40 mt-1">Vendas / Total de Leads</div>
        </div>
      </div>

      {/* Grid das 11 Etapas com Contadores Canônicos */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
          <div>
            <h3 className="text-sm font-bold text-white">Etapas do Pipeline Comercial X1</h3>
            <span className="text-xs text-white/50">
              Controle quantitativo e movimentação de volume
            </span>
          </div>
          <Badge variant="outline" className="border-white/10 text-white/60 text-xs">
            11 Etapas Canônicas
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {funnelStages.map((stage) => (
            <div
              key={stage.id}
              className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-xs font-bold text-white truncate">{stage.label}</span>
                </div>
                <span className="text-[10px] text-white/40 font-mono">
                  {totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0}%
                </span>
              </div>

              {/* Contador Quantitativo [-] 0 [+] */}
              <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl p-1.5">
                <button
                  onClick={() => handleStepCount(stage.id, -1)}
                  disabled={stage.count <= 0}
                  className="h-7 w-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-20 transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>

                <span className="font-mono text-base font-black text-white px-2">
                  {stage.count}
                </span>

                <button
                  onClick={() => handleStepCount(stage.id, 1)}
                  className="h-7 w-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
