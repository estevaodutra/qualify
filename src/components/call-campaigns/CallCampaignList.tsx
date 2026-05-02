import { useState } from "react";
import { CallCampaign } from "@/hooks/useCallCampaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  MoreVertical,
  PhoneCall,
  Settings,
  Trash2,
  Play,
  Pause,
  FileEdit,
  Users,
  Star,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallCampaignCounts } from "@/hooks/useCallCampaignCounts";
import { toast } from "sonner";

interface CallCampaignListProps {
  campaigns: CallCampaign[];
  isLoading: boolean;
  onSelect: (campaign: CallCampaign) => void;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onCreateNew: () => void;
  onDuplicate: (id: string) => Promise<unknown>;
  isDuplicating?: boolean;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  paused: "Pausado",
  completed: "Concluído",
};

export function CallCampaignList({
  campaigns,
  isLoading,
  onSelect,
  onDelete,
  onStatusChange,
  onCreateNew,
  onDuplicate,
  isDuplicating,
}: CallCampaignListProps) {
  const { data: counts } = useCallCampaignCounts(campaigns.map(c => c.id));
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async () => {
    if (deleteId) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar campanhas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Campanha
        </Button>
      </div>

      {/* Grid */}
      {filteredCampaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <PhoneCall className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhuma campanha encontrada</h3>
          <p className="text-muted-foreground mb-4">
            Crie sua primeira campanha de ligação para começar.
          </p>
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Campanha
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelect(campaign)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium flex items-center gap-1.5">
                      {campaign.isPriority && (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                      {campaign.name}
                    </CardTitle>
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onSelect(campaign);
                      }}>
                        <Settings className="mr-2 h-4 w-4" />
                        Configurar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(campaign.id);
                        toast.success("ID copiado", { description: campaign.id });
                      }}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar ID
                      </DropdownMenuItem>
                      {campaign.status !== "active" && campaign.status !== "completed" && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(campaign.id, "active");
                        }}>
                          <Play className="mr-2 h-4 w-4" />
                          Ativar
                        </DropdownMenuItem>
                      )}
                      {campaign.status === "active" && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(campaign.id, "paused");
                        }}>
                          <Pause className="mr-2 h-4 w-4" />
                          Pausar
                        </DropdownMenuItem>
                      )}
                      {campaign.status !== "draft" && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(campaign.id, "draft");
                        }}>
                          <FileEdit className="mr-2 h-4 w-4" />
                          Voltar para Rascunho
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate(campaign.id);
                        }}
                        disabled={isDuplicating}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        {isDuplicating ? "Duplicando..." : "Duplicar"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(campaign.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[campaign.status]}>
                      {statusLabels[campaign.status]}
                    </Badge>
                    {campaign.isPriority && (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs">
                        PRIORIDADE
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(campaign.createdAt), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                </div>
                
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{counts?.[campaign.id]?.leads ?? 0} leads</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <PhoneCall className="h-4 w-4" />
                    <span>{counts?.[campaign.id]?.calls ?? 0} ligações</span>
                  </div>
                  {campaign.isPriority && (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Star className="h-3.5 w-3.5" />
                      <span>Posição: {campaign.priorityPosition}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados da campanha, incluindo
              leads, operadores e histórico serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
