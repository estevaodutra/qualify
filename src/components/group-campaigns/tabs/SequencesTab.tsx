import { useState } from "react";
import { useSequences, MessageSequence } from "@/hooks/useSequences";
import { SequenceList } from "../sequences/SequenceList";
import { SequenceBuilder } from "../sequences/SequenceBuilder";

interface SequencesTabProps {
  campaignId: string;
}

export function SequencesTab({ campaignId }: SequencesTabProps) {
  const [editingSequence, setEditingSequence] = useState<MessageSequence | null>(null);
  
  const {
    sequences,
    isLoading,
    createSequence,
    updateSequence,
    deleteSequence,
    duplicateSequence,
    isCreating,
  } = useSequences(campaignId);

  const handleCreate = async (data: {
    name: string;
    description?: string;
    triggerType: string;
  }) => {
    const newSequence = await createSequence(data);
    setEditingSequence(newSequence);
  };

  const handleEdit = (sequence: MessageSequence) => {
    setEditingSequence(sequence);
  };

  const handleBack = () => {
    setEditingSequence(null);
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await updateSequence({ id, updates: { active } });
  };

  if (editingSequence) {
    return (
      <SequenceBuilder
        sequence={editingSequence}
        onBack={handleBack}
        onUpdate={updateSequence}
      />
    );
  }

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
