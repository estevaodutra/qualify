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
    // Bounded height so the canvas fills the available space with no page-level
    // scroll — only this (builder) branch needs it; the list view below stays
    // free to grow naturally with the page.
    return (
      <div className="h-[calc(100vh-230px)] min-h-[560px] overflow-hidden flex flex-col">
        <SequenceBuilder
          sequence={editingSequence}
          onBack={handleBack}
          onUpdate={updateSequence}
        />
      </div>
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
