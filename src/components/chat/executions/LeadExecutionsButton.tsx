import { useState } from "react";
import { Workflow, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeadExecutions } from "@/hooks/useLeadExecutions";
import LeadExecutionsDialog from "./LeadExecutionsDialog";

interface LeadExecutionsButtonProps {
  leadId?: string;
  leadPhone?: string;
  leadName?: string;
  disabled?: boolean;
}

export default function LeadExecutionsButton({
  leadId,
  leadPhone,
  leadName,
  disabled,
}: LeadExecutionsButtonProps) {
  const [open, setOpen] = useState(false);
  const leadExecutions = useLeadExecutions({ leadId, leadPhone });
  const { activeCount, isLoading } = leadExecutions;

  return (
    <>
      <button
        type="button"
        disabled={disabled || (!leadId && !leadPhone)}
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex items-center justify-center h-9 w-9 mb-0.5 rounded-xl transition-all duration-300 shrink-0 cursor-pointer",
          activeCount > 0
            ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 shadow-sm"
            : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent",
          (!leadId && !leadPhone) && "opacity-50 cursor-not-allowed"
        )}
        title={
          activeCount > 0
            ? `Execuções (${activeCount} ativa${activeCount > 1 ? "s" : ""})`
            : "Execuções de workflows do lead"
        }
      >
        <span className="relative flex items-center justify-center">
          <Workflow className="h-4.5 w-4.5 shrink-0" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-background"></span>
            </span>
          )}
        </span>
      </button>

      <LeadExecutionsDialog
        open={open}
        onOpenChange={setOpen}
        leadId={leadId}
        leadPhone={leadPhone}
        leadName={leadName}
        executionsData={leadExecutions}
      />
    </>
  );
}
