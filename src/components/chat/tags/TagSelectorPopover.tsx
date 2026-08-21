import { useState, useMemo } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Plus, Tag, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagSelectorPopoverProps {
  leadId?: string;
  currentTags?: string[];
  onTagsChange?: (newTags: string[]) => void;
  trigger?: React.ReactNode;
  align?: "start" | "center" | "end";
}

interface TagItem {
  id: string;
  name: string;
  color: string;
}

const LOCAL_TAGS_KEY = (companyId: string) => `qualify_tags_${companyId}`;

function getLocalTags(companyId: string): TagItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_TAGS_KEY(companyId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function TagSelectorPopover({
  leadId,
  currentTags = [],
  onTagsChange,
  trigger,
  align = "start",
}: TagSelectorPopoverProps) {
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch company system tags
  const { data: systemTags = [], isLoading } = useQuery<TagItem[]>({
    queryKey: ["company-tags-selector", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      let dbTags: TagItem[] = [];
      try {
        const { data, error } = await supabase
          .from("tags")
          .select("id, name, color")
          .eq("company_id", activeCompany.id)
          .order("name", { ascending: true });

        if (!error && data) dbTags = data as TagItem[];
      } catch {
        // Fallback silently if table cache error
      }

      const local = getLocalTags(activeCompany.id);
      const mergedMap = new Map<string, TagItem>();
      dbTags.forEach((t) => mergedMap.set(t.name.toLowerCase(), t));
      local.forEach((t) => {
        if (!mergedMap.has(t.name.toLowerCase())) mergedMap.set(t.name.toLowerCase(), t);
      });

      return Array.from(mergedMap.values());
    },
    enabled: !!activeCompany?.id && open,
  });

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return systemTags;
    const q = searchQuery.toLowerCase();
    return systemTags.filter((t) => t.name.toLowerCase().includes(q));
  }, [systemTags, searchQuery]);

  const handleToggleTag = async (tagName: string) => {
    if (!leadId) return;
    setIsUpdating(true);

    const exists = currentTags.some((t) => t.toLowerCase() === tagName.toLowerCase());
    let nextTags: string[];
    if (exists) {
      nextTags = currentTags.filter((t) => t.toLowerCase() !== tagName.toLowerCase());
    } else {
      nextTags = [...currentTags, tagName];
    }

    try {
      const { error } = await supabase
        .from("leads")
        .update({ tags: nextTags })
        .eq("id", leadId);

      if (error) throw error;

      if (onTagsChange) onTagsChange(nextTags);
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["lead-deals"] });

      toast({
        title: exists ? "Tag removida" : "Tag adicionada",
        description: `Tag "${tagName}" ${exists ? "removida do" : "adicionada ao"} lead.`,
      });
    } catch (err: any) {
      console.error("Error updating lead tags:", err);
      toast({
        title: "Erro ao atualizar tag",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] font-bold text-primary hover:bg-primary/10 rounded-md shadow-none gap-1 cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            Tag
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-56 p-2 rounded-2xl border border-white/20 bg-card/95 backdrop-blur-2xl shadow-xl space-y-2 z-[9999]"
      >
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-foreground">
          <Tag className="h-3.5 w-3.5 text-primary" />
          <span>Selecionar Tags</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-7 text-xs rounded-xl border-border/40 bg-background/50"
          />
        </div>

        {/* List */}
        <div className="max-h-48 overflow-y-auto space-y-1 pt-1 scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
              Carregando...
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-3 text-[11px] text-muted-foreground">
              {systemTags.length === 0 ? "Nenhuma tag cadastrada no sistema." : "Nenhuma tag encontrada."}
            </div>
          ) : (
            filteredTags.map((t) => {
              const isSelected = currentTags.some((ct) => ct.toLowerCase() === t.name.toLowerCase());
              return (
                <button
                  key={t.id || t.name}
                  type="button"
                  onClick={() => handleToggleTag(t.name)}
                  disabled={isUpdating}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                    isSelected
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-muted/40 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0 border border-white/20"
                      style={{ backgroundColor: t.color || "#8A3CFF" }}
                    />
                    <span className="truncate">{t.name}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 stroke-[3]" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
