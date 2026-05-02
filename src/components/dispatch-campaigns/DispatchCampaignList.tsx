import { useState } from "react";
import { DispatchCampaign } from "@/hooks/useDispatchCampaigns";
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
  Plus, Search, MoreVertical, Settings, Trash2, Play, Pause, FileEdit, Megaphone, Copy,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface DispatchCampaignListProps {
  campaigns: DispatchCampaign[];
  isLoading: boolean;
  onSelect: (campaign: DispatchCampaign) => void;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onCreateNew: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  active: { label: "Ativa", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  paused: { label: "Pausada", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  completed: { label: "Concluída", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
};

export function DispatchCampaignList({
  campaigns, isLoading, onSelect, onDelete, onStatusChange, onCreateNew,
}: DispatchCampaignListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = campaigns.filter(c =>
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
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar campanhas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Campanha
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Megaphone className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhuma campanha encontrada</h3>
          <p className="text-muted-foreground mb-4">
            Crie sua primeira campanha de disparos para começar.
          </p>
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Campanha
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(campaign => {
            const status = statusConfig[campaign.status] || statusConfig.draft;
            return (
              <Card
                key={campaign.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSelect(campaign)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-medium">{campaign.name}</CardTitle>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{campaign.description}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); onSelect(campaign); }}>
                          <Settings className="mr-2 h-4 w-4" /> Configurar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={e => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(campaign.id);
                          toast.success("ID copiado", { description: campaign.id });
                        }}>
                          <Copy className="mr-2 h-4 w-4" /> Copiar ID
                        </DropdownMenuItem>
                        {campaign.status !== "active" && (
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); onStatusChange(campaign.id, "active"); }}>
                            <Play className="mr-2 h-4 w-4" /> Ativar
                          </DropdownMenuItem>
                        )}
                        {campaign.status === "active" && (
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); onStatusChange(campaign.id, "paused"); }}>
                            <Pause className="mr-2 h-4 w-4" /> Pausar
                          </DropdownMenuItem>
                        )}
                        {campaign.status !== "draft" && (
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); onStatusChange(campaign.id, "draft"); }}>
                            <FileEdit className="mr-2 h-4 w-4" /> Rascunho
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteId(campaign.id); }}>
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge className={status.className}>{status.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(campaign.createdAt), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados da campanha serão permanentemente removidos.
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
