import React, { useState, useRef } from "react";
import { useCompanyMembers, CompanyMember } from "@/hooks/useCompanyMembers";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SprintMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onMentionSelected?: (member: CompanyMember) => void;
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
  const { data: members = [] } = useCompanyMembers();
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeMembers = members.filter((m) => m.is_active);

  const filteredMembers = mentionQuery !== null
    ? activeMembers.filter((m) => {
        const query = mentionQuery.toLowerCase();
        const nameMatch = m.full_name?.toLowerCase().includes(query);
        const emailMatch = m.email?.toLowerCase().includes(query);
        return nameMatch || emailMatch;
      })
    : [];

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

  const selectMember = (member: CompanyMember) => {
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

      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-64 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-1">
          <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            Mencionar membro da equipe
          </div>
          {filteredMembers.map((member, idx) => {
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
                  "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-foreground hover:bg-accent"
                )}
              >
                <Avatar className="h-6 w-6 text-[10px] border border-border shrink-0">
                  <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="truncate">
                  <p className="font-medium truncate">{name}</p>
                  <p className="text-[10px] opacity-70 truncate">{member.email}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
