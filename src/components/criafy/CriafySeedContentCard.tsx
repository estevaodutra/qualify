import React, { useState, useEffect } from "react";
import {
  Rocket,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  BookOpen,
  Film,
  FileText,
  AlertCircle,
  Loader2,
  ChevronRight,
  Layers,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  CriafySeedContentService,
  SEED_CAMPAIGN_NAME,
} from "@/services/criafy/criafySeedContentService";
import {
  CriafyInstagramAccount,
  CriafySeedProgress,
  CriafySeedPrerequisites,
  CriafySeedStatus,
} from "@/types/criafy";

interface CriafySeedContentCardProps {
  companyId: string;
  selectedAccountId?: string;
  accounts: CriafyInstagramAccount[];
  onNavigateTab: (tabId: string) => void;
  onOpenAddAccount?: () => void;
  onRefreshData?: () => void;
}

export const CriafySeedContentCard: React.FC<CriafySeedContentCardProps> = ({
  companyId,
  selectedAccountId = "all",
  accounts,
  onNavigateTab,
  onOpenAddAccount,
  onRefreshData,
}) => {
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [progress, setProgress] = useState<CriafySeedProgress | null>(null);
  const [prereqs, setPrereqs] = useState<CriafySeedPrerequisites | null>(null);

  // Resolver conta ativa
  const targetAccountId =
    selectedAccountId && selectedAccountId !== "all"
      ? selectedAccountId
      : accounts.length > 0
      ? accounts[0].id
      : "";

  const activeAccount = accounts.find((a) => a.id === targetAccountId);

  useEffect(() => {
    if (!companyId || !targetAccountId) {
      setLoading(false);
      return;
    }
    loadSeedStatus();
  }, [companyId, targetAccountId]);

  const loadSeedStatus = async () => {
    setLoading(true);
    try {
      const [prog, pre] = await Promise.all([
        CriafySeedContentService.calculateProgress(companyId, targetAccountId),
        CriafySeedContentService.checkPrerequisites(companyId, targetAccountId),
      ]);
      setProgress(prog);
      setPrereqs(pre);
      // Sincronizar ativação em background se status tiver mudado
      CriafySeedContentService.syncActivationStatus(companyId, targetAccountId).catch(() => {});
    } catch (err) {
      console.warn("[SeedCard] Erro ao carregar status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSeedContent = async () => {
    if (!companyId || !targetAccountId) {
      toast.error("Selecione uma conta do Instagram para iniciar.");
      return;
    }

    if (prereqs && !prereqs.canStart) {
      toast.error(prereqs.missingReasons[0] || "Pré-requisitos pendentes.");
      onNavigateTab("manual-marca");
      return;
    }

    setStarting(true);
    try {
      const result = await CriafySeedContentService.startSeedContent(
        companyId,
        targetAccountId
      );
      toast.success(
        "Conteúdo Semente criado com sucesso! 5 itens adicionados ao Planner e tarefas geradas."
      );
      await loadSeedStatus();
      if (onRefreshData) onRefreshData();
      onNavigateTab("planner");
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar Conteúdo Semente.");
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardContent className="p-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Verificando ativação da conta...</span>
        </CardContent>
      </Card>
    );
  }

  // Sem contas conectadas
  if (accounts.length === 0) {
    return null;
  }

  const status: CriafySeedStatus = progress?.status || "not_started";
  const completedCount = progress?.completed || 0;
  const totalCount = progress?.total || 5;

  // ============================================================
  // ESTADO 1: COMPLETED (Discreto, não ocupa o centro da tela)
  // ============================================================
  if (status === "completed") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground flex items-center gap-2">
              <span>Conteúdo Semente concluído</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-[10px]">
                5/5 publicado
              </Badge>
            </div>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              O posicionamento inicial da conta @{activeAccount?.username || ""} foi estabelecido com sucesso.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => onNavigateTab("planner")}
          >
            <Layers className="h-3.5 w-3.5" /> Ver no Planner
          </Button>
          <Button
            size="sm"
            variant="default"
            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onNavigateTab("conteudos")}
          >
            Ver Conteúdos <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // ESTADO 2: EM PRODUÇÃO OU GERADO (Progress Card)
  // ============================================================
  if (status === "generated" || status === "in_production") {
    return (
      <Card className="border-emerald-500/30 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-sm overflow-hidden">
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[11px] font-medium">
                  {status === "in_production" ? "Em Produção" : "Gerado"}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  @{activeAccount?.username || ""}
                </span>
              </div>
              <h3 className="text-lg font-bold tracking-tight text-foreground mt-1">
                Conteúdo Semente em Andamento
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                5 peças estratégicas criadas para firmar seu posicionamento e método no feed.
              </p>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-foreground">
                {completedCount} <span className="text-muted-foreground text-sm font-normal">/ {totalCount}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">conteúdos prontos</span>
            </div>
          </div>

          {/* Barra de Progresso Simples */}
          <div className="space-y-1.5">
            <Progress value={(completedCount / totalCount) * 100} className="h-2" />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{Math.round((completedCount / totalCount) * 100)}% concluído</span>
              <span>Faltam {totalCount - completedCount} peças</span>
            </div>
          </div>

          {/* Lista das 5 Peças */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1 text-xs">
            {progress?.items.map((item, idx) => {
              const isReady =
                item.status === "pronto" ||
                item.status === "agendado" ||
                item.status === "publicado";
              const inProd =
                item.status === "roteirizado" ||
                item.status === "aguardando_gravacao" ||
                item.status === "em_edicao";

              return (
                <div
                  key={item.id || idx}
                  className={`p-3 rounded-lg border flex flex-col justify-between space-y-2 transition-all ${
                    isReady
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                      : inProd
                      ? "bg-amber-500/5 border-amber-500/30 text-amber-900 dark:text-amber-200"
                      : "bg-muted/40 border-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground">
                      {item.format}
                    </span>
                    {isReady ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : inProd ? (
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-xs line-clamp-1">{item.theme}</div>
                    <div className="text-[10px] text-muted-foreground capitalize mt-0.5">
                      {item.status.replace(/_/g, " ")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA de Ação */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t">
            <span className="text-xs text-muted-foreground">
              Acompanhe o fluxo nas abas do Planner e Central de Demandas.
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs h-9"
                onClick={() => onNavigateTab("demandas")}
              >
                Ver Demandas
              </Button>
              <Button
                size="sm"
                className="w-full sm:w-auto text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => onNavigateTab("planner")}
              >
                Continuar Produção <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // ESTADO 3: PRÉ-REQUISITOS PENDENTES (Falta Manual da Marca)
  // ============================================================
  if (prereqs && !prereqs.canStart) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">
                  Complete as informações estratégicas da sua marca
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
                  Antes de criar seu Conteúdo Semente, preencha o Manual da Marca ou o Briefing da conta
                  para que as pautas sejam personalizadas para a sua voz e método.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              className="text-xs gap-1.5 shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => onNavigateTab("manual-marca")}
            >
              <BookOpen className="h-3.5 w-3.5" /> Completar Manual da Marca
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // ESTADO 4: NOT_STARTED (CARD GRANDE DE ONBOARDING - Regra #3)
  // ============================================================
  return (
    <Card className="border-emerald-500/30 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-md overflow-hidden">
      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-xs font-semibold px-2.5 py-0.5">
              Marco Zero da Conta
            </Badge>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground pt-1">
              Comece sua jornada na Criafy
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed pt-1">
              Sua estratégia está pronta. Agora vamos transformar isso nos primeiros conteúdos
              que vão estabelecer o posicionamento da sua marca no Instagram.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">Conta ativa:</span>
            <Badge variant="secondary" className="font-mono text-xs">
              @{activeAccount?.username || "conta"}
            </Badge>
          </div>
        </div>

        {/* O Pacote Conteúdo Semente (5 Peças) */}
        <div className="p-5 rounded-xl border bg-muted/30 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pacote Inicial: Conteúdo Semente (5 peças)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-background border shadow-2xs">
              <div className="h-7 w-7 rounded-md bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <Film className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-foreground">1 Reel sobre seu método</div>
                <div className="text-[11px] text-muted-foreground">Retenção e autoridade</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-background border shadow-2xs">
              <div className="h-7 w-7 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-foreground">1 Destaque estratégico</div>
                <div className="text-[11px] text-muted-foreground">Fixação de posicionamento</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-background border shadow-2xs">
              <div className="h-7 w-7 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-foreground">3 Posts estáticos</div>
                <div className="text-[11px] text-muted-foreground">Manifesto, Visão e Solução</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stepper da Jornada */}
        <div className="p-3 bg-muted/40 rounded-lg flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
          <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> 1. Estratégia
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 hidden sm:block" />
          <div className="flex items-center gap-1.5 font-bold text-foreground bg-background px-2.5 py-1 rounded border shadow-2xs">
            <Rocket className="h-3.5 w-3.5 text-emerald-600" /> 2. Conteúdo Semente
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> 3. Produção
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> 4. Publicação
          </div>
        </div>

        {/* Botão de Início */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Ao iniciar, os 5 conteúdos serão organizados no seu Planner com tarefas para a equipe.
          </p>

          <Button
            size="lg"
            className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm"
            onClick={handleStartSeedContent}
            disabled={starting}
          >
            {starting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando Conteúdo Semente...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" /> Começar Conteúdo Semente
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
