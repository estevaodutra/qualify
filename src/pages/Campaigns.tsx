import { useState } from "react";
import { PageHeader, StatusBadge, DataTable, EmptyState, type Column } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Megaphone, Plus, Search, MoreHorizontal, Play, Pause, Eye, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useCampaigns, type Campaign } from "@/hooks/useCampaigns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Campaigns() {
  const { toast } = useToast();
  const { campaigns, isLoading, isCreating, createCampaign, updateCampaign } = useCampaigns();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    channel: "whatsapp",
    message: "",
    totalRecipients: "1000",
  });

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateCampaign = async () => {
    if (!newCampaign.name) {
      toast({
        title: "Erro",
        description: "O nome da campanha é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    await createCampaign({
      name: newCampaign.name,
      channel: newCampaign.channel,
      total: parseInt(newCampaign.totalRecipients),
    });

    setShowCreateDialog(false);
    setNewCampaign({ name: "", channel: "whatsapp", message: "", totalRecipients: "1000" });
  };

  const handleToggleCampaign = async (campaign: Campaign) => {
    const newStatus = campaign.status === "running" ? "paused" : "running";
    await updateCampaign({ id: campaign.id, status: newStatus });
    toast({
      title: newStatus === "running" ? "Campanha iniciada" : "Campanha pausada",
      description: `"${campaign.name}" está agora ${newStatus === "running" ? "em execução" : "pausada"}.`,
    });
  };

  const handleViewDetails = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowDetailDialog(true);
  };

  const columns: Column<Campaign>[] = [
    {
      key: "name",
      header: "Campanha",
      render: (campaign) => (
        <div className="flex flex-col">
          <span className="font-medium">{campaign.name}</span>
          <span className="text-xs text-muted-foreground capitalize">{campaign.channel}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (campaign) => <StatusBadge status={campaign.status} />,
    },
    {
      key: "progress",
      header: "Progresso",
      render: (campaign) => (
        <div className="w-32 space-y-1">
          <Progress value={campaign.total > 0 ? (campaign.sent / campaign.total) * 100 : 0} className="h-1.5" />
          <span className="text-xs text-muted-foreground">
            {campaign.sent.toLocaleString()} / {campaign.total.toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: "successRate",
      header: "Taxa de Sucesso",
      render: (campaign) => (
        <span className="font-mono text-sm">
          {campaign.successRate > 0 ? `${campaign.successRate}%` : "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Criada em",
      render: (campaign) => (
        <span className="text-sm text-muted-foreground">{campaign.createdAt}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (campaign) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewDetails(campaign)}>
              <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
            </DropdownMenuItem>
            {campaign.status === "running" ? (
              <DropdownMenuItem onClick={() => handleToggleCampaign(campaign)}>
                <Pause className="mr-2 h-4 w-4" /> Pausar Campanha
              </DropdownMenuItem>
            ) : campaign.status === "paused" || campaign.status === "draft" ? (
              <DropdownMenuItem onClick={() => handleToggleCampaign(campaign)}>
                <Play className="mr-2 h-4 w-4" /> Iniciar Campanha
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  const stats = {
    total: campaigns.length,
    running: campaigns.filter((c) => c.status === "running").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader title="Campanhas" description="Crie e gerencie suas campanhas de disparos" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          Nova Campanha
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Campanhas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="metric-value">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Execução</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="metric-value text-success">{stats.running}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevation-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="metric-value text-info">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar campanhas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="running">Em Execução</SelectItem>
            <SelectItem value="paused">Pausada</SelectItem>
            <SelectItem value="completed">Concluída</SelectItem>
            <SelectItem value="terminated">Encerrada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      {filteredCampaigns.length > 0 ? (
        <DataTable
          columns={columns}
          data={filteredCampaigns}
          keyExtractor={(campaign) => campaign.id}
        />
      ) : (
        <EmptyState
          icon={Megaphone}
          title="Nenhuma campanha encontrada"
          description="Crie sua primeira campanha para começar a enviar mensagens"
          action={
            <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" />
              Criar Campanha
            </Button>
          }
        />
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Nova Campanha</DialogTitle>
            <DialogDescription>
              Configure uma nova campanha de disparos para WhatsApp ou Voz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Campanha</Label>
              <Input
                id="name"
                placeholder="ex: Promoção de Verão 2025"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Canal</Label>
              <Select
                value={newCampaign.channel}
                onValueChange={(value) => setNewCampaign((prev) => ({ ...prev, channel: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="voice">Voice/URA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipients">Total de Destinatários</Label>
              <Input
                id="recipients"
                type="number"
                placeholder="1000"
                value={newCampaign.totalRecipients}
                onChange={(e) => setNewCampaign((prev) => ({ ...prev, totalRecipients: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Template da Mensagem</Label>
              <Textarea
                id="message"
                placeholder="Digite o template da sua mensagem..."
                value={newCampaign.message}
                onChange={(e) => setNewCampaign((prev) => ({ ...prev, message: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCampaign} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Campanha"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedCampaign?.name}</DialogTitle>
            <DialogDescription>Desempenho e detalhes da campanha</DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={selectedCampaign.status} size="lg" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Canal</p>
                  <p className="font-medium capitalize">{selectedCampaign.channel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                  <p className="font-mono text-lg font-semibold">
                    {selectedCampaign.successRate > 0 ? `${selectedCampaign.successRate}%` : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Criada em</p>
                  <p className="font-medium">{selectedCampaign.createdAt}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Progresso</p>
                <Progress value={selectedCampaign.total > 0 ? (selectedCampaign.sent / selectedCampaign.total) * 100 : 0} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  {selectedCampaign.sent.toLocaleString()} de {selectedCampaign.total.toLocaleString()} despachados
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Fechar
            </Button>
            {selectedCampaign && (selectedCampaign.status === "running" || selectedCampaign.status === "paused" || selectedCampaign.status === "draft") && (
              <Button
                onClick={() => {
                  handleToggleCampaign(selectedCampaign);
                  setShowDetailDialog(false);
                }}
              >
                {selectedCampaign.status === "running" ? "Pausar" : "Iniciar"} Campanha
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
