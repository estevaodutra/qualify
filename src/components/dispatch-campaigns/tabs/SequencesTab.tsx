import { useNavigate } from "react-router-dom";
import { useDispatchSequences, DispatchSequence } from "@/hooks/useDispatchSequences";
import { DispatchSequenceList } from "../sequences/DispatchSequenceList";

interface SequencesTabProps {
  campaignId: string;
}

export function SequencesTab({ campaignId }: SequencesTabProps) {
  const navigate = useNavigate();

  const {
    sequences,
    isLoading,
    createSequence,
    updateSequence,
    deleteSequence,
    duplicateSequence,
    isCreating,
  } = useDispatchSequences(campaignId);

  // The canvas now opens in its own fullscreen "Builder Mode" route instead of
  // swapping in-place — see DispatchSequenceBuilderPage.tsx.
  const goToBuilder = (sequenceId: string) => {
    navigate(`/campaigns/whatsapp/despacho/${campaignId}/sequences/${sequenceId}/builder`);
  };

  const handleCreate = async (data: {
    name: string;
    description?: string;
    triggerType: string;
    triggerConfig?: Record<string, unknown>;
  }) => {
    const newSequence = await createSequence(data);
    goToBuilder(newSequence.id);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateSequence({ id, updates: { isActive } });
  };

  return (
    <DispatchSequenceList
      sequences={sequences}
      isLoading={isLoading}
      onEdit={(sequence: DispatchSequence) => goToBuilder(sequence.id)}
      onCreate={handleCreate}
      onDelete={deleteSequence}
      onToggleActive={handleToggleActive}
      onDuplicate={duplicateSequence}
      isCreating={isCreating}
    />
  );
}
