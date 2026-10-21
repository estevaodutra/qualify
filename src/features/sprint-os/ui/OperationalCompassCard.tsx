/**
 * Componente Executivo: 🧭 BÚSSOLA OPERACIONAL (Seção 28).
 * Motor de Diagnóstico de Gargalos.
 * Identifica em qual dos 7 estados a implementação se encontra:
 * ESTRUTURAR, INTEGRAR, ATIVAR, ATENDER, MEDIR, OTIMIZAR, ENTREGAR.
 * Sempre sustenta a recomendação com base nos dados reais do projeto.
 */

import React from "react";
import {
  Compass,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Sliders,
  Radio,
  BarChart2,
  PackageCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSprintOSStore } from "../state/sprintOsStore";
import { computeOperationalCompass, type BottleneckDiagnostic } from "../metrics/calculations";

const DIAGNOSTIC_CONFIG: Record<
  BottleneckDiagnostic,
  { label: string; color: string; bg: string; icon: any }
> = {
  ESTRUTURAR: {
    label: "ESTRUTURAR",
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/30",
    icon: AlertCircle,
  },
  INTEGRAR: {
    label: "INTEGRAR",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    icon: Sliders,
  },
  ATIVAR: {
    label: "ATIVAR",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/30",
    icon: Radio,
  },
  ATENDER: {
    label: "ATENDER",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
    icon: ArrowUpRight,
  },
  MEDIR: {
    label: "MEDIR",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/30",
    icon: BarChart2,
  },
  OTIMIZAR: {
    label: "OTIMIZAR",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/30",
    icon: ShieldCheck,
  },
  ENTREGAR: {
    label: "ENTREGAR",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    icon: PackageCheck,
  },
};

export const OperationalCompassCard: React.FC = () => {
  const { workspace, activeSprintId } = useSprintOSStore();

  if (!workspace || !activeSprintId) return null;

  const result = computeOperationalCompass(workspace, activeSprintId);
  const cfg = DIAGNOSTIC_CONFIG[result.diagnostic];
  const Icon = cfg.icon;

  return (
    <div className="rounded-2xl p-5 bg-zinc-900/60 border border-white/5 backdrop-blur-md flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-black uppercase tracking-wider text-white/50">
              Bússola Operacional
            </span>
          </div>

          <Badge className={`${cfg.bg} ${cfg.color} border font-black text-[11px] gap-1.5`}>
            <Icon className="h-3 w-3" />
            <span>{cfg.label}</span>
          </Badge>
        </div>

        <h4 className="text-base font-bold text-white mb-1.5">{result.headline}</h4>
        <p className="text-xs text-white/60 leading-relaxed mb-3">{result.rationale}</p>
      </div>

      {/* Dados Sustentadores + Ação */}
      <div className="space-y-2 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-white/40">Dado Sustentador:</span>
          <span className="font-semibold text-white/80">{result.supportingData}</span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-white/40">Ação Recomendada:</span>
          <span className="font-bold text-cyan-300">{result.actionRecommendation}</span>
        </div>
      </div>
    </div>
  );
};
