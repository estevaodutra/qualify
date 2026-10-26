import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { useAuth } from "@/contexts/AuthContext";

interface SprintMentionRendererProps {
  text: string;
  className?: string;
  isCompleted?: boolean;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeCaseInsensitivePattern(str: string): string {
  return str
    .split("")
    .map((c) => {
      if (/[a-zA-ZÀ-ÿ]/.test(c)) {
        return `[${c.toUpperCase()}${c.toLowerCase()}]`;
      }
      return escapeRegExp(c);
    })
    .join("")
    .replace(/\s+/g, "\\s+");
}

export const SprintMentionRenderer: React.FC<SprintMentionRendererProps> = ({
  text,
  className,
  isCompleted,
}) => {
  const { user } = useAuth();
  const { members = [] } = useCompanyMembers();

  const regex = useMemo(() => {
    const namesSet = new Set<string>();

    members.forEach((m) => {
      if (m?.full_name?.trim()) {
        namesSet.add(m.full_name.trim());
      }
      if (m?.email) {
        const prefix = m.email.split("@")[0]?.trim();
        if (prefix) namesSet.add(prefix);
      }
    });

    if (user) {
      const uName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0];
      if (uName?.trim()) namesSet.add(uName.trim());
    }

    // Ordenar por tamanho decrescente para priorizar nomes completos ("Pablo Santana" antes de "Pablo")
    const sorted = Array.from(namesSet)
      .filter((n) => n.length > 0)
      .sort((a, b) => b.length - a.length);

    const patterns: string[] = [];

    if (sorted.length > 0) {
      patterns.push(sorted.map(makeCaseInsensitivePattern).join("|"));
    }

    // Fallback: Nomes compostos com iniciais maiúsculas (ex: @Carlos Silva)
    patterns.push(`[A-ZÀ-Ý][a-zà-ÿ0-9_.-]+(?:\\s+[A-ZÀ-Ý][a-zà-ÿ0-9_.-]+)+`);

    // Fallback: Qualquer palavra única após @ (ex: @pablo ou @usuario)
    patterns.push(`[\\wÀ-ÿ0-9_.-]+`);

    return new RegExp(`(@(?:${patterns.join("|")}))`, "g");
  }, [members, user]);

  if (!text) return null;

  const parts = text.split(regex);

  return (
    <span className={cn("inline leading-normal", className)}>
      {parts.map((part, index) => {
        if (part.startsWith("@") && part.length > 1) {
          return (
            <span
              key={index}
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md text-[11px] font-medium border transition-colors select-none align-baseline",
                isCompleted
                  ? "bg-blue-500/10 text-blue-400/80 border-blue-500/20 line-through opacity-75"
                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20 shadow-2xs"
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
