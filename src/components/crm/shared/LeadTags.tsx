import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LeadTagsProps {
  tags: string[];
  maxVisible?: number;
}

export function LeadTags({ tags, maxVisible = 2 }: LeadTagsProps) {
  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="px-1.5 py-0 text-[10px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          {tag}
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-muted-foreground cursor-help">
                +{hiddenCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col gap-1 text-xs">
                {tags.slice(maxVisible).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
