import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSequences } from "@/hooks/useSequences";
import { SequenceBuilder } from "@/components/group-campaigns/sequences/SequenceBuilder";

// Dedicated, fullscreen "Builder Mode" route — deliberately rendered outside
// AppLayout (no sidebar/header/breadcrumb/tabs) so the canvas gets the whole
// viewport. See the sibling /call/script/:campaignId/:leadId route in App.tsx
// for the existing precedent this follows.
export default function GroupSequenceBuilderPage() {
  const { campaignId, sequenceId } = useParams<{ campaignId: string; sequenceId: string }>();
  const navigate = useNavigate();
  const { sequences, isLoading, updateSequence } = useSequences(campaignId);

  const sequence = sequences.find(s => s.id === sequenceId);
  const handleBack = () => navigate("/campaigns/whatsapp/grupos");

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden flex flex-col bg-[#F8F9FC] p-3">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : sequence ? (
        <SequenceBuilder sequence={sequence} onBack={handleBack} onUpdate={updateSequence} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          Sequência não encontrada.
        </div>
      )}
    </div>
  );
}
