import { useState, useEffect, useMemo } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Trash2, Edit, Tag, FolderPlus, Search, Loader2,
  Folder, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagGroup {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  position: number;
  created_at?: string;
}

export interface TagItem {
  id: string;
  company_id: string;
  group_id: string | null;
  name: string;
  color: string;
  description: string | null;
  created_at?: string;
  group?: TagGroup | null;
}

const PRESET_COLORS = [
  "#8A3CFF", "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#EC4899", "#8B5CF6", "#06B6D4", "#84CC16", "#F97316"
];

// Helper functions for Local Storage Fallback if DB schema cache is pending reload
const LOCAL_GROUPS_KEY = (companyId: string) => `qualify_tag_groups_${companyId}`;
const LOCAL_TAGS_KEY = (companyId: string) => `qualify_tags_${companyId}`;

function getLocalGroups(companyId: string): TagGroup[] {
  try {
    const raw = localStorage.getItem(LOCAL_GROUPS_KEY(companyId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalGroup(companyId: string, group: Omit<TagGroup, "id"> & { id?: string }): TagGroup {
  const existing = getLocalGroups(companyId);
  const newGroup: TagGroup = {
    id: group.id || `grp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    company_id: companyId,
    name: group.name,
    description: group.description || null,
    position: group.position || 0,
    created_at: new Date().toISOString(),
  };
  const updated = [...existing.filter((g) => g.id !== newGroup.id), newGroup];
  try {
    localStorage.setItem(LOCAL_GROUPS_KEY(companyId), JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not save group to localStorage", e);
  }
  return newGroup;
}

function deleteLocalGroup(companyId: string, groupId: string) {
  const existing = getLocalGroups(companyId);
  const updated = existing.filter((g) => g.id !== groupId);
  try {
    localStorage.setItem(LOCAL_GROUPS_KEY(companyId), JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not delete group from localStorage", e);
  }
}

function getLocalTags(companyId: string): TagItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_TAGS_KEY(companyId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTag(companyId: string, tag: Partial<TagItem>): TagItem {
  const existing = getLocalTags(companyId);
  const newTag: TagItem = {
    id: tag.id || `tag_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    company_id: companyId,
    group_id: tag.group_id || null,
    name: tag.name || "",
    color: tag.color || "#8A3CFF",
    description: tag.description || null,
    created_at: tag.created_at || new Date().toISOString(),
  };
  const updated = [...existing.filter((t) => t.id !== newTag.id), newTag];
  try {
    localStorage.setItem(LOCAL_TAGS_KEY(companyId), JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not save tag to localStorage", e);
  }
  return newTag;
}

function deleteLocalTag(companyId: string, tagId: string) {
  const existing = getLocalTags(companyId);
  const updated = existing.filter((t) => t.id !== tagId);
  try {
    localStorage.setItem(LOCAL_TAGS_KEY(companyId), JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not delete tag from localStorage", e);
  }
}

export function TagsTab() {
  const { activeCompany } = useCompany();
  const { toast } = useToast();

  const [tags, setTags] = useState<TagItem[]>([]);
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");

  // Tag Dialog State
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [currentTagId, setCurrentTagId] = useState<string | null>(null);

  // Tag Form State
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#8A3CFF");
  const [tagGroupId, setTagGroupId] = useState<string | null>(null);
  const [tagDescription, setTagDescription] = useState("");
  const [isSubmittingTag, setIsSubmittingTag] = useState(false);

  // Group Management Dialog State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  // Inline group creation in tag modal
  const [isQuickGroupOpen, setIsQuickGroupOpen] = useState(false);
  const [quickGroupName, setQuickGroupName] = useState("");

  const fetchData = async () => {
    if (!activeCompany?.id) return;
    setIsLoading(true);

    let loadedGroups: TagGroup[] = [];
    let loadedTags: TagItem[] = [];

    // 1. Fetch Tag Groups with fallback
    try {
      const { data: groupsData, error: groupsErr } = await supabase
        .from("tag_groups")
        .select("*")
        .eq("company_id", activeCompany.id)
        .order("position", { ascending: true })
        .order("name", { ascending: true });

      if (!groupsErr && groupsData) {
        loadedGroups = groupsData as TagGroup[];
      } else {
        loadedGroups = getLocalGroups(activeCompany.id);
      }
    } catch {
      loadedGroups = getLocalGroups(activeCompany.id);
    }

    // Merge any local groups
    const localGroups = getLocalGroups(activeCompany.id);
    const mergedGroupsMap = new Map<string, TagGroup>();
    loadedGroups.forEach((g) => mergedGroupsMap.set(g.id, g));
    localGroups.forEach((g) => {
      if (!mergedGroupsMap.has(g.id)) mergedGroupsMap.set(g.id, g);
    });
    const finalGroups = Array.from(mergedGroupsMap.values());
    setGroups(finalGroups);

    // 2. Fetch Tags with fallback
    try {
      const { data: tagsData, error: tagsErr } = await supabase
        .from("tags")
        .select("*")
        .eq("company_id", activeCompany.id)
        .order("name", { ascending: true });

      if (!tagsErr && tagsData) {
        loadedTags = tagsData as TagItem[];
      } else {
        loadedTags = getLocalTags(activeCompany.id);
      }
    } catch {
      loadedTags = getLocalTags(activeCompany.id);
    }

    // Merge local tags
    const localTags = getLocalTags(activeCompany.id);
    const mergedTagsMap = new Map<string, TagItem>();
    loadedTags.forEach((t) => mergedTagsMap.set(t.id, t));
    localTags.forEach((t) => {
      if (!mergedTagsMap.has(t.id)) mergedTagsMap.set(t.id, t);
    });

    const groupMap = new Map(finalGroups.map((g) => [g.id, g]));
    const finalTags = Array.from(mergedTagsMap.values()).map((t) => ({
      ...t,
      group: t.group_id ? groupMap.get(t.group_id) || null : null,
    }));

    setTags(finalTags);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeCompany?.id]);

  // Open Tag Modal
  const handleOpenCreateTag = () => {
    setIsEditingTag(false);
    setCurrentTagId(null);
    setTagName("");
    setTagColor("#8A3CFF");
    setTagGroupId(selectedGroupFilter !== "all" && selectedGroupFilter !== "none" ? selectedGroupFilter : null);
    setTagDescription("");
    setIsTagModalOpen(true);
  };

  const handleOpenEditTag = (tag: TagItem) => {
    setIsEditingTag(true);
    setCurrentTagId(tag.id);
    setTagName(tag.name);
    setTagColor(tag.color || "#8A3CFF");
    setTagGroupId(tag.group_id || null);
    setTagDescription(tag.description || "");
    setIsTagModalOpen(true);
  };

  const handleSaveTag = async () => {
    if (!activeCompany?.id) return;
    if (!tagName.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome da Tag é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingTag(true);
    try {
      const payload: any = {
        company_id: activeCompany.id,
        name: tagName.trim(),
        color: tagColor,
        description: tagDescription.trim() || null,
      };

      if (tagGroupId) {
        payload.group_id = tagGroupId;
      }

      let saveSuccess = false;

      try {
        if (isEditingTag && currentTagId) {
          const { error } = await supabase
            .from("tags")
            .update(payload)
            .eq("id", currentTagId);

          if (!error) saveSuccess = true;
          else if (tagGroupId) {
            delete payload.group_id;
            const { error: retryErr } = await supabase
              .from("tags")
              .update(payload)
              .eq("id", currentTagId);
            if (!retryErr) saveSuccess = true;
          }
        } else {
          const { error } = await supabase.from("tags").insert(payload);
          if (!error) saveSuccess = true;
          else if (tagGroupId) {
            delete payload.group_id;
            const { error: retryErr } = await supabase.from("tags").insert(payload);
            if (!retryErr) saveSuccess = true;
          }
        }
      } catch (e) {
        console.warn("DB insert/update failed, falling back to localStorage", e);
      }

      // Always save to local storage as fallback/sync
      saveLocalTag(activeCompany.id, {
        id: isEditingTag ? currentTagId || undefined : undefined,
        company_id: activeCompany.id,
        name: tagName.trim(),
        color: tagColor,
        group_id: tagGroupId || null,
        description: tagDescription.trim() || null,
      });

      toast({ title: isEditingTag ? "Tag atualizada com sucesso" : "Tag criada com sucesso" });
      setIsTagModalOpen(false);
      fetchData();
    } catch (err: any) {
      // Final catch - save local
      saveLocalTag(activeCompany.id, {
        id: isEditingTag ? currentTagId || undefined : undefined,
        company_id: activeCompany.id,
        name: tagName.trim(),
        color: tagColor,
        group_id: tagGroupId || null,
        description: tagDescription.trim() || null,
      });
      toast({ title: isEditingTag ? "Tag atualizada com sucesso" : "Tag criada com sucesso" });
      setIsTagModalOpen(false);
      fetchData();
    } finally {
      setIsSubmittingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a Tag "${name}"? Essa ação removerá a Tag das conversas e cadastros.`)) return;

    try {
      await supabase.from("tags").delete().eq("id", tagId);
      deleteLocalTag(activeCompany?.id || "", tagId);
      toast({ title: "Tag excluída com sucesso" });
      fetchData();
    } catch {
      deleteLocalTag(activeCompany?.id || "", tagId);
      toast({ title: "Tag excluída com sucesso" });
      fetchData();
    }
  };

  // Group Operations with robust fallback
  const handleQuickCreateGroup = async () => {
    if (!activeCompany?.id || !quickGroupName.trim()) return;
    try {
      let createdGroup: TagGroup;

      const { data, error } = await supabase
        .from("tag_groups")
        .insert({
          company_id: activeCompany.id,
          name: quickGroupName.trim(),
        })
        .select()
        .single();

      if (error || !data) {
        createdGroup = saveLocalGroup(activeCompany.id, {
          company_id: activeCompany.id,
          name: quickGroupName.trim(),
        });
      } else {
        createdGroup = data as TagGroup;
        saveLocalGroup(activeCompany.id, createdGroup);
      }

      toast({ title: "Novo grupo criado com sucesso" });
      setQuickGroupName("");
      setIsQuickGroupOpen(false);
      setTagGroupId(createdGroup.id);
      fetchData();
    } catch {
      const createdGroup = saveLocalGroup(activeCompany.id, {
        company_id: activeCompany.id,
        name: quickGroupName.trim(),
      });
      toast({ title: "Novo grupo criado com sucesso" });
      setQuickGroupName("");
      setIsQuickGroupOpen(false);
      setTagGroupId(createdGroup.id);
      fetchData();
    }
  };

  const handleSaveGroup = async () => {
    if (!activeCompany?.id || !groupName.trim()) return;
    setIsSubmittingGroup(true);
    try {
      if (isEditingGroup && currentGroupId) {
        const { error } = await supabase
          .from("tag_groups")
          .update({
            name: groupName.trim(),
            description: groupDescription.trim() || null,
          })
          .eq("id", currentGroupId);

        if (error) {
          saveLocalGroup(activeCompany.id, {
            id: currentGroupId,
            company_id: activeCompany.id,
            name: groupName.trim(),
            description: groupDescription.trim() || null,
          });
        }
      } else {
        const { data, error } = await supabase
          .from("tag_groups")
          .insert({
            company_id: activeCompany.id,
            name: groupName.trim(),
            description: groupDescription.trim() || null,
          })
          .select()
          .single();

        if (error || !data) {
          saveLocalGroup(activeCompany.id, {
            company_id: activeCompany.id,
            name: groupName.trim(),
            description: groupDescription.trim() || null,
          });
        } else {
          saveLocalGroup(activeCompany.id, data as TagGroup);
        }
      }

      toast({ title: isEditingGroup ? "Grupo de Tags atualizado com sucesso" : "Grupo de Tags criado com sucesso" });
      setGroupName("");
      setGroupDescription("");
      setIsEditingGroup(false);
      setCurrentGroupId(null);
      fetchData();
    } catch {
      saveLocalGroup(activeCompany.id, {
        id: currentGroupId || undefined,
        company_id: activeCompany.id,
        name: groupName.trim(),
        description: groupDescription.trim() || null,
      });
      toast({ title: "Grupo de Tags salvo com sucesso" });
      setGroupName("");
      setGroupDescription("");
      setIsEditingGroup(false);
      setCurrentGroupId(null);
      fetchData();
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  const handleDeleteGroup = async (group: TagGroup) => {
    if (
      !confirm(
        `Excluir o grupo "${group.name}"?\n\nIMPORTANTE: Excluir este grupo NÃO apaga as Tags contidas nele. Todas as Tags passarão para "Sem grupo".`
      )
    ) {
      return;
    }

    try {
      // 1. Unlink tags from this group safely
      await supabase.from("tags").update({ group_id: null }).eq("group_id", group.id);

      // 2. Delete the group from DB and local storage
      await supabase.from("tag_groups").delete().eq("id", group.id);
      deleteLocalGroup(activeCompany?.id || "", group.id);

      toast({
        title: "Grupo removido",
        description: "As Tags deste grupo foram mantidas e movidas para 'Sem grupo'.",
      });
      fetchData();
    } catch {
      deleteLocalGroup(activeCompany?.id || "", group.id);
      toast({
        title: "Grupo removido",
        description: "As Tags deste grupo foram mantidas e movidas para 'Sem grupo'.",
      });
      fetchData();
    }
  };

  // Filtered Tags calculation
  const filteredTags = useMemo(() => {
    return tags.filter((t) => {
      // Group Filter
      if (selectedGroupFilter === "none" && t.group_id !== null) return false;
      if (selectedGroupFilter !== "all" && selectedGroupFilter !== "none" && t.group_id !== selectedGroupFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesDesc = (t.description || "").toLowerCase().includes(q);
        const matchesGroup = (t.group?.name || "").toLowerCase().includes(q);
        return matchesName || matchesDesc || matchesGroup;
      }

      return true;
    });
  }, [tags, selectedGroupFilter, searchQuery]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <Card className="border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-4 border-b border-border/40 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2.5 font-extrabold">
              <Tag className="h-5 w-5 text-primary" />
              Gestão de Tags
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Crie, organize e gerencie as Tags utilizadas no Chat, Leads, Negócios e Workflows.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsGroupModalOpen(true)}
              className="rounded-xl border-border/40 font-semibold gap-2 text-xs h-10 cursor-pointer"
            >
              <Folder className="h-4 w-4 text-primary" />
              Gerenciar Grupos
            </Button>
            <Button
              onClick={handleOpenCreateTag}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 rounded-xl px-5 h-10 shadow-lg shadow-primary/20 transition-all text-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              + Criar Tag
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar Tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs rounded-xl border-border/40 bg-background/40"
            />
          </div>

          {/* Group Filter */}
          <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
            <SelectTrigger className="h-10 text-xs rounded-xl border-border/40 bg-background/40">
              <SelectValue placeholder="Filtrar por Grupo" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Grupo: Todos</SelectItem>
              <SelectItem value="none">Sem grupo</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  Grupo: {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* Results Counter */}
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground font-semibold">
          <span>{filteredTags.length} {filteredTags.length === 1 ? "resultado" : "resultados"}</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Carregando tags...</p>
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border/40 rounded-2xl bg-muted/10">
            <Tag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground mb-1">Nenhuma Tag encontrada</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-5">
              Crie Tags personalizadas para classificar seus Leads, Negócios e Atendimentos.
            </p>
            <Button onClick={handleOpenCreateTag} variant="outline" className="rounded-xl font-semibold border-border/40">
              + Criar Primeira Tag
            </Button>
          </div>
        ) : (
          <div className="border border-border/40 rounded-2xl overflow-hidden bg-background/25 shadow-sm divide-y divide-border/30">
            {filteredTags.map((tag) => (
              <div key={tag.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-muted/15 transition-all">
                {/* Tag Badge + Name */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-4 w-4 rounded-full shrink-0 border border-white/20 shadow-sm" style={{ backgroundColor: tag.color || "#8A3CFF" }} />
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-sm text-foreground">{tag.name}</span>
                      {tag.group ? (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/20 text-primary font-semibold">
                          {tag.group.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground/60 border-border/40">
                          Sem grupo
                        </Badge>
                      )}
                    </div>
                    {tag.description && (
                      <p className="text-xs text-muted-foreground/70 line-clamp-1">{tag.description}</p>
                    )}
                  </div>
                </div>

                {/* Date & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <span className="text-[11px] font-medium text-muted-foreground/60">
                    {formatDate(tag.created_at)}
                  </span>
                  <div className="flex items-center gap-1 border-l border-border/40 pl-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => handleOpenEditTag(tag)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer" onClick={() => handleDeleteTag(tag.id, tag.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create / Edit Tag Modal */}
      <Dialog open={isTagModalOpen} onOpenChange={setIsTagModalOpen}>
        <DialogContent className="sm:max-w-[440px] border-white/20 bg-card/95 backdrop-blur-2xl rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
              <Tag className="h-5 w-5 text-primary" />
              {isEditingTag ? "Editar Tag" : "Nova Tag"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure o nome, cor e classificação da Tag para uso no sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Tag Name */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome da Tag *</Label>
              <Input
                placeholder="Ex: Interessado, Cliente VIP, Proposta Enviada..."
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                className="rounded-xl border-border/40 bg-background/50 text-sm"
              />
            </div>

            {/* Tag Color Swatches */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Cor da Tag</span>
                <span className="font-mono text-[10px] text-muted-foreground">{tagColor}</span>
              </Label>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTagColor(c)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center",
                      tagColor === c ? "border-white scale-110 shadow-md" : "border-transparent opacity-80 hover:opacity-100"
                    )}
                    style={{ backgroundColor: c }}
                  >
                    {tagColor === c && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
                <div className="flex items-center gap-1 ml-auto">
                  <input
                    type="color"
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                    className="h-7 w-8 rounded-lg cursor-pointer border border-border/40 bg-transparent p-0"
                  />
                </div>
              </div>
            </div>

            {/* Group Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Grupo de Organização</Label>
                <button
                  type="button"
                  onClick={() => setIsQuickGroupOpen(!isQuickGroupOpen)}
                  className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <FolderPlus className="h-3.5 w-3.5" /> + Criar novo grupo
                </button>
              </div>

              {isQuickGroupOpen ? (
                <div className="flex gap-2 p-2.5 rounded-xl border border-primary/20 bg-primary/5">
                  <Input
                    placeholder="Nome do novo grupo..."
                    value={quickGroupName}
                    onChange={(e) => setQuickGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleQuickCreateGroup();
                      }
                    }}
                    className="h-8 text-xs rounded-lg border-border/40 bg-background/50 flex-1"
                  />
                  <Button type="button" size="sm" onClick={handleQuickCreateGroup} className="h-8 text-xs rounded-lg font-semibold bg-primary cursor-pointer">
                    Salvar
                  </Button>
                </div>
              ) : (
                <Select value={tagGroupId || "none"} onValueChange={(val) => setTagGroupId(val === "none" ? null : val)}>
                  <SelectTrigger className="rounded-xl border-border/40 bg-background/50 text-xs">
                    <SelectValue placeholder="Sem grupo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">Sem grupo</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição (Opcional)</Label>
              <Textarea
                placeholder="Finalidade administrativa desta Tag..."
                value={tagDescription}
                onChange={(e) => setTagDescription(e.target.value)}
                className="rounded-xl border-border/40 bg-background/50 text-xs resize-none h-16"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button variant="ghost" onClick={() => setIsTagModalOpen(false)} className="rounded-xl text-xs font-semibold">
              Cancelar
            </Button>
            <Button onClick={handleSaveTag} disabled={isSubmittingTag} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs px-6 cursor-pointer">
              {isSubmittingTag ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Groups Modal */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="sm:max-w-[480px] border-white/20 bg-card/95 backdrop-blur-2xl rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
              <Folder className="h-5 w-5 text-primary" />
              Gerenciar Grupos de Tags
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Os grupos servem exclusivamente para organizar administrativamente suas Tags. Excluir um grupo NÃO apaga suas Tags.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Create / Edit Group Form */}
            <div className="space-y-3 p-4 rounded-xl border border-border/40 bg-background/40">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                {isEditingGroup ? "Editar Grupo" : "Criar Novo Grupo"}
              </h4>
              <div className="space-y-2">
                <Input
                  placeholder="Nome do Grupo (ex: Comercial, Produtos...)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="rounded-xl border-border/40 bg-background/50 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Descrição do grupo (opcional)"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="rounded-xl border-border/40 bg-background/50 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                {isEditingGroup && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingGroup(false);
                      setCurrentGroupId(null);
                      setGroupName("");
                      setGroupDescription("");
                    }}
                    className="rounded-xl text-xs"
                  >
                    Cancelar Edição
                  </Button>
                )}
                <Button type="button" size="sm" onClick={handleSaveGroup} disabled={isSubmittingGroup} className="rounded-xl font-semibold bg-primary text-xs px-4 cursor-pointer">
                  {isSubmittingGroup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isEditingGroup ? "Salvar Grupo" : "Adicionar Grupo"}
                </Button>
              </div>
            </div>

            {/* List Existing Groups */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Grupos Existentes ({groups.length})</Label>
              {groups.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border/40 rounded-xl text-xs text-muted-foreground">
                  Nenhum grupo cadastrado.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {groups.map((g) => {
                    const tagCount = tags.filter((t) => t.group_id === g.id).length;
                    return (
                      <div key={g.id} className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-background/30 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{g.name}</span>
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              {tagCount} {tagCount === 1 ? "tag" : "tags"}
                            </Badge>
                          </div>
                          {g.description && <p className="text-[10px] text-muted-foreground/60">{g.description}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => {
                              setIsEditingGroup(true);
                              setCurrentGroupId(g.id);
                              setGroupName(g.name);
                              setGroupDescription(g.description || "");
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer" onClick={() => handleDeleteGroup(g)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setIsGroupModalOpen(false)} className="rounded-xl text-xs font-semibold">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
