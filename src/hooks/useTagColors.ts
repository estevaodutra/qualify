import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";

// Utilitário compartilhado para gerar cores padronizadas de fundo, borda e texto
export function getTagStyles(hexColor?: string) {
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

export function useTagColors() {
  const { activeCompany } = useCompany();

  // Buscar lista de tags com cores (compartilha o mesmo cache com TagSelectorPopover)
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

  return { getTagColor, getTagStyles };
}
