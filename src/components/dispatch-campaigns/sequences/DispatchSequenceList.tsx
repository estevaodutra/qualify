import { DispatchSequence } from "@/hooks/useDispatchSequences";
import { UnifiedSequenceList } from "@/components/sequences/UnifiedSequenceList";
import { UnifiedSequenceItem } from "@/components/sequences/shared-types";
import { Rocket, Calendar, Plug, UserPlus, Zap } from "lucide-react";

const TRIGGER_TYPES = [
  { value: "manual", label: "Manual", description: "Disparo manual pelo admin", icon: Rocket },
  { value: "scheduled", label: "Agendado", description: "Disparo em data/hora específica", icon: Calendar },
  { value: "api", label: "Via API", description: "Disparo via API/n8n", icon: Plug },
  { value: "on_add", label: "Ao adicionar contato", description: "Inicia quando contato entra na campanha", icon: UserPlus },
  { value: "action", label: "Acionador por Ação", description: "Dispara quando uma ação específica é executada", icon: Zap },
];

interface DispatchSequenceListProps {
  sequences: DispatchSequence[];
  isLoading: boolean;
  onEdit: (sequence: DispatchSequence) => void;
  onCreate: (data: { name: string; description?: string; triggerType: string; triggerConfig?: Record<string, unknown> }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
  onDuplicate?: (id: string) => Promise<void>;
  isCreating: boolean;
}

const getSequenceItem = (seq: DispatchSequence): UnifiedSequenceItem => ({
  id: seq.id,
  name: seq.name,
  description: seq.description,
  triggerType: seq.triggerType,
  isActive: seq.isActive,
});

export function DispatchSequenceList({ sequences, isLoading, onEdit, onCreate, onDelete, onToggleActive, onDuplicate, isCreating }: DispatchSequenceListProps) {
  return (
    <UnifiedSequenceList<DispatchSequence>
      sequences={sequences}
      isLoading={isLoading}
      onEdit={onEdit}
      onCreate={onCreate}
      onDelete={onDelete}
      onToggleActive={onToggleActive}
      onDuplicate={onDuplicate}
      isCreating={isCreating}
      triggerTypes={TRIGGER_TYPES}
      triggerSelectorType="radio"
      getSequenceItem={getSequenceItem}
    />
  );
}
