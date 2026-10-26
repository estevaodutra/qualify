import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  UserCheck,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  AtSign,
} from "lucide-react";

interface SprintMentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onMentionSelected?: (member: { user_id: string; full_name?: string | null; email?: string | null }) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  minHeight?: number;
  maxHeight?: number;
  showToolbar?: boolean;
}

export const SprintMentionTextarea: React.FC<SprintMentionTextareaProps> = ({
  value,
  onChange,
  onMentionSelected,
  placeholder,
  className,
  rows = 3,
  minHeight = 84,
  maxHeight = 500,
  showToolbar = true,
}) => {
  const { user } = useAuth();
  const { members = [] } = useCompanyMembers();
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-ajuste de altura da caixa de texto
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const calculatedHeight = Math.max(el.scrollHeight, minHeight);
    el.style.height = `${Math.min(calculatedHeight, maxHeight)}px`;
    if (calculatedHeight > maxHeight) {
      el.style.overflowY = "auto";
    } else {
      el.style.overflowY = "hidden";
    }
  }, [minHeight, maxHeight]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Lista consolidada com garantia de presença
  const memberList = useMemo(() => {
    const list: Array<{ id: string; user_id: string; full_name?: string | null; email?: string | null }> = [];

    members.forEach((m) => {
      if (m && m.is_active !== false) {
        list.push({
          id: m.id || m.user_id,
          user_id: m.user_id,
          full_name: m.full_name || m.email?.split("@")[0] || "Membro",
          email: m.email || null,
        });
      }
    });

    if (user && !list.some((m) => m.user_id === user.id)) {
      list.unshift({
        id: user.id,
        user_id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Você",
        email: user.email || null,
      });
    }

    return list;
  }, [members, user]);

  const filteredMembers = useMemo(() => {
    if (mentionQuery === null) return [];
    if (!mentionQuery.trim()) return memberList;

    const q = mentionQuery.toLowerCase();
    return memberList.filter((m) => {
      const name = (m.full_name || "").toLowerCase();
      const email = (m.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [mentionQuery, memberList]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    const cursor = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
      if (/\s/.test(charBeforeAt) || lastAtIndex === 0) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!/\s/.test(query)) {
          setMentionQuery(query);
          setMentionIndex(lastAtIndex);
          setSelectedIndex(0);
          return;
        }
      }
    }

    setMentionQuery(null);
  };

  const selectMember = (member: { user_id: string; full_name?: string | null; email?: string | null }) => {
    if (mentionIndex === null) return;
    const displayName = member.full_name || member.email?.split("@")[0] || "membro";
    const before = value.slice(0, mentionIndex);
    const after = value.slice(mentionIndex + 1 + (mentionQuery?.length || 0));
    const newValue = `${before}@${displayName} ${after}`;

    onChange(newValue);
    setMentionQuery(null);
    onMentionSelected?.(member);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextPos = before.length + displayName.length + 2;
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 50);
  };

  // Inserção rápida de formatação WhatsApp
  const applyFormatting = (prefix: string, suffix: string = "", defaultText: string = "") => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const textToWrap = selected || defaultText;

    const before = value.slice(0, start);
    const after = value.slice(end);

    // Se for bloco ou lista, garante que comece em nova linha se necessário
    let finalPrefix = prefix;
    if ((prefix === "> " || prefix === "- " || prefix === "1. ") && start > 0 && value[start - 1] !== "\n") {
      finalPrefix = "\n" + prefix;
    }

    const nextVal = `${before}${finalPrefix}${textToWrap}${suffix}${after}`;
    onChange(nextVal);

    setTimeout(() => {
      el.focus();
      const cursorStart = before.length + finalPrefix.length;
      const cursorEnd = cursorStart + textToWrap.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    }, 50);
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMember(filteredMembers[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setMentionQuery(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full space-y-1.5">
      {/* Barra de Formatação WhatsApp */}
      {showToolbar && (
        <div className="flex items-center justify-between flex-wrap gap-1 px-2 py-1 bg-muted/40 border border-border/60 rounded-t-lg text-xs">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => applyFormatting("*", "*", "texto")}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Negrito: *texto*"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting("_", "_", "texto")}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Itálico: _texto_"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting("~", "~", "texto")}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Tachado: ~texto~"
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </button>
            <div className="h-3 w-[1px] bg-border mx-1" />
            <button
              type="button"
              onClick={() => applyFormatting("`", "`", "código")}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-mono text-[11px]"
              title="Código inline: `código`"
            >
              <Code className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting("```\n", "\n```", "bloco")}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-mono text-[10px] px-1 font-semibold"
              title="Monoespaçado: ```bloco```"
            >
              {"{ }"}
            </button>
            <div className="h-3 w-[1px] bg-border mx-1" />
            <button
              type="button"
              onClick={() => applyFormatting("> ", "", "citação")}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Citação: > texto"
            >
              <Quote className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting("- ", "", "item")}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Lista com marcadores: - item"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting("1. ", "", "item")}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Lista numerada: 1. item"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
            <div className="h-3 w-[1px] bg-border mx-1" />
            <button
              type="button"
              onClick={() => {
                applyFormatting("@", "", "");
                setMentionQuery("");
                setSelectedIndex(0);
              }}
              className="p-1 rounded hover:bg-muted text-primary hover:text-primary/80 transition-colors"
              title="Mencionar membro (@)"
            >
              <AtSign className="h-3.5 w-3.5" />
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            Formatação estilo WhatsApp (*negrito*, _itálico_, ~tachado~)
          </span>
        </div>
      )}

      {/* Caixa de Texto Autoajustável */}
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleCustomKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full bg-background border border-input rounded-lg px-3 py-2 text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none leading-relaxed",
          showToolbar && "rounded-t-none border-t-0 -mt-1.5",
          className
        )}
      />

      {/* Menu Suspenso de Menções */}
      {mentionQuery !== null && (
        <div
          ref={dropdownRef}
          className="absolute left-0 bottom-full mb-1.5 z-[9999] w-72 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border/50 mb-1">
            <span className="flex items-center gap-1.5">
              <UserCheck className="h-3 w-3 text-primary" />
              <span>Mencionar Membro</span>
            </span>
            <span>{filteredMembers.length} disponível(is)</span>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              Nenhum membro encontrado para "{mentionQuery}"
            </div>
          ) : (
            filteredMembers.map((member, idx) => {
              const isSelected = idx === selectedIndex;
              const name = member.full_name || member.email || "Sem nome";
              const initials = name.slice(0, 2).toUpperCase();

              return (
                <button
                  key={member.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectMember(member);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <Avatar className="h-6 w-6 text-[10px] border border-border shrink-0">
                    <AvatarFallback className={cn("font-bold text-[9px]", isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="truncate flex-1 min-w-0">
                    <p className="font-medium truncate leading-tight">{name}</p>
                    {member.email && (
                      <p className={cn("text-[10px] truncate leading-tight", isSelected ? "opacity-85" : "text-muted-foreground")}>
                        {member.email}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
