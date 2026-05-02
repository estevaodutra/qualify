import { useState } from "react";
import { useDispatchContacts } from "@/hooks/useDispatchContacts";
import { useLeads } from "@/hooks/useLeads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Search, Plus, MoreHorizontal, Trash2, Play, Pause, RotateCcw, UserPlus, Loader2,
} from "lucide-react";

interface ContactsTabProps {
  campaignId: string;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  paused: { label: "Pausado", variant: "secondary" },
  completed: { label: "Concluído", variant: "outline" },
  unsubscribed: { label: "Cancelado", variant: "destructive" },
};

export function ContactsTab({ campaignId }: ContactsTabProps) {
  const { contacts, stats, isLoading, addContacts, removeContact, updateContact, isAdding } = useDispatchContacts(campaignId);
  const { leads } = useLeads();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [leadSearch, setLeadSearch] = useState("");

  const filtered = contacts.filter(c => {
    const matchesSearch = (c.leadName || c.leadPhone || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Leads not yet in the campaign
  const availableLeads = leads.filter(
    lead => !contacts.some(c => c.leadId === lead.id)
  ).filter(
    lead => (lead.name || lead.phone || "").toLowerCase().includes(leadSearch.toLowerCase())
  );

  const handleAddContacts = async () => {
    if (selectedLeads.length > 0) {
      await addContacts(selectedLeads);
      setSelectedLeads([]);
      setShowAddDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total", value: stats.total, icon: Users },
          { label: "Ativos", value: stats.active, icon: UserPlus },
          { label: "Em Sequência", value: stats.inSequence, icon: Play },
          { label: "Concluídos", value: stats.completed, icon: RotateCcw },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar contatos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="paused">Pausados</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum contato</h3>
          <p className="text-muted-foreground mb-4">Adicione contatos da sua lista de leads.</p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar Contatos
          </Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Sequência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(contact => {
                const st = statusLabels[contact.status] || statusLabels.active;
                return (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.leadName || "—"}</TableCell>
                    <TableCell>{contact.leadPhone || "—"}</TableCell>
                    <TableCell>
                      {contact.currentSequenceId ? (
                        <span className="text-sm">Etapa {contact.currentStep + 1}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {contact.status === "active" && (
                            <DropdownMenuItem onClick={() => updateContact({ id: contact.id, updates: { status: "paused" } })}>
                              <Pause className="mr-2 h-4 w-4" /> Pausar
                            </DropdownMenuItem>
                          )}
                          {contact.status === "paused" && (
                            <DropdownMenuItem onClick={() => updateContact({ id: contact.id, updates: { status: "active" } })}>
                              <Play className="mr-2 h-4 w-4" /> Retomar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => updateContact({ id: contact.id, updates: { currentStep: 0, currentSequenceId: null, sequenceStartedAt: null, sequenceCompletedAt: null } })}>
                            <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => removeContact(contact.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add Contacts Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Contatos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar leads..." value={leadSearch} onChange={e => setLeadSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {availableLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum lead disponível.</p>
              ) : (
                availableLeads.slice(0, 50).map(lead => (
                  <div key={lead.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={checked => {
                        setSelectedLeads(prev => checked ? [...prev, lead.id] : prev.filter(id => id !== lead.id));
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{lead.name || lead.phone}</p>
                      <p className="text-xs text-muted-foreground">{lead.phone}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {selectedLeads.length > 0 && (
              <p className="text-sm text-muted-foreground">{selectedLeads.length} selecionado(s)</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddContacts} disabled={selectedLeads.length === 0 || isAdding}>
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar ({selectedLeads.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
