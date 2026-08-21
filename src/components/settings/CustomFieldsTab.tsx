import { useState, useEffect, useMemo } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Trash2, Edit, Eye, EyeOff, Lock, Unlock, GripVertical,
  HelpCircle, Settings2, Sliders, Type, Hash, Calendar, ToggleLeft, ListCollapse, Loader2,
  Search, CheckCircle2, XCircle, Copy, Clock, Phone, Mail, Link as LinkIcon, DollarSign, FileText, AlignLeft, CheckSquare
} from "lucide-react";

export interface CustomFieldOption {
  id: string;
  label: string;
  value: string;
}

export interface CustomFieldMetadata {
  id: string;
  company_id: string;
  name: string;
  key: string;
  description: string | null;
  type: string;
  category: "lead" | "deal" | "company";
  group_name: string | null;
  is_visible: boolean;
  is_private: boolean;
  options?: CustomFieldOption[] | string[] | null;
  created_at?: string;
}

const FIELD_TYPES = [
  { value: "text", label: "Texto Curto", icon: Type },
  { value: "textarea", label: "Texto Longo", icon: AlignLeft },
  { value: "number", label: "Número", icon: Hash },
  { value: "currency", label: "Moeda (R$)", icon: DollarSign },
  { value: "date", label: "Data", icon: Calendar },
  { value: "datetime", label: "Data e Hora", icon: Clock },
  { value: "boolean", label: "Booleano (Sim/Não)", icon: ToggleLeft },
  { value: "select", label: "Seleção Única", icon: ListCollapse },
  { value: "multi_select", label: "Seleção Múltipla", icon: CheckSquare },
  { value: "phone", label: "Telefone", icon: Phone },
  { value: "email", label: "E-mail", icon: Mail },
  { value: "url", label: "URL / Link", icon: LinkIcon },
];

export function CustomFieldsTab() {
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const [fields, setFields] = useState<CustomFieldMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "lead" | "deal" | "company">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "visible" | "hidden">("all");

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFieldId, setCurrentFieldId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("text");
  const [category, setCategory] = useState<"lead" | "deal" | "company">("lead");
  const [groupName, setGroupName] = useState("Sem grupo");
  const [isVisible, setIsVisible] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [options, setOptions] = useState<CustomFieldOption[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate key from name
  useEffect(() => {
    if (!isEditing && name) {
      const generatedKey = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/(^_|_$)/g, "");
      setKey(generatedKey);
    }
  }, [name, isEditing]);

  const fetchFields = async () => {
    if (!activeCompany?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("custom_fields_metadata")
        .select("*")
        .eq("company_id", activeCompany.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        await populateDefaultFields();
      } else {
        setFields(data as CustomFieldMetadata[]);
      }
    } catch (err: any) {
      console.error("Error fetching custom fields:", err);
      toast({
        title: "Erro ao buscar campos",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const populateDefaultFields = async () => {
    if (!activeCompany?.id) return;
    try {
      const defaults: Omit<CustomFieldMetadata, "id">[] = [
        {
          company_id: activeCompany.id,
          category: "lead",
          name: "Tipo de Projeto",
          key: "tipo_de_projeto",
          description: "Tipo de projeto de marketing contratado pelo lead",
          type: "select",
          group_name: "Qualificação",
          is_visible: true,
          is_private: false,
          options: [
            { id: "opt_1", label: "Performance / Tráfego", value: "performance" },
            { id: "opt_2", label: "Inbound Marketing", value: "inbound" },
            { id: "opt_3", label: "Branding / Design", value: "branding" },
          ],
        },
        {
          company_id: activeCompany.id,
          category: "lead",
          name: "Orçamento Mensal",
          key: "orcamento_mensal",
          description: "Orçamento estimado de mídia mensal",
          type: "currency",
          group_name: "Qualificação",
          is_visible: true,
          is_private: false,
        },
        {
          company_id: activeCompany.id,
          category: "deal",
          name: "Faturamento Esperado",
          key: "faturamento_esperado",
          description: "Faturamento esperado do contrato fechado",
          type: "currency",
          group_name: "Negócios",
          is_visible: true,
          is_private: false,
        },
        {
          company_id: activeCompany.id,
          category: "lead",
          name: "Empresa",
          key: "empresa",
          description: "Nome da empresa contratante",
          type: "text",
          group_name: "Dados Gerais",
          is_visible: true,
          is_private: false,
        },
      ];

      const { data: inserted, error } = await supabase
        .from("custom_fields_metadata")
        .insert(defaults as any)
        .select();

      if (error) throw error;
      setFields((inserted || []) as CustomFieldMetadata[]);
    } catch (err: any) {
      console.error("Error creating default fields:", err);
    }
  };

  useEffect(() => {
    fetchFields();
  }, [activeCompany?.id]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentFieldId(null);
    setName("");
    setKey("");
    setDescription("");
    setType("text");
    setCategory("lead");
    setGroupName("Qualificação");
    setIsVisible(true);
    setIsPrivate(false);
    setOptions([]);
    setNewOptionLabel("");
    setIsOpen(true);
  };

  const handleOpenEdit = (field: CustomFieldMetadata) => {
    setIsEditing(true);
    setCurrentFieldId(field.id);
    setName(field.name);
    setKey(field.key);
    setDescription(field.description || "");
    setType(field.type || "text");
    setCategory(field.category);
    setGroupName(field.group_name || "Sem grupo");
    setIsVisible(field.is_visible);
    setIsPrivate(field.is_private);

    // Normalize options
    if (Array.isArray(field.options)) {
      const parsed = field.options.map((opt: any, index: number) => {
        if (typeof opt === "string") return { id: `opt_${index}`, label: opt, value: opt };
        return { id: opt.id || `opt_${index}`, label: opt.label || opt.value, value: opt.value || opt.label };
      });
      setOptions(parsed);
    } else {
      setOptions([]);
    }

    setNewOptionLabel("");
    setIsOpen(true);
  };

  const handleAddOption = () => {
    if (!newOptionLabel.trim()) return;
    const value = newOptionLabel
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_]/g, "_");

    setOptions((prev) => [
      ...prev,
      { id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, label: newOptionLabel.trim(), value },
    ]);
    setNewOptionLabel("");
  };

  const handleRemoveOption = (id: string) => {
    setOptions((prev) => prev.filter((opt) => opt.id !== id));
  };

  const handleSave = async () => {
    if (!activeCompany?.id) return;
    if (!name.trim() || !key.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e Chave são campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if ((type === "select" || type === "multi_select") && options.length === 0) {
      toast({
        title: "Opções necessárias",
        description: "Adicione ao menos uma opção para campos de Seleção.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const fieldData = {
        company_id: activeCompany.id,
        name: name.trim(),
        key: key.trim(),
        description: description.trim() || null,
        type,
        category,
        group_name: groupName.trim() || "Sem grupo",
        is_visible: isVisible,
        is_private: isPrivate,
        options: type === "select" || type === "multi_select" ? options : null,
      };

      if (isEditing && currentFieldId) {
        const { error } = await supabase
          .from("custom_fields_metadata")
          .update(fieldData as any)
          .eq("id", currentFieldId);
        if (error) throw error;
        toast({ title: "Campo atualizado com sucesso" });
      } else {
        const { error } = await supabase
          .from("custom_fields_metadata")
          .insert(fieldData as any);
        if (error) throw error;
        toast({ title: "Campo criado com sucesso" });
      }

      setIsOpen(false);
      fetchFields();
    } catch (err: any) {
      console.error("Error saving custom field:", err);
      toast({
        title: "Erro ao salvar campo",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este campo personalizado? O histórico não será apagado, mas a referência será removida.")) return;

    try {
      const { error } = await supabase
        .from("custom_fields_metadata")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Campo removido com sucesso" });
      fetchFields();
    } catch (err: any) {
      console.error("Error deleting field metadata:", err);
      toast({
        title: "Erro ao remover campo",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const toggleVisibility = async (field: CustomFieldMetadata) => {
    try {
      const { error } = await supabase
        .from("custom_fields_metadata")
        .update({ is_visible: !field.is_visible })
        .eq("id", field.id);

      if (error) throw error;

      setFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, is_visible: !f.is_visible } : f)));
      toast({
        title: !field.is_visible ? "Visibilidade ativada" : "Visibilidade desativada",
        description: !field.is_visible ? "O campo estará visível no perfil do lead." : "O campo foi ocultado no perfil do lead.",
      });
    } catch (err: any) {
      console.error("Error updating visibility:", err);
    }
  };

  const togglePrivacy = async (field: CustomFieldMetadata) => {
    try {
      const { error } = await supabase
        .from("custom_fields_metadata")
        .update({ is_private: !field.is_private })
        .eq("id", field.id);

      if (error) throw error;

      setFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, is_private: !f.is_private } : f)));
      toast({
        title: !field.is_private ? "Definido como Privado" : "Definido como Público",
      });
    } catch (err: any) {
      console.error("Error updating privacy:", err);
    }
  };

  // Filtered fields calculation
  const filteredFields = useMemo(() => {
    return fields.filter((f) => {
      // Category filter
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;

      // Status filter
      if (statusFilter === "visible" && !f.is_visible) return false;
      if (statusFilter === "hidden" && f.is_visible) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = f.name.toLowerCase().includes(q);
        const matchesKey = f.key.toLowerCase().includes(q);
        const matchesDesc = (f.description || "").toLowerCase().includes(q);
        return matchesName || matchesKey || matchesDesc;
      }

      return true;
    });
  }, [fields, categoryFilter, statusFilter, searchQuery]);

  // Group fields
  const groupedFields = useMemo(() => {
    const groups: Record<string, CustomFieldMetadata[]> = {};
    filteredFields.forEach((field) => {
      const group = field.group_name || "Sem grupo";
      if (!groups[group]) groups[group] = [];
      groups[group].push(field);
    });
    return groups;
  }, [filteredFields]);

  const getFieldIcon = (fieldType: string) => {
    const matched = FIELD_TYPES.find((t) => t.value === fieldType);
    return matched ? matched.icon : Type;
  };

  const getCategoryBadge = (cat: string) => {
    if (cat === "lead") return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px]">Lead</Badge>;
    if (cat === "deal") return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Negócio</Badge>;
    return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">Empresa</Badge>;
  };

  return (
    <Card className="border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-4 border-b border-border/40 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2.5 font-extrabold">
              <Sliders className="h-5 w-5 text-primary" />
              Gestão de Campos Adicionais
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Crie e gerencie campos personalizados estruturados reutilizados em Leads, Negócios, Workflows e integrações.
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 rounded-xl px-5 py-2.5 shadow-lg shadow-primary/20 shrink-0 transition-all">
            <Plus className="h-4.5 w-4.5" />
            + Novo Campo
          </Button>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, variável ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs rounded-xl border-border/40 bg-background/40"
            />
          </div>

          {/* Entidade Filter */}
          <Select value={categoryFilter} onValueChange={(val: any) => setCategoryFilter(val)}>
            <SelectTrigger className="h-10 text-xs rounded-xl border-border/40 bg-background/40">
              <SelectValue placeholder="Todas as Entidades" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todas as Entidades</SelectItem>
              <SelectItem value="lead">Entidade: Lead</SelectItem>
              <SelectItem value="deal">Entidade: Negócio</SelectItem>
              <SelectItem value="company">Entidade: Empresa</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="h-10 text-xs rounded-xl border-border/40 bg-background/40">
              <SelectValue placeholder="Todos os Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="visible">Apenas Visíveis no Chat</SelectItem>
              <SelectItem value="hidden">Apenas Ocultos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Carregando campos personalizados...</p>
          </div>
        ) : Object.keys(groupedFields).length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border/40 rounded-2xl bg-muted/10">
            <HelpCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground mb-1">Nenhum campo adicional encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-5">
              Crie campos personalizados para enriquecer as informações dos seus Leads e Negócios.
            </p>
            <Button onClick={handleOpenCreate} variant="outline" className="rounded-xl font-semibold border-border/40">
              Criar Primeiro Campo
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedFields).map(([groupName, groupFields]) => (
              <div key={groupName} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                    {groupName} ({groupFields.length})
                  </h3>
                </div>

                <div className="border border-border/40 rounded-2xl overflow-hidden divide-y divide-border/30 bg-background/25 shadow-sm">
                  {groupFields.map((field) => {
                    const FieldIcon = getFieldIcon(field.type);
                    const typeLabel = FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type;

                    return (
                      <div key={field.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/15 transition-all">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="p-2.5 rounded-xl bg-primary/10 shrink-0 text-primary mt-0.5">
                            <FieldIcon className="h-4.5 w-4.5" />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-bold text-sm text-foreground">{field.name}</span>
                              <span className="text-[11px] font-mono text-muted-foreground/70 bg-muted/40 px-2 py-0.5 rounded-md">
                                {`{{${field.key}}}`}
                              </span>
                              {getCategoryBadge(field.category)}
                              <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                                {typeLabel}
                              </Badge>
                            </div>
                            {field.description && (
                              <p className="text-xs text-muted-foreground/70 line-clamp-1">{field.description}</p>
                            )}
                            {Array.isArray(field.options) && field.options.length > 0 && (
                              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                                <span className="text-[10px] text-muted-foreground/60 font-semibold">Opções:</span>
                                {field.options.slice(0, 4).map((opt: any, i: number) => (
                                  <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                    {typeof opt === "string" ? opt : opt.label}
                                  </span>
                                ))}
                                {field.options.length > 4 && (
                                  <span className="text-[10px] text-muted-foreground/60 font-semibold">+{field.options.length - 4} mais</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Controls & Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {/* Privacy Toggle */}
                          <button
                            type="button"
                            onClick={() => togglePrivacy(field)}
                            title={field.is_private ? "Privado (Somente Admins)" : "Público"}
                            className={cn(
                              "p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold",
                              field.is_private
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                : "border-border/40 hover:bg-muted/40 text-muted-foreground/60"
                            )}
                          >
                            {field.is_private ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                          </button>

                          {/* Visibility Toggle */}
                          <button
                            type="button"
                            onClick={() => toggleVisibility(field)}
                            title={field.is_visible ? "Visível no Chat" : "Oculto no Chat"}
                            className={cn(
                              "p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold",
                              field.is_visible
                                ? "border-sky-500/30 bg-sky-500/10 text-sky-400"
                                : "border-border/40 hover:bg-muted/40 text-muted-foreground/60"
                            )}
                          >
                            {field.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>

                          <div className="flex items-center gap-1 border-l border-border/40 pl-2">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit(field)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(field.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] border-white/20 bg-card/95 backdrop-blur-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
              <Settings2 className="h-5 w-5 text-primary" />
              {isEditing ? "Editar Campo Adicional" : "Novo Campo Adicional"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Defina a estrutura e o tipo de dado para este campo personalizado do CRM.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do Campo *</Label>
              <Input
                placeholder="Ex: Faturamento Mensal, Setor..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border-border/40 bg-background/50 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chave da Variável *</Label>
              <Input
                placeholder="Ex: faturamento_mensal"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                disabled={isEditing}
                className="font-mono text-xs rounded-xl border-border/40 bg-background/50"
              />
              <p className="text-[10px] text-muted-foreground">Chave imutável para referenciar em Workflows, Condições e APIs (`{`{{${key || "variavel"}}}`}`).</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Entidade</Label>
                <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                  <SelectTrigger className="rounded-xl border-border/40 bg-background/50 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="deal">Negócio</SelectItem>
                    <SelectItem value="company">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Dado</Label>
                <Select value={type} onValueChange={(val: any) => setType(val)}>
                  <SelectTrigger className="rounded-xl border-border/40 bg-background/50 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-60 overflow-y-auto">
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <t.icon className="h-3.5 w-3.5 text-primary" />
                          <span>{t.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Grupo</Label>
              <Input
                placeholder="Ex: Qualificação, Vendas, Financeiro"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="rounded-xl border-border/40 bg-background/50 text-xs"
              />
            </div>

            {/* Options Manager for Select / Multi-Select */}
            {(type === "select" || type === "multi_select") && (
              <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
                <Label className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <ListCollapse className="h-4 w-4" /> Opções da Seleção
                </Label>

                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar opção (ex: Quente, Frio...)"
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                    className="rounded-xl border-border/40 bg-background/50 text-xs flex-1"
                  />
                  <Button type="button" onClick={handleAddOption} size="sm" className="rounded-xl font-semibold bg-primary text-primary-foreground">
                    Adicionar
                  </Button>
                </div>

                {options.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
                    {options.map((opt) => (
                      <div key={opt.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/20 text-xs">
                        <span className="font-medium text-foreground">{opt.label}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveOption(opt.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição</Label>
              <Textarea
                placeholder="Uma breve instrução sobre o objetivo deste campo..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl border-border/40 bg-background/50 text-xs resize-none h-16"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 border border-border/30 rounded-xl bg-background/30">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Visível no Chat</span>
                <p className="text-[10px] text-muted-foreground">Exibir este campo no painel lateral do lead durante o atendimento.</p>
              </div>
              <Switch checked={isVisible} onCheckedChange={setIsVisible} />
            </div>

            <div className="flex items-center justify-between p-3.5 border border-border/30 rounded-xl bg-background/30">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Campo Privado</span>
                <p className="text-[10px] text-muted-foreground">Restringir a visualização deste valor somente para Administradores.</p>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl text-xs font-semibold">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs px-6">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Campo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
