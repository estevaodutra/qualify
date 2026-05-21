import { useState, useRef, useMemo } from "react";
import { URACampaign } from "@/hooks/useURACampaigns";
import { useURALeads, URALeadStatus, URALead } from "@/hooks/useURALeads";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Upload, UserPlus, Search, RefreshCw, X, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface URALeadsTabProps {
  campaign: URACampaign;
}

const statusLabels: Record<URALeadStatus, string> = {
  pending: "Pendente",
  calling: "Ligando",
  in_progress: "Em Progresso",
  completed: "Concluido",
  no_answer: "Nao Atendeu",
  busy: "Ocupado",
  failed: "Falhou",
  cancelled: "Cancelado",
};

const statusColors: Record<URALeadStatus, string> = {
  pending: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  calling: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  no_answer: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  busy: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  failed: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  cancelled: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function URALeadsTab({ campaign }: URALeadsTabProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [statusFilter, setStatusFilter] = useState<URALeadStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newLead, setNewLead] = useState({ phone: "", name: "", email: "" });
  const [isDispatching, setIsDispatching] = useState(false);

  const currentStatusFilter = statusFilter === "all" ? undefined : statusFilter;
  const {
    leads,
    isLoading,
    stats,
    addLead,
    addLeadsBatch,
    deleteLead,
    resetLeads,
    isAdding,
    isBatchAdding,
    isDeleting,
    isResetting,
  } = useURALeads(campaign.id, currentStatusFilter);

  // Search filter clientside
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch =
        l.phone.includes(search) ||
        (l.name && l.name.toLowerCase().includes(search.toLowerCase())) ||
        (l.email && l.email.toLowerCase().includes(search.toLowerCase()));
      return matchesSearch;
    });
  }, [leads, search]);

  const handleManualAdd = async () => {
    if (!newLead.phone) return;
    try {
      await addLead(newLead);
      setShowAddDialog(false);
      setNewLead({ phone: "", name: "", email: "" });
    } catch (err) {
      // toast already handled by hook
    }
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        const newLeads = [];

        // Skip header if looks like one, or just parse
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const parts = line.split(",");
          let phone = parts[0]?.trim();
          let name = parts[1]?.trim() || "";
          let email = parts[2]?.trim() || "";

          // if phone is completely non-numeric, it might be a header.
          if (!/^\d+$/.test(phone.replace(/\D/g, ""))) continue;

          newLeads.push({ phone, name, email });
        }

        if (newLeads.length === 0) {
          toast({ title: "Arquivo vazio", description: "Nenhum lead valido encontrado no CSV.", variant: "destructive" });
          return;
        }

        await addLeadsBatch(newLeads);
      } catch (err) {
        console.error("Erro ao ler CSV", err);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleDispatch = async () => {
    if (!campaign.mosCampaignId) {
      toast({ title: "Atencao", description: "A campanha precisa estar sincronizada com a MOS BR (aba Configuracoes).", variant: "destructive" });
      return;
    }
    if (!campaign.audioValue) {
      toast({ title: "Atencao", description: "Faca o upload de um audio na aba Configuracoes primeiro.", variant: "destructive" });
      return;
    }
    if ((stats?.pending || 0) === 0) {
      toast({ title: "Atencao", description: "Nenhum lead pendente para disparar." });
      return;
    }

    setIsDispatching(true);
    try {
      const { data, error } = await supabase.functions.invoke("ura-campaign-dispatch", {
        body: { campaign_id: campaign.id },
      });

      if (error) throw new Error(error.message || "Erro desconhecido ao chamar a Edge Function");
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Disparo iniciado!",
        description: `Enviados ${data.count || 0} leads para a MOS BR. Acompanhe o status.`,
      });
      // The function changes status to in_progress in DB. Wait a bit then UI will refresh.
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro no disparo", description: err.message, variant: "destructive" });
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto flex-1">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-full sm:w-44 h-10">
              <SelectValue placeholder="Filtrar por Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in_progress">Em Progresso</SelectItem>
              <SelectItem value="completed">Concluido</SelectItem>
              <SelectItem value="no_answer">Nao Atendeu</SelectItem>
              <SelectItem value="busy">Ocupado</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 w-full sm:w-auto justify-end flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          <Button
            variant="outline"
            className="h-10 gap-2 w-full sm:w-auto border-border"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBatchAdding || isDispatching}
          >
            <Upload className="h-4 w-4 text-muted-foreground" />
            {isBatchAdding ? "Importando..." : "Importar CSV"}
          </Button>

          <Button
            variant="outline"
            className="h-10 gap-2 w-full sm:w-auto border-border"
            onClick={() => setShowAddDialog(true)}
            disabled={isAdding || isDispatching}
          >
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            Adicionar Lead
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="h-10 gap-2 w-full sm:w-auto text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                disabled={isResetting || (stats?.total === 0) || isDispatching}
              >
                <RefreshCw className="h-4 w-4" />
                Reiniciar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reiniciar campanha de URA?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso voltara o status de todos os leads para "Pendente" e limpara as tentativas e teclas pressionadas. util para reexecutar a campanha.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => resetLeads()}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            variant="default"
            className="h-10 gap-2 w-full sm:w-auto shadow-sm"
            onClick={handleDispatch}
            disabled={isDispatching || (stats?.pending === 0) || !campaign.mosCampaignId}
          >
            {isDispatching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            {isDispatching ? "Enviando..." : "Disparar Campanha"}
          </Button>
        </div>
      </div>

      {/* Leads Table */}
      <Card className="border-border shadow-sm rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Carregando leads...</div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Nenhum lead cadastrado ou encontrado.</div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tentativas</TableHead>
                <TableHead>Tecla DTMF</TableHead>
                <TableHead>Duracao</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-muted/10">
                  <TableCell className="font-medium">{lead.name || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{lead.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.email || "-"}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[lead.status] || "bg-slate-100 text-slate-700"}>
                      {statusLabels[lead.status] || lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-center">{lead.attempts}</TableCell>
                  <TableCell className="text-center">
                    {lead.dtmfPressed ? (
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-2 py-0.5">
                        Tecla {lead.dtmfPressed}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {lead.durationSeconds != null ? `${lead.durationSeconds}s` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteLead(lead.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Manual Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Lead Manualmente</DialogTitle>
            <DialogDescription>Digite as informacoes basicas do contato.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone (DDI+DDD+Numero)</Label>
              <Input
                id="phone"
                placeholder="Ex: 5511999999999"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Nome (Opcional)</Label>
              <Input
                id="name"
                placeholder="Ex: Joao da Silva"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email (Opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ex: joao@email.com"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleManualAdd} disabled={!newLead.phone.trim() || isAdding}>
              {isAdding ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
