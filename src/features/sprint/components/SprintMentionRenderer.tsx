import React from "react";
import { cn } from "@/lib/utils";

interface SprintMentionRendererProps {
  text: string;
  className?: string;
  isCompleted?: boolean;
}

export const SprintMentionRenderer: React.FC<SprintMentionRendererProps> = ({
  text,
  className,
  isCompleted,
}) => {
  if (!text) return null;

  // Separa o texto encontrando palavras que comecem com "@"
  const parts = text.split(/(@[\wÀ-ÿ0-9_.-]+)/g);

  return (
    <span className={cn("inline-block", className)}>
      {parts.map((part, index) => {
        if (part.startsWith("@") && part.length > 1) {
          return (
            <span
              key={index}
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md text-[11px] font-semibold border transition-colors select-none",
                isCompleted
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20 line-through opacity-75"
                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-2xs"
              )}
            >
              {part}
            </span>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};
