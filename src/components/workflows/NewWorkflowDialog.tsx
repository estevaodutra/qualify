import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useWorkflowFolders } from "@/hooks/useWorkflowFolders";
import { useWorkflowDefinitions } from "@/hooks/useWorkflowDefinitions";

interface NewWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFolderId?: string | null;
}

const NEW_FOLDER_VALUE = "__new_folder__";
const NO_FOLDER_VALUE = "__no_folder__";

export function NewWorkflowDialog({ open, onOpenChange, defaultFolderId }: NewWorkflowDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const { folders, createFolder } = useWorkflowFolders();
  const { createWorkflowDefinition } = useWorkflowDefinitions();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState<string>(defaultFolderId || NO_FOLDER_VALUE);
  const [newFolderName, setNewFolderName] = useState("");
  const [isDraft, setIsDraft] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setFolderId(NO_FOLDER_VALUE);
    setNewFolderName("");
    setIsDraft(true);
  };

  const handleCreate = async () => {
    if (!user || !activeCompanyId) {
      toast.error("Selecione uma empresa ativa");
      return;
    }
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      let resolvedFolderId: string | null = null;
      if (folderId === NEW_FOLDER_VALUE) {
        if (newFolderName.trim()) {
          const created = await createFolder({ name: newFolderName.trim() });
          resolvedFolderId = created.id;
        }
      } else if (folderId !== NO_FOLDER_VALUE) {
        resolvedFolderId = folderId;
      }

      // Dispatch sequences are the general-purpose engine for new automations
      // -- already reused this way by the Prospecting module's queue -- and
      // require no channel-specific setup at creation time (that's a Campanha
      // concern, configured later, not an Automação concern).
      const { data: campaign, error: campaignError } = await supabase
        .from("dispatch_campaigns")
        .insert({ user_id: user.id, company_id: activeCompanyId, name: name.trim(), description: description.trim() || null, status: "draft" })
        .select()
        .single();
      if (campaignError) throw campaignError;

      const { data: sequence, error: sequenceError } = await supabase
        .from("dispatch_sequences")
        .insert({
          user_id: user.id,
          campaign_id: campaign.id,
          name: name.trim(),
          description: description.trim() || null,
          trigger_type: "manual",
          trigger_config: {},
          is_active: false,
        })
        .select()
        .single();
      if (sequenceError) throw sequenceError;

      const definition = await createWorkflowDefinition({
        name: name.trim(),
        description: description.trim() || undefined,
        folderId: resolvedFolderId,
        sourceType: "dispatch_sequence",
        sourceId: sequence.id,
        status: "draft",
        triggerType: "manual",
      });

      queryClient.invalidateQueries({ queryKey: ["dispatch_campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["dispatch_sequences"] });

      reset();
      onOpenChange(false);
      navigate(`/workflows/${definition.id}/builder`);
    } catch (error) {
      toast.error("Erro ao criar automação", { description: (error as Error).message });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <DialogContent className="rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Nova automação</DialogTitle>
          <DialogDescription className="text-sm font-medium text-muted-foreground/70">
            Dê um nome à automação. O gatilho e as mensagens são configurados no construtor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome da automação</Label>
            <Input
              placeholder="Ex: Boas-vindas novo cliente"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl bg-background/50 border-border/40"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição (opcional)</Label>
            <Textarea
              placeholder="Do que se trata esta automação?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl bg-background/50 border-border/40 resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pasta</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FOLDER_VALUE}>Sem pasta</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                ))}
                <SelectItem value={NEW_FOLDER_VALUE}>+ Criar nova pasta</SelectItem>
              </SelectContent>
            </Select>
            {folderId === NEW_FOLDER_VALUE && (
              <Input
                placeholder="Nome da nova pasta"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="h-10 rounded-xl bg-background/50 border-border/40 mt-2"
              />
            )}
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <Checkbox id="isDraft" checked={isDraft} onCheckedChange={(c) => setIsDraft(c as boolean)} disabled />
            <Label htmlFor="isDraft" className="text-sm font-medium leading-none text-muted-foreground">
              Criar como rascunho
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-semibold">
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className="rounded-xl gradient-primary glow-primary font-bold shadow-lg min-w-[140px]"
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <><Rocket className="mr-2 h-4 w-4" /> Criar automação</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
