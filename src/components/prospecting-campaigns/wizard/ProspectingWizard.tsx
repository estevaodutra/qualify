import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepSearch, type StepSearchData } from "./StepSearch";
import { StepEnrichment } from "./StepEnrichment";
import { StepDestination, type StepDestinationData } from "./StepDestination";
import { StepConfirm } from "./StepConfirm";
import type { EnrichmentLayerId } from "./enrichmentLayers";
import {
  DEFAULT_QUEUE_POLICY,
  type CreateProspectingInput,
  type ProspectingCampaign,
} from "@/hooks/useProspectingCampaigns";

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
    automationCampaignId: "",
    automationSequenceId: "",
    instanceId: "",
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
        destinationMode: initialData.destinationMode,
        automationCampaignId: initialData.automationCampaignId || "",
        automationSequenceId: initialData.automationSequenceId || "",
        instanceId: initialData.instanceId || "",
        queuePolicy: { ...DEFAULT_QUEUE_POLICY, ...initialData.queuePolicy },
      });
    } else {
      const fresh = emptyState();
      setSearch(fresh.search);
      setLayers(fresh.layers);
      setDestination(fresh.destination);
    }
  }, [open, initialData]);

  const stepLabels = ["Busca", "Enriquecimento", "Destino", "Confirmar"];

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
      automationCampaignId: destination.automationCampaignId || undefined,
      automationSequenceId: destination.automationSequenceId || undefined,
      instanceId: destination.instanceId || undefined,
      queuePolicy: destination.queuePolicy,
    };
    await onCreate(input);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 flex flex-col rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="shrink-0 p-6 pb-4 border-b border-border/40">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nova prospecção</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground/70">
              Encontre empresas, enriqueça os dados e envie os contatos para uma automação.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 mt-4">
            {stepLabels.map((label, idx) => {
              const stepNumber = (idx + 1) as WizardStep;
              const isDone = stepNumber < step;
              const isCurrent = stepNumber === step;
              return (
                <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
                        isCurrent && "bg-primary text-primary-foreground",
                        isDone && "bg-primary/20 text-primary",
                        !isCurrent && !isDone && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : stepNumber}
                    </div>
                    <span className={cn("text-xs font-semibold hidden sm:inline", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                      {label}
                    </span>
                  </div>
                  {idx < stepLabels.length - 1 && <div className="flex-1 h-px bg-border" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-[360px]">
          {step === 1 && (
            <StepSearch
              data={search}
              onChange={(patch) => setSearch((prev) => ({ ...prev, ...patch }))}
              onNext={() => setStep(2)}
              onCancel={() => onOpenChange(false)}
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
                automationCampaignId: destination.automationCampaignId,
                automationSequenceId: destination.automationSequenceId,
                instanceId: destination.instanceId,
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
