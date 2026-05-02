import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InlineScriptRunner } from "@/components/call-campaigns/operator/InlineScriptRunner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScriptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  leadId: string;
  campaignName: string;
}

export function ScriptModal({ open, onOpenChange, campaignId, leadId, campaignName }: ScriptModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📋 Roteiro — {campaignName}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <InlineScriptRunner
            campaignId={campaignId}
            leadId={leadId}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
