import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { STAGES, getStageIndex } from "@/lib/prospecting-status";
import type { ProspectingStatus } from "@/hooks/useProspectingCampaigns";

interface StageProgressBarProps {
  status: ProspectingStatus;
}

export function StageProgressBar({ status }: StageProgressBarProps) {
  const isError = status === "failed" || status === "cancelled";
  const isPaused = status === "paused";
  const isFinal = status === "completed" || status === "partially_completed";
  const currentIndex = isFinal ? STAGES.length - 1 : getStageIndex(status);

  return (
    <div className="flex items-center gap-1.5">
      {STAGES.map((stage, idx) => {
        const isDone = isFinal || idx < currentIndex;
        const isCurrent = !isFinal && idx === currentIndex;
        const isFrozenHere = (isError || isPaused) && idx === Math.max(currentIndex, 0);

        return (
          <div key={stage.key} className="flex items-center gap-1.5 flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 min-w-[64px]">
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border",
                  isDone && !isFrozenHere && "bg-success/15 text-success border-success/30",
                  isCurrent && !isFrozenHere && "bg-primary text-primary-foreground border-primary animate-pulse",
                  isFrozenHere && isError && "bg-destructive/15 text-destructive border-destructive/30",
                  isFrozenHere && isPaused && "bg-warning/15 text-warning border-warning/30",
                  !isDone && !isCurrent && !isFrozenHere && "bg-muted text-muted-foreground border-border/40"
                )}
              >
                {isDone && !isFrozenHere ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 text-center">
                {stage.label}
              </span>
            </div>
            {idx < STAGES.length - 1 && (
              <div className={cn("flex-1 h-px", isDone ? "bg-success/40" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
