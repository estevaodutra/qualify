import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGroupExecutionList, GroupExecutionList } from "@/hooks/useGroupExecutionList";
import { GroupMember } from "@/hooks/useGroupMembers";
import { Search, Send, Loader2, ListChecks, Users, Clock, Info, Webhook, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExecuteListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMembers: GroupMember[];
  campaignId: string;
}

const ACTION_LABELS: Record<string, string> = {
  webhook: "Webhook",
  message: "Mensagem",
  call: "Ligação",
};

function ActionIcon({ type, className }: { type: string; className?: string }) {
  if (type === "webhook") return <Webhook className={className} />;
  if (type === "message") return <MessageSquare className={className} />;
  if (type === "call") return <Phone className={className} />;
  return <ListChecks className={className} />;
}

function listPreview(list: GroupExecutionList): string {
  if (list.action_type === "webhook") return list.webhook_url || "—";
  if (list.action_type === "message") return list.message_template?.slice(0, 80) || "—";
  if (list.action_type === "call") return `Campanha: ${list.call_campaign_id?.slice(0, 8) ?? "—"}`;
  return "—";
}

export function ExecuteListDialog({ open, onOpenChange, selectedMembers, campaignId }: ExecuteListDialogProps) {
  const { lists, isLoading, manualExecute } = useGroupExecutionList(campaignId);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [interval, setInterval] = useState(5);
  const [activeOnly, setActiveOnly] = useState(true);

  const activeLists = useMemo(() => lists.filter((l) => l.is_active), [lists]);

  const filteredLists = useMemo(
    () =>
      activeLists.filter((l) =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ACTION_LABELS[l.action_type]?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [activeLists, searchQuery]
  );

  const selectedList = activeLists.find((l) => l.id === selectedListId);
  const targetMembers = useMemo(
    () => selectedMembers.filter((m) => !activeOnly || m.status === "active"),
    [selectedMembers, activeOnly]
  );
  const targetCount = targetMembers.length;
  const estimatedTime = Math.max(1, Math.ceil((targetCount * interval) / 60));

  const handleExecute = async () => {
    if (!selectedListId) return;
    if (targetMembers.length === 0) {
      toast.error("Nenhum membro elegível selecionado.");
      return;
    }

    try {
      const members = targetMembers
        .filter((m) => !!m.phone)
        .map((m) => ({ phone: m.phone as string, lid: m.lid ?? null, name: m.name ?? null }));

      const result = await manualExecute.mutateAsync({
        listId: selectedListId,
        members,
        intervalSeconds: interval,
      });

      const ok = result?.processed ?? 0;
      const errs = result?.errors ?? 0;
      if (errs > 0) {
        toast.warning(`Processado: ${ok} • Falhas: ${errs}`);
      } else {
        toast.success(`Lista executada para ${ok} membro(s)!`);
      }
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao executar lista:", err);
      toast.error("Erro ao executar lista.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Executar Lista
          </DialogTitle>
          <DialogDescription>
            Disparar a ação configurada de uma Lista de Execução para {selectedMembers.length} membro(s) selecionado(s).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div>
            <Label className="text-sm font-medium">Selecione a Lista de Execução *</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar lista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ScrollArea className="h-56 border rounded-md">
            <div className="p-2 space-y-2">
              {isLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
              )}
              {!isLoading && filteredLists.map((list) => (
                <div
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-colors border",
                    selectedListId === list.id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ActionIcon type={list.action_type} className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{list.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {ACTION_LABELS[list.action_type] || list.action_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6 line-clamp-1 font-mono">
                    {listPreview(list)}
                  </p>
                </div>
              ))}
              {!isLoading && filteredLists.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma lista de execução ativa encontrada para esta campanha.
                </p>
              )}
            </div>
          </ScrollArea>

          {selectedList && (
            <div className="border rounded-md p-3 bg-muted/50 space-y-1">
              <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
              <p className="text-sm font-medium flex items-center gap-2">
                <ActionIcon type={selectedList.action_type} className="h-4 w-4" />
                {ACTION_LABELS[selectedList.action_type]}
              </p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {listPreview(selectedList)}
              </p>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-medium">Opções de Envio</Label>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Intervalo entre execuções</Label>
              <Select value={interval.toString()} onValueChange={(v) => setInterval(Number(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 10, 15, 30].map((s) => (
                    <SelectItem key={s} value={s.toString()}>{s} segundos</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" /> Intervalo recomendado para evitar bloqueios.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="list-active-only"
                checked={activeOnly}
                onCheckedChange={(c) => setActiveOnly(!!c)}
              />
              <Label htmlFor="list-active-only" className="text-sm">Executar apenas para membros ativos</Label>
            </div>
          </div>

          {selectedList && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Resumo</Label>
                <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    <span>Lista: <strong>{selectedList.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Alvos: <strong>{targetCount} membro(s)</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Tempo estimado: <strong>~{estimatedTime} min</strong></span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={manualExecute.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleExecute}
            disabled={!selectedListId || manualExecute.isPending || targetCount === 0}
          >
            {manualExecute.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Executar Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
