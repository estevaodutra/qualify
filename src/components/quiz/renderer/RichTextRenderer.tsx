// src/components/quiz/renderer/RichTextRenderer.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { sanitizeQuizHtml } from "@/utils/quiz/quizTextSanitizer";

interface RichTextRendererProps {
  content: string;
  className?: string;
  alignment?: "left" | "center" | "right";
  textColor?: string;
  fontSize?: string;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  content,
  className,
  alignment = "center",
  textColor,
  fontSize,
}) => {
  const sanitizedHtml = sanitizeQuizHtml(content);

  const style: React.CSSProperties = {
    textAlign: alignment,
    color: textColor || "inherit",
    fontSize: fontSize || undefined,
  };

  return (
    <div
      style={style}
      className={cn(
        "prose prose-slate max-w-none dark:prose-invert",
        "prose-h1:text-2xl prose-h1:font-bold prose-h1:my-0.5 prose-h1:leading-tight",
        "prose-h2:text-xl prose-h2:font-bold prose-h2:my-0.5 prose-h2:leading-tight",
        "prose-h3:text-lg prose-h3:font-semibold prose-h3:my-0.5 prose-h3:leading-snug",
        "prose-p:my-0.5 prose-p:leading-snug text-sm",
        "prose-a:text-indigo-600 prose-a:underline hover:prose-a:text-indigo-500",
        "prose-ul:list-disc prose-ul:pl-5 prose-ul:my-0.5",
        "prose-ol:list-decimal prose-ol:pl-5 prose-ol:my-0.5",
        "prose-li:my-0",
        "break-words transition-all",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
