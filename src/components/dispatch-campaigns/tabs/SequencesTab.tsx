import { useState } from "react";
import { useDispatchSequences, DispatchSequence } from "@/hooks/useDispatchSequences";
import { DispatchSequenceList } from "../sequences/DispatchSequenceList";
import { DispatchSequenceBuilder } from "../sequences/DispatchSequenceBuilder";

interface SequencesTabProps {
  campaignId: string;
}

export function SequencesTab({ campaignId }: SequencesTabProps) {
  const [editingSequence, setEditingSequence] = useState<DispatchSequence | null>(null);

  const {
    sequences,
    isLoading,
    createSequence,
    updateSequence,
    deleteSequence,
    duplicateSequence,
    isCreating,
  } = useDispatchSequences(campaignId);

  const handleCreate = async (data: {
    name: string;
    description?: string;
    triggerType: string;
    triggerConfig?: Record<string, unknown>;
  }) => {
    const newSequence = await createSequence(data);
    setEditingSequence(newSequence);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateSequence({ id, updates: { isActive } });
  };

  if (editingSequence) {
    // Bounded height so the canvas fills the available space with no page-level
    // scroll — only this (builder) branch needs it; the list view below stays
    // free to grow naturally with the page.
    return (
      <div className="h-[calc(100vh-230px)] min-h-[560px] overflow-hidden flex flex-col">
        <DispatchSequenceBuilder
          sequence={editingSequence}
          onBack={() => setEditingSequence(null)}
          onUpdate={updateSequence}
        />
      </div>
    );
  }

  return (
    <DispatchSequenceList
      sequences={sequences}
      isLoading={isLoading}
      onEdit={setEditingSequence}
      onCreate={handleCreate}
      onDelete={deleteSequence}
      onToggleActive={handleToggleActive}
      onDuplicate={duplicateSequence}
      isCreating={isCreating}
    />
  );
}
