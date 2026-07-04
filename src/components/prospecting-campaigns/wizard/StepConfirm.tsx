import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Rocket } from "lucide-react";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { useDispatchSequences } from "@/hooks/useDispatchSequences";
import { useInstances } from "@/hooks/useInstances";
import { ENRICHMENT_LAYERS, type EnrichmentLayerId } from "./enrichmentLayers";
import type { DestinationMode, QueuePolicy } from "@/hooks/useProspectingCampaigns";

const DESTINATION_LABELS: Record<DestinationMode, string> = {
  save_only: "Apenas salvar os leads",
  review_before_start: "Revisar antes de iniciar",
  auto_start: "Iniciar automação automaticamente",
};

interface SummaryData {
  searchTerms: string;
  places: string;
  quantity: string;
  enrichmentLayers: EnrichmentLayerId[];
  destinationMode: DestinationMode;
  automationCampaignId: string;
  automationSequenceId: string;
  instanceId: string;
  queuePolicy: QueuePolicy;
}

interface StepConfirmProps {
  data: SummaryData;
  confirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/20 last:border-0">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export function StepConfirm({ data, confirmed, onConfirmedChange, onBack, onSubmit, isSubmitting }: StepConfirmProps) {
  const { campaigns } = useDispatchCampaigns();
  const { sequences } = useDispatchSequences(data.automationCampaignId || undefined);
  const { instances } = useInstances();

  const automationName = campaigns.find((c) => c.id === data.automationCampaignId)?.name;
  const sequenceName = sequences.find((s) => s.id === data.automationSequenceId)?.name;
  const instanceName = instances.find((i) => i.id === data.instanceId)?.name;
  const layerLabels = data.enrichmentLayers
    .map((id) => ENRICHMENT_LAYERS.find((l) => l.id === id)?.label || id)
    .join(", ");

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-1 px-1">
        <p className="text-sm text-muted-foreground/80 mb-3">Revise as configurações antes de iniciar.</p>

        <SummaryRow label="Termo pesquisado" value={data.searchTerms} />
        <SummaryRow label="Localização" value={data.places || "—"} />
        <SummaryRow label="Quantidade solicitada" value={data.quantity} />
        <SummaryRow label="Camadas selecionadas" value={layerLabels || "—"} />
        <SummaryRow label="Destino dos leads" value={DESTINATION_LABELS[data.destinationMode]} />
        {data.destinationMode !== "save_only" && (
          <>
            <SummaryRow label="Automação" value={automationName ? `${automationName} / ${sequenceName ?? "—"}` : "—"} />
            <SummaryRow label="Instância" value={instanceName || "—"} />
          </>
        )}
        {data.destinationMode === "auto_start" && (
          <>
            <SummaryRow
              label="Intervalo entre contatos"
              value={`${Math.round(data.queuePolicy.delay_min_seconds / 60)} a ${Math.round(data.queuePolicy.delay_max_seconds / 60)} min`}
            />
            <SummaryRow label="Limite diário" value={data.queuePolicy.daily_limit ? String(data.queuePolicy.daily_limit) : "Sem limite"} />
            <SummaryRow
              label="Horário de execução"
              value={`${data.queuePolicy.start_time} às ${data.queuePolicy.end_time} (${data.queuePolicy.timezone})`}
            />
          </>
        )}

        <div className="flex items-center space-x-2 pt-4">
          <Checkbox id="confirmReview" checked={confirmed} onCheckedChange={(c) => onConfirmedChange(c as boolean)} />
          <Label htmlFor="confirmReview" className="text-sm font-medium leading-none">
            Confirmo que revisei as configurações da prospecção.
          </Label>
        </div>
      </div>

      <div className="flex justify-between gap-2 pt-4 shrink-0">
        <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting} className="rounded-xl font-semibold">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!confirmed || isSubmitting}
          className="rounded-xl gradient-primary glow-primary font-bold shadow-lg min-w-[160px]"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <>
              <Rocket className="mr-2 h-4 w-4" /> Iniciar prospecção
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
