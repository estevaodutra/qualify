import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StepSearch, type StepSearchData } from "./StepSearch";
import { StepEnrichment } from "./StepEnrichment";
import { StepDestination, type StepDestinationData } from "./StepDestination";
import { StepConfirm } from "./StepConfirm";
import { DEFAULT_QUEUE_POLICY, type CreateProspectingInput, type ProspectingCampaign } from "@/hooks/useProspectingCampaigns";
import type { EnrichmentLayerId } from "./enrichmentLayers";

type WizardStep = 1 | 2 | 3 | 4;

interface ProspectingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateProspectingInput) => Promise<void>;
  isCreating: boolean;
  initialData?: ProspectingCampaign | null;
}

const emptyState = () => ({
  search: { name: "", searchTerms: "", places: "", quantity: "50", category: "", exactNames: false } as StepSearchData,
  layers: ["google_maps"] as EnrichmentLayerId[],
  destination: {
    destinationMode: "save_only",
    automationSequenceId: "",
    pipelineId: "",
    stageId: "",
    queuePolicy: { ...DEFAULT_QUEUE_POLICY },
  } as StepDestinationData,
});

export function ProspectingWizard({ open, onOpenChange, onCreate, isCreating, initialData }: ProspectingWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [search, setSearch] = useState<StepSearchData>(emptyState().search);
  const [layers, setLayers] = useState<EnrichmentLayerId[]>(emptyState().layers);
  const [destination, setDestination] = useState<StepDestinationData>(emptyState().destination);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setConfirmed(false);
    if (initialData) {
      setSearch({
        name: `${initialData.name} (Cópia)`,
        searchTerms: initialData.searchTerms,
        places: initialData.places || "",
        quantity: String(initialData.quantity),
        category: initialData.category || "",
        exactNames: initialData.exactNames,
      });
      setLayers((initialData.enrichmentLayers as EnrichmentLayerId[]) || ["google_maps"]);
      setDestination({
        destinationMode: initialData.destinationMode || "save_only",
        automationSequenceId: initialData.automationSequenceId || "",
        pipelineId: initialData.pipelineId || "",
        stageId: initialData.stageId || "",
        queuePolicy: initialData.queuePolicy ? { ...DEFAULT_QUEUE_POLICY, ...initialData.queuePolicy } : DEFAULT_QUEUE_POLICY,
      });
    } else {
      const fresh = emptyState();
      setSearch(fresh.search);
      setLayers(fresh.layers);
      setDestination(fresh.destination);
    }
  }, [open, initialData]);

  const stepLabels = ["Busca", "Enriquecimento", "Destino & Pipeline", "Confirmar"];

  const handleSubmit = async () => {
    const input: CreateProspectingInput = {
      name: search.name.trim(),
      searchTerms: search.searchTerms.trim(),
      quantity: parseInt(search.quantity, 10) || 50,
      category: search.category.trim() || undefined,
      exactNames: search.exactNames,
      places: search.places.trim() || undefined,
      enrichmentLayers: layers,
      destinationMode: destination.destinationMode,
      automationSequenceId: destination.automationSequenceId || undefined,
      pipelineId: destination.pipelineId || undefined,
      stageId: destination.stageId || undefined,
      queuePolicy: destination.queuePolicy,
    };
    await onCreate(input);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[88vh] max-h-[88vh] p-0 flex flex-col rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="shrink-0 p-6 pb-4 border-b border-border/40">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nova prospecção</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground/70">
              Encontre empresas, separe fixos de WhatsApps e envie direto para a sua pipeline.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 mt-4">
            {stepLabels.map((label, idx) => {
              const s = (idx + 1) as WizardStep;
              const isActive = step === s;
              const isDone = step > s;
              return (
                <div key={label} className="flex-1 flex flex-col gap-1">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isActive ? "bg-primary" : isDone ? "bg-primary/50" : "bg-muted"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isActive ? "text-primary" : isDone ? "text-foreground/70" : "text-muted-foreground/50"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-6 pt-4 flex flex-col min-h-0">
          {step === 1 && (
            <StepSearch
              data={search}
              onChange={(patch) => setSearch((prev) => ({ ...prev, ...patch }))}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <StepEnrichment
              selectedLayers={layers}
              onChange={setLayers}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepDestination
              data={destination}
              onChange={(patch) => setDestination((prev) => ({ ...prev, ...patch }))}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <StepConfirm
              data={{
                searchTerms: search.searchTerms,
                places: search.places,
                quantity: search.quantity,
                enrichmentLayers: layers,
                destinationMode: destination.destinationMode,
                automationSequenceId: destination.automationSequenceId,
                pipelineId: destination.pipelineId,
                stageId: destination.stageId,
                queuePolicy: destination.queuePolicy,
              }}
              confirmed={confirmed}
              onConfirmedChange={setConfirmed}
              onBack={() => setStep(3)}
              onSubmit={handleSubmit}
              isSubmitting={isCreating}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
