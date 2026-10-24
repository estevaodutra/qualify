import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Compass,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Users,
  Target,
  Zap,
  GitBranch,
  Crown,
  MessageSquare,
  Instagram,
  Eye,
  HelpCircle,
  Clock,
} from "lucide-react";
import {
  CriafyStrategyData,
  StrategySectionId,
} from "@/types/criafyStrategy";
import { SectionCalculation } from "@/utils/criafyStrategyDefaults";

interface StrategyOverviewSectionProps {
  strategy: CriafyStrategyData;
  percentage: number;
  completedAreas: number;
  totalAreas: number;
  sectionCalculations: Record<StrategySectionId, SectionCalculation>;
  allIssues: Array<{ section: string; issue: string }>;
  onSelectSection: (section: StrategySectionId) => void;
  onOpenArchetypeModal: () => void;
}

export function StrategyOverviewSection({
  strategy,
  percentage,
  completedAreas,
  totalAreas,
  sectionCalculations,
  allIssues,
  onSelectSection,
  onOpenArchetypeModal,
}: StrategyOverviewSectionProps) {
  // Encontra a primeira seção incompleta para o botão "Continuar Preenchimento"
  const nextIncompleteSection: StrategySectionId = (() => {
    const list: StrategySectionId[] = [
      "audience",
      "problem_desire",
      "promise",
      "method",
      "positioning",
      "communication",
      "profile",
      "references",
    ];
    for (const key of list) {
      if (sectionCalculations[key]?.status !== "COMPLETE") return key;
    }
    return "audience";
  })();

  const formatLastUpdate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return `hoje, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return "recente";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. BLOCO STATUS HORIZONTAL */}
      <Card className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-foreground">
                Progresso Geral da Estratégia
              </span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                {percentage}% completa
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{completedAreas} de {totalAreas} áreas preenchidas</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Última atualização: {formatLastUpdate(strategy.updatedAt)}
              </span>
            </div>

            {/* Barra de progresso discreta */}
            <div className="pt-1 w-full max-w-md">
              <Progress value={percentage} className="h-2 bg-muted/60" />
            </div>
          </div>

          <div className="shrink-0">
            <Button
              type="button"
              onClick={() => onSelectSection(nextIncompleteSection)}
              className="h-9 px-4 text-xs font-semibold gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xs hover:opacity-95"
            >
              <span>Continuar preenchimento</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. BLOCO RESUMO ESTRATÉGICO EXECUTIVO */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm tracking-tight text-foreground">Resumo Estratégico</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectSection("positioning")}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Ver completo
            </Button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {strategy.strategicSummary ||
              strategy.brandContext.whatIs ||
              "Nenhum resumo cadastrado ainda. Preencha os dados de Posicionamento e Público ou importe a Anamnese para gerar a síntese executiva da marca."}
          </p>
        </CardContent>
      </Card>

      {/* 3. BLOCO PONTOS IMPORTANTES / PERSONALIDADE RÁPIDA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Big Idea */}
        <div className="p-4 rounded-2xl border border-border/70 bg-card hover:border-border transition-colors space-y-1.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Big Idea</span>
          <p className="text-xs font-bold text-foreground line-clamp-2">
            {strategy.positioning.bigIdea?.finalBigIdea ? `"${strategy.positioning.bigIdea.finalBigIdea}"` : "Ainda não definida"}
          </p>
          <button
            type="button"
            onClick={() => onSelectSection("positioning")}
            className="text-[11px] text-primary hover:underline text-left font-medium pt-1"
          >
            Ver contexto →
          </button>
        </div>

        {/* Arquétipo */}
        <div className="p-4 rounded-2xl border border-border/70 bg-card hover:border-border transition-colors space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Arquétipo</span>
            <button
              type="button"
              onClick={onOpenArchetypeModal}
              className="text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-0.5"
              title="O que é arquétipo?"
            >
              <HelpCircle className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs font-bold text-foreground truncate">
            {strategy.positioning.archetype?.primary || "Não selecionado"}
            {strategy.positioning.archetype?.secondary ? ` + ${strategy.positioning.archetype.secondary}` : ""}
          </p>
          <button
            type="button"
            onClick={() => onSelectSection("positioning")}
            className="text-[11px] text-primary hover:underline text-left font-medium pt-1"
          >
            Ajustar arquétipo →
          </button>
        </div>

        {/* Tom de Voz */}
        <div className="p-4 rounded-2xl border border-border/70 bg-card hover:border-border transition-colors space-y-1.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tom de Voz</span>
          <p className="text-xs font-bold text-foreground truncate">
            {strategy.communication.toneOfVoice?.length
              ? strategy.communication.toneOfVoice.join(" · ")
              : "Direto · Didático"}
          </p>
          <button
            type="button"
            onClick={() => onSelectSection("communication")}
            className="text-[11px] text-primary hover:underline text-left font-medium pt-1"
          >
            Ver comunicação →
          </button>
        </div>

        {/* CTA Principal */}
        <div className="p-4 rounded-2xl border border-border/70 bg-card hover:border-border transition-colors space-y-1.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CTA Principal</span>
          <p className="text-xs font-bold text-foreground truncate">
            {strategy.communication.ctas?.length ? strategy.communication.ctas[0] : "Comente EU QUERO"}
          </p>
          <button
            type="button"
            onClick={() => onSelectSection("communication")}
            className="text-[11px] text-primary hover:underline text-left font-medium pt-1"
          >
            Ver todas as CTAs →
          </button>
        </div>
      </div>

      {/* 4. BLOCO MAPA DA ESTRATÉGIA (Grid com 8 categorias) */}
      <div className="space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
          Mapa das Categorias Estratégicas
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 01 Público */}
          <CategoryMiniCard
            title="01 Público"
            icon={Users}
            status={sectionCalculations.audience.status}
            preview={strategy.audience.mainAudience || "Público alvo e cliente típico..."}
            onOpen={() => onSelectSection("audience")}
          />

          {/* 02 Problema & Desejo */}
          <CategoryMiniCard
            title="02 Problema & Desejo"
            icon={Target}
            status={sectionCalculations.problem_desire.status}
            preview={strategy.problemDesire.coreProblem || "Dores, conflitos e transformação..."}
            onOpen={() => onSelectSection("problem_desire")}
          />

          {/* 03 Promessa */}
          <CategoryMiniCard
            title="03 Promessa"
            icon={Zap}
            status={sectionCalculations.promise.status}
            preview={strategy.promise.corePromise || "Quem, problema e mecanismo..."}
            onOpen={() => onSelectSection("promise")}
          />

          {/* 04 Método */}
          <CategoryMiniCard
            title="04 Método"
            icon={GitBranch}
            status={sectionCalculations.method.status}
            preview={strategy.method.name || "Jornada do Ponto A ao Ponto B..."}
            onOpen={() => onSelectSection("method")}
          />

          {/* 05 Posicionamento */}
          <CategoryMiniCard
            title="05 Posicionamento"
            icon={Crown}
            status={sectionCalculations.positioning.status}
            preview={strategy.positioning.bigIdea?.finalBigIdea || "Big Idea, arquétipo e movimento..."}
            onOpen={() => onSelectSection("positioning")}
          />

          {/* 06 Comunicação */}
          <CategoryMiniCard
            title="06 Comunicação"
            icon={MessageSquare}
            status={sectionCalculations.communication.status}
            preview={strategy.communication.expertPersonality || "Tom, dialetos e pilares..."}
            onOpen={() => onSelectSection("communication")}
          />

          {/* 07 Perfil */}
          <CategoryMiniCard
            title="07 Perfil"
            icon={Instagram}
            status={sectionCalculations.profile.status}
            preview="Checklist operacional do Instagram..."
            onOpen={() => onSelectSection("profile")}
          />

          {/* 08 Referências */}
          <CategoryMiniCard
            title="08 Referências"
            icon={Sparkles}
            status={sectionCalculations.references.status}
            preview="Concorrentes e regras para IA..."
            onOpen={() => onSelectSection("references")}
          />
        </div>
      </div>

      {/* 5. BLOCO ALERTAS / PENDÊNCIAS (Somente exibido se houver pendências) */}
      {allIssues.length > 0 && (
        <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{allIssues.length} ponto{allIssues.length > 1 ? "s" : ""} precisa{allIssues.length > 1 ? "m" : ""} de atenção</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {allIssues.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/80"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-foreground block text-[11px] truncate">
                      {item.section}
                    </span>
                    <span className="text-muted-foreground text-[11px] block truncate">
                      {item.issue}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const match = Object.entries(sectionCalculations).find(
                        ([, v]) => v.label === item.section
                      );
                      if (match) onSelectSection(match[0] as StrategySectionId);
                    }}
                    className="h-7 px-2 text-[11px] text-primary shrink-0"
                  >
                    Resolver
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CategoryMiniCard({
  title,
  icon: Icon,
  status,
  preview,
  onOpen,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  status: string;
  preview: string;
  onOpen: () => void;
}) {
  const getBadge = () => {
    switch (status) {
      case "COMPLETE":
        return <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">● Completo</span>;
      case "PARTIAL":
        return <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">◐ Parcial</span>;
      default:
        return <span className="text-[10px] text-muted-foreground font-medium">○ Vazio</span>;
    }
  };

  return (
    <div className="p-3.5 rounded-2xl border border-border/70 bg-card hover:border-primary/40 transition-all flex flex-col justify-between space-y-2">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="truncate">{title}</span>
          </div>
          {getBadge()}
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
          {preview}
        </p>
      </div>

      <div className="pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpen}
          className="w-full h-7 text-[11px] rounded-lg border-border/70 hover:bg-muted font-medium"
        >
          Ver seção
        </Button>
      </div>
    </div>
  );
}
