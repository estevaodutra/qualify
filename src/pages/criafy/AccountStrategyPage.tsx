import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { criafyService } from "@/services/criafy/criafyService";
import { CriafyInstagramAccount } from "@/types/criafy";
import {
  CriafyStrategyData,
  StrategySectionId,
} from "@/types/criafyStrategy";
import {
  createEmptyStrategy,
  calculateStrategyCompleteness,
} from "@/utils/criafyStrategyDefaults";
import { StrategyHeader } from "@/components/criafy/strategy/StrategyHeader";
import { StrategySidebar } from "@/components/criafy/strategy/StrategySidebar";
import { StrategyStickyFooter } from "@/components/criafy/strategy/StrategyStickyFooter";
import { StrategyOverviewSection } from "@/components/criafy/strategy/sections/StrategyOverviewSection";
import { StrategyAudienceSection } from "@/components/criafy/strategy/sections/StrategyAudienceSection";
import { StrategyProblemDesireSection } from "@/components/criafy/strategy/sections/StrategyProblemDesireSection";
import { StrategyPromiseSection } from "@/components/criafy/strategy/sections/StrategyPromiseSection";
import { StrategyMethodSection } from "@/components/criafy/strategy/sections/StrategyMethodSection";
import { StrategyPositioningSection } from "@/components/criafy/strategy/sections/StrategyPositioningSection";
import { StrategyCommunicationSection } from "@/components/criafy/strategy/sections/StrategyCommunicationSection";
import { StrategyProfileSection } from "@/components/criafy/strategy/sections/StrategyProfileSection";
import { StrategyReferencesSection } from "@/components/criafy/strategy/sections/StrategyReferencesSection";
import { StrategyOriginalDocumentSection } from "@/components/criafy/strategy/sections/StrategyOriginalDocumentSection";
import { StrategyHistorySection } from "@/components/criafy/strategy/sections/StrategyHistorySection";
import { ImportAnamneseModal } from "@/components/criafy/strategy/modals/ImportAnamneseModal";
import { ArchetypeInfoModal } from "@/components/criafy/strategy/modals/ArchetypeInfoModal";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AccountStrategyPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { activeCompanyId } = useCompany();

  const [account, setAccount] = useState<CriafyInstagramAccount | null>(null);
  const [strategy, setStrategy] = useState<CriafyStrategyData | null>(null);
  const [editableStrategy, setEditableStrategy] = useState<CriafyStrategyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<StrategySectionId>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [archetypeModalOpen, setArchetypeModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [accountId, activeCompanyId]);

  const loadData = async () => {
    if (!accountId || !activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const accounts = await criafyService.getAccounts(activeCompanyId);
      const found = accounts.find((a) => a.id === accountId);
      if (!found) {
        throw new Error("Conta não encontrada ou não pertence a esta empresa.");
      }
      setAccount(found);

      const strat = await criafyService.getAccountStrategy(accountId, activeCompanyId);
      setStrategy(strat);
      setEditableStrategy(JSON.parse(JSON.stringify(strat)));
    } catch (err: any) {
      console.error("[AccountStrategyPage] Erro ao carregar dados:", err);
      setError(err.message || "Erro ao carregar estratégia.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editableStrategy) return;
    setIsSaving(true);
    try {
      // Adiciona entrada no histórico
      const updatedHistory = [
        {
          id: `edit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: "Estratégia atualizada manualmente",
          author: "Usuário",
          description: "Alterações salvas no painel estratégico.",
        },
        ...(editableStrategy.history || []),
      ];

      const toSave: CriafyStrategyData = {
        ...editableStrategy,
        history: updatedHistory,
      };

      const saved = await criafyService.saveAccountStrategy(toSave);
      setStrategy(saved);
      setEditableStrategy(JSON.parse(JSON.stringify(saved)));
      setIsEditing(false);
      toast.success("Estratégia salva com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar estratégia: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (strategy) {
      setEditableStrategy(JSON.parse(JSON.stringify(strategy)));
    }
    setIsEditing(false);
    toast.info("Edição cancelada.");
  };

  const handleConfirmImport = async (imported: CriafyStrategyData) => {
    const saved = await criafyService.saveAccountStrategy(imported);
    setStrategy(saved);
    setEditableStrategy(JSON.parse(JSON.stringify(saved)));
    setActiveSection("overview");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Carregando Central Estratégica da conta...</p>
      </div>
    );
  }

  if (error || !account || !editableStrategy) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-3 rounded-full bg-rose-500/10 text-rose-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-foreground">Não foi possível carregar a Estratégia</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          {error || "Conta não encontrada."}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/criafy")} className="gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Contas
          </Button>
          <Button size="sm" onClick={loadData} className="text-xs">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const { percentage, completedAreas, totalAreas, sections, allIssues } =
    calculateStrategyCompleteness(editableStrategy);

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      {/* 1. CABEÇALHO FIXO DA CONTA & AÇÕES */}
      <StrategyHeader
        account={account}
        strategy={editableStrategy}
        percentage={percentage}
        completedAreas={completedAreas}
        totalAreas={totalAreas}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(!isEditing)}
        onOpenImport={() => setImportModalOpen(true)}
      />

      {/* 2. LAYOUT DESKTOP/MOBILE (SIDEBAR INTERNA + CONTEÚDO) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Sidebar Interna da Estratégia */}
          <StrategySidebar
            activeSection={activeSection}
            onSelectSection={(sec) => setActiveSection(sec)}
            sectionCalculations={sections}
          />

          {/* Área de Conteúdo da Seção Ativa */}
          <div className="flex-1 w-full min-w-0">
            {activeSection === "overview" && (
              <StrategyOverviewSection
                strategy={editableStrategy}
                percentage={percentage}
                completedAreas={completedAreas}
                totalAreas={totalAreas}
                sectionCalculations={sections}
                allIssues={allIssues}
                onSelectSection={(sec) => setActiveSection(sec)}
                onOpenArchetypeModal={() => setArchetypeModalOpen(true)}
              />
            )}

            {activeSection === "audience" && (
              <StrategyAudienceSection
                audience={editableStrategy.audience}
                isEditing={isEditing}
                onChange={(aud) => setEditableStrategy({ ...editableStrategy, audience: aud })}
              />
            )}

            {activeSection === "problem_desire" && (
              <StrategyProblemDesireSection
                problemDesire={editableStrategy.problemDesire}
                isEditing={isEditing}
                onChange={(pd) => setEditableStrategy({ ...editableStrategy, problemDesire: pd })}
              />
            )}

            {activeSection === "promise" && (
              <StrategyPromiseSection
                promise={editableStrategy.promise}
                isEditing={isEditing}
                onChange={(prom) => setEditableStrategy({ ...editableStrategy, promise: prom })}
              />
            )}

            {activeSection === "method" && (
              <StrategyMethodSection
                method={editableStrategy.method}
                isEditing={isEditing}
                onChange={(meth) => setEditableStrategy({ ...editableStrategy, method: meth })}
              />
            )}

            {activeSection === "positioning" && (
              <StrategyPositioningSection
                positioning={editableStrategy.positioning}
                isEditing={isEditing}
                onChange={(pos) => setEditableStrategy({ ...editableStrategy, positioning: pos })}
                onOpenArchetypeModal={() => setArchetypeModalOpen(true)}
              />
            )}

            {activeSection === "communication" && (
              <StrategyCommunicationSection
                communication={editableStrategy.communication}
                isEditing={isEditing}
                onChange={(com) => setEditableStrategy({ ...editableStrategy, communication: com })}
              />
            )}

            {activeSection === "profile" && (
              <StrategyProfileSection
                profile={editableStrategy.profile}
                isEditing={isEditing}
                onChange={(prof) => setEditableStrategy({ ...editableStrategy, profile: prof })}
              />
            )}

            {activeSection === "references" && (
              <StrategyReferencesSection
                references={editableStrategy.references}
                isEditing={isEditing}
                onChange={(ref) => setEditableStrategy({ ...editableStrategy, references: ref })}
              />
            )}

            {activeSection === "original_document" && (
              <StrategyOriginalDocumentSection
                originalDocument={editableStrategy.originalDocument}
                onOpenImport={() => setImportModalOpen(true)}
              />
            )}

            {activeSection === "history" && (
              <StrategyHistorySection
                history={editableStrategy.history || []}
                version={editableStrategy.version || "v1"}
              />
            )}
          </div>
        </div>
      </main>

      {/* 3. STICKY FOOTER DE EDIÇÃO (QUANDO IS_EDITING = TRUE) */}
      {isEditing && (
        <StrategyStickyFooter
          isSaving={isSaving}
          onSave={handleSave}
          onCancel={handleCancelEdit}
        />
      )}

      {/* 4. MODAL DE IMPORTAÇÃO DE ANAMNESE */}
      <ImportAnamneseModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        currentStrategy={editableStrategy}
        onConfirmImport={handleConfirmImport}
      />

      {/* 5. MODAL EXPLICATIVO DE ARQUÉTIPOS */}
      <ArchetypeInfoModal
        open={archetypeModalOpen}
        onOpenChange={setArchetypeModalOpen}
      />
    </div>
  );
}
