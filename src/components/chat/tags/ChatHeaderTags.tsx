import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { TagSelectorPopover } from "./TagSelectorPopover";
import { Tag, Eye, Plus, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ChatHeaderTagsProps {
  leadId?: string;
  tags?: string[];
  onTagsChange?: (newTags: string[]) => void;
}

export function ChatHeaderTags({
  leadId,
  tags = [],
  onTagsChange,
}: ChatHeaderTagsProps) {
  const queryClient = useQueryClient();
  const [currentTags, setCurrentTags] = useState<string[]>(tags || []);
  const [removingTag, setRemovingTag] = useState<string | null>(null);

  useEffect(() => {
    setCurrentTags(tags || []);
  }, [tags]);

  const handleTagsChange = (newTags: string[]) => {
    setCurrentTags(newTags);
    if (onTagsChange) onTagsChange(newTags);
  };

  const handleRemoveTag = async (e: React.MouseEvent, tagToRemove: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!leadId) return;

    const nextTags = currentTags.filter(
      (t) => t.toLowerCase() !== tagToRemove.toLowerCase()
    );

    // Atualização otimista imediata
    handleTagsChange(nextTags);
    setRemovingTag(tagToRemove);

    try {
      const { error } = await supabase
        .from("leads")
        .update({ tags: nextTags })
        .eq("id", leadId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["lead-deals"] });
      toast.success(`Tag "${tagToRemove}" removida`);
    } catch (err: any) {
      console.error("Erro ao remover tag:", err);
      toast.error(`Erro ao remover tag: ${err.message || err}`);
      // Reverter em caso de erro
      handleTagsChange(currentTags);
    } finally {
      setRemovingTag(null);
    }
  };

  if (!leadId) return null;

  const cleanTags = (currentTags || []).filter(Boolean);
  const total = cleanTags.length;

  // As 3 últimas tags adicionadas ao lead
  const visibleTags = total > 3 ? cleanTags.slice(-3) : cleanTags;
  const hiddenCount = total > 3 ? total - 3 : 0;

  return (
    <div className="flex items-center gap-1.5 flex-wrap pt-0.5 animate-in fade-in duration-200">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 font-semibold select-none shrink-0">
        <Tag className="h-3 w-3 text-muted-foreground/60" />
        <span className="hidden sm:inline">Tags:</span>
      </div>

      {/* Tags visíveis (até 3 últimas) */}
      {visibleTags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="group/tag relative text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md shrink-0 shadow-none hover:bg-primary/15 transition-all flex items-center gap-1"
        >
          <span>{tag}</span>
          <button
            type="button"
            onClick={(e) => handleRemoveTag(e, tag)}
            disabled={removingTag === tag}
            className="opacity-0 group-hover/tag:opacity-100 -mr-0.5 ml-0.5 p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-all cursor-pointer"
            title={`Remover tag "${tag}"`}
          >
            {removingTag === tag ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <X className="h-2.5 w-2.5" />
            )}
          </button>
        </Badge>
      ))}

      {/* Se houver mais tags, exibe pílula com olhinho e HoverCard com todas as tags */}
      {hiddenCount > 0 && (
        <HoverCard openDelay={100} closeDelay={200}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all cursor-pointer shadow-none shrink-0"
              title="Passar o mouse para ver todas as tags"
            >
              <Eye className="h-3 w-3" />
              <span>+{hiddenCount}</span>
            </button>
          </HoverCardTrigger>
          <HoverCardContent
            align="start"
            side="bottom"
            sideOffset={6}
            className="w-72 p-3 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl shadow-2xl space-y-2.5 z-[99999]"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Tag className="h-3.5 w-3.5 text-primary" />
                <span>Tags do Lead ({total})</span>
              </div>
              <TagSelectorPopover
                leadId={leadId}
                currentTags={cleanTags}
                onTagsChange={handleTagsChange}
                trigger={
                  <button
                    type="button"
                    className="h-6 px-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-primary/20 shadow-none"
                    title="Adicionar ou alterar tags"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Adicionar</span>
                  </button>
                }
              />
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-0.5 scrollbar-thin">
              {cleanTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="group/popovertag text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md flex items-center gap-1"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveTag(e, tag)}
                    disabled={removingTag === tag}
                    className="opacity-0 group-hover/popovertag:opacity-100 -mr-0.5 ml-0.5 p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-all cursor-pointer"
                    title={`Remover tag "${tag}"`}
                  >
                    {removingTag === tag ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <X className="h-2.5 w-2.5" />
                    )}
                  </button>
                </Badge>
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
      )}

      {/* Botão de adicionar tag rápido via menu suspenso */}
      <TagSelectorPopover
        leadId={leadId}
        currentTags={cleanTags}
        onTagsChange={handleTagsChange}
        trigger={
          <button
            type="button"
            className="h-5 px-1.5 rounded-md bg-muted/60 hover:bg-primary/10 hover:text-primary text-muted-foreground flex items-center gap-1 text-[10px] font-medium transition-all cursor-pointer border border-border/40 shrink-0"
            title="Adicionar tag ao lead"
          >
            <Plus className="h-3 w-3" />
            {total === 0 && <span className="text-[10px]">Adicionar tag</span>}
          </button>
        }
      />
    </div>
  );
}
