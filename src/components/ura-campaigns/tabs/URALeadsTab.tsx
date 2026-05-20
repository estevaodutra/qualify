import { useState, useRef, useMemo } from "react";
import { URACampaign } from "@/hooks/useURACampaigns";
import { useURALeads, URALeadStatus, URALead } from "@/hooks/useURALeads";
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
import { Plus, Trash2, Upload, UserPlus, Search, RefreshCw, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface URALeadsTabProps {
  campaign: URACampaign;
}

const statusLabels: Record<URALeadStatus, string> = {
  pending: "Pendente",
  calling: "Ligando",
  in_progress: "Em Progresso",
  completed: "Concluído",
  no_answer: "Não Atendeu",
  busy: "Ocupado",
  failed: "Falhou",
  cancelled: "Cancelado",
};

const statusColors: Record<URALeadStatus, string> = {
  pending: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350",
  calling: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  no_answer: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-455",
  busy: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  failed: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  cancelled: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350",
};

export function URALeadsTab({ campaign }: URALeadsTabProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [statusFilter, setStatusFilter] = useState<URALeadStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newLead, setNewLead] = useState({ phone: "", name: "", email: "" });

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
        (l.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (l.email?.toLowerCase() || "").includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [leads, search]);

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length <= 1) {
          toast({
            title: "Arquivo vazio",
            description: "O arquivo CSV enviado não contém dados de lead.",
            variant: "destructive",
          });
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
        const phoneIndex = headers.findIndex(
          (h) => h.includes("phone") || h.includes("tel") || h.includes("fone") || h.includes("cel")
        );
        const nameIndex = headers.findIndex((h) => h.includes("name") || h.includes("nome"));
        const emailIndex = headers.findIndex((h) => h.includes("email") || h.includes("mail"));

        if (phoneIndex === -1) {
          toast({
            title: "Telefone não encontrado",
            description: "Certifique-se de que o CSV possui uma coluna 'telefone' ou 'phone'.",
            variant: "destructive",
          });
          return;
        }

        const leadsToAdd = lines
          .slice(1)
          .map((line) => {
            const cols = line.split(",").map((s) => s.trim().replace(/"/g, ""));
            const phone = cols[phoneIndex];
            const name = nameIndex !== -1 ? cols[nameIndex] : null;
            const email = emailIndex !== -1 ? cols[emailIndex] : null;

            // Custom fields: any column that is not name, phone, or email
            const customFields: Record<string, any> = {};
            headers.forEach((h, idx) => {
              if (idx !== phoneIndex && idx !== nameIndex && idx !== emailIndex && cols[idx]) {
                customFields[h] = cols[idx];
              }
            });

            return { phone, name, email, customFields };
          })
          .filter((l) => l.phone);

        if (leadsToAdd.length === 0) {
          toast({
            title: "Nenhum lead válido",
            description: "Nenhum lead com telefone válido foi encontrado no CSV.",
            variant: "destructive",
          });
          return;
        }

        await addLeadsBatch(leadsToAdd);
      } catch (err: any) {
        toast({
          title: "Erro ao importar",
          description: err.message || "Houve uma falha ao processar o CSV.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleManualAdd = async () => {
    if (!newLead.phone.trim()) return;

    try {
      await addLead({
        phone: newLead.phone.trim(),
        name: newLead.name.trim() || undefined,
        email: newLead.email.trim() || undefined,
      });
      setNewLead({ phone: "", name: "", email: "" });
      setShowAddDialog(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total", value: stats?.total || 0, color: "text-foreground" },
          { label: "Pendentes", value: stats?.pending || 0, color: "text-slate-500" },
          { label: "Em Execução", value: stats?.inProgress || 0, color: "text-blue-500" },
          { label: "Atendidos (OK)", value: stats?.completed || 0, color: "text-emerald-500" },
          { label: "Falhas", value: stats?.failed || 0, color: "text-rose-500" },
        ].map((stat, i) => (
          <Card key={i} className="border-border shadow-sm rounded-xl">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground font-medium mb-1">{stat.label}</span>
              <span className={	ext-2xl font-bold font-mono }>{stat.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
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
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="no_answer">Não Atendeu</SelectItem>
              <SelectItem value="busy">Ocupado</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 w-full sm:w-auto justify-end">
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
            disabled={isBatchAdding}
          >
            <Upload className="h-4 w-4 text-muted-foreground" />
            {isBatchAdding ? "Importando..." : "Importar CSV"}
          </Button>

          <Button
            variant="outline"
            className="h-10 gap-2 w-full sm:w-auto border-border"
            onClick={() => setShowAddDialog(true)}
            disabled={isAdding}
          >
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            Adicionar Lead
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="h-10 gap-2 w-full sm:w-auto text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                disabled={isResetting || (stats?.total === 0)}
              >
                <RefreshCw className="h-4 w-4" />
                Reiniciar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reiniciar campanha de URA?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso voltará o status de todos os leads para "Pendente" e limpará as tentativas e teclas pressionadas. Útil para reexecutar a campanha.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => resetLeads()}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
                <TableHead>Duração</TableHead>
                <TableHead className="text-right">Ações</TableHead>
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
                    {lead.durationSeconds != null ? ${lead.durationSeconds}s : "-"}
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
            <DialogDescription>Digite as informações básicas do contato.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone (DDI+DDD+Número)</Label>
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
                placeholder="Ex: João da Silva"
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
