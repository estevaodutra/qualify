import React from "react";
import {
  StrategySectionId,
  SectionStatus,
} from "@/types/criafyStrategy";
import { SectionCalculation } from "@/utils/criafyStrategyDefaults";
import {
  Compass,
  Users,
  Target,
  Zap,
  GitBranch,
  Crown,
  MessageSquare,
  Instagram,
  Sparkles,
  FileText,
  History,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface StrategySidebarProps {
  activeSection: StrategySectionId;
  onSelectSection: (section: StrategySectionId) => void;
  sectionCalculations: Record<StrategySectionId, SectionCalculation>;
}

interface NavItem {
  id: StrategySectionId;
  label: string;
  number?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_ITEMS: NavItem[] = [
  { id: "overview", label: "Visão Geral", icon: Compass },
  { id: "audience", label: "Público", number: "01", icon: Users },
  { id: "problem_desire", label: "Problema & Desejo", number: "02", icon: Target },
  { id: "promise", label: "Promessa", number: "03", icon: Zap },
  { id: "method", label: "Método", number: "04", icon: GitBranch },
  { id: "positioning", label: "Posicionamento", number: "05", icon: Crown },
  { id: "communication", label: "Comunicação", number: "06", icon: MessageSquare },
  { id: "profile", label: "Perfil", number: "07", icon: Instagram },
  { id: "references", label: "Referências", number: "08", icon: Sparkles },
];

const SECONDARY_ITEMS: NavItem[] = [
  { id: "original_document", label: "Documento original", icon: FileText },
  { id: "history", label: "Histórico", icon: History },
];

export function StrategySidebar({
  activeSection,
  onSelectSection,
  sectionCalculations,
}: StrategySidebarProps) {
  const renderStatusDot = (status: SectionStatus) => {
    switch (status) {
      case "COMPLETE":
        return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Completo" />;
      case "PARTIAL":
        return <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Parcialmente preenchido" />;
      case "NEEDS_REVIEW":
        return <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Revisão necessária" />;
      case "EMPTY":
      default:
        return <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 border border-muted-foreground/40" title="Vazio" />;
    }
  };

  return (
    <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-1 py-1">
      {/* Grupo Principal de Seções Estratégicas */}
      <div className="space-y-0.5">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Navegação Estratégia
        </div>

        {PRIMARY_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          const calc = sectionCalculations[item.id];
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group text-left ${
                isActive
                  ? "bg-primary/10 text-primary font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                <span className="truncate">
                  {item.number && (
                    <span className="font-mono text-[11px] opacity-60 mr-1.5">{item.number}</span>
                  )}
                  {item.label}
                </span>
              </div>

              <div className="shrink-0 pl-2">
                {renderStatusDot(calc?.status || "EMPTY")}
              </div>
            </button>
          );
        })}
      </div>

      {/* Divisor elegante */}
      <div className="my-3 border-t border-border/60 mx-2" />

      {/* Grupo Secundário: Documento Original & Histórico */}
      <div className="space-y-0.5">
        {SECONDARY_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          const calc = sectionCalculations[item.id];
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group text-left ${
                isActive
                  ? "bg-primary/10 text-primary font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="shrink-0 pl-2">
                {renderStatusDot(calc?.status || "EMPTY")}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
