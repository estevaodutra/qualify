import React, { useState, useRef, useEffect, useMemo } from "react";
import { useCompanyMembers, CompanyMember } from "@/hooks/useCompanyMembers";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { UserCheck } from "lucide-react";

interface SprintMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onMentionSelected?: (member: { user_id: string; full_name?: string | null; email?: string | null }) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
}

export const SprintMentionInput: React.FC<SprintMentionInputProps> = ({
  value,
  onChange,
  onKeyDown,
  onMentionSelected,
  placeholder,
  className,
  autoFocus,
  onBlur,
}) => {
  const { user } = useAuth();
  const { data: members = [] } = useCompanyMembers();
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lista consolidada com garantia de presença
  const memberList = useMemo(() => {
    const list: Array<{ id: string; user_id: string; full_name?: string | null; email?: string | null }> = [];

    // Adicionar membros da empresa
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

    // Se o usuário atual não estiver na lista, adiciona ele no topo
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

  // Filtro de membros
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

  // Detecta digitação e o caractere "@"
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

    onKeyDown?.(e);
  };

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setMentionQuery(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleCustomKeyDown}
        onBlur={onBlur}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={cn(
          "w-full bg-background border border-input rounded-md px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all",
          className
        )}
      />

      {/* Menu Suspenso de Menção */}
      {mentionQuery !== null && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-1.5 z-[9999] w-72 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100"
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
