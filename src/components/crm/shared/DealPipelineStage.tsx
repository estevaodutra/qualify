import { cn } from "@/lib/utils";

interface DealPipelineStageProps {
  stageName: string | null;
  stageColor?: string | null;
  className?: string;
}

export function DealPipelineStage({ stageName, stageColor, className }: DealPipelineStageProps) {
  if (!stageName) return null;
  
  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-medium", className)}>
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: stageColor || "#94a3b8" }}
      />
      <span className="truncate max-w-[120px] text-muted-foreground">{stageName}</span>
    </div>
  );
}
