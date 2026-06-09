import { useState } from "react";
import { User, Phone, Mail, Award, Tag, Sparkles, AlertCircle, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatConversation, PipelineStage } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface LeadContextPanelProps {
  conversation: ChatConversation;
  stages: PipelineStage[];
  onUpdateStage: (leadId: string, stageId: string | null) => Promise<any>;
}

export default function LeadContextPanel({ conversation, stages, onUpdateStage }: LeadContextPanelProps) {
  const { lead } = conversation;
  const [newTag, setNewTag] = useState("");
  const [localTags, setLocalTags] = useState<string[]>(lead?.tags || []);

  const getStageColor = (stageId: string | null) => {
    const stage = stages.find((s) => s.id === stageId);
    return stage ? stage.color : "#94a3b8";
  };

  const getStageName = (stageId: string | null) => {
    const stage = stages.find((s) => s.id === stageId);
    return stage ? stage.name : "Sem Etapa";
  };

  // Add tag to lead
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
  };

  // Remove tag from lead
  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = localTags.filter((t) => t !== tagToRemove);
    setLocalTags(updatedTags);

    await supabase
      .from("leads")
      .update({ tags: updatedTags })
      .eq("id", lead.id);
  };

  return (
    <div className="w-[300px] shrink-0 border-l border-border/40 bg-card/10 flex flex-col h-full overflow-y-auto p-4 space-y-6">
      {/* Contact Profile Header */}
      <div className="flex flex-col items-center text-center space-y-3">
        {/* Large Avatar bubble */}
        <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 shadow-md">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-base text-card-foreground">
            {lead?.name || "Sem Nome"}
          </h3>
          <span className="text-[10px] text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">
            Lead Whatsapp
          </span>
        </div>
      </div>

      <hr className="border-border/30" />

      {/* Information Details Card */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Informações de Contato
        </h4>
        
        <div className="space-y-3">
          {/* Phone */}
          <div className="flex items-center gap-2.5 text-xs text-card-foreground">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-mono">{lead?.phone}</span>
          </div>

          {/* Email */}
          <div className="flex items-center gap-2.5 text-xs text-card-foreground">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{lead?.email || "Nenhum e-mail"}</span>
          </div>
        </div>
      </div>

      <hr className="border-border/30" />

      {/* Pipeline Stage Card */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Award className="h-4 w-4 text-primary" />
          Funil de Vendas (CRM)
        </h4>

        {/* Selected Stage indicator badge */}
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: getStageColor(lead?.pipeline_stage_id) }}
          />
          <span className="text-xs font-semibold">
            {getStageName(lead?.pipeline_stage_id)}
          </span>
        </div>

        {/* Selector Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {stages.map((stage) => {
            const isCurrent = lead?.pipeline_stage_id === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => onUpdateStage(lead.id, stage.id)}
                className={cn(
                  "px-2 py-1.5 rounded-lg text-[10px] font-bold text-left border transition-all duration-300 cursor-pointer truncate",
                  isCurrent
                    ? "bg-card border-primary text-foreground shadow-sm"
                    : "bg-background/40 hover:bg-background/80 border-border/40 text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span>{stage.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-border/30" />

      {/* Lead Tags Card */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="h-4 w-4 text-primary" />
          Etiquetas / Tags
        </h4>

        {/* Existing Tags Wrapper */}
        <div className="flex flex-wrap gap-1">
          {localTags.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">Nenhuma tag cadastrada.</p>
          ) : (
            localTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[9px] font-bold flex items-center gap-1 pl-2 pr-1.5 py-0.5 bg-background border border-border/40 hover:bg-muted"
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

        {/* Add Tag Action */}
        <div className="flex gap-1.5 pt-1">
          <Input
            placeholder="Nova tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
            className="h-7 text-[10px] bg-background/50"
          />
          <Button size="sm" onClick={handleAddTag} className="h-7 px-2 shrink-0 cursor-pointer">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
