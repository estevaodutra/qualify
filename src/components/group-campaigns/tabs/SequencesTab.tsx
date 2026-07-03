import { useNavigate } from "react-router-dom";
import { useSequences, MessageSequence } from "@/hooks/useSequences";
import { SequenceList } from "../sequences/SequenceList";

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
  } = useSequences(campaignId);

  // The canvas now opens in its own fullscreen "Builder Mode" route instead of
  // swapping in-place — see GroupSequenceBuilderPage.tsx.
  const goToBuilder = (sequenceId: string) => {
    navigate(`/campaigns/whatsapp/grupos/${campaignId}/sequences/${sequenceId}/builder`);
  };

  const handleCreate = async (data: {
    name: string;
    description?: string;
    triggerType: string;
  }) => {
    const newSequence = await createSequence(data);
    goToBuilder(newSequence.id);
  };

  const handleEdit = (sequence: MessageSequence) => {
    goToBuilder(sequence.id);
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await updateSequence({ id, updates: { active } });
  };

  return (
    <SequenceList
      sequences={sequences}
      isLoading={isLoading}
      onEdit={handleEdit}
      onCreate={handleCreate}
      onDelete={deleteSequence}
      onToggleActive={handleToggleActive}
      onDuplicate={duplicateSequence}
      isCreating={isCreating}
    />
  );
}
