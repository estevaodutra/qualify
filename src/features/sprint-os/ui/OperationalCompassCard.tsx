/**
 * Componente Executivo: 🧭 BÚSSOLA OPERACIONAL (Seção 7).
 * Motor de Diagnóstico de Gargalos.
 * Simplificado e recolhível por padrão:
 * - Mostra: Estado atual, Descrição curta e Próxima ação recomendada.
 * - Expansível sob demanda para ver dados sustentadores.
 */

import React, { useState } from "react";
import {
  Compass,
  AlertCircle,
  Sliders,
  Radio,
  ArrowUpRight,
  BarChart2,
  PackageCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSprintOSStore } from "../state/sprintOsStore";
import { computeOperationalCompass, type BottleneckDiagnostic } from "../metrics/calculations";

const DIAGNOSTIC_CONFIG: Record<
  BottleneckDiagnostic,
  { label: string; color: string; bg: string; icon: any }
> = {
  ESTRUTURAR: { label: "ESTRUTURAR", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30", icon: AlertCircle },
  INTEGRAR: { label: "INTEGRAR", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", icon: Sliders },
  ATIVAR: { label: "ATIVAR", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", icon: Radio },
  ATENDER: { label: "ATENDER", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", icon: ArrowUpRight },
  MEDIR: { label: "MEDIR", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/30", icon: BarChart2 },
  OTIMIZAR: { label: "OTIMIZAR", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30", icon: Sliders },
  ENTREGAR: { label: "ENTREGAR", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: PackageCheck },
};

export const OperationalCompassCard: React.FC = () => {
  const { workspace, activeSprintId } = useSprintOSStore();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!workspace || !activeSprintId) return null;

  const compass = computeOperationalCompass(workspace, activeSprintId);
  const cfg = DIAGNOSTIC_CONFIG[compass.diagnostic] || DIAGNOSTIC_CONFIG.ESTRUTURAR;
  const IconComponent = cfg.icon;

  return (
    <div className="rounded-2xl p-4 bg-card border border-border text-card-foreground shadow-sm transition-all">
      {/* Linha Compacta Principal */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <IconComponent className={`h-3.5 w-3.5 ${cfg.color}`} />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
              Bússola:
            </span>
            <Badge variant="outline" className={`text-[10px] font-black tracking-wider ${cfg.bg} ${cfg.color} shrink-0`}>
              {cfg.label}
            </Badge>
            <span className="text-xs text-foreground/80 truncate hidden md:inline">
              {compass.shortReason}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-xs text-right hidden sm:block">
            <span className="text-muted-foreground text-[11px] mr-1">Próxima ação:</span>
            <span className="text-primary font-bold text-xs">{compass.recommendedAction}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
            title={isExpanded ? "Recolher Bússola" : "Expandir Detalhes"}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Conteúdo Expandido (Sob Demanda) */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2 text-xs text-muted-foreground">
          <p className="leading-relaxed text-foreground/90">{compass.shortReason}</p>
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-[11px] space-y-1">
            <div className="text-muted-foreground font-mono">DADOS QUE SUSTENTAM O DIAGNÓSTICO:</div>
            <div className="text-foreground/80">{compass.supportingData}</div>
          </div>
        </div>
      )}
    </div>
  );
};
