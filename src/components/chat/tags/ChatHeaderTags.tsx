import { useState, useEffect, useMemo } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { TagSelectorPopover } from "./TagSelectorPopover";
import { Tag, Eye, Plus, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

interface ChatHeaderTagsProps {
  leadId?: string;
  tags?: string[];
  onTagsChange?: (newTags: string[]) => void;
}

// Utilitário para gerar cores de fundo, borda e texto respeitando a cor da etiqueta
function getTagStyles(hexColor?: string) {
  let color = hexColor || "#8A3CFF";
  if (!color.startsWith("#") && !color.startsWith("rgb")) {
    color = `#${color}`;
  }

  // Formato Hex #RRGGBB
  if (color.startsWith("#") && (color.length === 7 || color.length === 9)) {
    const base = color.slice(0, 7);
    return {
      backgroundColor: `${base}1F`, // ~12% de opacidade para a caixinha
      borderColor: `${base}59`,     // ~35% de opacidade para a borda
      color: base,
    };
  }

  // Formato Hex curto #RGB
  if (color.startsWith("#") && color.length === 4) {
    const r = color[1], g = color[2], b = color[3];
    const base = `#${r}${r}${g}${g}${b}${b}`;
    return {
      backgroundColor: `${base}1F`,
      borderColor: `${base}59`,
      color: base,
    };
  }

  return {
    backgroundColor: `${color}1F`,
    borderColor: `${color}59`,
    color: color,
  };
}

export function ChatHeaderTags({
  leadId,
  tags = [],
  onTagsChange,
}: ChatHeaderTagsProps) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const [currentTags, setCurrentTags] = useState<string[]>(tags || []);
  const [removingTag, setRemovingTag] = useState<string | null>(null);

  useEffect(() => {
    setCurrentTags(tags || []);
  }, [tags]);

  // Carregar cores das tags da empresa
  const { data: systemTags = [] } = useQuery({
    queryKey: ["company-tags-selector", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      let dbTags: { name: string; color?: string }[] = [];
      try {
        const { data, error } = await supabase
          .from("tags")
          .select("id, name, color")
          .eq("company_id", activeCompany.id);
        if (!error && data) dbTags = data;
      } catch {}

      try {
        const raw = localStorage.getItem(`qualify_tags_${activeCompany.id}`);
        if (raw) {
          const local = JSON.parse(raw);
          if (Array.isArray(local)) {
            local.forEach((t) => {
              if (t.name && !dbTags.some((d) => d.name.toLowerCase() === t.name.toLowerCase())) {
                dbTags.push(t);
              }
            });
          }
        }
      } catch {}

      return dbTags;
    },
    enabled: !!activeCompany?.id,
    staleTime: 60000,
  });

  const tagColorMap = useMemo(() => {
    const map = new Map<string, string>();
    systemTags.forEach((t) => {
      if (t.name && t.color) {
        map.set(t.name.toLowerCase().trim(), t.color);
      }
    });
    return map;
  }, [systemTags]);

  const getTagColor = (tagName: string) => {
    return tagColorMap.get(tagName.toLowerCase().trim()) || "#8A3CFF";
  };

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
      {visibleTags.map((tag) => {
        const color = getTagColor(tag);
        const styles = getTagStyles(color);

        return (
          <div
            key={tag}
            style={styles}
            className="group/tag relative inline-flex items-center justify-center text-[10px] font-bold border px-2 py-0.5 rounded-md shrink-0 select-none overflow-hidden transition-all duration-150"
          >
            {/* Texto da tag delimitando a largura natural do conteúdo */}
            <span className="truncate max-w-[140px] leading-tight transition-opacity duration-150 group-hover/tag:opacity-0">
              {tag}
            </span>

            {/* Xizinho sobrepondo o texto no hover sem alterar a largura */}
            <button
              type="button"
              onClick={(e) => handleRemoveTag(e, tag)}
              disabled={removingTag === tag}
              style={{ color }}
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/tag:opacity-100 bg-background/70 backdrop-blur-[1px] hover:bg-destructive/15 hover:!text-destructive transition-all duration-150 cursor-pointer"
              title={`Remover tag "${tag}"`}
            >
              {removingTag === tag ? (
                <Loader2 className="h-3 w-3 animate-spin text-current" />
              ) : (
                <X className="h-3.5 w-3.5 stroke-[2.5]" />
              )}
            </button>
          </div>
        );
      })}

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
              {cleanTags.map((tag) => {
                const color = getTagColor(tag);
                const styles = getTagStyles(color);

                return (
                  <div
                    key={tag}
                    style={styles}
                    className="group/popovertag relative inline-flex items-center justify-center text-[10px] font-bold border px-2 py-0.5 rounded-md overflow-hidden select-none transition-all duration-150"
                  >
                    <span className="truncate max-w-[130px] leading-tight transition-opacity duration-150 group-hover/popovertag:opacity-0">
                      {tag}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveTag(e, tag)}
                      disabled={removingTag === tag}
                      style={{ color }}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/popovertag:opacity-100 bg-background/70 backdrop-blur-[1px] hover:bg-destructive/15 hover:!text-destructive transition-all duration-150 cursor-pointer"
                      title={`Remover tag "${tag}"`}
                    >
                      {removingTag === tag ? (
                        <Loader2 className="h-3 w-3 animate-spin text-current" />
                      ) : (
                        <X className="h-3.5 w-3.5 stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                );
              })}
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
