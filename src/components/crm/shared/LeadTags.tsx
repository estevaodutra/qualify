import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useTagColors, getTagStyles } from "@/hooks/useTagColors";

interface LeadTagsProps {
  tags: string[];
  maxVisible?: number;
}

export function LeadTags({ tags, maxVisible = 2 }: LeadTagsProps) {
  const { getTagColor } = useTagColors();

  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map((tag) => {
        const color = getTagColor(tag);
        const styles = getTagStyles(color);
        return (
          <span
            key={tag}
            style={styles}
            className="inline-flex items-center text-[10px] font-bold border px-1.5 py-0.5 rounded-md leading-tight shrink-0 select-none shadow-none"
          >
            {tag}
          </span>
        );
      })}
      {hiddenCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground cursor-help rounded-md">
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
