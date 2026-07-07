import { useState, useEffect } from "react";
import { 
  User, Plus, X, FileText, Tag, ChevronDown, ChevronRight, Save, Award, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChatConversation, PipelineStage } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LeadAvatar, LeadTags, DealPipelineStage, DealValue } from "../crm/shared";
import { useQuery } from "@tanstack/react-query";
import { Deal } from "@/types/crm.types";
import { format } from "date-fns";

interface LeadContextPanelProps {
  conversation: ChatConversation;
  stages: PipelineStage[];
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

export default function LeadContextPanel({ conversation, stages }: LeadContextPanelProps) {
  const { lead } = conversation;
  const { toast } = useToast();

  const [newTag, setNewTag] = useState("");
  const [localTags, setLocalTags] = useState<string[]>(lead?.tags || []);
  
  const [customFieldsMetadata, setCustomFieldsMetadata] = useState<CustomFieldMetadata[]>([]);
  const [name, setName] = useState(lead?.name || "");
  const [email, setEmail] = useState(lead?.email || "");
  const [phone, setPhone] = useState(lead?.phone || "");
  const [customFields, setCustomFields] = useState<Record<string, any>>((lead?.custom_fields as Record<string, any>) || {});
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    perfil: true,
    notas: true,
    negocio: true
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(lead?.name || "");
    setEmail(lead?.email || "");
    setPhone(lead?.phone || "");
    setCustomFields((lead?.custom_fields as Record<string, any>) || {});
    setLocalTags(lead?.tags || []);
  }, [lead]);

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

  // Fetch active deals for this lead
  const { data: activeDeals, isLoading: dealsLoading } = useQuery({
    queryKey: ['lead-active-deals', lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('lead_id', lead.id)
        .eq('status', 'open');
      if (error) throw error;
      return data as Deal[];
    },
    enabled: !!lead?.id
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAddTag = async () => {
    const tag = newTag.trim();
    if (!tag || localTags.includes(tag)) return;
    const updatedTags = [...localTags, tag];
    setLocalTags(updatedTags);
    setNewTag("");
    await supabase.from("leads").update({ tags: updatedTags }).eq("id", lead.id);
    toast({ title: "Tag adicionada" });
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = localTags.filter((t) => t !== tagToRemove);
    setLocalTags(updatedTags);
    await supabase.from("leads").update({ tags: updatedTags }).eq("id", lead.id);
    toast({ title: "Tag removida" });
  };

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
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFields(prev => ({ ...prev, [key]: value }));
  };

  const visibleFields = customFieldsMetadata.filter(m => m.is_visible);
  const fieldsByGroup: Record<string, CustomFieldMetadata[]> = {};
  visibleFields.forEach(f => {
    const group = f.group_name || "Sem grupo";
    const staticFields = ["empresa", "site", "documento", "data_nascimento"];
    if (staticFields.includes(f.key)) return;
    if (!fieldsByGroup[group]) fieldsByGroup[group] = [];
    fieldsByGroup[group].push(f);
  });

  return (
    <div className="w-[320px] shrink-0 border-l border-border/40 bg-card/20 flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* Contact Profile Header */}
      <div className="flex flex-col items-center text-center space-y-2 pb-2 border-b border-border/20">
        <LeadAvatar name={name} className="h-14 w-14 shadow-md" fallbackClassName="text-xl" />
        <div>
          <h3 className="font-bold text-sm text-card-foreground">{name || "Sem Nome"}</h3>
          <span className="text-[9px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
            Lead
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <Button variant="outline" className="text-[10px] h-7 px-1.5 border-border/40 font-semibold rounded-lg">+ Negócio</Button>
        <Button variant="outline" className="text-[10px] h-7 px-1.5 border-border/40 font-semibold rounded-lg">+ Tarefa</Button>
      </div>

      {/* Accordion: Negócios */}
      <div className="border border-border/30 rounded-xl overflow-hidden bg-background/20">
        <button 
          onClick={() => toggleSection("negocio")}
          className="w-full flex items-center justify-between p-3 text-xs font-bold text-card-foreground hover:bg-muted/10 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Award className="h-4 w-4 text-[#8A3CFF]" />
            Negócios em Andamento
          </span>
          {openSections.negocio ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        {openSections.negocio && (
          <div className="p-3 border-t border-border/20 space-y-2 bg-card/10 text-xs">
            {dealsLoading ? (
              <p className="text-center text-muted-foreground text-[10px] py-2">Carregando negócios...</p>
            ) : !activeDeals || activeDeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-3 px-2 text-center border border-dashed border-border/50 rounded-lg bg-background/50">
                <p className="text-[10px] text-muted-foreground mb-2">Nenhum negócio ativo encontrado.</p>
                <Button size="sm" variant="secondary" className="h-6 text-[10px] px-2">Criar Negócio</Button>
              </div>
            ) : (
              activeDeals.map(deal => {
                const stage = stages.find(s => s.id === deal.stage_id);
                return (
                  <div key={deal.id} className="p-2 border border-border/40 rounded-lg bg-background shadow-sm hover:border-primary/30 transition-colors cursor-pointer flex flex-col gap-1.5">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-[11px] truncate">{deal.title || "Sem título"}</span>
                      <DealValue value={deal.value} currency={deal.currency} className="text-[11px]" />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <DealPipelineStage stageName={stage?.name || "Sem etapa"} stageColor={stage?.color} className="text-[10px]" />
                      {deal.expected_close_date && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(deal.expected_close_date), 'dd/MM/yy')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
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
              <Input value={name} onChange={e => setName(e.target.value)} className="h-7 text-xs rounded-lg border-border/40 bg-background/50" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-semibold">E-mail</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-7 text-xs rounded-lg border-border/40 bg-background/50" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-semibold">Telefone</Label>
              <Input value={phone} disabled className="h-7 text-xs rounded-lg border-border/40 bg-muted/30 font-mono text-muted-foreground" />
            </div>
            
            <Button onClick={handleSaveProfile} disabled={isSaving} size="sm" className="w-full h-7 bg-[#8A3CFF] hover:bg-[#7830E3] text-white rounded-lg text-[10px] gap-1 mt-1">
              <Save className="h-3 w-3" />
              {isSaving ? "Salvando..." : "Salvar Perfil"}
            </Button>
          </div>
        )}
      </div>

      {/* Accordion: Notas */}
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
            <Button onClick={handleSaveProfile} size="sm" className="w-full h-7 bg-muted/40 hover:bg-muted/60 text-foreground border border-border/40 rounded-lg text-[10px]">
              Salvar Nota
            </Button>
          </div>
        )}
      </div>

      {/* Dynamic Group Foldouts */}
      {Object.entries(fieldsByGroup).map(([groupName, groupFields]) => {
        const sectionKey = groupName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
        const isOpen = !!openSections[sectionKey];
        
        return (
          <div key={groupName} className="border border-border/30 rounded-xl overflow-hidden bg-background/20">
            <button onClick={() => toggleSection(sectionKey)} className="w-full flex items-center justify-between p-3 text-xs font-bold text-card-foreground hover:bg-muted/10">
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
                    />
                  </div>
                ))}
                <Button onClick={handleSaveProfile} disabled={isSaving} size="sm" className="w-full h-7 bg-muted/40 hover:bg-muted/60 text-foreground border border-border/40 rounded-lg text-[10px]">
                  Salvar {groupName}
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Accordion: Etiquetas / Tags */}
      <div className="border border-border/30 rounded-xl overflow-hidden bg-background/20">
        <h4 className="flex items-center gap-1.5 p-3 text-xs font-bold text-card-foreground">
          <Tag className="h-4 w-4 text-[#8A3CFF]" />
          Etiquetas / Tags
        </h4>
        <div className="p-3 border-t border-border/20 space-y-3 bg-card/10">
          <LeadTags tags={localTags} maxVisible={10} />
          <div className="flex gap-1 pt-1">
            <Input placeholder="Nova tag..." value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddTag()} className="h-7 text-[10px] bg-background/50 rounded-lg" />
            <Button size="sm" onClick={handleAddTag} className="h-7 px-2 shrink-0 bg-[#8A3CFF] hover:bg-[#7830E3] rounded-lg">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
