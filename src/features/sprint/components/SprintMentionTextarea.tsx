import React, { useState, useRef } from "react";
import { useCompanyMembers, CompanyMember } from "@/hooks/useCompanyMembers";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SprintMentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onMentionSelected?: (member: CompanyMember) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export const SprintMentionTextarea: React.FC<SprintMentionTextareaProps> = ({
  value,
  onChange,
  onMentionSelected,
  placeholder,
  className,
  rows = 3,
}) => {
  const { data: members = [] } = useCompanyMembers();
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeMembers = members.filter((m) => m.is_active);

  const filteredMembers = mentionQuery !== null
    ? activeMembers.filter((m) => {
        const query = mentionQuery.toLowerCase();
        const nameMatch = m.full_name?.toLowerCase().includes(query);
        const emailMatch = m.email?.toLowerCase().includes(query);
        return nameMatch || emailMatch;
      })
    : [];

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
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
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

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleCustomKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-y",
          className
        )}
      />

      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div className="absolute left-0 bottom-full mb-1.5 z-50 w-64 max-h-56 overflow-y-auto rounded-xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-1">
          <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
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
                  "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors",
                  isSelected
                    ? "bg-primary text-white"
                    : "text-slate-200 hover:bg-slate-800"
                )}
              >
                <Avatar className="h-6 w-6 text-[10px] border border-white/10 shrink-0">
                  <AvatarFallback className="bg-slate-800 text-slate-200 font-semibold">
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
