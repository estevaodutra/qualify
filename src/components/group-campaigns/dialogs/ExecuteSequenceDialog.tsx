import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSequences, MessageSequence } from "@/hooks/useSequences";
import { GroupMember } from "@/hooks/useGroupMembers";
import { Search, Play, Loader2, ListOrdered, Users, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExecuteSequenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMembers: GroupMember[];
  campaignId: string;
}

export function ExecuteSequenceDialog({ open, onOpenChange, selectedMembers, campaignId }: ExecuteSequenceDialogProps) {
  const { sequences } = useSequences(campaignId);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [startOption, setStartOption] = useState<"now" | "scheduled">("now");
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(false);

  const activeSequences = useMemo(
    () => (sequences || []).filter((s) => s.active),
    [sequences]
  );

  const filteredSequences = useMemo(
    () => activeSequences.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [activeSequences, searchQuery]
  );

  const selectedSequence = activeSequences.find((s) => s.id === selectedSequenceId);
  const nodeCount = selectedSequence?.nodes?.length || 0;
  const totalMessages = nodeCount * selectedMembers.length;

  const handleExecute = async () => {
    if (!selectedSequenceId) return;
    setLoading(true);
    try {
      const phones = selectedMembers
        .filter((m) => !activeOnly || m.status === "active")
        .map((m) => m.phone);

      if (phones.length === 0) {
        toast.error("Nenhum membro ativo selecionado.");
        return;
      }

      const { error } = await supabase.functions.invoke("execute-message", {
        body: {
          campaignId,
          sequenceId: selectedSequenceId,
          targetPhones: phones,
        },
      });

      if (error) throw error;
      toast.success(`Sequência iniciada para ${phones.length} membros!`);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao executar sequência:", err);
      toast.error("Erro ao executar sequência.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Executar Sequência
          </DialogTitle>
          <DialogDescription>
            Executar uma sequência para {selectedMembers.length} membros selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Search */}
          <div>
            <Label className="text-sm font-medium">Selecione a Sequência *</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar sequência..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Sequence list */}
          <ScrollArea className="h-48 border rounded-md">
            <div className="p-2 space-y-2">
              {filteredSequences.map((seq) => (
                <div
                  key={seq.id}
                  onClick={() => setSelectedSequenceId(seq.id)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-colors border",
                    selectedSequenceId === seq.id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListOrdered className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{seq.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {seq.nodes?.length || 0} nós
                    </Badge>
                  </div>
                  {seq.description && (
                    <p className="text-xs text-muted-foreground mt-1 ml-6">{seq.description}</p>
                  )}
                </div>
              ))}
              {filteredSequences.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sequência encontrada</p>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Opções de Execução</Label>
            <RadioGroup value={startOption} onValueChange={(v) => setStartOption(v as "now" | "scheduled")}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="now" id="seq-now" />
                <Label htmlFor="seq-now" className="text-sm">Imediatamente</Label>
              </div>
            </RadioGroup>

            <div className="flex items-center gap-2">
              <Checkbox
                id="seq-active-only"
                checked={activeOnly}
                onCheckedChange={(c) => setActiveOnly(!!c)}
              />
              <Label htmlFor="seq-active-only" className="text-sm">Enviar apenas para membros ativos</Label>
            </div>
          </div>

          {/* Summary */}
          {selectedSequence && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Resumo</Label>
                <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="h-4 w-4 text-muted-foreground" />
                    <span>Sequência: <strong>{selectedSequence.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Membros: <strong>{selectedMembers.length}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>Nós: <strong>{nodeCount}</strong> por membro = <strong>{totalMessages}</strong> no total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Início: <strong>Imediatamente</strong></span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleExecute} disabled={!selectedSequenceId || loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Executar Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
