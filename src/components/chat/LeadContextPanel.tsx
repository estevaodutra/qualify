import { useState, useEffect } from "react";
import { 
  User, Plus, X, FileText, Tag, ChevronDown, ChevronRight, Save, Award, Calendar, ListTodo, Paperclip, LayoutList, Download
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
import { cn } from "@/lib/utils";

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

  const [activeTab, setActiveTab] = useState<"info" | "negocios" | "tarefas" | "arquivos">("info");

  const [newTag, setNewTag] = useState("");
  const [localTags, setLocalTags] = useState<string[]>(lead?.tags || []);
  
  const [customFieldsMetadata, setCustomFieldsMetadata] = useState<CustomFieldMetadata[]>([]);
  const [name, setName] = useState(lead?.name || "");
  const [email, setEmail] = useState(lead?.email || "");
  const [phone, setPhone] = useState(lead?.phone || "");
  const [customFields, setCustomFields] = useState<Record<string, any>>((lead?.custom_fields as Record<string, any>) || {});
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    perfil: true,
    notas: true
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

  // Fetch active deals
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

  // Fetch tasks/activities
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['lead-activities', lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('lead_id', lead.id)
        .order('due_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!lead?.id && activeTab === "tarefas"
  });

  // Fetch files (from chat media)
  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ['lead-files', conversation.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, body, media_url, message_type, created_at')
        .eq('conversation_id', conversation.id)
        .neq('message_type', 'text')
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: activeTab === "arquivos"
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
    <div className="w-[340px] shrink-0 border-l border-border/40 bg-card/20 flex flex-col h-full overflow-hidden">
      {/* Contact Profile Header */}
      <div className="flex flex-col items-center text-center p-4 space-y-2 border-b border-border/20 shrink-0 bg-background/30 backdrop-blur-md">
        <LeadAvatar name={name} className="h-16 w-16 shadow-lg border-2 border-primary/20" fallbackClassName="text-2xl" />
        <div>
          <h3 className="font-bold text-base text-card-foreground leading-tight">{name || "Sem Nome"}</h3>
          <span className="text-[10px] text-muted-foreground font-mono mt-0.5 inline-block">{phone}</span>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex bg-muted/40 p-1 rounded-xl mt-3 w-full border border-border/40 shadow-inner">
          <button 
            onClick={() => setActiveTab("info")} 
            className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1", activeTab === "info" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <User className="h-3 w-3" /> Info
          </button>
          <button 
            onClick={() => setActiveTab("negocios")} 
            className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1", activeTab === "negocios" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <Award className="h-3 w-3" /> Negócios
          </button>
          <button 
            onClick={() => setActiveTab("tarefas")} 
            className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1", activeTab === "tarefas" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <ListTodo className="h-3 w-3" /> Tarefas
          </button>
          <button 
            onClick={() => setActiveTab("arquivos")} 
            className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1", activeTab === "arquivos" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <Paperclip className="h-3 w-3" /> Mídia
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        
        {/* TAB: INFO */}
        {activeTab === "info" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Accordion: Perfil */}
            <div className="border border-border/40 rounded-2xl overflow-hidden bg-background/40 shadow-sm">
              <button 
                onClick={() => toggleSection("perfil")}
                className="w-full flex items-center justify-between p-3 text-xs font-bold text-card-foreground hover:bg-muted/30 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <div className="bg-primary/10 p-1.5 rounded-lg"><User className="h-3.5 w-3.5 text-primary" /></div>
                  Detalhes do Contato
                </span>
                {openSections.perfil ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>

              {openSections.perfil && (
                <div className="p-3 border-t border-border/20 space-y-3 bg-card/10">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Nome Completo</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs rounded-xl border-border/40 bg-background/80 focus:bg-background" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">E-mail</Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-8 text-xs rounded-xl border-border/40 bg-background/80 focus:bg-background" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Telefone / WhatsApp</Label>
                    <Input value={phone} disabled className="h-8 text-xs rounded-xl border-border/40 bg-muted/30 font-mono text-muted-foreground" />
                  </div>
                  
                  <Button onClick={handleSaveProfile} disabled={isSaving} size="sm" className="w-full h-8 rounded-xl text-[10px] font-bold gap-1 mt-2">
                    <Save className="h-3.5 w-3.5" />
                    {isSaving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              )}
            </div>

            {/* Accordion: Notas */}
            <div className="border border-border/40 rounded-2xl overflow-hidden bg-background/40 shadow-sm">
              <button 
                onClick={() => toggleSection("notas")}
                className="w-full flex items-center justify-between p-3 text-xs font-bold text-card-foreground hover:bg-muted/30 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <div className="bg-yellow-500/10 p-1.5 rounded-lg"><FileText className="h-3.5 w-3.5 text-yellow-500" /></div>
                  Anotações Fixas
                </span>
                {openSections.notas ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>

              {openSections.notas && (
                <div className="p-3 border-t border-border/20 space-y-2 bg-card/10">
                  <Textarea 
                    placeholder="Digite notas importantes sobre o lead que ficarão sempre visíveis..."
                    value={customFields.notas || ""}
                    onChange={e => handleCustomFieldChange("notas", e.target.value)}
                    className="text-xs bg-background/80 border-border/40 focus:bg-background rounded-xl h-24 resize-none leading-relaxed"
                  />
                  <Button onClick={handleSaveProfile} size="sm" variant="secondary" className="w-full h-8 rounded-xl text-[10px] font-bold mt-1">
                    Salvar Notas
                  </Button>
                </div>
              )}
            </div>

            {/* Dynamic Group Foldouts */}
            {Object.entries(fieldsByGroup).map(([groupName, groupFields]) => {
              const sectionKey = groupName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
              const isOpen = !!openSections[sectionKey];
              
              return (
                <div key={groupName} className="border border-border/40 rounded-2xl overflow-hidden bg-background/40 shadow-sm">
                  <button onClick={() => toggleSection(sectionKey)} className="w-full flex items-center justify-between p-3 text-xs font-bold text-card-foreground hover:bg-muted/30 transition-colors">
                    <span className="flex items-center gap-2">
                      <div className="bg-blue-500/10 p-1.5 rounded-lg"><LayoutList className="h-3.5 w-3.5 text-blue-500" /></div>
                      {groupName}
                    </span>
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
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
                            className="h-8 text-xs rounded-xl border-border/40 bg-background/80 focus:bg-background"
                          />
                        </div>
                      ))}
                      <Button onClick={handleSaveProfile} disabled={isSaving} size="sm" variant="secondary" className="w-full h-8 rounded-xl text-[10px] font-bold mt-2">
                        Salvar {groupName}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Etiquetas / Tags (Always open at bottom) */}
            <div className="pt-2">
              <h4 className="flex items-center gap-2 px-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                <Tag className="h-3.5 w-3.5" />
                Etiquetas do Lead
              </h4>
              <div className="space-y-3 bg-background/40 border border-border/40 p-3 rounded-2xl shadow-sm">
                <LeadTags tags={localTags} maxVisible={20} />
                <div className="flex gap-2">
                  <Input placeholder="Nova etiqueta..." value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddTag()} className="h-8 text-[11px] bg-background/80 focus:bg-background rounded-xl flex-1" />
                  <Button size="icon" onClick={handleAddTag} className="h-8 w-8 shrink-0 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 shadow-none">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: NEGÓCIOS */}
        {activeTab === "negocios" && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <Button className="w-full rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary hover:bg-primary/90 shadow-md">
              <Plus className="h-4 w-4" /> Novo Negócio
            </Button>
            
            {dealsLoading ? (
              <p className="text-center text-muted-foreground text-[10px] py-4">Carregando negócios...</p>
            ) : !activeDeals || activeDeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-border/50 rounded-2xl bg-background/50">
                <Award className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-bold">Nenhum negócio ativo</p>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">Crie um negócio para acompanhar oportunidades financeiras com este lead.</p>
              </div>
            ) : (
              activeDeals.map(deal => {
                const stage = stages.find(s => s.id === deal.stage_id);
                return (
                  <div key={deal.id} className="p-3 border border-border/40 rounded-2xl bg-background/80 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm text-card-foreground leading-tight">{deal.title || "Sem título"}</span>
                      <DealValue value={deal.value} currency={deal.currency} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold" />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <DealPipelineStage stageName={stage?.name || "Sem etapa"} stageColor={stage?.color} className="text-[10px] font-bold" />
                      {deal.expected_close_date && (
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                          <Calendar className="w-3 h-3 text-primary/70" />
                          {format(new Date(deal.expected_close_date), 'dd/MM/yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB: TAREFAS */}
        {activeTab === "tarefas" && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <Button className="w-full rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary hover:bg-primary/90 shadow-md">
              <Plus className="h-4 w-4" /> Nova Tarefa
            </Button>
            
            {activitiesLoading ? (
              <p className="text-center text-muted-foreground text-[10px] py-4">Carregando tarefas...</p>
            ) : !activities || activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-border/50 rounded-2xl bg-background/50">
                <ListTodo className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-bold">Nenhuma tarefa agendada</p>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">Crie lembretes, reuniões ou ligações para interagir com este lead.</p>
              </div>
            ) : (
              activities.map(activity => (
                <div key={activity.id} className={cn(
                  "p-3 border rounded-2xl shadow-sm transition-all flex flex-col gap-1.5",
                  activity.completed_at ? "bg-muted/30 border-border/30 opacity-70" : "bg-background/80 border-border/50 hover:border-primary/30"
                )}>
                  <div className="flex justify-between items-start gap-2">
                    <span className={cn("font-bold text-xs leading-tight", activity.completed_at ? "line-through text-muted-foreground" : "text-card-foreground")}>
                      {activity.title}
                    </span>
                    <span className="text-[9px] uppercase font-bold tracking-wider bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                      {activity.type}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{activity.description}</p>
                  )}
                  {activity.due_at && (
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground mt-1">
                      <Calendar className="w-3 h-3 text-primary/70" />
                      {format(new Date(activity.due_at), "dd/MM/yyyy 'às' HH:mm")}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB: ARQUIVOS */}
        {activeTab === "arquivos" && (
          <div className="space-y-3 animate-in fade-in duration-300">
            {filesLoading ? (
              <p className="text-center text-muted-foreground text-[10px] py-4">Carregando mídia...</p>
            ) : !files || files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-border/50 rounded-2xl bg-background/50">
                <Paperclip className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-bold">Nenhum arquivo anexado</p>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">Os arquivos e mídias enviados na conversa aparecerão aqui.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {files.map(file => (
                  <a 
                    key={file.id} 
                    href={file.media_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="group border border-border/50 bg-background/60 rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all flex flex-col relative"
                  >
                    {file.message_type === 'image' ? (
                      <div className="aspect-square bg-muted/40 relative">
                        <img src={file.media_url} alt="Mídia" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Download className="text-white opacity-0 group-hover:opacity-100 h-6 w-6 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300" />
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-square bg-muted/20 flex flex-col items-center justify-center gap-2 p-2 relative group-hover:bg-primary/5 transition-colors">
                        <FileText className="h-8 w-8 text-primary/70" />
                        <span className="text-[9px] font-bold text-center uppercase text-muted-foreground">{file.message_type}</span>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                          <Download className="text-primary opacity-0 group-hover:opacity-100 h-6 w-6 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 drop-shadow-sm" />
                        </div>
                      </div>
                    )}
                    <div className="p-2 border-t border-border/40">
                      <p className="text-[9px] text-muted-foreground font-mono truncate">{format(new Date(file.created_at), "dd/MM/yyyy")}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
