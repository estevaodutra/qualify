import React from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTagStyles } from "@/hooks/useTagColors";

interface TagBadgeProps {
  tag: string;
  color?: string;
  onRemove?: (e: React.MouseEvent) => void;
  isRemoving?: boolean;
  className?: string;
  maxTextWidth?: string;
}

export function TagBadge({
  tag,
  color = "#8A3CFF",
  onRemove,
  isRemoving = false,
  className,
  maxTextWidth = "max-w-[140px]",
}: TagBadgeProps) {
  const styles = getTagStyles(color);

  return (
    <div
      style={styles}
      className={cn(
        "group/tag relative inline-flex items-center justify-center text-[10px] font-bold border px-2 py-0.5 rounded-md shrink-0 select-none overflow-hidden transition-all duration-150 shadow-none",
        className
      )}
    >
      {/* Texto da tag delimitando a largura natural do conteúdo */}
      <span
        className={cn(
          "truncate leading-tight transition-opacity duration-150",
          maxTextWidth,
          onRemove && "group-hover/tag:opacity-0"
        )}
      >
        {tag}
      </span>

      {/* Xizinho sobrepondo o texto no hover sem alterar a largura */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={isRemoving}
          style={{ color }}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/tag:opacity-100 bg-background/75 backdrop-blur-[1px] hover:bg-destructive/15 hover:!text-destructive transition-all duration-150 cursor-pointer"
          title={`Remover tag "${tag}"`}
        >
          {isRemoving ? (
            <Loader2 className="h-3 w-3 animate-spin text-current" />
          ) : (
            <X className="h-3.5 w-3.5 stroke-[2.5]" />
          )}
        </button>
      )}
    </div>
  );
}
