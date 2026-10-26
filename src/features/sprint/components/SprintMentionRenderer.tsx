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

  const mentionPattern = useMemo(() => {
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

    return `@(?:${patterns.join("|")})`;
  }, [members, user]);

  if (!text) return null;

  // Renderiza tokens inline (Negrito *, Itálico _, Tachado ~, Código `, Links https?:// ou www., Menção @)
  const renderInlineTokens = (line: string, keyPrefix: string): React.ReactNode => {
    // Regex para tokens inline seguindo regras do WhatsApp + auto-link
    const tokenRegex = new RegExp(
      `(\`[^\`\\n]+\`)|` +
      `((?:https?:\\/\\/|www\\.)[^\\s<>"'\`]+)|` +
      `(${mentionPattern})|` +
      `(?:(?<=[^\\wÀ-ÿ*]|^)\\*(?!\\s)([^*\\n]+?)(?<!\\s)\\*(?=[^\\wÀ-ÿ*]|$))|` +
      `(?:(?<=[^\\wÀ-ÿ_]|^)_(?!\\s)([^_\\n]+?)(?<!\\s)_(?=[^\\wÀ-ÿ_]|$))|` +
      `(?:(?<=[^\\wÀ-ÿ~]|^)~(?!\s)([^~\\n]+?)(?<!\\s)~(?=[^\\wÀ-ÿ~]|$))`,
      "g"
    );

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let tokenIdx = 0;

    while ((match = tokenRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        elements.push(
          <React.Fragment key={`${keyPrefix}-txt-${tokenIdx++}`}>
            {line.slice(lastIndex, match.index)}
          </React.Fragment>
        );
      }

      if (match[1]) {
        // Código inline: `código`
        elements.push(
          <code
            key={`${keyPrefix}-code-${tokenIdx++}`}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-muted font-mono text-[11px] text-foreground border border-border/60"
          >
            {match[1].slice(1, -1)}
          </code>
        );
      } else if (match[2]) {
        // Link clicável (https://..., http://..., www....)
        let rawUrl = match[2];
        let trailing = "";

        // Remover pontuações finais que normalmente pertencem à frase e não ao link
        while (
          /[.,!?:;>'"]$/.test(rawUrl) ||
          (rawUrl.endsWith(")") && (rawUrl.match(/\(/g) || []).length < (rawUrl.match(/\)/g) || []).length) ||
          (rawUrl.endsWith("]") && (rawUrl.match(/\[/g) || []).length < (rawUrl.match(/\]/g) || []).length)
        ) {
          trailing = rawUrl.slice(-1) + trailing;
          rawUrl = rawUrl.slice(0, -1);
        }

        if (trailing.length > 0) {
          tokenRegex.lastIndex = match.index + rawUrl.length;
        }

        const href = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

        elements.push(
          <a
            key={`${keyPrefix}-link-${tokenIdx++}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2 font-medium transition-colors cursor-pointer break-all"
            title={href}
          >
            {rawUrl}
          </a>
        );
      } else if (match[3]) {
        // Menção: @Nome
        elements.push(
          <span
            key={`${keyPrefix}-men-${tokenIdx++}`}
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md text-[11px] font-medium border transition-colors select-none align-baseline",
              isCompleted
                ? "bg-blue-500/10 text-blue-400/80 border-blue-500/20 line-through opacity-75"
                : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20 shadow-2xs"
            )}
          >
            {match[3]}
          </span>
        );
      } else if (match[4]) {
        // Negrito: *texto*
        elements.push(
          <strong key={`${keyPrefix}-b-${tokenIdx++}`} className="font-bold text-foreground">
            {renderInlineTokens(match[4], `${keyPrefix}-b`)}
          </strong>
        );
      } else if (match[5]) {
        // Itálico: _texto_
        elements.push(
          <em key={`${keyPrefix}-i-${tokenIdx++}`} className="italic">
            {renderInlineTokens(match[5], `${keyPrefix}-i`)}
          </em>
        );
      } else if (match[6]) {
        // Tachado: ~texto~
        elements.push(
          <del key={`${keyPrefix}-s-${tokenIdx++}`} className="line-through opacity-80">
            {renderInlineTokens(match[6], `${keyPrefix}-s`)}
          </del>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      elements.push(
        <React.Fragment key={`${keyPrefix}-txt-end`}>
          {line.slice(lastIndex)}
        </React.Fragment>
      );
    }

    return elements;
  };

  // Se for texto de uma linha só sem blocos estruturais (ex: títulos de cartões ou itens de checklist simples)
  if (!text.includes("\n") && !text.startsWith(">") && !text.startsWith("```")) {
    return (
      <span className={cn("inline leading-normal", className)}>
        {renderInlineTokens(text, "single")}
      </span>
    );
  }

  // Parse de blocos para textos de múltiplas linhas (descrições, comentários, etc.)
  const renderBlocks = () => {
    const blocks: React.ReactNode[] = [];
    const codeBlockRegex = /```([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let blockIdx = 0;

    const processTextChunk = (chunk: string) => {
      const lines = chunk.split("\n");
      let currentQuote: string[] = [];
      let currentBulletList: string[] = [];
      let currentNumberList: { num: string; text: string }[] = [];

      const flushQuote = () => {
        if (currentQuote.length > 0) {
          const qIdx = blockIdx++;
          blocks.push(
            <blockquote
              key={`quote-${qIdx}`}
              className="border-l-3 border-primary/70 bg-primary/5 pl-3 py-1 my-1.5 rounded-r text-xs md:text-sm text-muted-foreground italic space-y-0.5"
            >
              {currentQuote.map((qLine, i) => (
                <div key={i}>{renderInlineTokens(qLine, `q-${qIdx}-${i}`)}</div>
              ))}
            </blockquote>
          );
          currentQuote = [];
        }
      };

      const flushBulletList = () => {
        if (currentBulletList.length > 0) {
          const bIdx = blockIdx++;
          blocks.push(
            <ul key={`blist-${bIdx}`} className="space-y-1 my-1.5 pl-2 text-xs md:text-sm">
              {currentBulletList.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary font-bold select-none leading-relaxed">•</span>
                  <div className="flex-1 leading-relaxed">
                    {renderInlineTokens(item, `bitem-${bIdx}-${i}`)}
                  </div>
                </li>
              ))}
            </ul>
          );
          currentBulletList = [];
        }
      };

      const flushNumberList = () => {
        if (currentNumberList.length > 0) {
          const nIdx = blockIdx++;
          blocks.push(
            <ol key={`nlist-${nIdx}`} className="space-y-1 my-1.5 pl-2 text-xs md:text-sm">
              {currentNumberList.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary font-semibold select-none text-[11px] min-w-4 leading-relaxed">
                    {item.num}.
                  </span>
                  <div className="flex-1 leading-relaxed">
                    {renderInlineTokens(item.text, `nitem-${nIdx}-${i}`)}
                  </div>
                </li>
              ))}
            </ol>
          );
          currentNumberList = [];
        }
      };

      const flushAll = () => {
        flushQuote();
        flushBulletList();
        flushNumberList();
      };

      lines.forEach((line, lIdx) => {
        // Citação do WhatsApp: "> texto"
        const quoteMatch = line.match(/^>\s?(.*)$/);
        if (quoteMatch) {
          flushBulletList();
          flushNumberList();
          currentQuote.push(quoteMatch[1]);
          return;
        }
        flushQuote();

        // Lista com marcadores do WhatsApp: "* item" ou "- item"
        const bulletMatch = line.match(/^[\*\-]\s+(.*)$/);
        if (bulletMatch) {
          flushNumberList();
          currentBulletList.push(bulletMatch[1]);
          return;
        }
        flushBulletList();

        // Lista numerada do WhatsApp: "1. item"
        const numberMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numberMatch) {
          currentNumberList.push({ num: numberMatch[1], text: numberMatch[2] });
          return;
        }
        flushNumberList();

        // Linha comum
        if (line.trim() === "") {
          blocks.push(<div key={`space-${blockIdx++}-${lIdx}`} className="h-2" />);
        } else {
          blocks.push(
            <div key={`line-${blockIdx++}-${lIdx}`} className="min-h-[1.25rem] leading-relaxed">
              {renderInlineTokens(line, `l-${blockIdx}-${lIdx}`)}
            </div>
          );
        }
      });

      flushAll();
    };

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        processTextChunk(text.slice(lastIndex, match.index));
      }
      const cIdx = blockIdx++;
      const codeContent = match[1].replace(/^\n+|\n+$/g, "");
      blocks.push(
        <pre
          key={`code-block-${cIdx}`}
          className="bg-muted/60 text-foreground p-3 rounded-xl font-mono text-xs overflow-x-auto my-2 border border-border/70 shadow-xs"
        >
          <code>{codeContent}</code>
        </pre>
      );
      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      processTextChunk(text.slice(lastIndex));
    }

    return blocks;
  };

  return (
    <div className={cn("leading-relaxed break-words", className)}>
      {renderBlocks()}
    </div>
  );
};
