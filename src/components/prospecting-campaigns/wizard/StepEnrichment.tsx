import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, MapPin, Globe, Instagram, FileText, Users } from "lucide-react";
import { ENRICHMENT_LAYERS, type EnrichmentLayerId } from "./enrichmentLayers";

const LAYER_ICONS: Record<EnrichmentLayerId, any> = {
  google_maps: MapPin,
  website: Globe,
  instagram: Instagram,
  cnpj: FileText,
  corporate_structure: Users,
};

interface StepEnrichmentProps {
  selectedLayers: EnrichmentLayerId[];
  onChange: (layers: EnrichmentLayerId[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepEnrichment({ selectedLayers, onChange, onNext, onBack }: StepEnrichmentProps) {
  const toggleLayer = (id: EnrichmentLayerId) => {
    if (selectedLayers.includes(id)) {
      onChange(selectedLayers.filter((l) => l !== id));
    } else {
      onChange([...selectedLayers, id]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 px-1">
        <p className="text-sm text-muted-foreground/80 -mt-1 mb-2">
          Quais informações deseja encontrar?
        </p>
        {ENRICHMENT_LAYERS.map((layer) => {
          const Icon = LAYER_ICONS[layer.id];
          const isAvailable = layer.status === "available";
          const isSelected = selectedLayers.includes(layer.id);

          return (
            <button
              key={layer.id}
              type="button"
              disabled={!isAvailable}
              onClick={() => isAvailable && toggleLayer(layer.id)}
              className={cn(
                "w-full text-left rounded-2xl border p-4 transition-all",
                isAvailable
                  ? "cursor-pointer border-border/40 bg-background/50 hover:border-primary/40"
                  : "cursor-not-allowed opacity-50 border-border/20 bg-muted/20",
                isSelected && isAvailable && "border-primary bg-primary/5 shadow-sm"
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  disabled={!isAvailable}
                  className="mt-1"
                  onCheckedChange={() => isAvailable && toggleLayer(layer.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-bold text-sm">{layer.label}</span>
                    {!isAvailable && (
                      <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider">
                        Em breve
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/70 mb-2">{layer.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {layer.fields.map((field) => (
                      <span
                        key={field}
                        className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground/80"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between gap-2 pt-4 shrink-0">
        <Button type="button" variant="ghost" onClick={onBack} className="rounded-xl font-semibold">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={selectedLayers.length === 0}
          className="rounded-xl gradient-primary glow-primary font-bold shadow-lg min-w-[120px]"
        >
          Continuar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
