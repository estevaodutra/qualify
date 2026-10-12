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
  const { activeCount, isLoading } = useLeadExecutions({ leadId, leadPhone });

  return (
    <>
      <button
        type="button"
        disabled={disabled || (!leadId && !leadPhone)}
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 shrink-0",
          activeCount > 0
            ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 shadow-sm"
            : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent",
          (!leadId && !leadPhone) && "opacity-50 cursor-not-allowed"
        )}
        title={
          activeCount > 0
            ? `${activeCount} execução(ões) ativa(s) para este lead`
            : "Ver execuções de workflows do lead"
        }
      >
        <span className="relative flex items-center justify-center">
          <Workflow className="h-3.5 w-3.5 shrink-0" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </span>

        <span>Execuções</span>

        {activeCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary text-primary-foreground leading-none">
            {activeCount}
          </span>
        )}

        {isLoading && activeCount === 0 && (
          <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground/60 ml-0.5" />
        )}
      </button>

      <LeadExecutionsDialog
        open={open}
        onOpenChange={setOpen}
        leadId={leadId}
        leadPhone={leadPhone}
        leadName={leadName}
      />
    </>
  );
}
