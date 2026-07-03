import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Trash2, Edit, Eye, EyeOff, Lock, Unlock, GripVertical, 
  HelpCircle, Settings2, Sliders, Type, Hash, Calendar, ToggleLeft, ListCollapse, Loader2
} from "lucide-react";

export interface CustomFieldMetadata {
  id: string;
  company_id: string;
  name: string;
  key: string;
  description: string | null;
  type: "text" | "number" | "date" | "boolean" | "select";
  category: "lead" | "deal" | "company";
  group_name: string | null;
  is_visible: boolean;
  is_private: boolean;
  created_at?: string;
}

const FIELD_TYPES = [
  { value: "text", label: "Texto", icon: Type },
  { value: "number", label: "Número/Moeda", icon: Hash },
  { value: "date", label: "Data", icon: Calendar },
  { value: "boolean", label: "Verdadeiro/Falso", icon: ToggleLeft },
  { value: "select", label: "Seleção/Lista", icon: ListCollapse }
];

export function CustomFieldsTab() {
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const [fields, setFields] = useState<CustomFieldMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState<"lead" | "deal" | "company">("lead");
  
  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFieldId, setCurrentFieldId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"text" | "number" | "date" | "boolean" | "select">("text");
  const [groupName, setGroupName] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate key from name
  useEffect(() => {
    if (!isEditing && name) {
      const generatedKey = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9_]/g, "_")    // replace non-alphanumeric with underscore
        .replace(/_+/g, "_")            // compress multiple underscores
        .replace(/(^_|_$)/g, "");       // trim underscores
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
      
      // If no fields exist, populate defaults for user presentation matching their mockup
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
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const populateDefaultFields = async () => {
    if (!activeCompany?.id) return;
    try {
      const defaults: Omit<CustomFieldMetadata, "id">[] = [
        // Lead Custom Fields
        { company_id: activeCompany.id, category: "lead", name: "Tipo de Projeto", key: "tipo_de_projeto", description: "Tipo de projeto de marketing", type: "select", group_name: "Sem grupo", is_visible: false, is_private: true },
        { company_id: activeCompany.id, category: "lead", name: "Orçamento Mensal", key: "orcamento_mensal", description: "Orçamento mensal de mídia", type: "number", group_name: "Sem grupo", is_visible: false, is_private: true },
        { company_id: activeCompany.id, category: "lead", name: "Duração do Contrato", key: "duracao_do_contrato", description: "Duração prevista do contrato", type: "text", group_name: "Sem grupo", is_visible: false, is_private: true },
        { company_id: activeCompany.id, category: "lead", name: "Início da Campanha", key: "inicio_da_campanha", description: "Data prevista de início", type: "date", group_name: "Sem grupo", is_visible: false, is_private: true },
        { company_id: activeCompany.id, category: "lead", name: "Etapa do Funil", key: "etapa_do_funil", description: null, type: "text", group_name: "Sem grupo", is_visible: false, is_private: false },
        { company_id: activeCompany.id, category: "lead", name: "input", key: "input", description: null, type: "text", group_name: "Sem grupo", is_visible: false, is_private: false },
        
        { company_id: activeCompany.id, category: "lead", name: "Disparo", key: "disparo", description: null, type: "text", group_name: "Gestão", is_visible: false, is_private: false },
        { company_id: activeCompany.id, category: "lead", name: "Status", key: "status", description: null, type: "text", group_name: "Gestão", is_visible: false, is_private: false },
        { company_id: activeCompany.id, category: "lead", name: "Empresa", key: "empresa", description: null, type: "text", group_name: "Gestão", is_visible: true, is_private: false },
        { company_id: activeCompany.id, category: "lead", name: "last_message", key: "last_message", description: null, type: "text", group_name: "Gestão", is_visible: false, is_private: false }
      ];

      const { data: inserted, error } = await supabase
        .from("custom_fields_metadata")
        .insert(defaults)
        .select();

      if (error) throw error;
      setFields(inserted as CustomFieldMetadata[]);
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
    setGroupName("Sem grupo");
    setIsVisible(false);
    setIsPrivate(false);
    setIsOpen(true);
  };

  const handleOpenEdit = (field: CustomFieldMetadata) => {
    setIsEditing(true);
    setCurrentFieldId(field.id);
    setName(field.name);
    setKey(field.key);
    setDescription(field.description || "");
    setType(field.type);
    setGroupName(field.group_name || "Sem grupo");
    setIsVisible(field.is_visible);
    setIsPrivate(field.is_private);
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!activeCompany?.id) return;
    if (!name.trim() || !key.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e Chave são campos obrigatórios.",
        variant: "destructive"
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
        is_private: isPrivate
      };

      if (isEditing && currentFieldId) {
        const { error } = await supabase
          .from("custom_fields_metadata")
          .update(fieldData)
          .eq("id", currentFieldId);
        if (error) throw error;
        toast({ title: "Campo atualizado com sucesso" });
      } else {
        const { error } = await supabase
          .from("custom_fields_metadata")
          .insert(fieldData);
        if (error) throw error;
        toast({ title: "Campo criado com sucesso" });
      }

      setIsOpen(false);
      fetchFields();
    } catch (err: any) {
      console.error("Error saving field metadata:", err);
      toast({
        title: "Erro ao salvar campo",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este campo? Os dados já salvos no lead não serão excluídos, mas o campo não estará visível no painel.")) return;

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
        variant: "destructive"
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
      
      // Update local state directly for responsive feedback
      setFields(prev => prev.map(f => f.id === field.id ? { ...f, is_visible: !f.is_visible } : f));
      toast({ 
        title: !field.is_visible ? "Visibilidade ativada" : "Visibilidade desativada",
        description: !field.is_visible ? "O campo agora estará visível no card do lead." : "O campo foi ocultado do card do lead."
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

      setFields(prev => prev.map(f => f.id === field.id ? { ...f, is_private: !f.is_private } : f));
      toast({ 
        title: !field.is_private ? "Privacidade definida como privada" : "Privacidade definida como pública"
      });
    } catch (err: any) {
      console.error("Error updating privacy:", err);
    }
  };

  // Filter fields by category
  const filteredFields = fields.filter(f => f.category === category);

  // Group fields
  const groups: Record<string, CustomFieldMetadata[]> = {};
  filteredFields.forEach(field => {
    const group = field.group_name || "Sem grupo";
    if (!groups[group]) groups[group] = [];
    groups[group].push(field);
  });

  const getFieldIcon = (fieldType: string) => {
    const matched = FIELD_TYPES.find(t => t.value === fieldType);
    return matched ? matched.icon : Type;
  };

  return (
    <Card className="border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden transition-colors hover:border-[#8A3CFF]/20">
      <CardHeader className="pb-4 border-b border-border/40 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            <Sliders className="h-5 w-5 text-[#8A3CFF]" />
            Campos Adicionais
          </CardTitle>
          <CardDescription>
            Configure os campos personalizados para Leads, Negócios ou Empresa. Habilite a visibilidade para mostrá-los no perfil do chat.
          </CardDescription>
        </div>
        <Button onClick={handleOpenCreate} className="bg-[#8A3CFF] hover:bg-[#7830E3] text-white gap-2 rounded-xl px-4 py-2 cursor-pointer transition-all duration-300">
          <Plus className="h-4 w-4" />
          Criar Campo
        </Button>
      </CardHeader>
      
      <CardContent className="pt-6">
        <Tabs value={category} onValueChange={(val: any) => setCategory(val)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/40 p-1 rounded-xl mb-6">
            <TabsTrigger value="lead" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-[#8A3CFF] data-[state=active]:font-semibold transition-all">Campos adicionais de lead</TabsTrigger>
            <TabsTrigger value="deal" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-[#8A3CFF] data-[state=active]:font-semibold transition-all">Campos adicionais de negócio</TabsTrigger>
            <TabsTrigger value="company" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-[#8A3CFF] data-[state=active]:font-semibold transition-all">Campos adicionais da empresa</TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#8A3CFF]" />
              <p className="text-sm text-muted-foreground">Carregando campos...</p>
            </div>
          ) : Object.keys(groups).length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border/40 rounded-xl">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-semibold mb-1">Nenhum campo personalizado</h3>
              <p className="text-xs text-muted-foreground mb-4">Crie campos personalizados para expandir o formulário de dados.</p>
              <Button onClick={handleOpenCreate} variant="outline" className="rounded-xl border-border/40">
                Criar Primeiro Campo
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groups).map(([groupName, groupFields]) => (
                <div key={groupName} className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <GripVertical className="h-3 w-3 text-muted-foreground/40" />
                      {groupName} ({groupFields.length})
                    </h3>
                  </div>

                  <div className="border border-border/40 rounded-xl overflow-hidden divide-y divide-border/30 bg-background/25">
                    {groupFields.map(field => {
                      const FieldIcon = getFieldIcon(field.type);
                      return (
                        <div key={field.id} className="flex items-center justify-between p-3.5 hover:bg-muted/15 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted/40 shrink-0 text-muted-foreground">
                              <FieldIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-card-foreground">{field.name}</span>
                                <span className="text-[10px] text-muted-foreground/60 font-mono">({field.key})</span>
                              </div>
                              {field.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{field.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Privacy Toggle (lock/unlock) */}
                            <button
                              onClick={() => togglePrivacy(field)}
                              title={field.is_private ? "Privado (Somente admins)" : "Público"}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                field.is_private 
                                  ? "border-amber-500/20 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" 
                                  : "border-border/40 hover:bg-muted/50 text-muted-foreground"
                              }`}
                            >
                              {field.is_private ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </button>

                            {/* Visibility eye toggle */}
                            <button
                              onClick={() => toggleVisibility(field)}
                              title={field.is_visible ? "Sempre visível no chat" : "Oculto no chat"}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                field.is_visible 
                                  ? "border-sky-500/20 bg-sky-500/10 text-sky-500 hover:bg-sky-500/20" 
                                  : "border-border/40 hover:bg-muted/50 text-muted-foreground"
                              }`}
                            >
                              {field.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>

                            <div className="flex gap-1 border-l border-border/40 pl-3">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit(field)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10" onClick={() => handleDelete(field.id)}>
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
        </Tabs>
      </CardContent>

      {/* Create / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[450px] border-white/20 bg-card/90 backdrop-blur-2xl rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-[#8A3CFF]" />
              {isEditing ? "Editar Campo Personalizado" : "Novo Campo Personalizado"}
            </DialogTitle>
            <DialogDescription>
              Defina as propriedades do campo personalizado para uso nos leads e workflows.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Campo *</Label>
              <Input 
                placeholder="Ex: Tipo de Projeto"
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="rounded-xl border-border/40 bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label>Chave do Campo (Variável) *</Label>
              <Input 
                placeholder="Ex: tipo_de_projeto" 
                value={key} 
                onChange={e => setKey(e.target.value)}
                disabled={isEditing}
                className="font-mono text-xs rounded-xl border-border/40 bg-background/50"
              />
              <p className="text-[10px] text-muted-foreground">Esta chave será usada para referenciar a variável nos workflows e APIs (ex: `{"{{tipo_de_projeto}}"}`).</p>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                placeholder="Uma breve explicação do que este campo representa..." 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                className="rounded-xl border-border/40 bg-background/50 resize-none h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Dado</Label>
                <Select value={type} onValueChange={(val: any) => setType(val)}>
                  <SelectTrigger className="rounded-xl border-border/40 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Grupo</Label>
                <Input 
                  placeholder="Ex: Gestão, Vendas" 
                  value={groupName} 
                  onChange={e => setGroupName(e.target.value)}
                  className="rounded-xl border-border/40 bg-background/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border border-border/30 rounded-xl bg-background/20 mt-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold">Sempre Visível no Chat</span>
                <span className="text-[10px] text-muted-foreground">Mostra este campo por padrão no painel lateral do lead no chat.</span>
              </div>
              <Switch checked={isVisible} onCheckedChange={setIsVisible} />
            </div>

            <div className="flex items-center justify-between p-3 border border-border/30 rounded-xl bg-background/20">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold">Campo Privado</span>
                <span className="text-[10px] text-muted-foreground">Ocultar o valor deste campo de operadores de nível básico.</span>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="bg-[#8A3CFF] hover:bg-[#7830E3] text-white rounded-xl transition-all">
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
