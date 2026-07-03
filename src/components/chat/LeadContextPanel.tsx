import { useState, useEffect } from "react";
import { 
  User, Phone, Mail, Award, Tag, Plus, X, Globe, FileText, Calendar, 
  Building2, ChevronDown, ChevronRight, Save, Trash2, Edit, Check, DollarSign, MapPin
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChatConversation, PipelineStage } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface LeadContextPanelProps {
  conversation: ChatConversation;
  stages: PipelineStage[];
  onUpdateStage: (leadId: string, stageId: string | null) => Promise<any>;
}

interface CustomFieldMetadata {
  id: string;
  name: string;
  key: string;
  description: string | null;
  type: string;
  category: string;
  group_name: string | null;
  is_visible: boolean;
}

export default function LeadContextPanel({ conversation, stages, onUpdateStage }: LeadContextPanelProps) {
  const { lead } = conversation;
  const { toast } = useToast();

  const [newTag, setNewTag] = useState("");
  const [localTags, setLocalTags] = useState<string[]>(lead?.tags || []);
  
  // Custom fields metadata
  const [customFieldsMetadata, setCustomFieldsMetadata] = useState<CustomFieldMetadata[]>([]);
  
  // Core Profile States
  const [name, setName] = useState(lead?.name || "");
  const [email, setEmail] = useState(lead?.email || "");
  const [phone, setPhone] = useState(lead?.phone || "");
  
  // Custom Profile States (stored inside lead.custom_fields)
  const [customFields, setCustomFields] = useState<Record<string, any>>((lead?.custom_fields as Record<string, any>) || {});
  
  // Accordion Foldout states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    perfil: true,
    notas: true,
    endereco: false,
    gestao: false,
    lead: false,
    negocio: true
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(lead?.name || "");
    setEmail(lead?.email || "");
    setPhone(lead?.phone || "");
    const cf = (lead?.custom_fields as Record<string, any>) || {};
    setCustomFields(cf);
    setLocalTags(lead?.tags || []);
  }, [lead]);

  // Load custom fields metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!conversation.company_id) return;
      try {
        const { data, error } = await supabase
          .from("custom_fields_metadata")
          .select("*")
          .eq("company_id", conversation.company_id);
        
        if (error) throw error;
        setCustomFieldsMetadata(data || []);
      } catch (err) {
        console.error("Error loading custom fields metadata:", err);
      }
    };
    fetchMetadata();
  }, [conversation.company_id]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getStageColor = (stageId: string | null) => {
    const stage = stages.find((s) => s.id === stageId);
    return stage ? stage.color : "#94a3b8";
  };

  const getStageName = (stageId: string | null) => {
    const stage = stages.find((s) => s.id === stageId);
    return stage ? stage.name : "Sem Etapa";
  };

  // Add tag
  const handleAddTag = async () => {
    const tag = newTag.trim();
    if (!tag || localTags.includes(tag)) return;

    const updatedTags = [...localTags, tag];
    setLocalTags(updatedTags);
    setNewTag("");

    await supabase
      .from("leads")
      .update({ tags: updatedTags })
      .eq("id", lead.id);
    
    toast({ title: "Tag adicionada" });
  };

  // Remove tag
  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = localTags.filter((t) => t !== tagToRemove);
    setLocalTags(updatedTags);

    await supabase
      .from("leads")
      .update({ tags: updatedTags })
      .eq("id", lead.id);
      
    toast({ title: "Tag removida" });
  };

  // Save Lead profile and custom fields
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({
          name: name.trim() || null,
          email: email.trim() || null,
          custom_fields: customFields
        })
        .eq("id", lead.id);

      if (error) throw error;
      toast({ title: "Perfil salvo com sucesso!" });
    } catch (err: any) {
      console.error("Error saving lead profile:", err);
      toast({
        title: "Erro ao salvar",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFields(prev => ({ ...prev, [key]: value }));
  };

  // Group dynamic custom fields
  const visibleFields = customFieldsMetadata.filter(m => m.is_visible);
  
  // Categorize visible fields by group_name
  const fieldsByGroup: Record<string, CustomFieldMetadata[]> = {};
  visibleFields.forEach(f => {
    const group = f.group_name || "Sem grupo";
    // Skip if it is a standard profile field that we render statically in the "Perfil" section
    const staticFields = ["empresa", "site", "documento", "data_nascimento"];
    if (staticFields.includes(f.key)) return;
    
    if (!fieldsByGroup[group]) fieldsByGroup[group] = [];
    fieldsByGroup[group].push(f);
  });

  return (
    <div className="w-[320px] shrink-0 border-l border-border/40 bg-card/20 flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* Contact Profile Header */}
      <div className="flex flex-col items-center text-center space-y-2 pb-2 border-b border-border/20">
        <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-[#8A3CFF]/30 to-[#8A3CFF]/10 flex items-center justify-center border border-[#8A3CFF]/20 shadow-md">
          <User className="h-7 w-7 text-[#8A3CFF]" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-card-foreground">
            {name || "Sem Nome"}
          </h3>
          <span className="text-[9px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
            Lead Whatsapp
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        <Button variant="outline" className="text-[10px] h-7 px-1.5 border-border/40 font-semibold rounded-lg">+ Negócio</Button>
        <Button variant="outline" className="text-[10px] h-7 px-1.5 border-border/40 font-semibold rounded-lg">Automação</Button>
        <Button variant="outline" className="text-[10px] h-7 px-1.5 border-border/40 font-semibold rounded-lg">+ Lista</Button>
      </div>

      {/* Accordion: Perfil (Static standard profile fields) */}
      <div className="border border-border/30 rounded-xl overflow-hidden bg-background/20">
        <button 
          onClick={() => toggleSection("perfil")}
          className="w-full flex items-center justify-between p-3 text-xs font-bold text-card-foreground hover:bg-muted/10 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4 text-[#8A3CFF]" />
            Perfil
          </span>
          {openSections.perfil ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        {openSections.perfil && (
          <div className="p-3 border-t border-border/20 space-y-3 bg-card/10">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-semibold">Nome</Label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="h-7 text-xs rounded-lg border-border/40 bg-background/50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-semibold">E-mail</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="h-7 text-xs rounded-lg border-border/40 bg-background/50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-semibold">Telefone</Label>
              <Input 
                value={phone} 
                disabled
                className="h-7 text-xs rounded-lg border-border/40 bg-muted/30 font-mono text-muted-foreground"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-semibold">Empresa</Label>
              <Input 
                value={customFields.empresa || ""} 
                onChange={e => handleCustomFieldChange("empresa", e.target.value)}
                className="h-7 text-xs rounded-lg border-border/40 bg-background/50"
                placeholder="Informe a empresa..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-semibold">Site</Label>
              <Input 
                value={customFields.site || ""} 
                onChange={e => handleCustomFieldChange("site", e.target.value)}
                className="h-7 text-xs rounded-lg border-border/40 bg-background/50 font-mono"
                placeholder="www.site.com.br"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground font-semibold">Documento</Label>
                <Input 
                  value={customFields.documento || ""} 
                  onChange={e => handleCustomFieldChange("documento", e.target.value)}
                  className="h-7 text-xs rounded-lg border-border/40 bg-background/50 font-mono"
                  placeholder="CPF/CNPJ"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground font-semibold">Nascimento</Label>
                <Input 
                  type="text" 
                  value={customFields.data_nascimento || ""} 
                  onChange={e => handleCustomFieldChange("data_nascimento", e.target.value)}
                  className="h-7 text-xs rounded-lg border-border/40 bg-background/50"
                  placeholder="dd/MM/yyyy"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleSaveProfile} 
              disabled={isSaving} 
              size="sm" 
              className="w-full h-7 bg-[#8A3CFF] hover:bg-[#7830E3] text-white rounded-lg text-[10px] gap-1 cursor-pointer transition-all mt-1"
            >
              <Save className="h-3 w-3" />
              {isSaving ? "Salvando..." : "Salvar Perfil"}
            </Button>
          </div>
        )}
      </div>

      {/* Accordion: Notas (Lead observations) */}
      <div className="border border-border/30 rounded-xl overflow-hidden bg-background/20">
        <button 
          onClick={() => toggleSection("notas")}
          className="w-full flex items-center justify-between p-3 text-xs font-bold text-card-foreground hover:bg-muted/10 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-[#8A3CFF]" />
            Notas
          </span>
          {openSections.notas ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        {openSections.notas && (
          <div className="p-3 border-t border-border/20 space-y-2 bg-card/10">
            <Textarea 
              placeholder="Digite notas e observações sobre o lead..."
              value={customFields.notas || ""}
              onChange={e => handleCustomFieldChange("notas", e.target.value)}
              className="text-xs bg-background/50 border-border/40 rounded-lg h-20 resize-none"
            />
            <Button 
              onClick={handleSaveProfile} 
              size="sm" 
              className="w-full h-7 bg-muted/40 hover:bg-muted/60 text-foreground border border-border/40 rounded-lg text-[10px] gap-1 cursor-pointer"
            >
              Salvar Nota
            </Button>
          </div>
        )}
      </div>

      {/* Dynamic Group Foldouts (ex: Gestão, Endereço, Lead) */}
      {Object.entries(fieldsByGroup).map(([groupName, groupFields]) => {
        const sectionKey = groupName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
        const isOpen = !!openSections[sectionKey];
        
        return (
          <div key={groupName} className="border border-border/30 rounded-xl overflow-hidden bg-background/20">
            <button 
              onClick={() => toggleSection(sectionKey)}
              className="w-full flex items-center justify-between p-3 text-xs font-bold text-card-foreground hover:bg-muted/10 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-[#8A3CFF]" />
                {groupName}
              </span>
              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>

            {isOpen && (
              <div className="p-3 border-t border-border/20 space-y-3 bg-card/10">
                {groupFields.map(field => (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">{field.name}</Label>
                    <Input 
                      type={field.type === "date" ? "date" : "text"}
                      value={customFields[field.key] || ""} 
                      onChange={e => handleCustomFieldChange(field.key, e.target.value)}
                      className="h-7 text-xs rounded-lg border-border/40 bg-background/50"
                      placeholder={`Informe ${field.name.toLowerCase()}...`}
                    />
                  </div>
                ))}
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={isSaving}
                  size="sm" 
                  className="w-full h-7 bg-muted/40 hover:bg-muted/60 text-foreground border border-border/40 rounded-lg text-[10px] gap-1 cursor-pointer"
                >
                  Salvar {groupName}
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Accordion: Funil de Vendas (CRM) / Negócio */}
      <div className="border border-border/30 rounded-xl overflow-hidden bg-background/20">
        <button 
          onClick={() => toggleSection("negocio")}
          className="w-full flex items-center justify-between p-3 text-xs font-bold text-card-foreground hover:bg-muted/10 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Award className="h-4 w-4 text-[#8A3CFF]" />
            Negócio
          </span>
          {openSections.negocio ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        {openSections.negocio && (
          <div className="p-3 border-t border-border/20 space-y-4 bg-card/10 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-semibold">Etapa Atual:</span>
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: getStageColor(lead?.pipeline_stage_id) }}
                />
                <span className="font-bold">
                  {getStageName(lead?.pipeline_stage_id)}
                </span>
              </div>
            </div>

            {/* Selector Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {stages.map((stage) => {
                const isCurrent = lead?.pipeline_stage_id === stage.id;
                return (
                  <button
                    key={stage.id}
                    onClick={() => onUpdateStage(lead.id, stage.id)}
                    className={cn(
                      "px-2 py-1.5 rounded-lg text-[10px] font-bold text-left border transition-all cursor-pointer truncate",
                      isCurrent
                        ? "bg-card border-[#8A3CFF] text-[#8A3CFF] shadow-sm"
                        : "bg-background/40 hover:bg-background/80 border-border/40 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <div
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span>{stage.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Accordion: Etiquetas / Tags */}
      <div className="border border-border/30 rounded-xl overflow-hidden bg-background/20">
        <h4 className="flex items-center gap-1.5 p-3 text-xs font-bold text-card-foreground">
          <Tag className="h-4 w-4 text-[#8A3CFF]" />
          Etiquetas / Tags
        </h4>

        <div className="p-3 border-t border-border/20 space-y-3 bg-card/10">
          <div className="flex flex-wrap gap-1">
            {localTags.length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic">Nenhuma tag cadastrada.</p>
            ) : (
              localTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[9px] font-bold flex items-center gap-1 pl-2 pr-1 py-0.5 bg-background border border-border/40 hover:bg-muted"
                >
                  {tag}
                  <X
                    className="h-3 w-3 text-muted-foreground/60 hover:text-destructive cursor-pointer shrink-0"
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))
            )}
          </div>

          <div className="flex gap-1 pt-1">
            <Input
              placeholder="Nova tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              className="h-7 text-[10px] bg-background/50 rounded-lg"
            />
            <Button size="sm" onClick={handleAddTag} className="h-7 px-2 shrink-0 bg-[#8A3CFF] hover:bg-[#7830E3] cursor-pointer rounded-lg">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
